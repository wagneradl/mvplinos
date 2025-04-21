import { useState, useEffect } from 'react';

/**
 * Hook para debounce de valores
 * @param value Valor a ser debounced
 * @param delay Tempo de espera em milissegundos (padrão: 500ms)
 * @returns Valor após o debounce
 */
export function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Configura o timer para atualizar o valor após o delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpa o timer se o valor mudar antes do delay
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
