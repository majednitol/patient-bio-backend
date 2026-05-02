import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Stethoscope,
  Activity,
  FlaskConical,
  Pill,
  Users,
  AlertTriangle,
  HeartPulse,
  FileText,
} from "lucide-react";

interface ClinicalRecords {
  background: {
    primary_diagnosis?: string;
    cancer_stage?: string;
    functional_status?: string;
    family_history?: string;
    lifestyle_notes?: string;
    occupation?: string;
  } | null;
  comorbidities: {
    comorbidity_list?: string[];
    icd10_mappings?: Record<string, string>;
    smoking_status?: string;
    alcohol_consumption?: string;
  } | null;
  investigations: {
    investigation_type?: string;
    loinc_code?: string;
    biomarker_results?: Record<string, unknown>;
    has_abnormal_values?: boolean;
    imaging_type?: string;
    imaging_results?: string;
    bp_systolic?: number;
    bp_diastolic?: number;
    bmi?: number;
  } | null;
  treatments: {
    treatment_types?: string[];
    is_active?: boolean;
    therapy_type?: string;
    dialysis_status?: string;
    dietary_intervention?: string;
  } | null;
  careTeam: Array<{ specialty?: string }>;
  complications: {
    current_complications?: string[];
    icd10_mappings?: Record<string, string>;
    treatment_response?: string;
    follow_up_required?: boolean;
  } | null;
}

interface Prescription {
  diagnosis?: string;
  medications: Array<{ name?: string; dosage?: string; frequency?: string }>;
  instructions?: string;
  is_active?: boolean;
  created_at?: string;
}

interface ClinicalRecordsTabProps {
  clinicalRecords: ClinicalRecords | null;
  prescriptions: Prescription[] | null;
}

const SectionCard = ({ icon: Icon, title, children, empty }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  empty?: boolean;
}) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-sm flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="text-sm">
      {empty ? (
        <p className="text-muted-foreground text-xs">No data available</p>
      ) : (
        children
      )}
    </CardContent>
  </Card>
);

const ICD10Badge = ({ code, label }: { code: string; label: string }) => (
  <Badge variant="outline" className="text-xs gap-1">
    <span className="font-mono text-primary">{code}</span>
    {label}
  </Badge>
);

