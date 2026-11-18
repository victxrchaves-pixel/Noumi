// Captura cada concepto en escritorio (1440x900) y móvil (390x844) y lo guarda como webp en prototipo/img/webs/.
// Uso: node design/conceptos/shoot.js [nombre ...]
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const dir = __dirname;
const out = path.join(dir, '..', '..', 'prototipo', 'img', 'webs');
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['alma', 'brisa', 'norte', 'forma'];

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  for (const n of names) {
    for (const [tag, vp, scale] of [['desk', { width: 1440, height: 900 }, 1], ['mob', { width: 390, height: 844 }, 2]]) {
      const p = await b.newPage({ viewport: vp, deviceScaleFactor: scale });
      await p.goto('file://' + path.join(dir, n + '.html'));
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(300);
      const png = path.join(out, `${n}-${tag}.png`);
      await p.screenshot({ path: png });
      await p.close();
      const webp = png.replace(/\.png$/, '.webp');
      const w = tag === 'desk' ? 1440 : 560;
      execFileSync('python3', ['-I', '-c',
        `from PIL import Image;im=Image.open(${JSON.stringify(png)}).convert('RGB');im=im.resize((${w},round(im.height*${w}/im.width)),Image.LANCZOS);im.save(${JSON.stringify(webp)},'WEBP',quality=80,method=6)`]);
      fs.unlinkSync(png);
      console.log(webp, fs.statSync(webp).size);
    }
  }
  await b.close();
})();
