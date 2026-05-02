import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useResearcherProfile } from "@/hooks/useResearcherProfile";
import { useAuth } from "@/contexts/AuthContext";
import { QRCodeSVG } from "qrcode.react";
import { Download, Copy, FlaskConical } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ResearcherQRCodePage = () => {
  const { user } = useAuth();
  const { profile } = useResearcherProfile();

  const researcherId = user?.id || "";
  const qrData = JSON.stringify({
    type: "researcher",
    id: researcherId,
    name: profile?.full_name,
    institution: profile?.institution_name,
  });

  const handleDownload = () => {
    const svg = document.getElementById("researcher-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `researcher-qr-${profile?.full_name?.replace(/\s+/g, "-") || "code"}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));

    toast({
      title: "QR Code Downloaded",
      description: "Share this with doctors who want to send you research data.",
    });
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(researcherId);
    toast({
      title: "Researcher ID Copied",
      description: "Share this ID with doctors to receive research data.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Your QR Code</h1>
        <p className="text-muted-foreground">
          Doctors can scan this to share patient data for research
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Researcher QR Code</CardTitle>
            <CardDescription>
              Share this with doctors to receive research data
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            <div className="p-4 bg-white rounded-xl shadow-lg">
              <QRCodeSVG
                id="researcher-qr-code"
                value={qrData}
                size={200}
                level="H"
                includeMargin
                fgColor="#ea580c"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleDownload} className="bg-orange-600 hover:bg-orange-700">
                <Download className="h-4 w-4 mr-2" />
                Download PNG
              </Button>
              <Button variant="outline" onClick={handleCopyId}>
                <Copy className="h-4 w-4 mr-2" />
                Copy ID
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>Steps for doctors to share research data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Doctor Scans Your QR</p>
                <p className="text-sm text-muted-foreground">
                  Using their portal, doctors scan your QR code
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Doctor Shares Patient Data</p>
                <p className="text-sm text-muted-foreground">
                  They select patient data to share for research purposes
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-medium">
                3
              </div>
              <div>
                <p className="font-medium">You Receive the Data</p>
                <p className="text-sm text-muted-foreground">
                  Data appears in your Research Data section (usually anonymized)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-medium">
                4
              </div>
              <div>
                <p className="font-medium">Conduct Your Research</p>
                <p className="text-sm text-muted-foreground">
                  Review, analyze, and mark data as complete when done
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FlaskConical className="h-4 w-4" />
                <span>Your Researcher ID: <code className="bg-muted px-1 rounded">{researcherId.slice(0, 8)}...</code></span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResearcherQRCodePage;
