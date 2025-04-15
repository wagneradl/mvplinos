const { mkdirSync, copyFileSync, existsSync } = require('fs');
const { join, dirname } = require('path');

const src = join(__dirname, '../src/assets/static/logo.png');

let dest;
const uploadsEnv = process.env.UPLOADS_PATH;

if (uploadsEnv && uploadsEnv.startsWith('/var/data')) {
  // Render não permite escrita em /var/data, redireciona para uploads/static local
  dest = join(process.cwd(), 'uploads', 'static', 'logo.png');
  console.log('[copy-logo] UPLOADS_PATH aponta para /var/data. Redirecionando logo para uploads/static local:', dest);
} else if (uploadsEnv) {
  dest = join(uploadsEnv, 'static', 'logo.png');
} else {
  dest = join(process.cwd(), 'uploads', 'static', 'logo.png');
}

mkdirSync(dirname(dest), { recursive: true });

if (!existsSync(dest)) {
  copyFileSync(src, dest);
  console.log(`Logo copiada para: ${dest}`);
} else {
  console.log(`Logo já existe em: ${dest}`);
}
