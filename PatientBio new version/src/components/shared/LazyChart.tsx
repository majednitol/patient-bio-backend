/**
 * LazyChart - Dynamic Recharts loader
 * Saves ~150KB from initial bundle by loading Recharts on-demand
 * Part of Performance Optimization (Phase 2.1)
 */

import React, { Suspense, lazy, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load Recharts components
const LazyLineChart = lazy(() =>
  import('recharts').then((module) => ({ default: module.LineChart }))
);

const LazyAreaChart = lazy(() =>
  import('recharts').then((module) => ({ default: module.AreaChart }))
);

const LazyBarChart = lazy(() =>
  import('recharts').then((module) => ({ default: module.BarChart }))
);

const LazyPieChart = lazy(() =>
  import('recharts').then((module) => ({ default: module.PieChart }))
);

const LazyComposedChart = lazy(() =>
  import('recharts').then((module) => ({ default: module.ComposedChart }))
);

// Re-export commonly used chart components for lazy access
export const LazyChartComponents = {
  ResponsiveContainer: lazy(() =>
    import('recharts').then((module) => ({ default: module.ResponsiveContainer }))
  ),
  XAxis: lazy(() =>
    import('recharts').then((module) => ({ default: module.XAxis }))
  ),
  YAxis: lazy(() =>
    import('recharts').then((module) => ({ default: module.YAxis }))
  ),
  Tooltip: lazy(() =>
    import('recharts').then((module) => ({ default: module.Tooltip }))
  ),
  Legend: lazy(() =>
    import('recharts').then((module) => ({ default: module.Legend }))
  ),
  Line: lazy(() =>
    import('recharts').then((module) => ({ default: module.Line }))
  ),
  Area: lazy(() =>
    import('recharts').then((module) => ({ default: module.Area }))
  ),
  Bar: lazy(() =>
    import('recharts').then((module) => ({ default: module.Bar }))
  ),
  Pie: lazy(() =>
    import('recharts').then((module) => ({ default: module.Pie }))
  ),
  Cell: lazy(() =>
    import('recharts').then((module) => ({ default: module.Cell }))
  ),
  CartesianGrid: lazy(() =>
    import('recharts').then((module) => ({ default: module.CartesianGrid }))
  ),
};

// Chart skeleton loader
interface ChartSkeletonProps {
  height?: number | string;
  className?: string;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  height = 300,
  className = '',
}) => (
  <div
    className={`w-full flex flex-col gap-2 ${className}`}
    style={{ height }}
  >
    <div className="flex justify-between items-center px-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-16" />
    </div>
    <div className="flex-1 flex items-end gap-1 px-4 pb-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton
          key={i}
          className="flex-1"
          style={{ height: `${30 + Math.random() * 60}%` }}
        />
      ))}
    </div>
    <div className="flex justify-center gap-4 px-4">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-16" />
    </div>
  </div>
);

// Wrapper component types
type ChartType = 'line' | 'area' | 'bar' | 'pie' | 'composed';

interface LazyChartWrapperProps {
  type: ChartType;
  height?: number | string;
  skeletonClassName?: string;
  children: React.ReactNode;
  chartProps?: Record<string, unknown>;
}

/**
 * LazyChartWrapper - Wraps any chart type with lazy loading
 * Note: Use useRechartsComponents hook for more control over chart rendering
 */
export const LazyChartWrapper: React.FC<LazyChartWrapperProps> = ({
  type,
  height = 300,
  skeletonClassName,
  children,
  chartProps = {},
}) => {
  const { components, isLoading } = useRechartsComponents();

  if (isLoading || !components) {
    return <ChartSkeleton height={height} className={skeletonClassName} />;
  }

  const ChartComponent = (() => {
    switch (type) {
      case 'line':
        return components.LineChart;
      case 'area':
        return components.AreaChart;
      case 'bar':
        return components.BarChart;
      case 'pie':
        return components.PieChart;
      case 'composed':
        return components.ComposedChart;
      default:
        return components.LineChart;
    }
  })();

  return <ChartComponent {...chartProps}>{children}</ChartComponent>;
};

/**
 * useRechartsComponents - Hook to lazily load all Recharts components at once
 * Returns null while loading, components object when ready
 */
export function useRechartsComponents() {
  const [components, setComponents] = React.useState<typeof import('recharts') | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    import('recharts')
      .then((module) => {
        setComponents(module);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load Recharts:', error);
        setIsLoading(false);
      });
  }, []);

  return { components, isLoading };
}

export { LazyLineChart, LazyAreaChart, LazyBarChart, LazyPieChart, LazyComposedChart };
