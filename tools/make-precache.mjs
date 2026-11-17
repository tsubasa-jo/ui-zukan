import { readdir, writeFile } from 'node:fs/promises';

const site = new URL('../site/', import.meta.url);
const files = ['./'];

async function collect(directory, prefix = './') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory()) await collect(new URL(`${entry.name}/`, directory), `${path}/`);
    else if (entry.isFile() && !['./sw.js', './precache.json'].includes(path)) files.push(path);
  }
}

await collect(site);
files.sort();
await writeFile(new URL('./precache.json', site), `${JSON.stringify({ files }, null, 2)}\n`);
console.log(`precache.json に ${files.length} 件のパスを書き出しました。`);
