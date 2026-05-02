import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Loader2, Users } from "lucide-react";
import { useQuickRegisterWithFamily, RELATIONSHIP_OPTIONS } from "@/hooks/useFamilyMembers";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { FuzzyPatientSearchResults } from "./FuzzyPatientSearchResults";

const formSchema = z.object({
  // Patient details
  display_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Enter a valid phone number"),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  // Family member details
  family_member_name: z.string().min(2, "Family member name is required"),
  family_member_phone: z.string().min(10, "Enter a valid phone number"),
  relationship: z.string().min(1, "Please select a relationship"),
});

type FormValues = z.infer<typeof formSchema>;

interface QuickPatientRegisterDialogProps {
  hospitalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (patientId: string) => void;
}

export default function QuickPatientRegisterDialog({
  hospitalId,
  open,
  onOpenChange,
  onSuccess,
}: QuickPatientRegisterDialogProps) {
  const registerPatient = useQuickRegisterWithFamily();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      display_name: "",
      phone: "",
      date_of_birth: "",
      gender: "",
      family_member_name: "",
      family_member_phone: "",
      relationship: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const result = await registerPatient.mutateAsync({
        hospitalId,
        display_name: values.display_name,
        phone: values.phone,
        date_of_birth: values.date_of_birth || null,
        gender: values.gender || null,
        family_member_name: values.family_member_name,
        family_member_phone: values.family_member_phone,
        relationship: values.relationship,
      });

      toast.success("Patient registered successfully with family member account");
      form.reset();
      onOpenChange(false);
      
      if (onSuccess && result.patientId) {
        onSuccess(result.patientId);
      }

      // Auto-trigger duplicate detection for the new patient
      if (result.patientId) {
        supabase.functions.invoke("detect-duplicate-patients", {
          body: { hospital_id: hospitalId, patient_id: result.patientId },
        }).then(({ data }) => {
          if (data?.candidates?.length > 0) {
            toast({
              title: "Potential Duplicates Found",
              description: `${data.candidates.length} possible duplicate(s) detected. Review in the dashboard.`,
              variant: "destructive",
            });
          }
        }).catch(() => { /* silent fail for background scan */ });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to register patient");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Quick Patient Registration
          </DialogTitle>
          <DialogDescription>
            Register a walk-in patient under a family member's account. The family member will manage this patient's records.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Patient Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <UserPlus className="h-4 w-4" />
                Patient Information
              </div>

              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter patient's full name" {...field} />
                    </FormControl>
                     <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fuzzy search results when typing patient name */}
              <FuzzyPatientSearchResults nameQuery={form.watch("display_name")} />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Phone Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter patient's phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Family Member Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="h-4 w-4" />
                Family Member / Guardian (Account Holder)
              </div>
              <p className="text-xs text-muted-foreground">
                This person will manage the patient's account and can transfer ownership later.
              </p>

              <FormField
                control={form.control}
                name="family_member_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Family Member Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter family member's name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="family_member_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Family Member Phone *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter family member's phone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="relationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship to Patient *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RELATIONSHIP_OPTIONS.map((option) => (
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
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={registerPatient.isPending}>
                {registerPatient.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Register Patient
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
