#!/usr/bin/env python3
"""Repack hatch-pet artwork into website leader-gallery animation strips.

Input may be either the formal transparent 8x9 hatch atlas or one raw ImageGen
strip per website state. Every source frame must contain the same fixed,
left-to-right lineup of nine leaders. This script only removes a flat chroma
key, crops, scales, and repositions existing artwork; it does not synthesize
sprite content.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

try:
    from PIL import Image, ImageChops, ImageDraw, ImageFilter, UnidentifiedImageError
except ImportError as exc:  # pragma: no cover - depends on the caller's environment
    raise SystemExit(
        "error: Pillow is required; install it with `python -m pip install Pillow`"
    ) from exc


ATLAS_COLUMNS = 8
ATLAS_ROWS = 9
CELL_WIDTH = 192
CELL_HEIGHT = 208
ATLAS_SIZE = (ATLAS_COLUMNS * CELL_WIDTH, ATLAS_ROWS * CELL_HEIGHT)

FRAME_WIDTH = 1024
FRAME_HEIGHT = 180
PARTY_SLOTS = 8
SLOT_WIDTH = FRAME_WIDTH // PARTY_SLOTS
LEADER_COUNT = 9

SINGLE_MAX_HEIGHT = 158
PAIR_MAX_HEIGHT = 150
SINGLE_SIDE_PADDING = 5
PAIR_SIDE_PADDING = 4
PAIR_GAP = 4
BOTTOM_PADDING = 4

NEAREST = getattr(Image, "Resampling", Image).NEAREST

CHROMA_KEY = (255, 0, 255)
CHROMA_HARD_DISTANCE = 48
CHROMA_FRINGE_RADIUS = 2
CHROMA_FRINGE_MIN_CHANNEL = 48
CHROMA_FRINGE_MAX_RED_BLUE_DELTA = 32
CHROMA_FRINGE_MIN_EXCESS = 40


@dataclass(frozen=True)
class StateSpec:
    name: str
    row: int
    frames: int
    pose_frame: int


STATES = (
    StateSpec("roam", row=7, frames=6, pose_frame=0),
    StateSpec("suspense", row=6, frames=6, pose_frame=0),
    StateSpec("cheer", row=4, frames=5, pose_frame=1),
    StateSpec("boo", row=5, frames=4, pose_frame=1),
    StateSpec("laugh", row=8, frames=4, pose_frame=2),
)
STATE_NAMES = tuple(spec.name for spec in STATES)

LEADER_ASSET_NAMES = (
    "magdalena-andersson",
    "ulf-kristersson",
    "jimmie-akesson",
    "nooshi-dadgostar",
    "elisabeth-thand-ringqvist",
    "ebba-busch",
    "simona-mohamsson",
    "amanda-lind",
    "daniel-hellden",
)

BBox = tuple[int, int, int, int]
XRun = tuple[int, int]


def fail(message: str) -> None:
    raise SystemExit(f"error: {message}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Adapt a transparent hatch-pet atlas or five raw ImageGen strips "
            "into lossless WebP leader-gallery animations."
        )
    )
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument(
        "--atlas",
        help="Absolute path to a transparent 1536x1872 spritesheet.png",
    )
    input_group.add_argument(
        "--source",
        action="append",
        metavar="STATE=/ABSOLUTE/PATH.PNG",
        help=(
            "Raw ImageGen strip for a website state; repeat once for each of "
            f"{', '.join(STATE_NAMES)}"
        ),
    )
    parser.add_argument(
        "--output-dir",
        required=True,
        help="Absolute destination directory, normally web/public/sprites",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir).expanduser()
    if not output_dir.is_absolute():
        parser.error("--output-dir must be an absolute path")

    if args.atlas is not None:
        atlas = Path(args.atlas).expanduser()
        if not atlas.is_absolute():
            parser.error("--atlas must be an absolute path")
        args.atlas = atlas.resolve()
        args.sources = None
    else:
        sources: dict[str, Path] = {}
        for value in args.source or []:
            if "=" not in value:
                parser.error(
                    f"invalid --source {value!r}; expected STATE=/absolute/path.png"
                )
            state, raw_path = value.split("=", 1)
            if state not in STATE_NAMES:
                parser.error(
                    f"unknown --source state {state!r}; expected one of "
                    f"{', '.join(STATE_NAMES)}"
                )
            if state in sources:
                parser.error(f"duplicate --source for state {state!r}")
            source_path = Path(raw_path).expanduser()
            if not source_path.is_absolute():
                parser.error(f"--source path for {state!r} must be absolute")
            sources[state] = source_path.resolve()

        missing = [state for state in STATE_NAMES if state not in sources]
        if missing:
            parser.error(
                "source mode requires exactly one --source for every state; "
                f"missing {', '.join(missing)}"
            )
        args.sources = sources

    args.output_dir = output_dir.resolve()
    return args


def bbox_list(bbox: BBox) -> list[int]:
    return [bbox[0], bbox[1], bbox[2], bbox[3]]


def chroma_removal_rule() -> dict[str, Any]:
    """Return a JSON-safe description of the raw-strip chroma algorithm."""

    return {
        "key": "#FF00FF",
        "hard_key": {
            "metric": "euclidean-rgb",
            "maximum_distance": CHROMA_HARD_DISTANCE,
        },
        "fringe_cleanup": {
            "within_key_radius_pixels": CHROMA_FRINGE_RADIUS,
            "minimum_red_and_blue": CHROMA_FRINGE_MIN_CHANNEL,
            "maximum_red_blue_delta": CHROMA_FRINGE_MAX_RED_BLUE_DELTA,
            "minimum_magenta_excess_over_green": CHROMA_FRINGE_MIN_EXCESS,
            "alpha_estimate": "255 - (min(red, blue) - green)",
            "rgb_decontamination": "unmix #FF00FF using the estimated alpha",
        },
        "existing_alpha": "multiplied by the estimated chroma alpha",
    }


def unmix_key_channel(observed: int, key_channel: int, alpha: int) -> int:
    """Recover straight-alpha foreground color from a chroma-composited channel."""

    numerator = observed * 255 - (255 - alpha) * key_channel
    return max(0, min(255, round(numerator / alpha)))


def chroma_to_alpha(image: Image.Image) -> tuple[Image.Image, dict[str, Any]]:
    """Remove flat #FF00FF and decontaminate adjacent balanced magenta fringe.

    A small Euclidean neighborhood around the exact key is made fully
    transparent. Within two pixels of that removed background, balanced
    red/blue pixels are treated as antialiased key blends: their alpha is
    estimated from magenta excess and their RGB channels are unmixed from the
    key. Restricting despill to the key boundary preserves non-key sprite
    colors in figure interiors.
    """

    rgba = image.convert("RGBA")
    pixels = list(rgba.get_flattened_data())
    hard_distance_squared = CHROMA_HARD_DISTANCE**2
    hard_mask_data: list[int] = []

    for red, green, blue, _input_alpha in pixels:
        distance_squared = (
            (red - CHROMA_KEY[0]) ** 2
            + (green - CHROMA_KEY[1]) ** 2
            + (blue - CHROMA_KEY[2]) ** 2
        )
        hard_mask_data.append(255 if distance_squared <= hard_distance_squared else 0)

    hard_mask = Image.new("L", rgba.size, 0)
    hard_mask.putdata(hard_mask_data)
    neighborhood_size = CHROMA_FRINGE_RADIUS * 2 + 1
    near_key_data = list(
        hard_mask.filter(ImageFilter.MaxFilter(neighborhood_size)).get_flattened_data()
    )

    output_pixels: list[tuple[int, int, int, int]] = []
    hard_key_count = 0
    fringe_adjusted_count = 0
    existing_transparent_count = 0
    output_transparent_count = 0

    for pixel, is_hard_key, is_near_key in zip(
        pixels, hard_mask_data, near_key_data, strict=True
    ):
        red, green, blue, input_alpha = pixel
        if input_alpha == 0:
            output_pixels.append((0, 0, 0, 0))
            existing_transparent_count += 1
            output_transparent_count += 1
            continue

        if is_hard_key:
            output_pixels.append((0, 0, 0, 0))
            hard_key_count += 1
            output_transparent_count += 1
            continue

        minimum_red_blue = min(red, blue)
        magenta_excess = minimum_red_blue - green
        is_balanced_fringe = (
            is_near_key
            and minimum_red_blue >= CHROMA_FRINGE_MIN_CHANNEL
            and abs(red - blue) <= CHROMA_FRINGE_MAX_RED_BLUE_DELTA
            and magenta_excess >= CHROMA_FRINGE_MIN_EXCESS
        )
        if not is_balanced_fringe:
            output_pixels.append(pixel)
            continue

        chroma_alpha = max(0, min(255, 255 - magenta_excess))
        output_alpha = round(input_alpha * chroma_alpha / 255)
        if output_alpha <= 1 or chroma_alpha == 0:
            output_pixels.append((0, 0, 0, 0))
            output_transparent_count += 1
        else:
            output_pixels.append(
                (
                    unmix_key_channel(red, CHROMA_KEY[0], chroma_alpha),
                    unmix_key_channel(green, CHROMA_KEY[1], chroma_alpha),
                    unmix_key_channel(blue, CHROMA_KEY[2], chroma_alpha),
                    output_alpha,
                )
            )
        fringe_adjusted_count += 1

    output = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    output.putdata(output_pixels)
    metadata = {
        "rule": chroma_removal_rule(),
        "hard_key_pixel_count": hard_key_count,
        "fringe_adjusted_pixel_count": fringe_adjusted_count,
        "existing_transparent_pixel_count": existing_transparent_count,
        "output_transparent_pixel_count": output_transparent_count,
    }
    return output, metadata


def proportional_slot_boxes(
    width: int, height: int, frame_count: int
) -> list[BBox]:
    """Split a raw strip using rounded proportional x boundaries."""

    if width < frame_count or height <= 0:
        fail(
            f"source dimensions {width}x{height} are too small for "
            f"{frame_count} frame slots"
        )

    boundaries = [
        round(width * index / frame_count) for index in range(frame_count + 1)
    ]
    if any(left >= right for left, right in zip(boundaries, boundaries[1:])):
        fail(f"rounded slot boundaries are not strictly increasing: {boundaries}")
    return [
        (boundaries[index], 0, boundaries[index + 1], height)
        for index in range(frame_count)
    ]


def content_group_boxes(
    alpha: Image.Image, frame_count: int
) -> tuple[list[BBox], dict[str, Any]]:
    """Split a raw strip at the largest transparent gaps between pose groups.

    Image generation leaves generous but not perfectly equal spacing between
    each complete nine-leader lineup. Cutting by equal image fractions can
    therefore leave a hand or shoulder in the neighbouring frame. The alpha
    projection lets us put every boundary in an actually empty interval.
    """

    full_bbox = alpha.getbbox()
    if full_bbox is None:
        fail("raw strip is empty after chroma removal")

    projection = alpha_projection(alpha, (0, 0, alpha.width, alpha.height))
    raw_runs = projection_runs(projection, (0, 0, alpha.width, alpha.height))
    minimum_run_pixels = max(4, alpha.height // 80)
    runs = [
        run
        for run in raw_runs
        if sum(projection[run[0] : run[1]]) >= minimum_run_pixels
    ]
    if len(runs) < frame_count:
        fallback = proportional_slot_boxes(alpha.width, alpha.height, frame_count)
        return fallback, {
            "method": "proportional-fallback",
            "detected_run_count": len(runs),
            "detected_runs": [[left, right] for left, right in runs],
            "discarded_tiny_runs": [
                [left, right] for left, right in raw_runs if (left, right) not in runs
            ],
            "minimum_run_pixels": minimum_run_pixels,
        }

    gaps = [
        (runs[index + 1][0] - runs[index][1], index)
        for index in range(len(runs) - 1)
    ]
    separator_indexes = sorted(
        index
        for _gap, index in sorted(
            gaps,
            key=lambda item: (item[0], -item[1]),
            reverse=True,
        )[: frame_count - 1]
    )

    if len(separator_indexes) != frame_count - 1:
        fail(
            f"could not find {frame_count - 1} transparent pose-group gaps "
            f"in a strip with {len(runs)} occupied x-runs"
        )

    boundaries = [0]
    selected_gaps: list[dict[str, int]] = []
    for run_index in separator_indexes:
        gap_left = runs[run_index][1]
        gap_right = runs[run_index + 1][0]
        boundary = (gap_left + gap_right) // 2
        boundaries.append(boundary)
        selected_gaps.append(
            {
                "left": gap_left,
                "right": gap_right,
                "width": gap_right - gap_left,
                "boundary": boundary,
            }
        )
    boundaries.append(alpha.width)

    boxes = [
        (boundaries[index], 0, boundaries[index + 1], alpha.height)
        for index in range(frame_count)
    ]
    return boxes, {
        "method": "largest-transparent-gaps",
        "detected_run_count": len(runs),
        "detected_runs": [[left, right] for left, right in runs],
        "discarded_tiny_runs": [
            [left, right] for left, right in raw_runs if (left, right) not in runs
        ],
        "minimum_run_pixels": minimum_run_pixels,
        "selected_gaps": selected_gaps,
    }


def alpha_projection(alpha: Image.Image, group_bbox: BBox) -> list[int]:
    """Count nontransparent pixels in every cell-local x column."""

    left, top, right, bottom = group_bbox
    pixels = alpha.load()
    projection = [0] * alpha.width
    for x in range(left, right):
        projection[x] = sum(1 for y in range(top, bottom) if pixels[x, y] > 0)
    return projection


def projection_runs(projection: list[int], group_bbox: BBox) -> list[XRun]:
    """Return half-open x runs whose alpha projection is nonzero."""

    left, _, right, _ = group_bbox
    runs: list[XRun] = []
    start: int | None = None

    for x in range(left, right):
        occupied = projection[x] > 0
        if occupied and start is None:
            start = x
        elif not occupied and start is not None:
            runs.append((start, x))
            start = None

    if start is not None:
        runs.append((start, right))
    return runs


def bbox_for_x_range(alpha: Image.Image, x_range: XRun) -> BBox | None:
    left, right = x_range
    local_bbox = alpha.crop((left, 0, right, alpha.height)).getbbox()
    if local_bbox is None:
        return None
    local_left, top, local_right, bottom = local_bbox
    return (left + local_left, top, left + local_right, bottom)


def merge_runs_to_count(runs: Iterable[XRun], count: int) -> list[XRun]:
    """Merge the closest adjacent projection fragments until count remain."""

    merged = list(runs)
    while len(merged) > count:
        merge_index = min(
            range(len(merged) - 1),
            key=lambda index: (
                merged[index + 1][0] - merged[index][1],
                merged[index + 1][1] - merged[index][0],
                index,
            ),
        )
        merged[merge_index : merge_index + 2] = [
            (merged[merge_index][0], merged[merge_index + 1][1])
        ]
    return merged


def equal_band_segments(projection: list[int], group_bbox: BBox) -> list[XRun]:
    """Split into nine near-equal bands, nudging cuts toward projection minima."""

    left, _, right, _ = group_bbox
    width = right - left
    if width < LEADER_COUNT:
        fail(
            f"group bbox is only {width}px wide, too narrow for {LEADER_COUNT} leaders"
        )

    boundaries = [left]
    search_radius = max(2, round(width / (LEADER_COUNT * 3)))

    for index in range(1, LEADER_COUNT):
        target = left + round(width * index / LEADER_COUNT)
        minimum = boundaries[-1] + 1
        remaining_segments = LEADER_COUNT - index
        maximum = right - remaining_segments
        search_left = max(minimum, target - search_radius)
        search_right = min(maximum, target + search_radius)

        if search_left > search_right:
            boundary = min(max(target, minimum), maximum)
        else:
            boundary = min(
                range(search_left, search_right + 1),
                key=lambda x: (projection[x], abs(x - target), x),
            )
        boundaries.append(boundary)

    boundaries.append(right)
    return [
        (boundaries[index], boundaries[index + 1])
        for index in range(LEADER_COUNT)
    ]


def segment_leaders(
    alpha: Image.Image,
    group_bbox: BBox,
    context: str,
) -> tuple[list[BBox], dict[str, Any]]:
    projection = alpha_projection(alpha, group_bbox)
    raw_runs = projection_runs(projection, group_bbox)
    raw_run_bboxes = [
        bbox
        for run in raw_runs
        if (bbox := bbox_for_x_range(alpha, run)) is not None
    ]

    if len(raw_runs) >= LEADER_COUNT:
        source_ranges = merge_runs_to_count(raw_runs, LEADER_COUNT)
        method = "projection-runs" if len(raw_runs) == LEADER_COUNT else "merged-projection-runs"
    else:
        source_ranges = equal_band_segments(projection, group_bbox)
        method = "equal-band-projection-fallback"

    figure_bboxes: list[BBox] = []
    for leader_index, source_range in enumerate(source_ranges, start=1):
        bbox = bbox_for_x_range(alpha, source_range)
        if bbox is None:
            fail(
                f"{context}: leader {leader_index} is empty after {method}; "
                "the source lineup cannot be segmented safely"
            )
        figure_bboxes.append(bbox)

    if len(figure_bboxes) != LEADER_COUNT:
        fail(
            f"{context}: segmentation produced {len(figure_bboxes)} leaders, "
            f"expected {LEADER_COUNT}"
        )

    metadata = {
        "group_bbox": bbox_list(group_bbox),
        "detected_run_count": len(raw_runs),
        "detected_run_bboxes": [bbox_list(bbox) for bbox in raw_run_bboxes],
        "segmentation_method": method,
        "figure_bboxes": [bbox_list(bbox) for bbox in figure_bboxes],
    }
    return figure_bboxes, metadata


def separator_seam(
    alpha: Image.Image,
    group_bbox: BBox,
    target_x: int,
    half_window: int,
) -> list[int]:
    """Trace a low-alpha top-to-bottom seam near one expected leader boundary."""

    group_left, top, group_right, bottom = group_bbox
    window_left = max(group_left + 1, target_x - half_window)
    window_right = min(group_right - 1, target_x + half_window)
    if window_left > window_right:
        fail(f"invalid separator window around x={target_x} in {group_bbox}")

    xs = list(range(window_left, window_right + 1))
    width = len(xs)
    alpha_pixels = alpha.load()
    previous = [abs(x - target_x) for x in xs]
    predecessors: list[list[int]] = []

    for y in range(top, bottom):
        current = [0] * width
        row_predecessors = [0] * width
        for local_x, x in enumerate(xs):
            best_previous = local_x
            best_cost = previous[local_x]
            if local_x > 0 and previous[local_x - 1] + 2 < best_cost:
                best_previous = local_x - 1
                best_cost = previous[local_x - 1] + 2
            if local_x + 1 < width and previous[local_x + 1] + 2 < best_cost:
                best_previous = local_x + 1
                best_cost = previous[local_x + 1] + 2

            pixel_cost = alpha_pixels[x, y] * 3 + abs(x - target_x)
            current[local_x] = best_cost + pixel_cost
            row_predecessors[local_x] = best_previous
        previous = current
        predecessors.append(row_predecessors)

    local_x = min(range(width), key=lambda index: previous[index])
    path = [target_x] * alpha.height
    for row_index in range(len(predecessors) - 1, -1, -1):
        y = top + row_index
        path[y] = xs[local_x]
        local_x = predecessors[row_index][local_x]
    return path


def segment_leader_layers(
    cell: Image.Image,
    group_bbox: BBox,
    context: str,
) -> tuple[list[tuple[Image.Image, BBox]], dict[str, Any]]:
    """Separate touching figures with curved transparent-background seams.

    Generated chibi figures frequently touch at hair, sleeves, or hands, so a
    straight vertical crop can turn the neighbour into a thin duplicate. A
    constrained seam follows the transparent space around those contacts and
    keeps each resulting layer visually whole when the leaders are spread out
    beneath the eight party podiums.
    """

    alpha = cell.getchannel("A")
    left, top, right, bottom = group_bbox
    group_width = right - left
    average_width = group_width / LEADER_COUNT
    half_window = max(3, round(average_width * 0.46))
    seams = [
        separator_seam(
            alpha,
            group_bbox,
            round(left + group_width * index / LEADER_COUNT),
            half_window,
        )
        for index in range(1, LEADER_COUNT)
    ]

    layers: list[tuple[Image.Image, BBox]] = []
    seam_metadata: list[dict[str, int]] = []
    for seam_index, seam in enumerate(seams, start=1):
        active = seam[top:bottom]
        seam_metadata.append(
            {
                "between_leaders": seam_index,
                "minimum_x": min(active),
                "maximum_x": max(active),
                "top_x": active[0],
                "bottom_x": active[-1],
            }
        )

    for leader_index in range(LEADER_COUNT):
        mask = Image.new("L", cell.size, 0)
        draw = ImageDraw.Draw(mask)
        left_path = (
            [left] * cell.height if leader_index == 0 else seams[leader_index - 1]
        )
        right_path = (
            [right - 1] * cell.height
            if leader_index == LEADER_COUNT - 1
            else seams[leader_index]
        )
        polygon = [
            (left_path[y] + (1 if leader_index > 0 else 0), y)
            for y in range(top, bottom)
        ]
        polygon.extend(
            (right_path[y], y) for y in range(bottom - 1, top - 1, -1)
        )
        draw.polygon(polygon, fill=255)
        isolated_alpha = ImageChops.multiply(alpha, mask)
        source_bbox = isolated_alpha.getbbox()
        if source_bbox is None:
            fail(f"{context}: seam segment for leader {leader_index + 1} is empty")
        layer = cell.copy()
        layer.putalpha(isolated_alpha)
        layers.append((layer, source_bbox))

    return layers, {
        "group_bbox": bbox_list(group_bbox),
        "segmentation_method": "constrained-transparent-seams",
        "figure_bboxes": [bbox_list(bbox) for _layer, bbox in layers],
        "seams": seam_metadata,
    }


def resized_figure(
    cell: Image.Image,
    source_bbox: BBox,
    max_width: int,
    max_height: int,
) -> Image.Image:
    figure = cell.crop(source_bbox)
    width, height = figure.size
    if width <= 0 or height <= 0 or figure.getchannel("A").getbbox() is None:
        fail(f"empty figure crop at bbox {bbox_list(source_bbox)}")

    scale = min(max_width / width, max_height / height)
    target_width = max(1, min(max_width, round(width * scale)))
    target_height = max(1, min(max_height, round(height * scale)))
    return figure.resize((target_width, target_height), resample=NEAREST)


def place_figure(
    frame: Image.Image,
    figure: Image.Image,
    horizontal_area: tuple[int, int],
) -> BBox:
    area_left, area_right = horizontal_area
    area_width = area_right - area_left
    width, height = figure.size
    if width > area_width:
        fail(f"resized figure width {width}px exceeds placement area {area_width}px")

    x = area_left + (area_width - width) // 2
    y = FRAME_HEIGHT - BOTTOM_PADDING - height
    if x < 0 or y < 0 or x + width > FRAME_WIDTH or y + height > FRAME_HEIGHT:
        fail(f"figure placement {(x, y, x + width, y + height)} would crop")

    frame.alpha_composite(figure, (x, y))
    return (x, y, x + width, y + height)


def build_frame(cell: Image.Image, context: str) -> tuple[Image.Image, dict[str, Any]]:
    alpha = cell.getchannel("A")
    group_bbox = alpha.getbbox()
    if group_bbox is None:
        fail(f"{context} is empty")

    figure_layers, metadata = segment_leader_layers(cell, group_bbox, context)
    frame = Image.new("RGBA", (FRAME_WIDTH, FRAME_HEIGHT), (0, 0, 0, 0))
    placements: list[dict[str, Any]] = []

    for leader_index, (layer, source_bbox) in enumerate(figure_layers[:7]):
        slot_left = leader_index * SLOT_WIDTH
        area = (
            slot_left + SINGLE_SIDE_PADDING,
            slot_left + SLOT_WIDTH - SINGLE_SIDE_PADDING,
        )
        figure = resized_figure(
            layer,
            source_bbox,
            max_width=area[1] - area[0],
            max_height=SINGLE_MAX_HEIGHT,
        )
        output_bbox = place_figure(frame, figure, area)
        placements.append(
            {
                "leader": leader_index + 1,
                "party_slot": leader_index + 1,
                "source_bbox": bbox_list(source_bbox),
                "output_bbox": bbox_list(output_bbox),
            }
        )

    final_slot_left = (PARTY_SLOTS - 1) * SLOT_WIDTH
    usable_left = final_slot_left + PAIR_SIDE_PADDING
    usable_right = FRAME_WIDTH - PAIR_SIDE_PADDING
    midpoint = (usable_left + usable_right) // 2
    half_gap = PAIR_GAP // 2
    pair_areas = (
        (usable_left, midpoint - half_gap),
        (midpoint + (PAIR_GAP - half_gap), usable_right),
    )

    for pair_index, (layer, source_bbox) in enumerate(figure_layers[7:]):
        area = pair_areas[pair_index]
        figure = resized_figure(
            layer,
            source_bbox,
            max_width=area[1] - area[0],
            max_height=PAIR_MAX_HEIGHT,
        )
        output_bbox = place_figure(frame, figure, area)
        placements.append(
            {
                "leader": pair_index + 8,
                "party_slot": PARTY_SLOTS,
                "pair_position": "left" if pair_index == 0 else "right",
                "source_bbox": bbox_list(source_bbox),
                "output_bbox": bbox_list(output_bbox),
            }
        )

    if frame.getchannel("A").getbbox() is None:
        fail(f"{context} produced an empty output frame")

    metadata["placements"] = placements
    return frame, metadata


def validate_atlas(path: Path) -> Image.Image:
    if not path.exists():
        fail(f"atlas does not exist: {path}")
    if not path.is_file():
        fail(f"atlas is not a file: {path}")

    try:
        with Image.open(path) as opened:
            opened.load()
            if opened.size != ATLAS_SIZE:
                fail(f"atlas size is {opened.size}, expected {ATLAS_SIZE}")
            if opened.mode != "RGBA":
                fail(f"atlas mode is {opened.mode}, expected RGBA with an alpha channel")
            atlas = opened.copy()
    except UnidentifiedImageError as exc:
        fail(f"atlas is not a readable image: {path} ({exc})")
    except OSError as exc:
        fail(f"could not read atlas {path}: {exc}")

    alpha_minimum, alpha_maximum = atlas.getchannel("A").getextrema()
    if alpha_maximum == 0:
        fail("atlas alpha channel is entirely transparent")
    if alpha_minimum == 255:
        fail("atlas alpha channel contains no transparent pixels")
    return atlas


def validate_raw_source(
    path: Path, spec: StateSpec
) -> tuple[Image.Image, dict[str, Any], list[BBox]]:
    if not path.exists():
        fail(f"source for state {spec.name!r} does not exist: {path}")
    if not path.is_file():
        fail(f"source for state {spec.name!r} is not a file: {path}")

    try:
        with Image.open(path) as opened:
            opened.load()
            input_mode = opened.mode
            if input_mode not in {"RGB", "RGBA"}:
                fail(
                    f"source for state {spec.name!r} has mode {input_mode}, "
                    "expected RGB or RGBA"
                )
            dimensions = opened.size
            source = opened.copy()
    except UnidentifiedImageError as exc:
        fail(
            f"source for state {spec.name!r} is not a readable image: "
            f"{path} ({exc})"
        )
    except OSError as exc:
        fail(f"could not read source for state {spec.name!r} at {path}: {exc}")

    keyed_source, chroma_metadata = chroma_to_alpha(source)
    alpha_minimum, alpha_maximum = keyed_source.getchannel("A").getextrema()
    if alpha_maximum == 0:
        fail(f"source for state {spec.name!r} is empty after chroma removal")
    if alpha_minimum == 255:
        fail(
            f"source for state {spec.name!r} contains no transparent/keyed pixels "
            "after chroma removal"
        )

    slot_boxes, slot_detection = content_group_boxes(
        keyed_source.getchannel("A"), spec.frames
    )
    for left, right in slot_detection["discarded_tiny_runs"]:
        keyed_source.paste((0, 0, 0, 0), (left, 0, right, keyed_source.height))

    metadata = {
        "path": str(path),
        "dimensions": [dimensions[0], dimensions[1]],
        "mode": input_mode,
        "post_chroma_mode": "RGBA",
        "frame_count": spec.frames,
        "slot_bboxes": [bbox_list(slot_bbox) for slot_bbox in slot_boxes],
        "slot_boundary_rule": slot_detection["method"],
        "slot_detection": slot_detection,
        "chroma_removal": chroma_metadata,
    }
    return keyed_source, metadata, slot_boxes


def save_strip(strip: Image.Image, path: Path, expected_size: tuple[int, int]) -> None:
    if strip.mode != "RGBA" or strip.size != expected_size:
        fail(f"internal strip validation failed for {path.name}")

    try:
        strip.save(path, format="WEBP", lossless=True, method=6, exact=True)
        with Image.open(path) as saved:
            saved.load()
            if saved.size != expected_size:
                fail(f"saved {path.name} has size {saved.size}, expected {expected_size}")
            if "A" not in saved.getbands():
                fail(f"saved {path.name} lost its alpha channel")
    except OSError as exc:
        fail(f"could not write lossless WebP {path}: {exc}")


def manifest_template(output_dir: Path, source: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema_version": 2,
        "source": source,
        "output": {
            "directory": str(output_dir),
            "format": "lossless-webp",
            "frame_dimensions": [FRAME_WIDTH, FRAME_HEIGHT],
            "party_slots": PARTY_SLOTS,
            "party_slot_width": SLOT_WIDTH,
            "leader_count": LEADER_COUNT,
            "bbox_coordinate_space": (
                "source-frame-local pixels unless named slot/atlas/output; "
                "right and bottom are exclusive"
            ),
            "bbox_coordinate_spaces": {
                "slot_bbox": "raw input-strip pixels",
                "atlas_bbox": "full atlas pixels",
                "group_bbox": "source-frame-local pixels",
                "detected_run_bboxes": "source-frame-local pixels",
                "figure_bboxes": "source-frame-local pixels",
                "source_bbox": "source-frame-local pixels",
                "output_bbox": "1024x180 output-frame pixels",
            },
        },
        "states": {},
    }


def build_state_strip(
    spec: StateSpec,
    output_dir: Path,
    frame_inputs: Iterable[tuple[Image.Image, str, dict[str, Any]]],
    state_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    inputs = list(frame_inputs)
    if len(inputs) != spec.frames:
        fail(
            f"state {spec.name!r} received {len(inputs)} source frames, "
            f"expected {spec.frames}"
        )

    strip_size = (FRAME_WIDTH * spec.frames, FRAME_HEIGHT)
    strip = Image.new("RGBA", strip_size, (0, 0, 0, 0))
    built_frames: list[Image.Image] = []
    frame_metadata: list[dict[str, Any]] = []

    for frame_index, (cell, context, origin_metadata) in enumerate(inputs):
        if cell.mode != "RGBA":
            fail(f"{context} has mode {cell.mode}, expected internal RGBA")
        frame, metadata = build_frame(cell, context)
        built_frames.append(frame)
        strip.alpha_composite(frame, (frame_index * FRAME_WIDTH, 0))
        metadata["frame"] = frame_index
        metadata.update(origin_metadata)
        frame_metadata.append(metadata)

    filename = f"partiledargalleriet-{spec.name}.webp"
    output_path = output_dir / filename
    save_strip(strip, output_path, strip_size)

    pose_frame = built_frames[spec.pose_frame]
    pose_filename = f"partiledargalleriet-{spec.name}-pose.webp"
    save_strip(pose_frame, output_dir / pose_filename, (FRAME_WIDTH, FRAME_HEIGHT))

    leader_output_dir = output_dir / "leader-gallery"
    leader_output_dir.mkdir(parents=True, exist_ok=True)
    leader_files: dict[str, str] = {}
    for leader_index, leader_name in enumerate(LEADER_ASSET_NAMES):
        if leader_index < 7:
            leader_box = (
                leader_index * SLOT_WIDTH,
                0,
                (leader_index + 1) * SLOT_WIDTH,
                FRAME_HEIGHT,
            )
        elif leader_index == 7:
            leader_box = (
                7 * SLOT_WIDTH,
                0,
                7 * SLOT_WIDTH + SLOT_WIDTH // 2,
                FRAME_HEIGHT,
            )
        else:
            leader_box = (
                7 * SLOT_WIDTH + SLOT_WIDTH // 2,
                0,
                FRAME_WIDTH,
                FRAME_HEIGHT,
            )
        leader_image = pose_frame.crop(leader_box)
        leader_filename = f"{spec.name}-{leader_name}.webp"
        save_strip(leader_image, leader_output_dir / leader_filename, leader_image.size)
        leader_files[leader_name] = f"leader-gallery/{leader_filename}"

    result: dict[str, Any] = {
        "file": filename,
        "frame_count": spec.frames,
        "strip_dimensions": [strip_size[0], strip_size[1]],
        "selected_pose_frame": spec.pose_frame,
        "pose_file": pose_filename,
        "leader_files": leader_files,
        "frames": frame_metadata,
    }
    if state_metadata:
        result.update(state_metadata)
    return result


def write_manifest(manifest: dict[str, Any], output_dir: Path) -> Path:
    manifest_path = output_dir / "partiledargalleriet-manifest.json"
    try:
        manifest_path.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
    except OSError as exc:
        fail(f"could not write manifest {manifest_path}: {exc}")

    return manifest_path


def build_gallery_from_atlas(atlas_path: Path, output_dir: Path) -> Path:
    atlas = validate_atlas(atlas_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest = manifest_template(
        output_dir,
        {
            "kind": "atlas",
            "path": str(atlas_path),
            "atlas": str(atlas_path),
            "dimensions": [ATLAS_SIZE[0], ATLAS_SIZE[1]],
            "grid": {"columns": ATLAS_COLUMNS, "rows": ATLAS_ROWS},
            "cell_dimensions": [CELL_WIDTH, CELL_HEIGHT],
            "mode": "RGBA",
        },
    )

    for spec in STATES:
        frame_inputs: list[tuple[Image.Image, str, dict[str, Any]]] = []
        for frame_index in range(spec.frames):
            cell_box = (
                frame_index * CELL_WIDTH,
                spec.row * CELL_HEIGHT,
                (frame_index + 1) * CELL_WIDTH,
                (spec.row + 1) * CELL_HEIGHT,
            )
            frame_inputs.append(
                (
                    atlas.crop(cell_box),
                    f"state {spec.name!r}, frame {frame_index}, atlas cell {cell_box}",
                    {
                        "atlas_cell": [frame_index, spec.row],
                        "atlas_bbox": bbox_list(cell_box),
                    },
                )
            )
        manifest["states"][spec.name] = build_state_strip(
            spec,
            output_dir,
            frame_inputs,
            state_metadata={"atlas_row": spec.row},
        )

    return write_manifest(manifest, output_dir)


def build_gallery(atlas_path: Path, output_dir: Path) -> Path:
    """Backward-compatible entry point for callers using the atlas API."""

    return build_gallery_from_atlas(atlas_path, output_dir)


def build_gallery_from_sources(
    sources: dict[str, Path], output_dir: Path
) -> Path:
    missing = [state for state in STATE_NAMES if state not in sources]
    unexpected = sorted(set(sources) - set(STATE_NAMES))
    if missing or unexpected or len(sources) != len(STATE_NAMES):
        details: list[str] = []
        if missing:
            details.append(f"missing {', '.join(missing)}")
        if unexpected:
            details.append(f"unexpected {', '.join(unexpected)}")
        fail(
            "raw source map must contain exactly the five website states: "
            + "; ".join(details)
        )

    output_dir.mkdir(parents=True, exist_ok=True)
    source_manifest: dict[str, Any] = {"kind": "raw-strips", "states": {}}
    manifest = manifest_template(output_dir, source_manifest)

    for spec in STATES:
        source_path = sources[spec.name]
        keyed_source, input_metadata, slot_boxes = validate_raw_source(
            source_path, spec
        )
        source_manifest["states"][spec.name] = input_metadata

        frame_inputs: list[tuple[Image.Image, str, dict[str, Any]]] = []
        for frame_index, slot_box in enumerate(slot_boxes):
            frame_inputs.append(
                (
                    keyed_source.crop(slot_box),
                    (
                        f"state {spec.name!r}, frame {frame_index}, raw source "
                        f"{source_path}, slot {slot_box}"
                    ),
                    {
                        "source_slot": frame_index,
                        "slot_bbox": bbox_list(slot_box),
                    },
                )
            )

        manifest["states"][spec.name] = build_state_strip(
            spec,
            output_dir,
            frame_inputs,
            state_metadata={
                "input_source": str(source_path),
                "input_dimensions": input_metadata["dimensions"],
                "input_mode": input_metadata["mode"],
                "chroma_removal_rule": input_metadata["chroma_removal"]["rule"],
            },
        )

    return write_manifest(manifest, output_dir)


def main() -> int:
    args = parse_args()
    if args.atlas is not None:
        manifest_path = build_gallery_from_atlas(args.atlas, args.output_dir)
    else:
        manifest_path = build_gallery_from_sources(args.sources, args.output_dir)
    print(f"Wrote five leader-gallery strips and {manifest_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