const ClinicalRecordsTab = ({ clinicalRecords, prescriptions }: ClinicalRecordsTabProps) => {
  if (!clinicalRecords) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No clinical records available</p>
        <p className="text-sm">Clinical data was not included in this share</p>
      </div>
    );
  }

  const bg = clinicalRecords.background;
  const comorb = clinicalRecords.comorbidities;
  const inv = clinicalRecords.investigations;
  const treat = clinicalRecords.treatments;
  const care = clinicalRecords.careTeam;
  const comp = clinicalRecords.complications;

  return (
    <div className="space-y-4">
      {/* Background */}
      <SectionCard icon={FileText} title="Background" empty={!bg}>
        {bg && (
          <div className="grid grid-cols-2 gap-3">
            {bg.primary_diagnosis && (
              <div>
                <p className="text-xs text-muted-foreground">Primary Diagnosis</p>
                <p className="font-medium">{bg.primary_diagnosis}</p>
              </div>
            )}
            {bg.cancer_stage && (
              <div>
                <p className="text-xs text-muted-foreground">Stage</p>
                <Badge variant="secondary">{bg.cancer_stage}</Badge>
              </div>
            )}
            {bg.functional_status && (
              <div>
                <p className="text-xs text-muted-foreground">Functional Status</p>
                <p>{bg.functional_status}</p>
              </div>
            )}
            {bg.occupation && (
              <div>
                <p className="text-xs text-muted-foreground">Occupation</p>
                <p>{bg.occupation}</p>
              </div>
            )}
            {bg.family_history && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Family History</p>
                <p>{bg.family_history}</p>
              </div>
            )}
            {bg.lifestyle_notes && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Lifestyle</p>
                <p>{bg.lifestyle_notes}</p>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* Comorbidities */}
      <SectionCard icon={Activity} title="Comorbidities" empty={!comorb}>
        {comorb && (
          <div className="space-y-3">
            {comorb.comorbidity_list && comorb.comorbidity_list.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {comorb.comorbidity_list.map((c, i) => {
                  const icdCode = comorb.icd10_mappings?.[c];
                  return icdCode ? (
                    <ICD10Badge key={i} code={icdCode} label={c} />
                  ) : (
                    <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                  );
                })}
              </div>
            )}
            <div className="flex gap-4 text-xs">
              {comorb.smoking_status && (
                <span>Smoking: <span className="font-medium">{comorb.smoking_status}</span></span>
              )}
              {comorb.alcohol_consumption && (
                <span>Alcohol: <span className="font-medium">{comorb.alcohol_consumption}</span></span>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Investigations */}
      <SectionCard icon={FlaskConical} title="Investigations" empty={!inv}>
        {inv && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {inv.investigation_type && (
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p>{inv.investigation_type}</p>
                </div>
              )}
              {inv.loinc_code && (
                <div>
                  <p className="text-xs text-muted-foreground">LOINC Code</p>
                  <Badge variant="outline" className="font-mono text-xs">{inv.loinc_code}</Badge>
                </div>
              )}
              {inv.bp_systolic != null && (
                <div>
                  <p className="text-xs text-muted-foreground">Blood Pressure</p>
                  <p className="flex items-center gap-1">
                    <HeartPulse className="h-3 w-3 text-primary" />
                    {inv.bp_systolic}/{inv.bp_diastolic} mmHg
                  </p>
                </div>
              )}
              {inv.bmi != null && (
                <div>
                  <p className="text-xs text-muted-foreground">BMI</p>
                  <p>{inv.bmi.toFixed(1)}</p>
                </div>
              )}
              {inv.imaging_type && (
                <div>
                  <p className="text-xs text-muted-foreground">Imaging</p>
                  <p>{inv.imaging_type}</p>
                </div>
              )}
              {inv.imaging_results && (
                <div>
                  <p className="text-xs text-muted-foreground">Imaging Results</p>
                  <p>{inv.imaging_results}</p>
                </div>
              )}
            </div>
            {inv.has_abnormal_values && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />
                Abnormal Values Detected
              </Badge>
            )}
            {inv.biomarker_results && Object.keys(inv.biomarker_results).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Biomarker Results</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(inv.biomarker_results).map(([key, val]) => (
                    <Badge key={key} variant="outline" className="text-xs">
                      {key}: {String(val)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* Treatments */}
      <SectionCard icon={Pill} title="Treatments" empty={!treat}>
        {treat && (
          <div className="grid grid-cols-2 gap-3">
            {treat.treatment_types && treat.treatment_types.length > 0 && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Treatment Types</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {treat.treatment_types.map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
            {treat.therapy_type && (
              <div>
                <p className="text-xs text-muted-foreground">Therapy</p>
                <p>{treat.therapy_type}</p>
              </div>
            )}
            {treat.dialysis_status && (
              <div>
                <p className="text-xs text-muted-foreground">Dialysis</p>
                <p>{treat.dialysis_status}</p>
              </div>
            )}
            {treat.dietary_intervention && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Dietary Intervention</p>
                <p>{treat.dietary_intervention}</p>
              </div>
            )}
            {treat.is_active != null && (
              <div>
                <Badge variant={treat.is_active ? "default" : "secondary"} className="text-xs">
                  {treat.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* Care Team */}
      <SectionCard icon={Users} title="Care Team" empty={care.length === 0}>
        {care.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {care.map((member, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {member.specialty || "Unspecified"}
              </Badge>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Complications */}
      <SectionCard icon={AlertTriangle} title="Complications" empty={!comp}>
        {comp && (
          <div className="space-y-3">
            {comp.current_complications && comp.current_complications.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {comp.current_complications.map((c, i) => {
                  const icdCode = comp.icd10_mappings?.[c];
                  return icdCode ? (
                    <ICD10Badge key={i} code={icdCode} label={c} />
                  ) : (
                    <Badge key={i} variant="destructive" className="text-xs">{c}</Badge>
                  );
                })}
              </div>
            )}
            <div className="flex gap-4 text-xs">
              {comp.treatment_response && (
                <span>Response: <span className="font-medium">{comp.treatment_response}</span></span>
              )}
              {comp.follow_up_required != null && (
                <Badge variant={comp.follow_up_required ? "default" : "secondary"} className="text-xs">
                  {comp.follow_up_required ? "Follow-up Required" : "No Follow-up"}
                </Badge>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Prescriptions */}
      {prescriptions && prescriptions.length > 0 && (
        <>
          <Separator />
          <SectionCard icon={Pill} title={`Prescriptions (${prescriptions.length})`}>
            <div className="space-y-3">
              {prescriptions.map((rx, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs">{rx.diagnosis || "No diagnosis"}</span>
                    <Badge variant={rx.is_active ? "default" : "secondary"} className="text-xs">
                      {rx.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {rx.medications.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {rx.medications.map((med, j) => (
                        <Badge key={j} variant="outline" className="text-xs">
                          {med.name || "Unknown"} {med.dosage ? `• ${med.dosage}` : ""} {med.frequency ? `• ${med.frequency}` : ""}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {rx.instructions && (
                    <p className="text-xs text-muted-foreground">{rx.instructions}</p>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
};

export default ClinicalRecordsTab;
