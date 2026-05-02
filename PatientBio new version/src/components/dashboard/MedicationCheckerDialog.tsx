/**
 * MedicationCheckerDialog - UI for checking medication interactions
 * Part of Enhanced AI Technology (Phase 5.1)
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  useMedicationChecker,
  getSeverityColor,
  getSeverityLabel,
  getRiskColor,
  type MedicationInput,
} from '@/hooks/useMedicationChecker';
import {
  Pill,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ShieldAlert,
  Info,
} from 'lucide-react';

interface MedicationCheckerDialogProps {
  trigger?: React.ReactNode;
  defaultMedications?: MedicationInput[];
}

export function MedicationCheckerDialog({
  trigger,
  defaultMedications = [],
}: MedicationCheckerDialogProps) {
  const [open, setOpen] = useState(false);
  const [medications, setMedications] = useState<MedicationInput[]>(
    defaultMedications.length > 0 ? defaultMedications : [{ name: '' }, { name: '' }]
  );
  const { checkInteractions, isChecking, result, reset } = useMedicationChecker();

  const addMedication = () => {
    setMedications([...medications, { name: '' }]);
  };

  const removeMedication = (index: number) => {
    if (medications.length > 2) {
      setMedications(medications.filter((_, i) => i !== index));
    }
  };

  const updateMedication = (index: number, field: keyof MedicationInput, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleCheck = async () => {
    const validMeds = medications.filter(m => m.name.trim());
    if (validMeds.length < 2) return;
    await checkInteractions({ medications: validMeds });
  };

  const handleReset = () => {
    reset();
    setMedications([{ name: '' }, { name: '' }]);
  };

  const validMedicationCount = medications.filter(m => m.name.trim()).length;

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'high':
        return <XCircle className="h-5 w-5" />;
      case 'moderate':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <CheckCircle className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Pill className="h-4 w-4" />
            Check Interactions
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Medication Interaction Checker
          </DialogTitle>
          <DialogDescription>
            Enter your medications to check for potential drug interactions
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {!result ? (
            <div className="space-y-4">
              <div className="space-y-3">
                {medications.map((med, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label htmlFor={`med-${index}`} className="sr-only">
                            Medication {index + 1}
                          </Label>
                          <Input
                            id={`med-${index}`}
                            placeholder={`Medication ${index + 1} (e.g., Aspirin)`}
                            value={med.name}
                            onChange={(e) => updateMedication(index, 'name', e.target.value)}
                          />
                        </div>
                        <Input
                          placeholder="Dosage"
                          value={med.dosage || ''}
                          onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                          className="w-24"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMedication(index)}
                      disabled={medications.length <= 2}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={addMedication}
                className="w-full gap-2"
                disabled={medications.length >= 10}
              >
                <Plus className="h-4 w-4" />
                Add Another Medication
              </Button>

              <Separator />

              <div className="flex gap-2">
                <Button
                  onClick={handleCheck}
                  disabled={isChecking || validMedicationCount < 2}
                  className="flex-1 gap-2"
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="h-4 w-4" />
                      Check Interactions
                    </>
                  )}
                </Button>
              </div>

              {validMedicationCount < 2 && (
                <p className="text-sm text-muted-foreground text-center">
                  Enter at least 2 medications to check for interactions
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Overall Risk */}
              <Card className={getRiskColor(result.overallRisk)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {getRiskIcon(result.overallRisk)}
                    <div>
                      <p className="font-semibold">
                        Overall Risk: {result.overallRisk.charAt(0).toUpperCase() + result.overallRisk.slice(1)}
                      </p>
                      <p className="text-sm opacity-80">
                        {result.interactions.length} interaction{result.interactions.length !== 1 ? 's' : ''} found
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Interactions */}
              {result.interactions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Interactions Found
                  </h4>
                  {result.interactions.map((interaction, index) => (
                    <Card key={index} className={getSeverityColor(interaction.severity)}>
                      <CardHeader className="p-3 pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">
                            {interaction.medication1} + {interaction.medication2}
                          </CardTitle>
                          <Badge variant="outline" className={getSeverityColor(interaction.severity)}>
                            {getSeverityLabel(interaction.severity)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-1">
                        <p className="text-sm">{interaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          <strong>Recommendation:</strong> {interaction.recommendation}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* General Warnings */}
              {result.generalWarnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    General Notes
                  </h4>
                  <ul className="space-y-1">
                    {result.generalWarnings.map((warning, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disclaimer */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important Disclaimer</AlertTitle>
                <AlertDescription className="text-xs">
                  {result.disclaimer}
                </AlertDescription>
              </Alert>

              <Button onClick={handleReset} variant="outline" className="w-full">
                Check Different Medications
              </Button>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
