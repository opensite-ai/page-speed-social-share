import { gzipSync } from "node:zlib";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const files = [
  "dist/index.js",
  "dist/index.cjs",
  "dist/core/index.js",
  "dist/hooks/index.js",
  "dist/types/index.js",
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} KB`;
}

let foundAny = false;

for (const relativeFile of files) {
  const absoluteFile = path.resolve(process.cwd(), relativeFile);
  if (!existsSync(absoluteFile)) {
    continue;
  }

  foundAny = true;
  const content = readFileSync(absoluteFile);
  const gzipped = gzipSync(content);

  console.log(
    `${relativeFile} -> raw ${formatBytes(content.length)}, gzip ${formatBytes(gzipped.length)}`,
  );
}

if (!foundAny) {
  console.warn("No build artifacts were found. Run `pnpm build` first.");
}
