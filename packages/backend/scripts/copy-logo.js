const { mkdirSync, copyFileSync, existsSync } = require('fs');
const { join, dirname } = require('path');

const src = join(__dirname, '../src/assets/static/logo.png');
const dest = process.env.UPLOADS_PATH
  ? join(process.env.UPLOADS_PATH, 'static', 'logo.png')
  : join(process.cwd(), 'uploads', 'static', 'logo.png');

mkdirSync(dirname(dest), { recursive: true });

if (!existsSync(dest)) {
  copyFileSync(src, dest);
  console.log(`Logo copiada para: ${dest}`);
} else {
  console.log(`Logo já existe em: ${dest}`);
}
