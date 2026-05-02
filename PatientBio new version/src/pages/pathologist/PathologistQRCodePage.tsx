import { useAuth } from "@/contexts/AuthContext";
import { usePathologistProfile } from "@/hooks/usePathologistProfile";
import { useDoctorPathologistShares } from "@/hooks/useDoctorPathologistShares";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Download, Share2, Copy, Check, Microscope, Printer, Link2, Users, CalendarDays, UserCheck } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const PathologistQRCodePage = () => {
  const { user } = useAuth();
  const { profile } = usePathologistProfile();
  const { receivedShares } = useDoctorPathologistShares();
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const referralLink = `${window.location.origin}/connect/pathologist/${user?.id}`;

  const qrData = JSON.stringify({
    type: "pathologist",
    id: user?.id,
    name: profile?.full_name,
    lab: profile?.lab_name,
    specialization: profile?.specialization_area,
    referralLink,
  });

  // Connection stats
  const connectionStats = useMemo(() => {
    const uniqueDoctors = new Set(receivedShares.map((s) => s.doctor_id));
    const now = new Date();
    const thisMonth = receivedShares.filter((s) => {
      const d = new Date(s.shared_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const thisMonthDoctors = new Set(thisMonth.map((s) => s.doctor_id));

    // Last connected doctor
    const sorted = [...receivedShares].sort(
      (a, b) => new Date(b.shared_at).getTime() - new Date(a.shared_at).getTime()
    );
    const lastDoctor = sorted.length > 0
      ? { id: sorted[0].doctor_id, date: sorted[0].shared_at }
      : null;

    return {
      total: uniqueDoctors.size,
      thisMonth: thisMonthDoctors.size,
      lastDoctor,
    };
  }, [receivedShares]);

  const handleDownload = () => {
    const svg = document.getElementById("pathologist-qr-code");
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
      downloadLink.download = `pathologist-qr-${profile?.full_name || "code"}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(user?.id || "");
    setCopied(true);
    toast({ title: "Diagnostic Center ID copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    toast({ title: "Referral link copied to clipboard" });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.full_name} - Diagnostic Center`,
          text: `Connect with ${profile?.full_name} at ${profile?.lab_name}. Use this link to connect:`,
          url: referralLink,
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svgEl = document.getElementById("pathologist-qr-code");
    const svgHTML = svgEl ? new XMLSerializer().serializeToString(svgEl) : "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Card - ${profile?.full_name || "Diagnostic Center"}</title>
        <meta http-equiv="Content-Security-Policy" content="script-src 'none'">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; justify-content: center; padding: 20mm; }
          .card { border: 2px solid #0d9488; border-radius: 16px; padding: 32px; max-width: 360px; text-align: center; }
          .logo { font-size: 14px; color: #0d9488; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
          .name { font-size: 22px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
          .lab { font-size: 14px; color: #555; margin-bottom: 4px; }
          .spec { font-size: 12px; color: #888; margin-bottom: 20px; }
          .qr { margin: 0 auto 20px; }
          .address { font-size: 11px; color: #888; line-height: 1.5; border-top: 1px solid #e5e5e5; padding-top: 16px; margin-top: 8px; }
          .scan-text { font-size: 12px; color: #0d9488; font-weight: 500; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">🔬 Diagnostic Center</div>
          <div class="name">${profile?.full_name || "Diagnostic Center"}</div>
          <div class="lab">${profile?.lab_name || ""}</div>
          ${profile?.specialization_area ? `<div class="spec">${profile.specialization_area}</div>` : '<div class="spec">&nbsp;</div>'}
          <div class="qr">${svgHTML}</div>
          <div class="scan-text">Scan to connect & refer patients</div>
          ${profile?.lab_address ? `<div class="address">${profile.lab_address}</div>` : ""}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">My QR Code</h1>
        <p className="text-muted-foreground">
          Share this code with doctors to receive patient referrals seamlessly
        </p>
      </div>

      {/* Connection Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="diagnostic-stat-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--diagnostic-primary)/0.1)]">
              <Users className="h-4 w-4 text-[hsl(var(--diagnostic-primary))]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Connections</p>
              <p className="text-lg font-bold">{connectionStats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="diagnostic-stat-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--diagnostic-accent)/0.1)]">
              <CalendarDays className="h-4 w-4 text-[hsl(var(--diagnostic-accent))]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-lg font-bold">{connectionStats.thisMonth}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="diagnostic-stat-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--diagnostic-primary)/0.1)]">
              <UserCheck className="h-4 w-4 text-[hsl(var(--diagnostic-primary))]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Connected</p>
              <p className="text-sm font-medium truncate">
                {connectionStats.lastDoctor
                  ? formatDistanceToNow(new Date(connectionStats.lastDoctor.date), { addSuffix: true })
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Code Card */}
      <Card className="diagnostic-card overflow-hidden" ref={printRef}>
        <CardHeader className="text-center bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100/50">
          <div className="mx-auto w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-3">
            <Microscope className="h-6 w-6 text-teal-600" />
          </div>
          <CardTitle className="text-xl text-gray-800">{profile?.full_name || "Diagnostic Center"}</CardTitle>
          <CardDescription className="text-teal-700">
            {profile?.lab_name || "Laboratory"}
            {profile?.specialization_area && ` • ${profile.specialization_area}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6 pt-8 pb-8">
          {/* QR Code Container */}
          <div className="p-6 bg-white rounded-2xl shadow-md border border-teal-100">
            <QRCodeSVG
              id="pathologist-qr-code"
              value={qrData}
              size={256}
              level="H"
              includeMargin
              fgColor="#0d9488"
            />
          </div>

          {/* Referral Link */}
          <div className="w-full max-w-md">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border bg-muted/40">
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <code className="text-xs text-muted-foreground truncate flex-1">{referralLink}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyLink}
                className="h-7 px-2 shrink-0"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-[hsl(var(--diagnostic-accent))]" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-3">
            <Button 
              onClick={handleDownload} 
              variant="outline"
              className="border-teal-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button 
              onClick={handlePrint} 
              variant="outline"
              className="border-teal-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print QR Card
            </Button>
            <Button 
              onClick={handleCopy} 
              variant="outline"
              className="border-teal-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300"
            >
              {copied ? (
                <Check className="h-4 w-4 mr-2 text-teal-600" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Copy ID
            </Button>
            <Button 
              onClick={handleShare} 
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center space-y-2 pt-2">
            <p className="text-sm text-muted-foreground">
              Scan this QR code to connect and receive patient data
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100">
              <span className="text-xs text-muted-foreground">Your ID:</span>
              <code className="font-mono text-xs text-teal-700">{user?.id?.slice(0, 12)}...</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card className="diagnostic-card">
        <CardContent className="p-6">
          <h3 className="font-medium text-gray-800 mb-3">How it works</h3>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-medium">1</span>
              <span>Share this QR code or referral link with referring doctors</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-medium">2</span>
              <span>They scan it or click the link to connect your diagnostic center</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-medium">3</span>
              <span>Receive patient referrals directly in your dashboard</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default PathologistQRCodePage;
