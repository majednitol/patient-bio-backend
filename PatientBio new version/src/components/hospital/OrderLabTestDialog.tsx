import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FlaskConical, Search, AlertCircle, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalLabOrders, type LabOrderTest } from "@/hooks/useHospitalLabOrders";
import { toast } from "@/hooks/use-toast";

interface PathologistTest {
  id: string;
  name: string;
  code: string | null;
  category: string;
  price: number;
  sample_type: string | null;
}

interface Pathologist {
  user_id: string;
  full_name: string;
  lab_name: string | null;
}

interface OrderLabTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospitalId: string;
  patientId: string;
  patientName: string;
  admissionId?: string;
  wardBedInfo?: string;
}

export default function OrderLabTestDialog({
  open,
  onOpenChange,
  hospitalId,
  patientId,
  patientName,
  admissionId,
  wardBedInfo,
}: OrderLabTestDialogProps) {
  const { createLabOrder } = useHospitalLabOrders(hospitalId);
  
  const [labType, setLabType] = useState<"internal" | "external">("external");
  const [pathologistSearch, setPathologistSearch] = useState("");
  const [selectedPathologist, setSelectedPathologist] = useState<Pathologist | null>(null);
  const [pathologistTests, setPathologistTests] = useState<PathologistTest[]>([]);
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [urgency, setUrgency] = useState<"routine" | "urgent" | "stat">("routine");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Pathologist[]>([]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setLabType("external");
      setPathologistSearch("");
      setSelectedPathologist(null);
      setPathologistTests([]);
      setSelectedTests(new Set());
      setUrgency("routine");
      setClinicalNotes("");
      setSearchResults([]);
    }
  }, [open]);

  // Search for pathologists
  const handleSearchPathologist = async () => {
    if (!pathologistSearch.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("pathologist_profiles")
        .select("user_id, full_name, lab_name")
        .or(`lab_name.ilike.%${pathologistSearch}%,full_name.ilike.%${pathologistSearch}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search pathologists");
    } finally {
      setIsSearching(false);
    }
  };

  // Load tests when pathologist is selected
  const handleSelectPathologist = async (pathologist: Pathologist) => {
    setSelectedPathologist(pathologist);
    setSearchResults([]);
    setPathologistSearch("");
    
    try {
      const { data, error } = await supabase
        .from("pathologist_tests")
        .select("id, name, code, category, price, sample_type")
        .eq("pathologist_id", pathologist.user_id)
        .eq("is_active", true)
        .order("category")
        .order("name");

      if (error) throw error;
      setPathologistTests(data || []);
    } catch (error) {
      console.error("Failed to load tests:", error);
      toast.error("Failed to load test catalog");
    }
  };

  // Toggle test selection
  const toggleTest = (testId: string) => {
    setSelectedTests(prev => {
      const next = new Set(prev);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }
      return next;
    });
  };

  // Calculate total price
  const selectedTestDetails = pathologistTests.filter(t => selectedTests.has(t.id));
  const totalPrice = selectedTestDetails.reduce((sum, t) => sum + t.price, 0);

  // Submit order
  const handleSubmit = async () => {
    if (!selectedPathologist || selectedTests.size === 0) {
      toast.error("Please select a lab and at least one test");
      return;
    }

    const tests: LabOrderTest[] = selectedTestDetails.map(t => ({
      name: t.name,
      code: t.code || undefined,
      price: t.price,
    }));

    await createLabOrder.mutateAsync({
      admission_id: admissionId,
      patient_id: patientId,
      pathologist_id: selectedPathologist.user_id,
      is_internal_lab: labType === "internal",
      tests,
      clinical_notes: clinicalNotes || undefined,
      urgency,
    });

    onOpenChange(false);
  };

  // Group tests by category
  const testsByCategory = pathologistTests.reduce((acc, test) => {
    if (!acc[test.category]) acc[test.category] = [];
    acc[test.category].push(test);
    return acc;
  }, {} as Record<string, PathologistTest[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Order Lab/Radiology Test
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Patient Info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">{patientName}</p>
            {wardBedInfo && (
              <p className="text-sm text-muted-foreground">{wardBedInfo}</p>
            )}
          </div>

          {/* Lab Type Selection */}
          <div className="space-y-2">
            <Label>Select Diagnostic Center Type</Label>
            <RadioGroup
              value={labType}
              onValueChange={(v) => {
                setLabType(v as "internal" | "external");
                setSelectedPathologist(null);
                setPathologistTests([]);
                setSelectedTests(new Set());
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="internal" id="internal" />
                <Label htmlFor="internal" className="cursor-pointer">
                  Internal Lab (Hospital-Owned)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="external" id="external" />
                <Label htmlFor="external" className="cursor-pointer">
                  External Lab
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Pathologist Search */}
          <div className="space-y-2">
            <Label>Search Diagnostic Center</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by lab name or pathologist name..."
                  value={pathologistSearch}
                  onChange={(e) => setPathologistSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchPathologist()}
                  className="pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleSearchPathologist}
                disabled={isSearching}
              >
                Search
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y">
                {searchResults.map((path) => (
                  <button
                    key={path.user_id}
                    onClick={() => handleSelectPathologist(path)}
                    className="w-full p-3 text-left hover:bg-muted transition-colors flex items-center gap-3"
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{path.lab_name || path.full_name}</p>
                      {path.lab_name && (
                        <p className="text-sm text-muted-foreground">{path.full_name}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Pathologist */}
            {selectedPathologist && (
              <div className="p-3 bg-primary/10 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {selectedPathologist.lab_name || selectedPathologist.full_name}
                  </p>
                  {selectedPathologist.lab_name && (
                    <p className="text-sm text-muted-foreground">
                      {selectedPathologist.full_name}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedPathologist(null);
                    setPathologistTests([]);
                    setSelectedTests(new Set());
                  }}
                >
                  Change
                </Button>
              </div>
            )}
          </div>

          {/* Test Selection */}
          {selectedPathologist && pathologistTests.length > 0 && (
            <div className="space-y-2">
              <Label>Select Tests</Label>
              <ScrollArea className="h-48 border rounded-lg">
                <div className="p-3 space-y-4">
                  {Object.entries(testsByCategory).map(([category, tests]) => (
                    <div key={category}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        {category}
                      </h4>
                      <div className="space-y-2">
                        {tests.map((test) => (
                          <label
                            key={test.id}
                            className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedTests.has(test.id)}
                              onCheckedChange={() => toggleTest(test.id)}
                            />
                            <div className="flex-1">
                              <span className="font-medium">{test.name}</span>
                              {test.code && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({test.code})
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-medium">
                              ৳{test.price.toLocaleString()}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Selected tests summary */}
              {selectedTests.size > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedTestDetails.map((test) => (
                    <Badge key={test.id} variant="secondary">
                      {test.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedPathologist && pathologistTests.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No tests available in this lab's catalog
            </div>
          )}

          {/* Urgency */}
          <div className="space-y-2">
            <Label>Urgency</Label>
            <RadioGroup
              value={urgency}
              onValueChange={(v) => setUrgency(v as typeof urgency)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="routine" id="routine" />
                <Label htmlFor="routine" className="cursor-pointer">Routine</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="urgent" id="urgent" />
                <Label htmlFor="urgent" className="cursor-pointer text-orange-600">Urgent</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="stat" id="stat" />
                <Label htmlFor="stat" className="cursor-pointer text-red-600 font-bold">STAT</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Clinical Notes */}
          <div className="space-y-2">
            <Label>Clinical Notes (Optional)</Label>
            <Textarea
              placeholder="Add clinical context for the pathologist..."
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Consent Warning */}
          {labType === "external" && selectedPathologist && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-lg">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Patient Consent Required</p>
                <p>External lab orders require patient approval before the lab can access their data.</p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div className="text-lg font-bold">
            Total: ৳{totalPrice.toLocaleString()}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedPathologist || selectedTests.size === 0 || createLabOrder.isPending}
            >
              {createLabOrder.isPending ? "Ordering..." : 
                labType === "external" ? "Order Tests (Requires Consent)" : "Order Tests"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
