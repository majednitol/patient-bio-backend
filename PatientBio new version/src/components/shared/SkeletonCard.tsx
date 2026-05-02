/**
 * SkeletonCard - Reusable skeleton screen for dashboard cards
 * Part of Performance Optimization (Phase 2.2)
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
  variant?: 'default' | 'compact' | 'detailed' | 'stat' | 'chart' | 'list';
  lines?: number;
  showHeader?: boolean;
  showFooter?: boolean;
  showIcon?: boolean;
}

/**
 * SkeletonCard - Versatile skeleton loader for various card layouts
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  className,
  variant = 'default',
  lines = 3,
  showHeader = true,
  showFooter = false,
  showIcon = false,
}) => {
  const renderContent = () => {
    switch (variant) {
      case 'stat':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              {showIcon && <Skeleton className="h-8 w-8 rounded-full" />}
            </div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        );

      case 'chart':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-md" />
              </div>
            </div>
            <div className="flex items-end gap-1 h-40">
              {Array.from({ length: 12 }).map((_, i) => {
                // Deterministic pseudo-random heights for consistent rendering
                const heights = [45, 72, 58, 33, 85, 40, 67, 52, 90, 28, 75, 60];
                return (
                  <Skeleton
                    key={i}
                    className="flex-1 rounded-t"
                    style={{ height: `${heights[i]}%` }}
                  />
                );
              })}
            </div>
            <div className="flex justify-center gap-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        );

      case 'list':
        return (
          <div className="space-y-3">
            {Array.from({ length: lines }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        );

      case 'compact':
        return (
          <div className="flex items-center gap-3">
            {showIcon && <Skeleton className="h-8 w-8 rounded" />}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        );

      case 'detailed':
        return (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              {showIcon && <Skeleton className="h-16 w-16 rounded-lg shrink-0" />}
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-3"
                  style={{ width: `${100 - i * 15}%` }}
                />
              ))}
            </div>
            {showFooter && (
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-3">
            {Array.from({ length: lines }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-4"
                style={{ width: `${100 - i * 10}%` }}
              />
            ))}
          </div>
        );
    }
  };

  return (
    <Card className={cn('animate-pulse', className)}>
      {showHeader && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            {showIcon && variant !== 'stat' && (
              <Skeleton className="h-5 w-5 rounded" />
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className={!showHeader ? 'pt-6' : ''}>
        {renderContent()}
      </CardContent>
    </Card>
  );
};

/**
 * SkeletonGrid - Multiple skeleton cards in a grid layout
 */
interface SkeletonGridProps {
  count?: number;
  columns?: 1 | 2 | 3 | 4;
  variant?: SkeletonCardProps['variant'];
  className?: string;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({
  count = 4,
  columns = 2,
  variant = 'default',
  className,
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  );
};

/**
 * SkeletonTable - Skeleton loader for tables
 */
interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  className,
}) => {
  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="flex gap-4 p-4 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b last:border-0">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className="h-4 flex-1"
              style={{ opacity: 1 - rowIndex * 0.1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * SkeletonTimeline - Skeleton loader for timeline views
 */
interface SkeletonTimelineProps {
  items?: number;
  className?: string;
}

export const SkeletonTimeline: React.FC<SkeletonTimelineProps> = ({
  items = 4,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <Skeleton className="h-3 w-3 rounded-full" />
            {i < items - 1 && <Skeleton className="w-0.5 flex-1 mt-2" />}
          </div>
          <div className="flex-1 pb-4 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonCard;
