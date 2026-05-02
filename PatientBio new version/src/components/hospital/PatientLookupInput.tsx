import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useLookupPatientByCode } from "@/hooks/useDoctorPatients";
import { Search, User, Loader2, AlertCircle, CheckCircle, X, UserPlus } from "lucide-react";

interface PatientLookupInputProps {
  value: string;
  onChange: (patientId: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  onRegisterNew?: () => void;
  showRegisterOption?: boolean;
}

interface SelectedPatient {
  id: string;
  name: string;
  gender?: string | null;
  age?: number | null;
}

export default function PatientLookupInput({
  value,
  onChange,
  label = "Patient",
  placeholder = "Enter patient ID code (e.g., ABCD1234)",
  disabled = false,
  onRegisterNew,
  showRegisterOption = true,
}: PatientLookupInputProps) {
  const [searchCode, setSearchCode] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null);
  const lookupMutation = useLookupPatientByCode();

  const handleSearch = () => {
    if (!searchCode.trim() || searchCode.trim().length < 4) return;
    
    lookupMutation.mutate(searchCode.trim(), {
      onSuccess: (result) => {
        if (result.found && result.patient_id) {
          setSelectedPatient({
            id: result.patient_id,
            name: result.display_name || "Unknown",
            gender: result.gender,
            age: result.age,
          });
          onChange(result.patient_id);
        }
      },
    });
  };

  const handleClear = () => {
    setSelectedPatient(null);
    setSearchCode("");
    onChange("");
    lookupMutation.reset();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const result = lookupMutation.data;

  // If a patient is selected, show the selected state
  if (selectedPatient && value === selectedPatient.id) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedPatient.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedPatient.age ? `${selectedPatient.age} years` : "Age unknown"}
                    {selectedPatient.gender && ` • ${selectedPatient.gender}`}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder || "e.g., PB-202602-000008-6"}
          value={searchCode}
          onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          maxLength={20}
          className="font-mono uppercase"
          disabled={disabled}
        />
        <Button
          type="button"
          onClick={handleSearch}
          disabled={lookupMutation.isPending || !searchCode.trim() || searchCode.trim().length < 4 || disabled}
          size="icon"
        >
          {lookupMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Enter the patient's Health Passport ID (e.g., PB-202602-000008-6)
      </p>

      {/* Error state */}
      {lookupMutation.isError && (
        <Card className="border-destructive">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Error searching for patient. Please try again.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not found state */}
      {result && !result.found && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20">
          <CardContent className="py-3">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">No patient found with ID "{searchCode}"</span>
              </div>
              {showRegisterOption && onRegisterNew && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRegisterNew}
                  className="w-full"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Register New Patient
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Found - select prompt */}
      {result?.found && !selectedPatient && (
        <Card className="border-primary/50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{result.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {result.age ? `${result.age} years` : "Age unknown"}
                    {result.gender && ` • ${result.gender}`}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (result.patient_id) {
                    setSelectedPatient({
                      id: result.patient_id,
                      name: result.display_name || "Unknown",
                      gender: result.gender,
                      age: result.age,
                    });
                    onChange(result.patient_id);
                  }
                }}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Select
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
