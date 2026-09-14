import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const root = join(process.cwd(), 'dist', 'generated', 'prisma');

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
      continue;
    }
    if (extname(entry.name) !== '.js') continue;
    const source = await readFile(path, 'utf8');
    const fixed = source.replace(/(from\s+['"]|import\(\s*['"])(\.\.?\/[^'"]+)(['"]\s*\)?)/g, (match, prefix, specifier, suffix) => {
      return /\.[cm]?[jt]sx?$/.test(specifier) ? match : `${prefix}${specifier}.js${suffix}`;
    });
    if (fixed !== source) await writeFile(path, fixed);
  }
}

await visit(root);
