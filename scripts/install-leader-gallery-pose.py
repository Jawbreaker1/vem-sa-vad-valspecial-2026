#!/usr/bin/env python3
"""Install one corrected transparent pose into the leader-gallery assets.

The main gallery builder accepts animation strips. This helper is deliberately
smaller: it takes one anatomy-checked lineup, normalizes it through the same
layout code, repeats it across the state's strip frames, and refreshes the nine
per-leader WebPs consumed by the website.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, UnidentifiedImageError


def load_builder():
    builder_path = Path(__file__).with_name("build-leader-gallery.py")
    spec = importlib.util.spec_from_file_location("leader_gallery_builder", builder_path)
    if spec is None or spec.loader is None:
        raise SystemExit(f"error: could not load {builder_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Install a corrected transparent lineup as one gallery pose."
    )
    parser.add_argument("--state", required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()
    args.source = Path(args.source).expanduser().resolve()
    args.output_dir = Path(args.output_dir).expanduser().resolve()
    return args


def masked_crop(
    pose: Image.Image,
    alpha: Image.Image,
    polygon: list[tuple[int, int]],
    label: str,
) -> Image.Image:
    """Return one figure isolated by a polygon without duplicating neighbours."""

    mask = Image.new("L", pose.size, 0)
    ImageDraw.Draw(mask).polygon(polygon, fill=255)
    isolated_alpha = ImageChops.multiply(alpha, mask)
    bbox = isolated_alpha.getbbox()
    if bbox is None:
        raise SystemExit(f"error: corrected pose produced an empty {label} layer")
    layer = pose.copy()
    layer.putalpha(isolated_alpha)
    return layer.crop(bbox)


def normalize_lineup(pose: Image.Image, builder) -> tuple[Image.Image, dict]:
    """Put the nine figures in equal source bands before the shared layout pass.

    The corrected artwork has seven separated figures followed by the two MP
    spokespeople whose raised hands touch. The general gallery segmenter assumes
    even spacing and can otherwise mistake that final pair for one wide figure,
    shifting the last four identities one slot to the right.
    """

    alpha = pose.getchannel("A")
    segmentation_alpha = alpha.point(lambda value: 255 if value > 16 else 0)
    group_bbox = segmentation_alpha.getbbox()
    if group_bbox is None:
        raise SystemExit("error: corrected pose is empty")
    projection = builder.alpha_projection(segmentation_alpha, group_bbox)
    runs = builder.projection_runs(projection, group_bbox)

    figures: list[Image.Image] = []
    if len(runs) == builder.LEADER_COUNT:
        for index, run in enumerate(runs, start=1):
            bbox = builder.bbox_for_x_range(segmentation_alpha, run)
            if bbox is None:
                raise SystemExit(f"error: corrected pose leader {index} is empty")
            figures.append(pose.crop(bbox))
        pair_method = "separate-alpha-runs"
    elif len(runs) == builder.LEADER_COUNT - 1:
        for index, run in enumerate(runs[:7], start=1):
            bbox = builder.bbox_for_x_range(segmentation_alpha, run)
            if bbox is None:
                raise SystemExit(f"error: corrected pose leader {index} is empty")
            figures.append(pose.crop(bbox))

        pair_bbox = builder.bbox_for_x_range(segmentation_alpha, runs[-1])
        if pair_bbox is None:
            raise SystemExit("error: corrected pose MP pair is empty")
        left, top, right, bottom = pair_bbox
        target_x = (left + right) // 2
        seam = builder.separator_seam(
            alpha,
            pair_bbox,
            target_x,
            max(3, round((right - left) * 0.24)),
        )
        left_polygon = [(left, y) for y in range(top, bottom)]
        left_polygon.extend((seam[y], y) for y in range(bottom - 1, top - 1, -1))
        right_polygon = [(seam[y] + 1, y) for y in range(top, bottom)]
        right_polygon.extend(
            (right - 1, y) for y in range(bottom - 1, top - 1, -1)
        )
        figures.append(masked_crop(pose, alpha, left_polygon, "Amanda Lind"))
        figures.append(masked_crop(pose, alpha, right_polygon, "Daniel Hellden"))
        pair_method = "low-alpha-seam"
    else:
        raise SystemExit(
            "error: corrected pose must contain nine separated figures or "
            f"seven figures plus one touching pair; detected {len(runs)} alpha runs"
        )

    if len(figures) != builder.LEADER_COUNT:
        raise SystemExit(
            f"error: corrected pose produced {len(figures)} figures, "
            f"expected {builder.LEADER_COUNT}"
        )

    band_width = max(256, max(figure.width for figure in figures) + 64)
    normalized_height = max(figure.height for figure in figures)
    normalized_width = band_width * builder.LEADER_COUNT
    normalized = Image.new(
        "RGBA", (normalized_width, normalized_height), (0, 0, 0, 0)
    )
    placements = []
    for index, figure in enumerate(figures):
        if index == 0:
            x = 0
        elif index == len(figures) - 1:
            x = normalized_width - figure.width
        else:
            x = index * band_width + (band_width - figure.width) // 2
        y = normalized_height - figure.height
        normalized.alpha_composite(figure, (x, y))
        placements.append([x, y, x + figure.width, y + figure.height])

    normalized_alpha = normalized.getchannel("A")
    normalized_bbox = normalized_alpha.getbbox()
    if normalized_bbox is None:
        raise SystemExit("error: normalized corrected pose is empty")
    normalized_runs = builder.projection_runs(
        builder.alpha_projection(normalized_alpha, normalized_bbox), normalized_bbox
    )
    if len(normalized_runs) != builder.LEADER_COUNT:
        raise SystemExit(
            "error: normalized corrected pose does not have nine safely separated "
            f"figures; detected {len(normalized_runs)} alpha runs"
        )

    return normalized, {
        "detected_source_alpha_runs": len(runs),
        "touching_pair_split": pair_method,
        "normalized_dimensions": [normalized_width, normalized_height],
        "normalized_placements": placements,
    }


def main() -> int:
    args = parse_args()
    builder = load_builder()
    state_specs = {state.name: state for state in builder.STATES}
    if args.state not in state_specs:
        expected = ", ".join(state_specs)
        raise SystemExit(f"error: unknown state {args.state!r}; expected {expected}")
    if not args.source.is_file():
        raise SystemExit(f"error: source does not exist: {args.source}")

    try:
        with Image.open(args.source) as opened:
            opened.load()
            source_mode = opened.mode
            source_size = opened.size
            pose = opened.convert("RGBA")
    except (OSError, UnidentifiedImageError) as exc:
        raise SystemExit(f"error: could not read {args.source}: {exc}") from exc

    if pose.getchannel("A").getextrema()[0] == 255:
        raise SystemExit("error: corrected pose must have a genuinely transparent background")

    normalized_pose, normalization = normalize_lineup(pose, builder)

    state = state_specs[args.state]
    frame_inputs = [
        (
            normalized_pose.copy(),
            f"corrected {args.state!r} pose {args.source}, repeated frame {frame}",
            {"replacement_pose": str(args.source), "source_slot": frame},
        )
        for frame in range(state.frames)
    ]
    result = builder.build_state_strip(
        state,
        args.output_dir,
        frame_inputs,
        state_metadata={
            "replacement_pose_source": str(args.source),
            "input_dimensions": [source_size[0], source_size[1]],
            "input_mode": source_mode,
            "normalization": normalization,
        },
    )

    manifest_path = args.output_dir / "partiledargalleriet-manifest.json"
    if manifest_path.is_file():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    else:
        manifest = builder.manifest_template(
            args.output_dir,
            {"kind": "corrected-pose-install", "states": {}},
        )
    manifest.setdefault("source", {}).setdefault("states", {})[args.state] = {
        "kind": "corrected-transparent-pose",
        "path": str(args.source),
        "dimensions": [source_size[0], source_size[1]],
        "mode": source_mode,
        "repeated_frame_count": state.frames,
    }
    manifest.setdefault("states", {})[args.state] = result
    builder.write_manifest(manifest, args.output_dir)

    print(
        f"Installed corrected {args.state} pose for {len(builder.LEADER_ASSET_NAMES)} "
        f"leaders in {args.output_dir}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
