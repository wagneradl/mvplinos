// Script para copiar assets estáticos do src para dist após o build
const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(child => {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

const srcAssets = path.join(__dirname, 'src', 'assets');
const destAssets = path.join(__dirname, 'dist', 'assets');
copyRecursiveSync(srcAssets, destAssets);
console.log(`[copy-assets] Copiados assets de ${srcAssets} para ${destAssets}`);
