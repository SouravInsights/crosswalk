const sharp = require('sharp');
const fs = require('fs');

async function main() {
  fs.mkdirSync('png', { recursive: true });
  for (const [src, out] of [
    ['wordmark-light-on-dark.svg', 'wordmark-light-on-dark-1024.png'],
    ['wordmark-dark-on-light.svg', 'wordmark-dark-on-light-1024.png'],
  ]) {
    await sharp(fs.readFileSync(src), { density: 400 }).resize(1024).png().toFile('png/' + out);
    console.log(out);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
