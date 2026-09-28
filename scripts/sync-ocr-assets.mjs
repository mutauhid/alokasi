import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const target = resolve("public", "ocr");
const core = resolve("node_modules", "tesseract.js-core");

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await copyFile(
  resolve("node_modules", "tesseract.js", "dist", "worker.min.js"),
  resolve(target, "worker.min.js"),
);
await copyFile(
  resolve(
    "node_modules",
    "@tesseract.js-data",
    "eng",
    "4.0.0",
    "eng.traineddata.gz",
  ),
  resolve(target, "eng.traineddata.gz"),
);
for (const name of await readdir(core)) {
  if (/^tesseract-core.*\.(?:js|wasm)$/u.test(name)) {
    await copyFile(resolve(core, name), resolve(target, name));
  }
}
await copyFile(
  resolve(core, "LICENSE"),
  resolve(target, "LICENSE.tesseract-core"),
);

console.log("Aset OCR lokal disinkronkan ke public/ocr.");
