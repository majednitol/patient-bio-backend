import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateHospital } from "@/hooks/useHospitals";
import { HospitalType } from "@/types/hospital";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, Loader2, Info } from "lucide-react";

const HOSPITAL_TYPES: { value: HospitalType; label: string }[] = [
  { value: "hospital", label: "Hospital" },
  { value: "clinic", label: "Clinic" },
  { value: "diagnostic", label: "Diagnostic Center" },
  { value: "pharmacy", label: "Pharmacy" },
];

interface QuickRegisterDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function QuickRegisterDialog({ 
  trigger, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange 
}: QuickRegisterDialogProps) {
  const navigate = useNavigate();
  const createHospital = useCreateHospital();
  const [internalOpen, setInternalOpen] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState<HospitalType>("hospital");
  const [errors, setErrors] = useState<{ name?: string; city?: string }>({});

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName("");
      setCity("");
      setType("hospital");
      setErrors({});
    }
  }, [open]);

  const validate = () => {
    const newErrors: { name?: string; city?: string } = {};
    
    if (name.trim().length < 2) {
      newErrors.name = "Facility name must be at least 2 characters";
    }
    if (city.trim().length < 2) {
      newErrors.city = "City must be at least 2 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    try {
      const hospital = await createHospital.mutateAsync({
        name: name.trim(),
        city: city.trim(),
        type: type,
      });
      setOpen(false);
      navigate(`/hospital/${hospital.id}`);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isValid = name.trim().length >= 2 && city.trim().length >= 2;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Zap className="h-4 w-4 mr-2" />
            Quick Register
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Register
          </DialogTitle>
          <DialogDescription>
            Register your facility in seconds. You can add more details later from your dashboard.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quick-name">Facility Name *</Label>
              <Input
                id="quick-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="e.g., City General Hospital"
                autoFocus
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quick-type">Facility Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as HospitalType)}>
                <SelectTrigger id="quick-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {HOSPITAL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quick-city">City *</Label>
              <Input
                id="quick-city"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  if (errors.city) setErrors((prev) => ({ ...prev, city: undefined }));
                }}
                placeholder="e.g., Dhaka"
                className={errors.city ? "border-destructive" : ""}
              />
              {errors.city && (
                <p className="text-xs text-destructive">{errors.city}</p>
              )}
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-muted-foreground">
                You can complete your profile later by adding contact info, address, and description from your hospital dashboard.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || createHospital.isPending}
            >
              {createHospital.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Facility"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
