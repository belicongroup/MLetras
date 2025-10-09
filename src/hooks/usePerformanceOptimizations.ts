import { useCallback } from 'react';

// Hook for optimizing component performance
export function usePerformanceOptimizations() {
  // Debounce function for search and input handlers
  const debounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }, []);

  return {
    debounce,
  };
}
