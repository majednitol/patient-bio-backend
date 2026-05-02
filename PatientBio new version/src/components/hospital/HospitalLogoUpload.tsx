import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface HospitalLogoUploadProps {
  hospitalId: string;
  currentLogoUrl: string | null;
  hospitalName: string;
  onUploadComplete: (url: string) => void;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_MB = 2;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export const HospitalLogoUpload = ({
  hospitalId,
  currentLogoUrl,
  hospitalName,
  onUploadComplete,
}: HospitalLogoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or WebP image.");
      return;
    }

    // Validate file size
    if (file.size > MAX_SIZE_BYTES) {
      toast.error(`Please upload an image smaller than ${MAX_SIZE_MB}MB.`);
      return;
    }

    setUploading(true);

    try {
      // Delete existing logo if present
      if (currentLogoUrl) {
        const existingPath = currentLogoUrl.split("/avatars/")[1];
        if (existingPath) {
          await supabase.storage.from("avatars").remove([existingPath]);
        }
      }

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `hospital-${hospitalId}/logo-${Date.now()}.${fileExt}`;

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      onUploadComplete(publicUrl);
      toast.success("Hospital logo updated successfully!");
    } catch (error: any) {
      console.error("Logo upload error:", error);
      toast.error(error.message || "Failed to upload logo. Please try again.");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <div
          className={cn(
            "h-[120px] w-[120px] rounded-lg flex items-center justify-center cursor-pointer",
            "ring-2 ring-offset-2 ring-primary/20 transition-all overflow-hidden",
            "group-hover:ring-primary/50 bg-muted",
            uploading && "opacity-50"
          )}
          onClick={handleClick}
        >
          {currentLogoUrl ? (
            <img
              src={currentLogoUrl}
              alt={`${hospitalName} logo`}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Building2 className="h-10 w-10 mb-1" />
              <span className="text-sm font-medium">{getInitials(hospitalName)}</span>
            </div>
          )}
        </div>

        {/* Overlay on hover */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 opacity-0 transition-opacity cursor-pointer",
            "group-hover:opacity-100",
            uploading && "opacity-100"
          )}
          onClick={handleClick}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={uploading}
        className="text-xs"
      >
        {uploading ? (
          <>
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Camera className="mr-1 h-3 w-3" />
            Change Logo
          </>
        )}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
