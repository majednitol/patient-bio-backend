/**
 * Memoization utilities for optimizing component re-renders
 * Part of the Code Quality Optimization (Phase 1.1)
 */

import { useCallback, useMemo, useRef } from 'react';

/**
 * Deep comparison for objects - useful for React.memo comparisons
 */
export function deepEqual<T>(objA: T, objB: T): boolean {
  if (objA === objB) return true;
  
  if (
    typeof objA !== 'object' ||
    typeof objB !== 'object' ||
    objA === null ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA as object);
  const keysB = Object.keys(objB as object);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual((objA as Record<string, unknown>)[key], (objB as Record<string, unknown>)[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Shallow comparison for arrays - faster than deep comparison
 */
export function shallowArrayEqual<T>(arrA: T[], arrB: T[]): boolean {
  if (arrA === arrB) return true;
  if (arrA.length !== arrB.length) return false;
  
  for (let i = 0; i < arrA.length; i++) {
    if (arrA[i] !== arrB[i]) return false;
  }
  
  return true;
}

/**
 * Creates a comparison function for React.memo that checks specific keys
 */
export function createPropsComparator<P extends object>(
  keys: (keyof P)[]
): (prevProps: P, nextProps: P) => boolean {
  return (prevProps: P, nextProps: P): boolean => {
    for (const key of keys) {
      if (prevProps[key] !== nextProps[key]) {
        return false;
      }
    }
    return true;
  };
}

/**
 * Creates a comparison function that uses deep equality for specified keys
 */
export function createDeepPropsComparator<P extends object>(
  shallowKeys: (keyof P)[],
  deepKeys: (keyof P)[]
): (prevProps: P, nextProps: P) => boolean {
  return (prevProps: P, nextProps: P): boolean => {
    // Shallow compare specified keys
    for (const key of shallowKeys) {
      if (prevProps[key] !== nextProps[key]) {
        return false;
      }
    }
    
    // Deep compare specified keys
    for (const key of deepKeys) {
      if (!deepEqual(prevProps[key], nextProps[key])) {
        return false;
      }
    }
    
    return true;
  };
}

/**
 * Hook for memoizing expensive computations with deep comparison
 */
export function useDeepMemo<T, D>(factory: () => T, deps: D): T {
  const ref = useRef<{ deps: D; value: T } | undefined>(undefined);

  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = { deps, value: factory() };
  }

  return ref.current.value;
}

/**
 * Hook for memoizing callbacks with deep comparison of dependencies
 */
export function useDeepCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: unknown[]
): T {
  const ref = useRef<{ deps: unknown[]; callback: T } | undefined>(undefined);

  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = { deps, callback };
  }

  return ref.current.callback;
}

/**
 * Memoize filtered/sorted data for tables and lists
 */
export function useMemoizedFilter<T>(
  data: T[],
  filterFn: (item: T) => boolean,
  deps: unknown[] = []
): T[] {
  return useMemo(() => {
    return data.filter(filterFn);
  }, [data, ...deps]);
}

/**
 * Memoize sorted data
 */
export function useMemoizedSort<T>(
  data: T[],
  compareFn: (a: T, b: T) => number,
  deps: unknown[] = []
): T[] {
  return useMemo(() => {
    return [...data].sort(compareFn);
  }, [data, ...deps]);
}

/**
 * Memoize filtered and sorted data together
 */
export function useMemoizedFilterSort<T>(
  data: T[],
  filterFn: (item: T) => boolean,
  compareFn: (a: T, b: T) => number,
  deps: unknown[] = []
): T[] {
  return useMemo(() => {
    return data.filter(filterFn).sort(compareFn);
  }, [data, ...deps]);
}

/**
 * Memoize grouped data for access logs, etc.
 */
export function useMemoizedGroupBy<T, K extends string | number>(
  data: T[],
  keyFn: (item: T) => K,
  deps: unknown[] = []
): Record<K, T[]> {
  return useMemo(() => {
    return data.reduce((acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<K, T[]>);
  }, [data, ...deps]);
}

/**
 * Creates a stable callback reference that always calls the latest version
 * Useful for event handlers that shouldn't trigger re-renders
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * Memoize chart data calculations
 */
export function useMemoizedChartData<T, R>(
  data: T[],
  transformer: (data: T[]) => R,
  deps: unknown[] = []
): R {
  return useMemo(() => {
    return transformer(data);
  }, [data, ...deps]);
}

/**
 * Comparison function for health record objects
 */
export function healthRecordPropsEqual(
  prevProps: { records?: unknown[]; isLoading?: boolean },
  nextProps: { records?: unknown[]; isLoading?: boolean }
): boolean {
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.records === nextProps.records) return true;
  if (!prevProps.records || !nextProps.records) return false;
  if (prevProps.records.length !== nextProps.records.length) return false;
  
  // Compare by ID for performance
  return shallowArrayEqual(
    prevProps.records.map((r: unknown) => (r as { id?: string })?.id),
    nextProps.records.map((r: unknown) => (r as { id?: string })?.id)
  );
}

/**
 * Comparison function for timeline components
 */
export function timelinePropsEqual(
  prevProps: { entries?: unknown[]; expanded?: boolean },
  nextProps: { entries?: unknown[]; expanded?: boolean }
): boolean {
  if (prevProps.expanded !== nextProps.expanded) return false;
  if (prevProps.entries === nextProps.entries) return true;
  if (!prevProps.entries || !nextProps.entries) return false;
  
  return prevProps.entries.length === nextProps.entries.length;
}
