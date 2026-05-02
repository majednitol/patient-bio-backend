import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUpdatePrescription, Prescription } from "@/hooks/usePrescriptions";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Trash2, CalendarIcon, Pencil, Sun, Cloud, Moon } from "lucide-react";

const timingPatternSchema = z.object({
  morning: z.number().min(0).max(3),
  noon: z.number().min(0).max(3),
  night: z.number().min(0).max(3),
}).optional();

const medicationSchema = z.object({
  name: z.string().min(1, "Medication name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  duration: z.string().min(1, "Duration is required"),
  instructions: z.string().optional(),
  timingPattern: timingPatternSchema,
});

const formSchema = z.object({
  chief_complaints: z.string().optional(),
  diagnosis: z.string().optional(),
  investigations: z.string().optional(),
  medications: z.array(medicationSchema).min(1, "At least one medication is required"),
  instructions: z.string().optional(),
  advice: z.string().optional(),
  notes: z.string().optional(),
  follow_up_date: z.date().optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface EditPrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: Prescription;
  patientName?: string;
}

// Timing grid cell component
const TimingCell = ({
  icon: Icon,
  value,
  onChange,
}: {
  icon: React.ElementType;
  value: number;
  onChange: (v: number) => void;
}) => (
  <button
    type="button"
    onClick={() => onChange(value >= 2 ? 0 : value + 1)}
    className={cn(
      "flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-md border text-xs transition-colors",
      value > 0
        ? "bg-primary/10 border-primary/30 text-primary font-semibold"
        : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
    )}
  >
    <Icon className="h-3 w-3" />
    <span>{value}</span>
  </button>
);

export const EditPrescriptionDialog = ({
  open,
  onOpenChange,
  prescription,
  patientName,
}: EditPrescriptionDialogProps) => {
  const updatePrescription = useUpdatePrescription();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      chief_complaints: prescription.chief_complaints || "",
      diagnosis: prescription.diagnosis || "",
      investigations: prescription.investigations || "",
      medications: prescription.medications.length > 0 
        ? prescription.medications.map(m => ({ ...m, timingPattern: m.timingPattern }))
        : [{ name: "", dosage: "", frequency: "", duration: "", instructions: "" }],
      instructions: prescription.instructions || "",
      advice: prescription.advice || "",
      notes: prescription.notes || "",
      follow_up_date: prescription.follow_up_date 
        ? parseISO(prescription.follow_up_date) 
        : null,
    },
  });

  // Reset form when prescription changes
  useEffect(() => {
    if (open && prescription) {
      form.reset({
        chief_complaints: prescription.chief_complaints || "",
        diagnosis: prescription.diagnosis || "",
        investigations: prescription.investigations || "",
        medications: prescription.medications.length > 0 
          ? prescription.medications.map(m => ({ ...m, timingPattern: m.timingPattern }))
          : [{ name: "", dosage: "", frequency: "", duration: "", instructions: "" }],
        instructions: prescription.instructions || "",
        advice: prescription.advice || "",
        notes: prescription.notes || "",
        follow_up_date: prescription.follow_up_date 
          ? parseISO(prescription.follow_up_date) 
          : null,
      });
    }
  }, [open, prescription, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "medications",
  });

  const onSubmit = async (data: FormData) => {
    const medications = data.medications.map(med => ({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      duration: med.duration,
      instructions: med.instructions,
      ...(med.timingPattern ? { timingPattern: { morning: med.timingPattern.morning ?? 0, noon: med.timingPattern.noon ?? 0, night: med.timingPattern.night ?? 0 } } : {}),
    }));

    await updatePrescription.mutateAsync({
      id: prescription.id,
      chief_complaints: data.chief_complaints,
      diagnosis: data.diagnosis,
      investigations: data.investigations,
      medications,
      instructions: data.instructions,
      advice: data.advice,
      notes: data.notes,
      follow_up_date: data.follow_up_date
        ? format(data.follow_up_date, "yyyy-MM-dd")
        : undefined,
    });

    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-base sm:text-lg">Edit Prescription</span>
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Patient: <strong>{patientName || "Unknown Patient"}</strong>
            <br />
            <span className="text-xs">
              Created: {format(new Date(prescription.created_at), "MMM d, yyyy")}
            </span>
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            {/* Chief Complaints */}
            <FormField
              control={form.control}
              name="chief_complaints"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chief Complaints</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Chest pain for 3 days, shortness of breath" className="min-h-[60px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Diagnosis */}
            <FormField
              control={form.control}
              name="diagnosis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagnosis</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Upper respiratory infection" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Investigations */}
            <FormField
              control={form.control}
              name="investigations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Investigations</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., CBC, LFT, ECG" className="min-h-[60px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Medications */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel className="text-sm sm:text-base">Medications</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ name: "", dosage: "", frequency: "", duration: "", instructions: "" })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Add Medication</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border rounded-lg p-2.5 sm:p-4 space-y-2 sm:space-y-3 bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Medication {index + 1}</span>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    <FormField
                      control={form.control}
                      name={`medications.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Medication name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`medications.${index}.dosage`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Dosage</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 500mg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`medications.${index}.frequency`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Frequency</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Twice daily" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`medications.${index}.duration`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Duration</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 7 days" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Timing Pattern Grid */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Dosage Timing (optional)</p>
                    <div className="flex gap-2">
                      <TimingCell
                        icon={Sun}
                        value={form.watch(`medications.${index}.timingPattern`)?.morning ?? 0}
                        onChange={(v) => {
                          const current = form.getValues(`medications.${index}.timingPattern`) || { morning: 0, noon: 0, night: 0 };
                          form.setValue(`medications.${index}.timingPattern`, { ...current, morning: v });
                        }}
                      />
                      <TimingCell
                        icon={Cloud}
                        value={form.watch(`medications.${index}.timingPattern`)?.noon ?? 0}
                        onChange={(v) => {
                          const current = form.getValues(`medications.${index}.timingPattern`) || { morning: 0, noon: 0, night: 0 };
                          form.setValue(`medications.${index}.timingPattern`, { ...current, noon: v });
                        }}
                      />
                      <TimingCell
                        icon={Moon}
                        value={form.watch(`medications.${index}.timingPattern`)?.night ?? 0}
                        onChange={(v) => {
                          const current = form.getValues(`medications.${index}.timingPattern`) || { morning: 0, noon: 0, night: 0 };
                          form.setValue(`medications.${index}.timingPattern`, { ...current, night: v });
                        }}
                      />
                      {form.watch(`medications.${index}.timingPattern`) &&
                        (form.watch(`medications.${index}.timingPattern`)!.morning > 0 ||
                         form.watch(`medications.${index}.timingPattern`)!.noon > 0 ||
                         form.watch(`medications.${index}.timingPattern`)!.night > 0) && (
                        <div className="flex items-center ml-2">
                          <Badge variant="secondary" className="text-xs font-mono">
                            {form.watch(`medications.${index}.timingPattern`)!.morning}+
                            {form.watch(`medications.${index}.timingPattern`)!.noon}+
                            {form.watch(`medications.${index}.timingPattern`)!.night}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name={`medications.${index}.instructions`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Special Instructions (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Take after meals" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
              {form.formState.errors.medications?.message && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.medications.message}
                </p>
              )}
            </div>

            {/* General Instructions */}
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>General Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="General advice for the patient..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Advice */}
            <FormField
              control={form.control}
              name="advice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Advice (Diet, Lifestyle, Precautions)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Avoid spicy food, regular exercise, adequate rest"
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinical Notes (Private)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes for your reference..."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Follow-up Date */}
            <FormField
              control={form.control}
              name="follow_up_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Follow-up Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updatePrescription.isPending}>
                {updatePrescription.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};