// Rasterize the brand SVGs to PNG. Usage: npm i sharp && node render.js
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const jobs = [
  ["logo-mark.svg", "mark-dark-512.png", 512],
  ["logo-mark-light.svg", "mark-light-512.png", 512],
  ["logo-mark-tile.svg", "avatar-tile-512.png", 512],
  ["logo-mark-tile.svg", "avatar-tile-1024.png", 1024],
];

async function main() {
  fs.mkdirSync(path.join(__dirname, "png"), { recursive: true });
  for (const [src, out, size] of jobs) {
    await sharp(fs.readFileSync(path.join(__dirname, src)), { density: 400 })
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, "png", out));
    console.log(out);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
