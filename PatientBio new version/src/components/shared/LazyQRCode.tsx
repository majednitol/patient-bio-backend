/**
 * LazyQRCode - Dynamic qrcode.react loader
 * Loads QR code component on-demand
 * Part of Performance Optimization (Phase 2.1)
 */

import React, { Suspense, lazy, useCallback, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

// Lazy load QRCodeSVG
const QRCodeSVG = lazy(() =>
  import('qrcode.react').then((module) => ({ default: module.QRCodeSVG }))
);

// Lazy load QRCodeCanvas for download functionality
const QRCodeCanvas = lazy(() =>
  import('qrcode.react').then((module) => ({ default: module.QRCodeCanvas }))
);

interface QRCodeSkeletonProps {
  size?: number;
  className?: string;
}

const QRCodeSkeleton: React.FC<QRCodeSkeletonProps> = ({
  size = 128,
  className = '',
}) => (
  <Skeleton
    className={`rounded-lg ${className}`}
    style={{ width: size, height: size }}
  />
);

interface ImageSettingsType {
  src: string;
  height: number;
  width: number;
  excavate: boolean;
}

interface LazyQRCodeProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  bgColor?: string;
  fgColor?: string;
  includeMargin?: boolean;
  className?: string;
  imageSettings?: ImageSettingsType;
}

/**
 * LazyQRCode - SVG-based QR code with lazy loading
 */
export const LazyQRCode: React.FC<LazyQRCodeProps> = ({
  value,
  size = 128,
  level = 'M',
  bgColor = '#FFFFFF',
  fgColor = '#000000',
  includeMargin = false,
  className = '',
  imageSettings,
}) => {
  return (
    <Suspense fallback={<QRCodeSkeleton size={size} className={className} />}>
      <QRCodeSVG
        value={value}
        size={size}
        level={level}
        bgColor={bgColor}
        fgColor={fgColor}
        includeMargin={includeMargin}
        className={className}
        imageSettings={imageSettings}
      />
    </Suspense>
  );
};

interface LazyQRCodeWithDownloadProps extends LazyQRCodeProps {
  filename?: string;
  downloadButtonText?: string;
  showDownloadButton?: boolean;
}

/**
 * LazyQRCodeWithDownload - QR code with download capability
 */
export const LazyQRCodeWithDownload: React.FC<LazyQRCodeWithDownloadProps> = ({
  value,
  size = 256,
  level = 'M',
  bgColor = '#FFFFFF',
  fgColor = '#000000',
  includeMargin = true,
  className = '',
  imageSettings,
  filename = 'qrcode',
  downloadButtonText = 'Download QR Code',
  showDownloadButton = true,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);

    try {
      // Small delay to ensure canvas is rendered
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Find the canvas element
      const canvas = document.querySelector(
        `canvas[data-qr-filename="${filename}"]`
      ) as HTMLCanvasElement;

      if (!canvas) {
        throw new Error('QR code canvas not found');
      }

      // Create download link
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download QR code:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [filename]);

  return (
    <div className="flex flex-col items-center gap-4">
      <Suspense
        fallback={<QRCodeSkeleton size={size} className={className} />}
      >
        <div className="relative">
          {/* Hidden canvas for download */}
          <div className="absolute opacity-0 pointer-events-none">
            <QRCodeCanvas
              value={value}
              size={size}
              level={level}
              bgColor={bgColor}
              fgColor={fgColor}
              includeMargin={includeMargin}
              imageSettings={imageSettings}
              data-qr-filename={filename}
            />
          </div>
          {/* Visible SVG */}
          <QRCodeSVG
            value={value}
            size={size}
            level={level}
            bgColor={bgColor}
            fgColor={fgColor}
            includeMargin={includeMargin}
            className={className}
            imageSettings={imageSettings}
          />
        </div>
      </Suspense>

      {showDownloadButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              {downloadButtonText}
            </>
          )}
        </Button>
      )}
    </div>
  );
};

/**
 * useQRCode - Hook for programmatic QR code generation
 */
export function useQRCode() {
  const [isLoading, setIsLoading] = useState(false);

  const generateDataURL = useCallback(
    async (
      value: string,
      options: Partial<LazyQRCodeProps> = {}
    ): Promise<string> => {
      setIsLoading(true);

      try {
        // Dynamically import qrcode.react
        const { QRCodeCanvas } = await import('qrcode.react');

        // Create temporary container
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        document.body.appendChild(container);

        // Render QR code to canvas
        const { createRoot } = await import('react-dom/client');
        const root = createRoot(container);

        await new Promise<void>((resolve) => {
          root.render(
            React.createElement(QRCodeCanvas, {
              value,
              size: options.size || 256,
              level: options.level || 'M',
              bgColor: options.bgColor || '#FFFFFF',
              fgColor: options.fgColor || '#000000',
              includeMargin: options.includeMargin ?? true,
              imageSettings: options.imageSettings,
            })
          );
          setTimeout(resolve, 100);
        });

        // Get data URL
        const canvas = container.querySelector('canvas');
        if (!canvas) {
          throw new Error('Canvas not found');
        }

        const dataURL = canvas.toDataURL('image/png');

        // Cleanup
        root.unmount();
        document.body.removeChild(container);

        return dataURL;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { generateDataURL, isLoading };
}

export { QRCodeSkeleton };
