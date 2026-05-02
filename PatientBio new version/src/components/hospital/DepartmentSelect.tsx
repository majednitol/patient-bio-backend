import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDepartments } from "@/hooks/useDepartments";
import { Loader2 } from "lucide-react";

interface DepartmentSelectProps {
  hospitalId: string;
  value?: string | null;
  onChange: (departmentId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DepartmentSelect({
  hospitalId,
  value,
  onChange,
  placeholder = "Select department",
  disabled = false,
}: DepartmentSelectProps) {
  const { data: departments, isLoading } = useDepartments(hospitalId);

  if (isLoading) {
    return (
      <div className="flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Select
      value={value || "none"}
      onValueChange={(val) => onChange(val === "none" ? null : val)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">(No department)</SelectItem>
        {departments?.map((dept) => (
          <SelectItem key={dept.id} value={dept.id}>
            {dept.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
