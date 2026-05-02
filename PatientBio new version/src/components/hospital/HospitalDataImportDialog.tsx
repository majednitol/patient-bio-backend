import { useState, useCallback } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Users,
  Building2,
  Bed,
  UserPlus,
  Receipt,
  ClipboardList,
  Loader2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useHospitalDataImport, ImportType, ConflictResolution, ImportResult } from "@/hooks/useHospitalDataImport";

interface HospitalDataImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospitalId: string;
  initialType?: ImportType;
}

const IMPORT_TYPES = [
  { 
    value: 'departments' as ImportType, 
    label: 'Departments', 
    icon: Building2,
    description: 'Import organizational departments',
    columns: 'name, description, head_staff_email',
  },
  { 
    value: 'staff' as ImportType, 
    label: 'Staff Roster', 
    icon: Users,
    description: 'Import staff members and send invitations',
    columns: 'name, email, role, department_name, employee_id',
  },
  { 
    value: 'wards' as ImportType, 
    label: 'Wards & Beds', 
    icon: Bed,
    description: 'Import wards and bed configurations',
    columns: 'ward_name, ward_description, bed_number, bed_type',
  },
  { 
    value: 'patients' as ImportType, 
    label: 'Patient Registry', 
    icon: UserPlus,
    description: 'Connect with existing patients',
    columns: 'patient_email, patient_name, date_of_birth, phone, ghpid',
  },
  { 
    value: 'admissions' as ImportType, 
    label: 'Admissions History', 
    icon: ClipboardList,
    description: 'Import historical admission records',
    columns: 'patient_email, admission_date, doctor_email, diagnosis',
  },
  { 
    value: 'invoices' as ImportType, 
    label: 'Invoices & Billing', 
    icon: Receipt,
    description: 'Import billing and invoice data',
    columns: 'patient_email, invoice_date, subtotal, tax_amount',
  },
];

const CSV_TEMPLATES: Record<ImportType, string> = {
  departments: `name,description,head_staff_email
Cardiology,Heart and cardiovascular diseases,dr.smith@example.com
Emergency,Emergency and critical care,dr.johnson@example.com
Pediatrics,Children's healthcare,`,
  staff: `name,email,role,department_name,employee_id,specialty,license_number
Dr. Jane Smith,jane@hospital.com,doctor,Cardiology,EMP001,Cardiologist,BMDC-12345
Nurse John Doe,john@hospital.com,nurse,Emergency,EMP002,,
Receptionist Sarah,sarah@hospital.com,receptionist,,EMP003,,`,
  wards: `ward_name,ward_description,bed_number,bed_type,daily_rate
ICU,Intensive Care Unit,ICU-001,icu_premium,5000
ICU,Intensive Care Unit,ICU-002,icu,3500
General,General Ward,G-001,standard,1000
General,General Ward,G-002,standard,1000`,
  patients: `ghpid,patient_name,patient_email,date_of_birth,phone,gender
PB-202601-000123-5,John Doe,john@example.com,1985-05-15,+1234567890,Male
PB-202601-000124-4,Jane Smith,jane@example.com,1990-03-22,+0987654321,Female
,Michael Johnson,michael@example.com,1975-11-10,+1111111111,Male`,
  admissions: `patient_email,admission_date,expected_discharge,admission_reason,diagnosis,doctor_email,bed_number,ward_name,status
john@example.com,2026-02-01,2026-02-08,Chest pain,Angina,dr.smith@example.com,ICU-001,ICU,admitted
jane@example.com,2026-01-28,2026-02-10,Post-op care,Appendectomy,jane@hospital.com,G-001,General,discharged`,
  invoices: `patient_email,invoice_date,subtotal,tax_amount,discount_amount,notes
john@example.com,2026-02-08,50000,5000,2500,Admission charges Feb 1-8
jane@example.com,2026-02-08,35000,3500,0,General ward charges`,
};

type Step = 'select' | 'upload' | 'preview' | 'importing' | 'complete';

