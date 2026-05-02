import { formatDoctorName } from "@/utils/formatDoctorName";
import { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Download, Share2, QrCode, Copy, Stethoscope, ScanLine, Keyboard, Loader2 } from "lucide-react";
import { QRScanner } from "@/components/qr/QRScanner";
import { supabase } from "@/integrations/supabase/client";

const DoctorQRCodePage = () => {
  const { user } = useAuth();
  const { effectiveDoctorId } = useStaffAccess();
  const { data: profile } = useDoctorProfile(effectiveDoctorId || undefined);
  const qrRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualPatientId, setManualPatientId] = useState("");

  const doctorId = (effectiveDoctorId || user?.id)?.substring(0, 8).toUpperCase() || "--------";
  const qrValue = `patientbio:doctor:${doctorId}`;

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 400, 400);
      }

      const link = document.createElement("a");
      link.download = `doctor-qr-${doctorId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("QR Code downloaded!");
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleShare = async () => {
    const shareText = `Connect with ${formatDoctorName(profile?.full_name, "Doctor")} on PatientBio!\n\nDoctor ID: ${doctorId}\n\nScan the QR code or enter this ID in the app to connect.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Connect with your Doctor",
          text: shareText,
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("Share text copied to clipboard!");
    }
  };

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(doctorId);
    toast.success("Doctor ID copied to clipboard!");
  };

  const connectToPatient = async (patientCode: string) => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("lookup-patient-by-id", {
        body: { patient_code: patientCode },
      });

      if (error || !data.success) {
        toast.error(data?.error || "Patient not found");
        return;
      }

      const { data: existingAccess } = await supabase
        .from("doctor_patient_access")
        .select("id")
        .eq("doctor_id", user?.id)
        .eq("patient_id", data.patient.id)
        .eq("is_active", true)
        .maybeSingle();

      if (existingAccess) {
        toast.info(`Already connected with ${data.patient.display_name || "this patient"}`);
        return;
      }

      const { error: insertError } = await supabase
        .from("doctor_patient_access")
        .insert({
          doctor_id: user?.id,
          patient_id: data.patient.id,
          is_active: true,
        });

      if (insertError) {
        toast.error("Failed to connect with patient");
        return;
      }

      toast.success(`Connected with ${data.patient.display_name || "patient"}`);
    } catch (err) {
      toast.error("An error occurred while processing");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScan = async (decodedText: string) => {
    if (decodedText.startsWith("patientbio:doctor:")) {
      toast.error("This is a doctor's QR code. Please scan a patient's QR code.");
      return;
    }

    if (decodedText.startsWith("patientbio:")) {
      const patientCode = decodedText.replace("patientbio:", "");
      await connectToPatient(patientCode);
    } else {
      toast.error("This QR code is not recognized by PatientBio.");
    }
  };

  const handleManualConnect = async () => {
    const cleanId = manualPatientId.trim().toUpperCase();
    if (cleanId.length !== 8) {
      toast.error("Please enter a valid 8-character Patient ID.");
      return;
    }
    
    await connectToPatient(cleanId);
    setManualPatientId("");
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="text-center lg:text-left">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">My QR Code</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Share with patients or scan to connect
        </p>
      </div>

      <div className="desktop-two-col">
        {/* Left column: My Code */}
        <div className="space-y-3 sm:space-y-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <QrCode className="h-5 w-5" />
                Doctor QR Code
              </CardTitle>
              <CardDescription>
                Share this with patients to grant them access
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div
                ref={qrRef}
                className="bg-white p-4 sm:p-6 rounded-xl shadow-inner mb-4 sm:mb-6"
              >
                <QRCodeSVG
                  value={qrValue}
                  size={200}
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: "",
                    height: 0,
                    width: 0,
                    excavate: false,
                  }}
                />
              </div>

              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-lg">
                    {profile?.full_name || "Doctor"}
                  </span>
                </div>
                {profile?.specialty && (
                  <p className="text-muted-foreground text-sm">
                    {profile.specialty}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-center gap-2">
                  <code className="bg-muted px-3 py-1 rounded-md text-lg font-mono font-bold">
                    {doctorId}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyId}
                    className="h-8 w-8"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button className="flex-1" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">How it works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                  1
                </span>
                <p>Patient opens their PatientBio app</p>
              </div>
              <div className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                  2
                </span>
                <p>They scan your QR code or enter your Doctor ID</p>
              </div>
              <div className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                  3
                </span>
                <p>You get access to view their health data and prescribe</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Scan Patient */}
        <div className="space-y-3 sm:space-y-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <ScanLine className="h-5 w-5 text-primary" />
                Scan Patient QR
              </CardTitle>
              <CardDescription>
                Scan a patient's QR code to connect with them
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QRScanner onScan={handleScan} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Keyboard className="h-4 w-4" />
                Enter Patient ID Manually
              </CardTitle>
              <CardDescription>
                Can't scan? Enter the 8-character Patient ID below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., A1B2C3D4"
                  value={manualPatientId}
                  onChange={(e) => setManualPatientId(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="font-mono uppercase"
                />
                <Button 
                  onClick={handleManualConnect}
                  disabled={manualPatientId.length !== 8 || isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Connect"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">How to connect</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Ask the patient to show their PatientBio QR code</li>
                <li>• Scan it or enter their Patient ID manually</li>
                <li>• Once connected, you'll be able to view their health data</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DoctorQRCodePage;
