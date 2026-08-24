import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const contentDirectory = join(scriptsDirectory, '..', 'content');
const baseFile = join(contentDirectory, 'quotes.json');
const batchDirectory = join(contentDirectory, 'quote-batches');

export function quoteFiles() {
  const batches = existsSync(batchDirectory)
    ? readdirSync(batchDirectory)
        .filter((name) => name.endsWith('.json'))
        .sort((left, right) => left.localeCompare(right, 'sv'))
        .map((name) => join(batchDirectory, name))
    : [];

  return [baseFile, ...batches];
}

export function loadQuotes() {
  return quoteFiles().flatMap((file) => JSON.parse(readFileSync(file, 'utf8')));
}
