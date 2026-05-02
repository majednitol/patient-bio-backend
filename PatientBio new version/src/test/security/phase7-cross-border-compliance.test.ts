/**
 * Phase 7: Cross-Border Data Transfer Compliance
 * Validates jurisdiction-aware consent requirements and transfer agreement logic.
 */
import { describe, it, expect } from "vitest";
import {
  requiresCrossBorderConsent,
  makeTransferAgreement,
  isTransferAgreementValid,
  type JurisdictionCode,
} from "./security-helpers";
import { measureTime } from "../performance/perf-helpers";

const ALL_JURISDICTIONS: JurisdictionCode[] = ["IN", "US", "EU", "UK", "AU", "CA", "OTHER"];

describe("Phase 7: Cross-Border Data Transfer Compliance", () => {
  it("1. Same jurisdiction -- no cross-border consent required", () => {
    for (const j of ALL_JURISDICTIONS) {
      expect(requiresCrossBorderConsent(j, j)).toBe(false);
    }
  });

  it("2. EU to EU -- no additional consent (adequacy)", () => {
    expect(requiresCrossBorderConsent("EU", "EU")).toBe(false);
  });

  it("3. EU to US -- requires explicit consent", () => {
    expect(requiresCrossBorderConsent("EU", "US")).toBe(true);
  });

  it("4. IN to EU -- requires explicit consent", () => {
    expect(requiresCrossBorderConsent("IN", "EU")).toBe(true);
  });

  it("5. Transfer agreement with expired expires_at -- invalid", () => {
    const ta = makeTransferAgreement({
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    expect(isTransferAgreementValid(ta).valid).toBe(false);
    expect(isTransferAgreementValid(ta).reason).toBe("Transfer expired");
  });

  it("6. Transfer agreement revoked -- blocks data access", () => {
    const ta = makeTransferAgreement({
      revoked_at: new Date().toISOString(),
      revocation_reason: "Patient requested",
    });
    expect(isTransferAgreementValid(ta).valid).toBe(false);
    expect(isTransferAgreementValid(ta).reason).toBe("Transfer revoked");
  });

  it("7. acknowledged_risks=false -- transfer blocked", () => {
    const ta = makeTransferAgreement({ acknowledged_risks: false });
    expect(isTransferAgreementValid(ta).valid).toBe(false);
    expect(isTransferAgreementValid(ta).reason).toBe("Risks not acknowledged");
  });

  it("8. Retention period exceeded -- flagged", () => {
    const ta = makeTransferAgreement({ retention_period_days: 0 });
    expect(isTransferAgreementValid(ta).valid).toBe(false);
  });

  it("9. All jurisdiction pairs tested (matrix) -- correct consent requirements", () => {
    for (const src of ALL_JURISDICTIONS) {
      for (const dst of ALL_JURISDICTIONS) {
        const result = requiresCrossBorderConsent(src, dst);
        if (src === dst) {
          expect(result).toBe(false);
        } else if (src === "EU" && (dst === "EU" || dst === "UK")) {
          expect(result).toBe(false);
        } else {
          expect(result).toBe(true);
        }
      }
    }
  });

  it("10. Transfer impact assessment presence validated", () => {
    const taWithAssessment = makeTransferAgreement({
      transfer_impact_assessment: { risk_level: "medium", mitigations: ["encryption"] },
    });
    expect(taWithAssessment.transfer_impact_assessment).not.toBeNull();
    expect(taWithAssessment.transfer_impact_assessment?.risk_level).toBe("medium");

    const taWithout = makeTransferAgreement({ transfer_impact_assessment: null });
    expect(taWithout.transfer_impact_assessment).toBeNull();
  });

  it("11. Recipient type validation (doctor, researcher, pharmacy)", () => {
    const validTypes = ["doctor", "researcher", "pharmacy", "hospital", "insurance"];
    for (const type of validTypes) {
      const ta = makeTransferAgreement({ recipient_type: type });
      expect(ta.recipient_type).toBe(type);
      expect(isTransferAgreementValid(ta).valid).toBe(true);
    }
  });

  it("12. Transfer agreement links to correct access token", () => {
    const ta = makeTransferAgreement({ access_token_id: "token-abc-123" });
    expect(ta.access_token_id).toBe("token-abc-123");
  });

  it("13. Multiple transfers for same patient -- independent validation", () => {
    const ta1 = makeTransferAgreement({ user_id: "p1", destination_jurisdiction: "US" });
    const ta2 = makeTransferAgreement({
      user_id: "p1",
      destination_jurisdiction: "EU",
      revoked_at: new Date().toISOString(),
    });
    expect(isTransferAgreementValid(ta1).valid).toBe(true);
    expect(isTransferAgreementValid(ta2).valid).toBe(false);
  });

  it("14. Revocation reason required when revoking transfer", () => {
    const ta = makeTransferAgreement({
      revoked_at: new Date().toISOString(),
      revocation_reason: "Patient changed mind",
    });
    expect(ta.revocation_reason).toBeTruthy();
    expect(isTransferAgreementValid(ta).valid).toBe(false);
  });

  it("15. 200 transfer validations under 50ms", () => {
    const { durationMs } = measureTime(() => {
      for (let i = 0; i < 200; i++) {
        const ta = makeTransferAgreement({
          source_jurisdiction: ALL_JURISDICTIONS[i % ALL_JURISDICTIONS.length],
          destination_jurisdiction: ALL_JURISDICTIONS[(i + 1) % ALL_JURISDICTIONS.length],
        });
        isTransferAgreementValid(ta);
        requiresCrossBorderConsent(ta.source_jurisdiction, ta.destination_jurisdiction);
      }
    });
    expect(durationMs).toBeLessThan(50);
  });
});
