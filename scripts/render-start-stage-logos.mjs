import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = resolve(import.meta.dirname, '..');
const sourcePath = resolve(projectRoot, 'source-art/start-stage-official-logos.svg');
const maskSourcePath = resolve(projectRoot, 'source-art/start-stage-medallion-mask.svg');
const originalStagePath = resolve(projectRoot, 'public/start-stage-clean.png');
const blankMedallionsPath = resolve(projectRoot, 'source-art/start-stage-blank-medallions.png');
const logoLayerPath = resolve(projectRoot, 'public/start-stage-official-logos.png');
const finalStagePath = resolve(projectRoot, 'public/start-stage-s-rose.webp');

const mimeByExtension = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const logoAssets = [
  's-rose.svg',
];

const renderSvg = (svg) => {
  const rendered = spawnSync(
    'rsvg-convert',
    ['--width', '1672', '--height', '941', '--format', 'png', '-'],
    {
      cwd: projectRoot,
      input: svg,
      maxBuffer: 24 * 1024 * 1024,
    },
  );

  if (rendered.status !== 0) {
    throw new Error(rendered.stderr.toString('utf8') || 'Kunde inte rendera SVG-lagret.');
  }

  return rendered.stdout;
};

const runFfmpeg = (args, errorMessage) => {
  const result = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', ...args], {
    cwd: projectRoot,
    maxBuffer: 24 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.toString('utf8') || errorMessage);
  }
};

let selfContainedSvg = readFileSync(sourcePath, 'utf8');

for (const asset of logoAssets) {
  const assetPath = resolve(projectRoot, 'public/party-logos', asset);
  const mimeType = mimeByExtension[extname(asset)];
  if (!mimeType) throw new Error(`Okänt bildformat för ${asset}.`);

  const source = readFileSync(assetPath);
  const renderedSource = asset === 's-rose.svg'
    ? Buffer.from(source.toString('utf8').replaceAll('#ed1b34', '#ffffff'))
    : source;
  const dataUri = `data:${mimeType};base64,${renderedSource.toString('base64')}`;
  selfContainedSvg = selfContainedSvg.replaceAll(
    `../public/party-logos/${asset}`,
    dataUri,
  );
}

const tempDir = mkdtempSync(join(tmpdir(), 'vemsavad-stage-'));
const maskPath = join(tempDir, 'medallion-mask.png');
const compositedPngPath = join(tempDir, 'start-stage-official.png');

try {
  writeFileSync(logoLayerPath, renderSvg(selfContainedSvg));
  writeFileSync(maskPath, renderSvg(readFileSync(maskSourcePath, 'utf8')));

  runFfmpeg(
    [
      '-i', originalStagePath,
      '-i', blankMedallionsPath,
      '-i', maskPath,
      '-i', logoLayerPath,
      '-filter_complex',
      '[2:v]format=gray[mask];[1:v][mask]alphamerge[blank-patches];[0:v][blank-patches]overlay=0:0[clean];[clean][3:v]overlay=0:0',
      '-frames:v', '1',
      compositedPngPath,
    ],
    'Kunde inte montera de rena medaljongytorna och logotyperna.',
  );

  runFfmpeg(
    [
      '-i', compositedPngPath,
      '-frames:v', '1',
      '-c:v', 'libwebp',
      '-quality', '90',
      '-compression_level', '6',
      '-preset', 'picture',
      finalStagePath,
    ],
    'Kunde inte exportera den färdiga WebP-scenen.',
  );
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

console.log(`Renderade ${finalStagePath}`);
