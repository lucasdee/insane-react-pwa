// Copies the API types that insane-node-rest-api generates from its OpenAPI spec
// (its committed generated/api.ts) into this app, so the frontend's types always
// match the backend. Run after the backend's API changes: `npm run types:sync`.
// The source defaults to a sibling checkout; set API_TYPES_SRC to use another file.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(
  process.env.API_TYPES_SRC ?? resolve(root, '../insane-node-rest-api/generated/api.ts'),
);
const target = resolve(root, 'src/api/generated/api.ts');

const header = [
  '// Copied from insane-node-rest-api/generated/api.ts. Do not edit;',
  '// run `npm run types:sync` after the backend API changes.',
  '',
].join('\n');

let content;
try {
  content = readFileSync(source, 'utf8');
} catch {
  console.error(`Cannot read ${source}. Check out insane-node-rest-api next to this repo,`);
  console.error('or point API_TYPES_SRC at its generated/api.ts.');
  process.exit(1);
}

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, header + content.replace(/\r\n/g, '\n'));
console.log(`Copied ${source} -> ${target}`);