export function HospitalDataImportDialog({
  open,
  onOpenChange,
  hospitalId,
  initialType,
}: HospitalDataImportDialogProps) {
  const [step, setStep] = useState<Step>('select');
  const [importType, setImportType] = useState<ImportType | null>(initialType || null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [previewData, setPreviewData] = useState<{ headers: string[]; rows: string[][] }>({ headers: [], rows: [] });
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>('skip');
  const [sendInvitations, setSendInvitations] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  
  const importMutation = useHospitalDataImport();
  
  const resetDialog = useCallback(() => {
    setStep('select');
    setImportType(initialType || null);
    setCsvContent('');
    setFileName('');
    setPreviewData({ headers: [], rows: [] });
    setConflictResolution('skip');
    setSendInvitations(true);
    setResult(null);
  }, [initialType]);
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      
      // Parse for preview
      const lines = content.trim().split('\n');
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = lines.slice(1, 7).map(line => 
          line.split(',').map(v => v.trim().replace(/"/g, ''))
        );
        setPreviewData({ headers, rows });
      }
    };
    reader.readAsText(file);
  };
  
  const downloadTemplate = () => {
    if (!importType) return;
    const template = CSV_TEMPLATES[importType];
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${importType}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleImport = async () => {
    if (!importType || !csvContent) return;
    
    setStep('importing');
    
    try {
      const importResult = await importMutation.mutateAsync({
        hospitalId,
        importType,
        csvContent,
        conflictResolution,
        sendInvitations: importType === 'staff' ? sendInvitations : undefined,
      });
      
      setResult(importResult);
      setStep('complete');
    } catch (error) {
      setStep('preview');
    }
  };
  
  const downloadErrorReport = () => {
    if (!result?.errors.length) return;
    const report = result.errors.map(e => `Row ${e.row}: ${e.error}`).join('\n');
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_errors.txt';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };
  
  const selectedTypeInfo = importType ? IMPORT_TYPES.find(t => t.value === importType) : null;
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Hospital Data
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Select the type of data you want to import'}
            {step === 'upload' && `Upload a CSV file for ${selectedTypeInfo?.label}`}
            {step === 'preview' && 'Review and configure your import'}
            {step === 'importing' && 'Processing your import...'}
            {step === 'complete' && 'Import complete'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {/* Step 1: Select Import Type */}
          {step === 'select' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {IMPORT_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <Card
                    key={type.value}
                    className={`cursor-pointer transition-all hover:border-primary ${
                      importType === type.value ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setImportType(type.value)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Icon className="h-4 w-4" />
                        {type.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">{type.columns}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          
          {/* Step 2: Upload File */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <Label htmlFor="csv-upload" className="cursor-pointer">
                  <span className="text-primary font-medium">Click to upload</span>
                  <span className="text-muted-foreground"> or drag and drop</span>
                  <p className="text-sm text-muted-foreground mt-1">CSV files only</p>
                </Label>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                {fileName && (
                  <p className="mt-4 text-sm font-medium">{fileName}</p>
                )}
              </div>
              
              <Button variant="outline" onClick={downloadTemplate} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download {selectedTypeInfo?.label} Template
              </Button>
            </div>
          )}
          
          {/* Step 3: Preview & Configure */}
          {step === 'preview' && (
            <div className="space-y-4">
              {previewData.headers.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Preview (first 6 rows)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-48">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {previewData.headers.map((header, i) => (
                              <TableHead key={i} className="text-xs whitespace-nowrap">{header}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.rows.map((row, i) => (
                            <TableRow key={i}>
                              {row.map((cell, j) => (
                                <TableCell key={j} className="text-xs truncate max-w-32">{cell}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Conflict Resolution</Label>
                  <Select value={conflictResolution} onValueChange={(v) => setConflictResolution(v as ConflictResolution)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip duplicates</SelectItem>
                      <SelectItem value="merge">Merge (update non-empty fields)</SelectItem>
                      <SelectItem value="replace">Replace existing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {importType === 'staff' && (
                  <div className="space-y-2">
                    <Label>Staff Options</Label>
                    <div className="flex items-center space-x-2 pt-2">
                      <Switch
                        id="send-invitations"
                        checked={sendInvitations}
                        onCheckedChange={setSendInvitations}
                      />
                      <Label htmlFor="send-invitations" className="text-sm font-normal">
                        Send invitations to new staff
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Processing your import...</p>
              <Progress value={50} className="w-64 mx-auto" />
            </div>
          )}
          
          {/* Step 5: Complete */}
          {step === 'complete' && result && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="text-center p-4">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <p className="text-2xl font-bold">{result.imported}</p>
                  <p className="text-sm text-muted-foreground">Imported</p>
                </Card>
                <Card className="text-center p-4">
                  <AlertTriangle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                  <p className="text-2xl font-bold">{result.skipped}</p>
                  <p className="text-sm text-muted-foreground">Skipped</p>
                </Card>
                <Card className="text-center p-4">
                  <XCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                  <p className="text-2xl font-bold">{result.failed}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </Card>
              </div>
              
              {result.errors.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-destructive">Errors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-32">
                      <ul className="space-y-1">
                        {result.errors.slice(0, 10).map((err, i) => (
                          <li key={i} className="text-sm text-muted-foreground">
                            <Badge variant="outline" className="mr-2">Row {err.row}</Badge>
                            {err.error}
                          </li>
                        ))}
                        {result.errors.length > 10 && (
                          <li className="text-sm text-muted-foreground">
                            ... and {result.errors.length - 10} more errors
                          </li>
                        )}
                      </ul>
                    </ScrollArea>
                    <Button variant="outline" size="sm" onClick={downloadErrorReport} className="mt-2">
                      <Download className="h-4 w-4 mr-2" />
                      Download Error Report
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              {result.warnings.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-yellow-600">Warnings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-24">
                      <ul className="space-y-1">
                        {result.warnings.slice(0, 5).map((warn, i) => (
                          <li key={i} className="text-sm text-muted-foreground">{warn}</li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
        
        {/* Footer Navigation */}
        <div className="flex justify-between pt-4 border-t">
          {step !== 'select' && step !== 'importing' && step !== 'complete' && (
            <Button
              variant="outline"
              onClick={() => {
                if (step === 'upload') setStep('select');
                if (step === 'preview') {
                  setStep('upload');
                  setCsvContent('');
                  setFileName('');
                  setPreviewData({ headers: [], rows: [] });
                }
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          
          {step === 'select' && (
            <>
              <div />
              <Button onClick={() => setStep('upload')} disabled={!importType}>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}
          
          {step === 'upload' && (
            <Button onClick={() => setStep('preview')} disabled={!csvContent}>
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          
          {step === 'preview' && (
            <Button onClick={handleImport} disabled={importMutation.isPending}>
              {importMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  Start Import
                  <Upload className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
          
          {step === 'complete' && (
            <>
              <Button variant="outline" onClick={resetDialog}>
                Import More
              </Button>
              <Button onClick={handleClose}>
                Done
              </Button>
            </>
          )}
          
          {step === 'importing' && <div />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
