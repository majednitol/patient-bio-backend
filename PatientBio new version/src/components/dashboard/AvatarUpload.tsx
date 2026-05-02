import { useState, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  displayName: string | null;
  onUploadComplete: (url: string) => void;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_MB = 2;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export const AvatarUpload = ({
  userId, currentAvatarUrl, displayName, onUploadComplete,
}: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: t("avatarUpload.invalidFileType"), description: t("avatarUpload.invalidFileTypeDesc"), variant: "destructive" });
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      toast({ title: t("avatarUpload.fileTooLarge"), description: t("avatarUpload.fileTooLargeDesc", { size: MAX_SIZE_MB }), variant: "destructive" });
      return;
    }

    setUploading(true);

    try {
      if (currentAvatarUrl) {
        const existingPath = currentAvatarUrl.split("/avatars/")[1];
        if (existingPath) await supabase.storage.from("avatars").remove([existingPath]);
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase.from("user_profiles").update({ avatar_url: publicUrl }).eq("user_id", userId);
      if (updateError) throw updateError;

      onUploadComplete(publicUrl);
      toast({ title: t("avatarUpload.photoUpdated"), description: t("avatarUpload.photoUpdatedDesc") });
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast({ title: t("avatarUpload.uploadFailed"), description: error.message || t("avatarUpload.uploadFailedDesc"), variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClick = () => fileInputRef.current?.click();

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <Avatar className={cn("h-20 w-20 sm:h-24 sm:w-24 cursor-pointer ring-2 ring-offset-2 ring-primary/20 transition-all", "group-hover:ring-primary/50", uploading && "opacity-50")} onClick={handleClick}>
          <AvatarImage src={currentAvatarUrl || undefined} alt={t("avatarUpload.profilePhoto")} />
          <AvatarFallback className="text-2xl bg-primary/10 text-primary">{getInitials(displayName)}</AvatarFallback>
        </Avatar>
        <div className={cn("absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity cursor-pointer", "group-hover:opacity-100", uploading && "opacity-100")} onClick={handleClick}>
          {uploading ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Camera className="h-6 w-6 text-white" />}
        </div>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={uploading} className="text-xs">
        {uploading ? (
          <><Loader2 className="mr-1 h-3 w-3 animate-spin" />{t("avatarUpload.uploading")}</>
        ) : (
          <><Camera className="mr-1 h-3 w-3" />{t("avatarUpload.changePhoto")}</>
        )}
      </Button>

      <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileSelect} className="hidden" />
    </div>
  );
};