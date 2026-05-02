import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, Trash2, ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export const PlatformLogoUpload = () => {
  const { logoUrl, updateSetting } = usePlatformSettings();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: t("platformLogo.invalidFile"), description: t("platformLogo.invalidFileDesc"), variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t("platformLogo.fileTooLarge"), description: t("platformLogo.fileTooLargeDesc"), variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `platform/logo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

      await updateSetting.mutateAsync({ key: "logo_url", value: urlData.publicUrl });
      toast({ title: t("platformLogo.logoUploaded"), description: t("platformLogo.logoUploadedDesc") });
    } catch (err: any) {
      toast({ title: t("platformLogo.uploadFailed"), description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    try {
      await updateSetting.mutateAsync({ key: "logo_url", value: "" });
      toast({ title: t("platformLogo.logoRemoved"), description: t("platformLogo.logoRemovedDesc") });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex items-center gap-4">
      {logoUrl ? (
        <img src={logoUrl} alt="Platform logo" className="w-16 h-16 rounded-xl object-cover border border-border" />
      ) : (
        <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center border border-dashed border-border">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? t("platformLogo.uploading") : t("platformLogo.uploadLogo")}
        </Button>
        {logoUrl && (
          <Button variant="ghost" size="sm" onClick={handleRemove} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            {t("platformLogo.remove")}
          </Button>
        )}
      </div>
    </div>
  );
};