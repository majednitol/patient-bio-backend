import { useState } from "react";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useMedicationReminders, FREQUENCY_OPTIONS, DAYS_OF_WEEK } from "@/hooks/useMedicationReminders";
import { useMedicationChecker, getSeverityLabel, type MedicationInput } from "@/hooks/useMedicationChecker";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, X, AlertTriangle } from "lucide-react";

const formSchema = z.object({
  medication_name: z.string().min(1, "Medication name is required"),
  dosage: z.string().optional(),
  frequency: z.string().min(1, "Frequency is required"),
  days_of_week: z.array(z.number()).min(1, "Select at least one day"),
  notes: z.string().optional(),
});

interface AddMedicationReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddMedicationReminderDialog = ({
  open,
  onOpenChange,
}: AddMedicationReminderDialogProps) => {
  const { createReminder, reminders } = useMedicationReminders();
  const { checkInteractions, isChecking: isCheckingInteractions, result: interactionResult, reset: resetInteractions } = useMedicationChecker();
  const [reminderTimes, setReminderTimes] = useState<string[]>(["08:00"]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      medication_name: "",
      dosage: "",
      frequency: "once_daily",
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      notes: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await createReminder.mutateAsync({
      medication_name: values.medication_name,
      dosage: values.dosage,
      frequency: values.frequency,
      days_of_week: values.days_of_week,
      notes: values.notes,
      reminder_times: reminderTimes,
    });

    // Auto-check interactions with existing active reminders + new one
    const activeNames = reminders
      .filter((r) => r.is_active)
      .map((r): MedicationInput => ({ name: r.medication_name, dosage: r.dosage ?? undefined }));
    const allMeds: MedicationInput[] = [
      ...activeNames,
      { name: values.medication_name, dosage: values.dosage },
    ];
    if (allMeds.length >= 2) {
      checkInteractions({ medications: allMeds });
      // Keep dialog open briefly so user sees the result
      return;
    }

    form.reset();
    resetInteractions();
    setReminderTimes(["08:00"]);
    onOpenChange(false);
  };

  const handleClose = () => {
    form.reset();
    resetInteractions();
    setReminderTimes(["08:00"]);
    onOpenChange(false);
  };

  const addTime = () => {
    setReminderTimes([...reminderTimes, "12:00"]);
  };

  const removeTime = (index: number) => {
    setReminderTimes(reminderTimes.filter((_, i) => i !== index));
  };

  const updateTime = (index: number, value: string) => {
    const newTimes = [...reminderTimes];
    newTimes[index] = value;
    setReminderTimes(newTimes);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-[500px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Add Medication Reminder</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Set up a reminder to take your medication on time.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="medication_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medication Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Metformin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dosage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dosage (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 500mg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Reminder Times</FormLabel>
              <div className="space-y-2 mt-2">
                {reminderTimes.map((time, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => updateTime(index, e.target.value)}
                      className="flex-1"
                    />
                    {reminderTimes.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTime(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTime}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time
                </Button>
              </div>
            </div>

            <FormField
              control={form.control}
              name="days_of_week"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Days</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <label
                        key={day.value}
                        className={`flex items-center justify-center w-10 h-10 rounded-full cursor-pointer border-2 transition-colors ${
                          field.value.includes(day.value)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-muted hover:border-primary/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={field.value.includes(day.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              field.onChange([...field.value, day.value]);
                            } else {
                              field.onChange(field.value.filter((v) => v !== day.value));
                            }
                          }}
                        />
                        <span className="text-xs font-medium">{day.label}</span>
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Take with food"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Interaction check result after creation */}
            {interactionResult && interactionResult.interactions.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Interaction Warning</AlertTitle>
                <AlertDescription className="space-y-1">
                  {interactionResult.interactions.map((ix, i) => (
                    <p key={i} className="text-xs">
                      <strong>{ix.medication1} + {ix.medication2}</strong> — {getSeverityLabel(ix.severity)}: {ix.description}
                    </p>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {interactionResult && interactionResult.interactions.length === 0 && (
              <p className="text-sm text-primary flex items-center gap-1">
                ✓ No interactions detected with your current medications.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                {interactionResult ? "Close" : "Cancel"}
              </Button>
              {!interactionResult && (
                <Button type="submit" disabled={createReminder.isPending}>
                  {createReminder.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Reminder
                </Button>
              )}
            </div>
          </form>
        </Form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
