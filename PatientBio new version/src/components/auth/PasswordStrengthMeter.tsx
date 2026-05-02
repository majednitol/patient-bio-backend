import { useMemo } from "react";

interface PasswordStrengthMeterProps {
  password: string;
}

const getStrength = (password: string): { score: number; label: string } => {
  if (!password) return { score: 0, label: "" };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Weak" };
  if (score <= 2) return { score: 2, label: "Fair" };
  if (score <= 3) return { score: 3, label: "Good" };
  return { score: 4, label: "Strong" };
};

const colorMap: Record<number, string> = {
  1: "bg-destructive",
  2: "bg-orange-500",
  3: "bg-yellow-500",
  4: "bg-green-500",
};

export const PasswordStrengthMeter = ({ password }: PasswordStrengthMeterProps) => {
  const { score, label } = useMemo(() => getStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i <= score ? colorMap[score] : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${score <= 1 ? "text-destructive" : score <= 2 ? "text-orange-500" : score <= 3 ? "text-yellow-600" : "text-green-600"}`}>
        {label}
      </p>
    </div>
  );
};
