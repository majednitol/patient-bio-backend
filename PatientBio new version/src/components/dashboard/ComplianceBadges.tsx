import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import type { JurisdictionCode } from "@/hooks/useDataTransferAgreements";

export interface RegulationInfo {
  code: string;
  name: string;
  color: string;
}

export const JURISDICTION_REGULATIONS: Record<string, RegulationInfo> = {
  US: { code: "HIPAA", name: "Health Insurance Portability & Accountability Act", color: "bg-blue-100 text-blue-800 border-blue-200" },
  EU: { code: "GDPR", name: "General Data Protection Regulation", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  UK: { code: "UK GDPR", name: "UK General Data Protection Regulation", color: "bg-purple-100 text-purple-800 border-purple-200" },
  BD: { code: "BDPA", name: "Bangladesh Digital Protection Act", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  IN: { code: "DISHA", name: "Digital Information Security in Healthcare Act", color: "bg-orange-100 text-orange-800 border-orange-200" },
  CA: { code: "PIPEDA", name: "Personal Information Protection & Electronic Documents Act", color: "bg-red-100 text-red-800 border-red-200" },
  BR: { code: "LGPD", name: "Lei Geral de Proteção de Dados", color: "bg-green-100 text-green-800 border-green-200" },
  SG: { code: "PDPA", name: "Personal Data Protection Act", color: "bg-teal-100 text-teal-800 border-teal-200" },
  AU: { code: "Privacy Act", name: "Privacy Act 1988", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  JP: { code: "APPI", name: "Act on Protection of Personal Information", color: "bg-pink-100 text-pink-800 border-pink-200" },
  CN: { code: "PIPL", name: "Personal Information Protection Law", color: "bg-rose-100 text-rose-800 border-rose-200" },
  AE: { code: "PDPL", name: "Personal Data Protection Law", color: "bg-amber-100 text-amber-800 border-amber-200" },
  ZA: { code: "POPIA", name: "Protection of Personal Information Act", color: "bg-lime-100 text-lime-800 border-lime-200" },
};

export function getRegulationsForJurisdictions(
  source?: JurisdictionCode | string,
  destination?: JurisdictionCode | string
): RegulationInfo[] {
  const regulations: RegulationInfo[] = [];
  const seen = new Set<string>();

  [source, destination].forEach((j) => {
    if (j && JURISDICTION_REGULATIONS[j] && !seen.has(j)) {
      seen.add(j);
      regulations.push(JURISDICTION_REGULATIONS[j]);
    }
  });

  return regulations;
}

interface ComplianceBadgesProps {
  sourceJurisdiction?: JurisdictionCode | string;
  destinationJurisdiction?: JurisdictionCode | string;
  compact?: boolean;
  showIcon?: boolean;
}

const ComplianceBadges = ({
  sourceJurisdiction,
  destinationJurisdiction,
  compact = false,
  showIcon = true,
}: ComplianceBadgesProps) => {
  const regulations = getRegulationsForJurisdictions(sourceJurisdiction, destinationJurisdiction);

  if (regulations.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {showIcon && <Shield className="h-3.5 w-3.5 text-muted-foreground" />}
      {regulations.map((reg) => (
        <Badge
          key={reg.code}
          variant="outline"
          className={`text-[10px] font-semibold ${compact ? "px-1.5 py-0" : "px-2 py-0.5"} ${reg.color}`}
          title={reg.name}
        >
          {reg.code}
        </Badge>
      ))}
    </div>
  );
};

export default ComplianceBadges;
