import React, { useState, useEffect, useRef, useCallback } from "react";

interface VirtualListProps<T> {
  items: T[];
  batchSize?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  loadingIndicator?: React.ReactNode;
}

/**
 * Lightweight batch-rendering list using IntersectionObserver.
 * Renders items in batches as the user scrolls down.
 */
export function VirtualList<T>({
  items,
  batchSize = 20,
  renderItem,
  className,
  loadingIndicator,
}: VirtualListProps<T>) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
  }, [batchSize, items.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // Reset visible count when items change significantly
  useEffect(() => {
    setVisibleCount(batchSize);
  }, [items.length, batchSize]);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return (
    <div className={className}>
      {visibleItems.map((item, index) => (
        <React.Fragment key={index}>{renderItem(item, index)}</React.Fragment>
      ))}
      {hasMore && (
        <div ref={sentinelRef} className="py-4 flex justify-center">
          {loadingIndicator || (
            <p className="text-xs text-muted-foreground">Loading more...</p>
          )}
        </div>
      )}
    </div>
  );
}
