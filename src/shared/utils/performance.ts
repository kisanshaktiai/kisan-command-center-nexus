
import { memo, useMemo, useCallback } from 'react';

// Memoization utilities
export const createMemoizedComponent = <P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  return memo(Component, propsAreEqual);
};

// Performance monitoring
export const performanceMonitor = {
  mark: (name: string) => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  },
  
  measure: (name: string, startMark: string, endMark?: string) => {
    if (typeof performance !== 'undefined' && performance.measure) {
      performance.measure(name, startMark, endMark);
    }
  },
  
  getEntries: (name?: string) => {
    if (typeof performance !== 'undefined' && performance.getEntriesByName) {
      return name ? performance.getEntriesByName(name) : performance.getEntries();
    }
    return [];
  }
};

// Debounce utility for performance
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  return useCallback(
    (...args: Parameters<T>) => {
      const timeoutId = setTimeout(() => callback(...args), delay);
      return () => clearTimeout(timeoutId);
    },
    [callback, delay]
  ) as T;
};

// Memoized value with dependency comparison
export const useMemoizedValue = <T>(
  factory: () => T,
  deps: React.DependencyList,
  isEqual?: (prev: T, next: T) => boolean
): T => {
  return useMemo(() => {
    const value = factory();
    return value;
  }, deps);
};
