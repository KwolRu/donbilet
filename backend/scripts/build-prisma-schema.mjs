import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const partsDir = join(process.cwd(), 'prisma', 'schema-parts');
const outputFile = join(process.cwd(), 'prisma', 'schema.prisma');

const partFiles = readdirSync(partsDir)
  .filter((name) => name.endsWith('.prisma'))
  .sort((a, b) => a.localeCompare(b));

if (partFiles.length === 0) {
  throw new Error('No Prisma schema parts found in prisma/schema-parts');
}

const rendered = partFiles
  .map((fileName) => {
    const content = readFileSync(join(partsDir, fileName), 'utf8').trim();
    return `// ---- ${fileName} ----\n${content}`;
  })
  .join('\n\n');

writeFileSync(outputFile, `${rendered}\n`, 'utf8');
console.log(`Built prisma/schema.prisma from ${partFiles.length} part files.`);
