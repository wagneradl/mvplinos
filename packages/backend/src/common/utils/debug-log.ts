export function debugLog(namespace: string, ...args: unknown[]) {
  // Gate único: DEBUG=1 para qualquer log
  if (process.env.DEBUG === '1') {
    // eslint-disable-next-line no-console
    console.log(`[${namespace}]`, ...args);
  }
}

// Opcional: exportar estado para outros usos se necessário
export const debugEnabled = process.env.DEBUG === '1';
