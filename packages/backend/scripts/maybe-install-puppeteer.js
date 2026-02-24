/**
 * Instala o browser do Puppeteer apenas quando necessário.
 * Pula a instalação quando:
 *   - PUPPETEER_SKIP_DOWNLOAD=true (set no render.yaml)
 *   - PDF_MOCK=true (não precisa de browser real)
 */
const { execSync } = require('child_process');

const skip =
  process.env.PUPPETEER_SKIP_DOWNLOAD === 'true' ||
  process.env.PDF_MOCK === 'true';

if (skip) {
  console.log('[maybe-install-puppeteer] Skipping browser download (PUPPETEER_SKIP_DOWNLOAD=%s, PDF_MOCK=%s)',
    process.env.PUPPETEER_SKIP_DOWNLOAD || 'unset',
    process.env.PDF_MOCK || 'unset');
  process.exit(0);
}

console.log('[maybe-install-puppeteer] Installing Chrome browser...');
try {
  execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
} catch (err) {
  console.error('[maybe-install-puppeteer] Failed to install Chrome:', err.message);
  // Não falhar o build — PDF_MOCK pode ser ativado depois
  process.exit(0);
}
