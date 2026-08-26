import { readFileSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = resolve(import.meta.dirname, '..');
const sourcePath = resolve(projectRoot, 'source-art/start-stage-official-logos.svg');
const outputPath = resolve(projectRoot, 'public/start-stage-official-logos.png');

const mimeByExtension = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const logoAssets = [
  's-rose.svg',
  'm.webp',
  'sd.png',
  'v.svg',
  'c.png',
  'kd.svg',
  'l.svg',
  'mp.svg',
];

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

const rendered = spawnSync(
  'rsvg-convert',
  ['--width', '1672', '--height', '941', '--format', 'png', '-'],
  {
    cwd: projectRoot,
    input: selfContainedSvg,
    maxBuffer: 24 * 1024 * 1024,
  },
);

if (rendered.status !== 0) {
  throw new Error(rendered.stderr.toString('utf8') || 'Kunde inte rendera logolagret.');
}

writeFileSync(outputPath, rendered.stdout);
console.log(`Renderade ${outputPath}`);
