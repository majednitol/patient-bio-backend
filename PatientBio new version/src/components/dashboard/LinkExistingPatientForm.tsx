import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RELATIONSHIP_OPTIONS } from "@/hooks/useFamilyMembers";
import { useCreateLinkRequest } from "@/hooks/useFamilyLinkRequests";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, User, CheckCircle2, AlertTriangle } from "lucide-react";

interface PatientResult {
  patient_id: string;
  display_name: string;
  gender: string | null;
  age: number | null;
  patient_passport_id?: string;
}

interface LinkExistingPatientFormProps {
  onSuccess: () => void;
}

const maskPassportId = (id: string) => {
  // PB-202601-000001-7 → PB-2026XX-XXXX01-7
  const parts = id.split("-");
  if (parts.length !== 4) return id;
  const masked1 = parts[1].slice(0, 4) + "XX";
  const masked2 = "XXXX" + parts[2].slice(-2);
  return `${parts[0]}-${masked1}-${masked2}-${parts[3]}`;
};

export const LinkExistingPatientForm = ({ onSuccess }: LinkExistingPatientFormProps) => {
  const { user } = useAuth();
  const [searchId, setSearchId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [patientResult, setPatientResult] = useState<PatientResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [relationship, setRelationship] = useState("");
  const [canManageRecords, setCanManageRecords] = useState(true);
  const [canShareData, setCanShareData] = useState(true);

  const createRequest = useCreateLinkRequest();

  const handleSearch = async () => {
    if (!searchId.trim()) return;

    setIsSearching(true);
    setPatientResult(null);
    setNotFound(false);
    setIsSelf(false);

    try {
      const { data, error } = await supabase.functions.invoke("lookup-patient-by-id", {
        body: { patient_code: searchId.trim() },
      });

      if (error) throw error;

      if (data?.found) {
        if (data.patient_id === user?.id) {
          setIsSelf(true);
          return;
        }
        setPatientResult({
          patient_id: data.patient_id,
          display_name: data.display_name,
          gender: data.gender,
          age: data.age,
          patient_passport_id: data.patient_passport_id,
        });
      } else {
        setNotFound(true);
      }
    } catch (error: any) {
      console.error("Search error:", error);
      setNotFound(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = () => {
    if (!patientResult || !relationship) return;

    createRequest.mutate(
      {
        target_patient_id: patientResult.patient_id,
        relationship,
        can_manage_records: canManageRecords,
        can_share_data: canShareData,
      },
      { onSuccess }
    );
  };

  const initials = patientResult?.display_name
    ? patientResult.display_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "";

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="space-y-2">
        <Label>Health Passport ID</Label>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. PB-202601-000001-7"
            value={searchId}
            onChange={(e) => {
              setSearchId(e.target.value);
              setNotFound(false);
              setPatientResult(null);
              setIsSelf(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleSearch}
            disabled={isSearching || !searchId.trim()}
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {notFound && (
        <p className="text-sm text-destructive">No patient found with that ID. Please check and try again.</p>
      )}

      {isSelf && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>You cannot link to yourself.</AlertDescription>
        </Alert>
      )}

      {/* Patient Preview Card */}
      {patientResult && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {initials || <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{patientResult.display_name}</p>
              <div className="flex gap-2 mt-0.5">
                {patientResult.patient_passport_id && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {maskPassportId(patientResult.patient_passport_id)}
                  </Badge>
                )}
                {patientResult.gender && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {patientResult.gender}
                  </Badge>
                )}
                {patientResult.age !== null && (
                  <Badge variant="outline" className="text-xs">
                    {patientResult.age} years
                  </Badge>
                )}
              </div>
            </div>
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>

          {/* Relationship */}
          <div className="space-y-2">
            <Label>
              Relationship <span className="text-destructive">*</span>
            </Label>
            <Select value={relationship} onValueChange={setRelationship}>
              <SelectTrigger>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_OPTIONS.map((rel) => (
                  <SelectItem key={rel.value} value={rel.value}>
                    {rel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Permissions */}
          <div className="space-y-3">
            <Label>Requested Permissions</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="link_can_manage"
                checked={canManageRecords}
                onCheckedChange={(c) => setCanManageRecords(c === true)}
              />
              <label htmlFor="link_can_manage" className="text-sm cursor-pointer">
                Can manage health records
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="link_can_share"
                checked={canShareData}
                onCheckedChange={(c) => setCanShareData(c === true)}
              />
              <label htmlFor="link_can_share" className="text-sm cursor-pointer">
                Can share data with providers
              </label>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            A request will be sent to this patient. They must approve before you can manage their records.
          </p>

          <Button
            className="w-full"
            onClick={handleSendRequest}
            disabled={!relationship || createRequest.isPending}
          >
            {createRequest.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Link Request"
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
