import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDoctorPathologistShares } from "@/hooks/useDoctorPathologistShares";
import { useDoctorPathologistNotifications } from "@/hooks/useDoctorPathologistNotifications";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Send, Microscope, QrCode, Keyboard, Search } from "lucide-react";
import { QRScanner } from "@/components/qr/QRScanner";
import { PathologistDirectoryPicker } from "./PathologistDirectoryPicker";
import type { PathologistSearchResult } from "@/hooks/useSearchPathologists";

const diseaseCategories = [
  { value: "general", label: "General" },
  { value: "cancer", label: "Cancer" },
  { value: "covid19", label: "COVID-19" },
  { value: "diabetes", label: "Diabetes" },
  { value: "heart_disease", label: "Heart Disease" },
  { value: "infectious", label: "Infectious Disease" },
  { value: "other", label: "Other" },
];

interface ReferToPathologistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: {
    patient_id: string;
    display_name?: string;
  };
}

export const ReferToPathologistDialog = ({
  open,
  onOpenChange,
  patient,
}: ReferToPathologistDialogProps) => {
  const { createShare } = useDoctorPathologistShares();
  const { notifyPathologistOfReferral } = useDoctorPathologistNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputMode, setInputMode] = useState<"directory" | "manual" | "scan">("directory");
  const [selectedPathologist, setSelectedPathologist] = useState<PathologistSearchResult | null>(null);
  const [formData, setFormData] = useState({
    pathologist_id: "",
    disease_category: "",
    notes: "",
  });

  const handlePathologistSelect = (p: PathologistSearchResult) => {
    setSelectedPathologist(p);
    setFormData({ ...formData, pathologist_id: p.user_id });
  };

  const handleQRScan = (decodedText: string) => {
    try {
      const data = JSON.parse(decodedText);
      const id = data.pathologist_id || data.user_id;
      if (id) {
        setFormData({ ...formData, pathologist_id: id });
        setSelectedPathologist(null);
        setInputMode("manual");
      }
    } catch {
      if (decodedText.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        setFormData({ ...formData, pathologist_id: decodedText });
        setSelectedPathologist(null);
        setInputMode("manual");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pathologist_id) return;

    setIsSubmitting(true);
    try {
      createShare(
        {
          pathologist_id: formData.pathologist_id,
          patient_id: patient.patient_id,
          disease_category: formData.disease_category || undefined,
          notes: formData.notes || undefined,
        },
        {
          onSuccess: async () => {
            await notifyPathologistOfReferral(
              formData.pathologist_id,
              patient.patient_id,
              formData.disease_category || undefined
            );
            onOpenChange(false);
            setFormData({ pathologist_id: "", disease_category: "", notes: "" });
            setSelectedPathologist(null);
          },
          onSettled: () => {
            setIsSubmitting(false);
          },
        }
      );
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Microscope className="h-5 w-5 text-primary" />
            Refer to Diagnostic Center
          </DialogTitle>
          <DialogDescription>
            Share patient data with a pathologist for diagnostic analysis
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Patient Info */}
            <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {patient.display_name?.[0]?.toUpperCase() || "P"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{patient.display_name || "Unknown Patient"}</p>
                <p className="text-xs text-muted-foreground">
                  ID: {patient.patient_id.substring(0, 8).toUpperCase()}
                </p>
              </div>
            </div>

            {/* Pathologist Selection */}
            <div className="space-y-2">
              <Label>Select Pathologist *</Label>
              <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="directory">
                    <Search className="h-4 w-4 mr-1.5" />
                    Directory
                  </TabsTrigger>
                  <TabsTrigger value="manual">
                    <Keyboard className="h-4 w-4 mr-1.5" />
                    ID
                  </TabsTrigger>
                  <TabsTrigger value="scan">
                    <QrCode className="h-4 w-4 mr-1.5" />
                    QR
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="directory" className="mt-3">
                  <PathologistDirectoryPicker
                    selectedId={formData.pathologist_id}
                    onSelect={handlePathologistSelect}
                  />
                </TabsContent>
                <TabsContent value="manual" className="mt-3">
                  <Input
                    placeholder="Enter pathologist's UUID"
                    value={formData.pathologist_id}
                    onChange={(e) => {
                      setFormData({ ...formData, pathologist_id: e.target.value });
                      setSelectedPathologist(null);
                    }}
                    required={inputMode === "manual"}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ask the pathologist for their ID
                  </p>
                </TabsContent>
                <TabsContent value="scan" className="mt-3">
                  <QRScanner onScan={handleQRScan} />
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Scan the pathologist's QR code to auto-fill their ID
                  </p>
                </TabsContent>
              </Tabs>
              {formData.pathologist_id && (
                <div className="p-2 rounded-md bg-primary/10 text-sm">
                  <span className="text-muted-foreground">Selected: </span>
                  <span className="font-medium text-primary">
                    {selectedPathologist?.full_name || formData.pathologist_id.substring(0, 8).toUpperCase() + "..."}
                  </span>
                  {selectedPathologist?.lab_name && (
                    <span className="text-muted-foreground"> · {selectedPathologist.lab_name}</span>
                  )}
                </div>
              )}
            </div>

            {/* Disease Category */}
            <div className="space-y-2">
              <Label>Disease Category</Label>
              <Select
                value={formData.disease_category}
                onValueChange={(value) => setFormData({ ...formData, disease_category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {diseaseCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes for Pathologist</Label>
              <Textarea
                id="notes"
                placeholder="Add any relevant clinical notes or test requests..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={!formData.pathologist_id || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Refer Patient
                  </>
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
