import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, SwitchCamera, Loader2 } from "lucide-react";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

// Dynamic import for html5-qrcode
const loadQRScanner = async () => {
  const { Html5Qrcode, Html5QrcodeScannerState } = await import("html5-qrcode");
  return { Html5Qrcode, Html5QrcodeScannerState };
};

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const Html5QrcodeScannerStateRef = useRef<any>(null);

  useEffect(() => {
    // Get available cameras on mount
    loadQRScanner()
      .then(({ Html5Qrcode, Html5QrcodeScannerState }) => {
        Html5QrcodeScannerStateRef.current = Html5QrcodeScannerState;
        return Html5Qrcode.getCameras();
      })
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera
          const backCameraIndex = devices.findIndex(
            (d) => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("rear")
          );
          if (backCameraIndex >= 0) {
            setCurrentCameraIndex(backCameraIndex);
          }
        }
      })
      .catch((err) => {
        console.error("Error getting cameras:", err);
        setError("Could not access camera. Please grant camera permissions.");
      });

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    if (!cameras.length) {
      setError("No cameras found on this device.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { Html5Qrcode, Html5QrcodeScannerState } = await loadQRScanner();
      Html5QrcodeScannerStateRef.current = Html5QrcodeScannerState;
      
      const scanner = new Html5Qrcode("qr-scanner-container");
      scannerRef.current = scanner;

      await scanner.start(
        cameras[currentCameraIndex].id,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          // Ignore continuous scanning errors
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error("Error starting scanner:", err);
      setError("Failed to start camera. Please try again.");
      onError?.("Failed to start camera");
    } finally {
      setIsLoading(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && Html5QrcodeScannerStateRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerStateRef.current.SCANNING) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;

    await stopScanning();
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);

    // Restart with new camera after a short delay
    setTimeout(() => {
      startScanning();
    }, 300);
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="relative">
          {/* Scanner container */}
          <div
            id="qr-scanner-container"
            ref={containerRef}
            className={`w-full aspect-square bg-muted ${isScanning ? "" : "hidden"}`}
          />

          {/* Placeholder when not scanning */}
          {!isScanning && (
            <div className="w-full aspect-square bg-muted flex flex-col items-center justify-center p-6">
              <Camera className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-center text-sm mb-4">
                Scan a QR code to connect
              </p>
              {error && (
                <p className="text-destructive text-center text-sm mb-4">{error}</p>
              )}
              <Button
                onClick={startScanning}
                disabled={isLoading || cameras.length === 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Start Scanner
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Controls overlay when scanning */}
          {isScanning && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
              <Button variant="secondary" size="sm" onClick={stopScanning}>
                <CameraOff className="h-4 w-4 mr-2" />
                Stop
              </Button>
              {cameras.length > 1 && (
                <Button variant="secondary" size="sm" onClick={switchCamera}>
                  <SwitchCamera className="h-4 w-4 mr-2" />
                  Switch
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
