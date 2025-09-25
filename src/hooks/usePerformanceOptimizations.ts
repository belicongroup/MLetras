import { useEffect, useCallback, useRef, useState } from 'react';
import React from 'react';

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

  // Throttle function for scroll and resize handlers
  const throttle = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }, []);

  // Intersection Observer for lazy loading
  const useIntersectionObserver = useCallback((
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) => {
    const targetRef = useRef<HTMLElement>(null);

    useEffect(() => {
      const target = targetRef.current;
      if (!target) return;

      const observer = new IntersectionObserver(callback, {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      });

      observer.observe(target);

      return () => {
        observer.unobserve(target);
      };
    }, [callback, options]);

    return targetRef;
  }, []);

  // Memory-efficient event listener cleanup
  const useEventListener = useCallback((
    eventName: string,
    handler: EventListener,
    element: EventTarget = window,
    options?: AddEventListenerOptions
  ) => {
    useEffect(() => {
      element.addEventListener(eventName, handler, options);
      return () => element.removeEventListener(eventName, handler, options);
    }, [eventName, handler, element, options]);
  }, []);

  // Optimized resize handler
  const useOptimizedResize = useCallback((
    callback: (width: number, height: number) => void,
    delay: number = 100
  ) => {
    const throttledCallback = throttle(callback, delay);
    
    useEventListener('resize', () => {
      throttledCallback(window.innerWidth, window.innerHeight);
    });
  }, [throttle, useEventListener]);

  return {
    debounce,
    throttle,
    useIntersectionObserver,
    useEventListener,
    useOptimizedResize,
  };
}

// Hook for optimizing API calls
export function useApiOptimizations() {
  // Request deduplication
  const requestCache = useRef<Map<string, Promise<any>>>(new Map());

  const deduplicateRequest = useCallback(async <T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> => {
    // Return existing promise if request is already in flight
    if (requestCache.current.has(key)) {
      return requestCache.current.get(key)!;
    }

    // Create new request and cache it
    const promise = requestFn().finally(() => {
      // Remove from cache when request completes
      requestCache.current.delete(key);
    });

    requestCache.current.set(key, promise);
    return promise;
  }, []);

  // Abort controller for cancelling requests
  const useAbortController = useCallback(() => {
    const abortControllerRef = useRef<AbortController | null>(null);

    const createController = () => {
      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      return abortControllerRef.current;
    };

    const cleanup = () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };

    useEffect(() => {
      return cleanup;
    }, []);

    return { createController, cleanup };
  }, []);

  return {
    deduplicateRequest,
    useAbortController,
  };
}

// Hook for optimizing list rendering
export function useListOptimizations() {
  // Virtual scrolling helper
  const useVirtualScrolling = useCallback((
    itemHeight: number,
    containerHeight: number,
    itemCount: number
  ) => {
    const [scrollTop, setScrollTop] = useState(0);
    
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      itemCount
    );
    
    const visibleItems = Array.from(
      { length: endIndex - startIndex },
      (_, i) => startIndex + i
    );

    const totalHeight = itemCount * itemHeight;
    const offsetY = startIndex * itemHeight;

    return {
      visibleItems,
      totalHeight,
      offsetY,
      setScrollTop,
    };
  }, []);

  // Memoized list item component factory
  const createMemoizedListItem = useCallback(<T>(
    ItemComponent: React.ComponentType<{ item: T; index: number }>,
    getItemKey: (item: T, index: number) => string | number
  ) => {
    return React.memo<{ item: T; index: number }>(
      ({ item, index }) => {
        return React.createElement(ItemComponent, { item, index });
      },
      (prevProps, nextProps) => {
        return (
          prevProps.item === nextProps.item &&
          prevProps.index === nextProps.index
        );
      }
    );
  }, []);

  return {
    useVirtualScrolling,
    createMemoizedListItem,
  };
}

// Hook for optimizing images
export function useImageOptimizations() {
  // Lazy loading with intersection observer
  const useLazyImage = useCallback((
    src: string,
    placeholder?: string
  ) => {
    const [imageSrc, setImageSrc] = useState(placeholder || '');
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    const { useIntersectionObserver } = usePerformanceOptimizations();
    
    useIntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.1 }
    )(imgRef);

    useEffect(() => {
      if (isInView && src) {
        const img = new Image();
        img.onload = () => {
          setImageSrc(src);
          setIsLoaded(true);
        };
        img.onerror = () => {
          // Fallback to placeholder on error
          setImageSrc(placeholder || '');
        };
        img.src = src;
      }
    }, [isInView, src, placeholder]);

    return {
      ref: imgRef,
      src: imageSrc,
      isLoaded,
      isInView,
    };
  }, []);

  // Image preloading
  const preloadImages = useCallback((urls: string[]) => {
    const promises = urls.map(url => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
    });

    return Promise.all(promises);
  }, []);

  return {
    useLazyImage,
    preloadImages,
  };
}
