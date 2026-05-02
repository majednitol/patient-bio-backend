import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FlaskConical, Loader2, Check, Info, Coins } from "lucide-react";
import { useBroadcastRequests } from "@/hooks/useBroadcastRequests";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DISEASE_CATEGORIES = [
  { value: "cancer", label: "Cancer" },
  { value: "covid19", label: "COVID-19" },
  { value: "diabetes", label: "Diabetes" },
  { value: "heart_disease", label: "Heart Disease" },
  { value: "general", label: "General" },
  { value: "other", label: "Other" },
];

interface RequestPatientDataDialogProps {
  trigger?: React.ReactNode;
  defaultDiseaseCategory?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const RequestPatientDataDialog = ({ trigger, defaultDiseaseCategory, open: controlledOpen, onOpenChange: controlledOnOpenChange }: RequestPatientDataDialogProps) => {
  const { createBroadcast, isCreating } = useBroadcastRequests();
  
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;

  const [diseaseCategory, setDiseaseCategory] = useState(defaultDiseaseCategory || "");
  const [researchPurpose, setResearchPurpose] = useState("");
  const [tokenOffer, setTokenOffer] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [success, setSuccess] = useState(false);
  const [patientsNotified, setPatientsNotified] = useState(0);

  // Sync default disease when prop changes
  useEffect(() => {
    if (defaultDiseaseCategory) {
      setDiseaseCategory(defaultDiseaseCategory);
    }
  }, [defaultDiseaseCategory]);

  const resetDialog = () => {
    setDiseaseCategory(defaultDiseaseCategory || "");
    setResearchPurpose("");
    setTokenOffer("");
    setTotalBudget("");
    setSuccess(false);
    setPatientsNotified(0);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetDialog();
    }
  };

  const handleRequest = async () => {
    if (!diseaseCategory || !researchPurpose.trim()) return;

    try {
      const tokenOfferNum = tokenOffer ? parseFloat(tokenOffer) : undefined;
      const totalBudgetNum = totalBudget ? parseFloat(totalBudget) : undefined;

      const result = await createBroadcast({
        disease_category: diseaseCategory,
        research_purpose: researchPurpose.trim(),
        token_offer_per_patient: tokenOfferNum,
        total_token_budget: totalBudgetNum,
      });
      setPatientsNotified(result.patients_notified || 0);
      setSuccess(true);
    } catch (error) {
      console.error("Error creating request:", error);
    }
  };

  const selectedCategoryLabel = DISEASE_CATEGORIES.find(c => c.value === diseaseCategory)?.label || diseaseCategory.replace(/_/g, " ");

  const maxPatients = totalBudget && tokenOffer && parseFloat(tokenOffer) > 0 
    ? Math.floor(parseFloat(totalBudget) / parseFloat(tokenOffer))
    : null;

  const dialogContent = (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Request Research Data</DialogTitle>
        <DialogDescription>
          Request anonymized health data from patients for research. Offer PBIO tokens to incentivize data sharing.
        </DialogDescription>
      </DialogHeader>

      {success ? (
        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-medium mb-1">
              {patientsNotified > 0 ? "Request Broadcast!" : "No Matching Patients"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {patientsNotified > 0 
                ? `Your request has been sent to ${patientsNotified} patient${patientsNotified > 1 ? 's' : ''} with ${selectedCategoryLabel} data.${tokenOffer ? ` Offering ${tokenOffer} PBIO per patient.` : ''} You'll be notified when they respond.`
                : "No patients found with data in this disease category. Try a different category."}
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => handleOpenChange(false)}>Close</Button>
        </div>
      ) : (
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label htmlFor="disease-category" className="text-sm font-medium">Disease Category of Interest *</label>
            <Select value={diseaseCategory} onValueChange={setDiseaseCategory}>
              <SelectTrigger><SelectValue placeholder="Select a disease category..." /></SelectTrigger>
              <SelectContent>
                {DISEASE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="research-purpose" className="text-sm font-medium">Research Purpose *</label>
            <Textarea id="research-purpose" placeholder="Explain your research purpose..." value={researchPurpose} onChange={(e) => setResearchPurpose(e.target.value)} rows={3} />
          </div>
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Coins className="h-4 w-4 text-primary" />Token Incentives (Optional)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="token-offer" className="text-xs text-muted-foreground">PBIO per Patient</label>
                <Input id="token-offer" type="number" min="0" step="1" placeholder="e.g. 25" value={tokenOffer} onChange={(e) => setTokenOffer(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="total-budget" className="text-xs text-muted-foreground">Total Budget</label>
                <Input id="total-budget" type="number" min="0" step="1" placeholder="e.g. 500" value={totalBudget} onChange={(e) => setTotalBudget(e.target.value)} />
              </div>
            </div>
            {maxPatients !== null && (
              <p className="text-xs text-muted-foreground">
                Budget allows up to <span className="font-medium text-foreground">{maxPatients}</span> patient{maxPatients !== 1 ? 's' : ''} to be rewarded
              </p>
            )}
          </div>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {diseaseCategory 
                ? `Your request will be sent to all patients who have ${selectedCategoryLabel}-related health records.${tokenOffer ? ` Each patient who approves will earn ${tokenOffer} PBIO tokens.` : ' Each patient can choose to share their anonymized data.'}`
                : "Select a disease category to see how many patients will receive your request."}
            </AlertDescription>
          </Alert>
          <DialogFooter className="pt-2">
            <Button onClick={handleRequest} disabled={!diseaseCategory || !researchPurpose.trim() || isCreating} className="w-full bg-primary hover:bg-primary/90">
              {isCreating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Broadcasting...</>) : "Broadcast Request"}
            </Button>
          </DialogFooter>
        </div>
      )}
    </DialogContent>
  );

  // Controlled mode (no trigger needed)
  if (isControlled) {
    return <Dialog open={open} onOpenChange={handleOpenChange}>{dialogContent}</Dialog>;
  }

  // Uncontrolled mode with trigger
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-primary hover:bg-primary/90">
            <FlaskConical className="mr-2 h-4 w-4" />
            Request Patient Data
          </Button>
        )}
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
};

export default RequestPatientDataDialog;
