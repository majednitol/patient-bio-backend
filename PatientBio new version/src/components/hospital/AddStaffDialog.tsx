import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Loader2, UserPlus, Mail, Copy, Check } from "lucide-react";
import { STAFF_ROLES, HospitalStaffRole } from "@/types/hospital";
import {
  useCheckUserByEmail,
  useAddExistingStaff,
  useSendStaffInvitation,
} from "@/hooks/useAddHospitalStaff";
import { DepartmentSelect } from "./DepartmentSelect";
import { toast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "doctor", "receptionist", "nurse"]),
  departmentId: z.string().optional(),
  employeeId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospitalId: string;
  hospitalName: string;
}

export function AddStaffDialog({
  open,
  onOpenChange,
  hospitalId,
  hospitalName,
}: AddStaffDialogProps) {
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const checkUser = useCheckUserByEmail();
  const addExistingStaff = useAddExistingStaff();
  const sendInvitation = useSendStaffInvitation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "receptionist",
      departmentId: "",
      employeeId: "",
    },
  });

  const isLoading = checkUser.isPending || addExistingStaff.isPending || sendInvitation.isPending;

  const onSubmit = async (values: FormValues) => {
    try {
      // Check if user exists
      const userId = await checkUser.mutateAsync(values.email);

      if (userId) {
        // User exists - add directly
        await addExistingStaff.mutateAsync({
          hospitalId,
          userId,
          role: values.role as HospitalStaffRole,
          departmentId: values.departmentId || undefined,
          employeeId: values.employeeId || undefined,
        });
        handleClose();
      } else {
        // User doesn't exist - send invitation
        const result = await sendInvitation.mutateAsync({
          hospitalId,
          email: values.email,
          name: values.name,
          role: values.role as HospitalStaffRole,
          departmentId: values.departmentId || undefined,
          employeeId: values.employeeId || undefined,
          hospitalName,
        });

        // Show invitation link for manual sharing
        const link = `${window.location.origin}/staff-invitation/${result.invitation.token}`;
        setInvitationLink(link);

        if (!result.emailSent) {
          toast.info("Copy the invitation link to share manually");
        }
      }
    } catch (error) {
      console.error("Error adding staff:", error);
    }
  };

  const handleClose = () => {
    form.reset();
    setInvitationLink(null);
    setCopied(false);
    onOpenChange(false);
  };

  const copyLink = async () => {
    if (invitationLink) {
      await navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Staff Member
          </DialogTitle>
          <DialogDescription>
            Add a new staff member to {hospitalName}. If they have an existing account,
            they'll be added immediately. Otherwise, they'll receive an invitation.
          </DialogDescription>
        </DialogHeader>

        {invitationLink ? (
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Invitation Created
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                An invitation has been created for {form.getValues("email")}.
                Share this link with them:
              </p>
              <div className="flex gap-2">
                <Input
                  value={invitationLink}
                  readOnly
                  className="text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyLink}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This link expires in 24 hours.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      We'll check if they have an existing account
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STAFF_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department (Optional)</FormLabel>
                    <FormControl>
                      <DepartmentSelect
                        hospitalId={hospitalId}
                        value={field.value || null}
                        onChange={(val) => field.onChange(val || "")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., EMP-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Add Staff"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
