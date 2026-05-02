/**
 * Phase 6: Bundle Size & Code-Splitting Verification Tests
 * 
 * 15 pure-logic tests verifying that heavy libraries are dynamically imported,
 * lazy wrappers defer loading correctly, and the import graph maintains
 * code-splitting boundaries.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const srcRoot = path.resolve(__dirname, "../..");

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(srcRoot, relPath), "utf-8");
}

// ─── Group 1: Dynamic Import Resolution ────────────────────────────────

describe("Phase 6 – Group 1: Dynamic Import Resolution", () => {
  it("1. import('jspdf') resolves with a default export (jsPDF constructor)", async () => {
    const mod = await import("jspdf");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("2. import('jspdf-autotable') resolves with a default export", async () => {
    const mod = await import("jspdf-autotable");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("3. import('recharts') resolves with core chart exports", async () => {
    const mod = await import("recharts");
    expect(mod.LineChart).toBeDefined();
    expect(mod.AreaChart).toBeDefined();
    expect(mod.BarChart).toBeDefined();
    expect(mod.ResponsiveContainer).toBeDefined();
  });

  it("4. import('qrcode.react') resolves with QRCodeSVG export", async () => {
    const mod = await import("qrcode.react");
    expect(mod.QRCodeSVG).toBeDefined();
  });

  it("5. import('html5-qrcode') resolves with Html5Qrcode export", async () => {
    const mod = await import("html5-qrcode");
    expect(mod.Html5Qrcode).toBeDefined();
  });
});

// ─── Group 2: Lazy Wrapper Contract Verification ───────────────────────

describe("Phase 6 – Group 2: Lazy Wrapper Contract Verification", () => {
  it("6. useRechartsComponents defers loading (initial state is null/loading)", () => {
    // Verify the hook source initialises with null and true
    const source = readSrc("components/shared/LazyChart.tsx");
    expect(source).toContain("useState<typeof import('recharts') | null>(null)");
    expect(source).toContain("useState(true)");
  });

  it("7. Dynamic recharts import resolves to full module", async () => {
    const mod = await import("recharts");
    // Verify a broad set of exports that useRechartsComponents exposes
    const keys = ["LineChart", "AreaChart", "BarChart", "PieChart", "ComposedChart",
      "XAxis", "YAxis", "Tooltip", "Legend", "ResponsiveContainer", "CartesianGrid"];
    for (const key of keys) {
      expect((mod as Record<string, unknown>)[key]).toBeDefined();
    }
  });

  it("8. Parallel dynamic import of jspdf + jspdf-autotable resolves both", async () => {
    const [jspdfMod, autoTableMod] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    expect(jspdfMod.default).toBeDefined();
    expect(autoTableMod.default).toBeDefined();
  });

  it("9. Simulated LazySection: factory returns null before loader, module after", async () => {
    let loaded: { default: () => string } | null = null;
    const loader = () =>
      Promise.resolve({ default: () => "rendered" }).then((mod) => {
        loaded = mod;
        return mod;
      });

    // Before loader is called
    expect(loaded).toBeNull();

    // After loader is called
    await loader();
    expect(loaded).not.toBeNull();
    expect(loaded!.default()).toBe("rendered");
  });

  it("10. Concurrent dynamic imports of same module return same reference", async () => {
    const [a, b, c] = await Promise.all([
      import("recharts"),
      import("recharts"),
      import("recharts"),
    ]);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});

// ─── Group 3: Import Graph Boundary Audit ──────────────────────────────

describe("Phase 6 – Group 3: Import Graph Boundary Audit", () => {
  it("11. LazyPDFExport.tsx does NOT contain a top-level static jsPDF import", () => {
    const content = readSrc("components/shared/LazyPDFExport.tsx");
    // Must not have static: import jsPDF from 'jspdf' or import { ... } from 'jspdf'
    expect(content).not.toMatch(/^import\s+.*\s+from\s+['"]jspdf['"]/m);
    // Must have dynamic: import('jspdf')
    expect(content).toMatch(/import\(\s*['"]jspdf['"]\s*\)/);
  });

  it("12. HealthCardPDF.tsx and EmergencyCardPDF.tsx use await import('jspdf') pattern", () => {
    const health = readSrc("components/dashboard/HealthCardPDF.tsx");
    const emergency = readSrc("components/dashboard/EmergencyCardPDF.tsx");

    // No static import
    expect(health).not.toMatch(/^import\s+.*\s+from\s+['"]jspdf['"]/m);
    expect(emergency).not.toMatch(/^import\s+.*\s+from\s+['"]jspdf['"]/m);

    // Dynamic import present
    expect(health).toMatch(/await\s+import\(\s*['"]jspdf['"]\s*\)/);
    expect(emergency).toMatch(/await\s+import\(\s*['"]jspdf['"]\s*\)/);
  });

  it("13. LazyChart.tsx uses import('recharts').then(...) not top-level import", () => {
    const content = readSrc("components/shared/LazyChart.tsx");
    // No static import from recharts
    expect(content).not.toMatch(/^import\s+.*\s+from\s+['"]recharts['"]/m);
    // Dynamic import pattern
    expect(content).toMatch(/import\(\s*['"]recharts['"]\s*\)/);
  });

  it("14. Files using useRechartsComponents do NOT also have static recharts imports", () => {
    const consumers = [
      "pages/researcher/CohortAnalyticsPage.tsx",
      "components/hospital/RevenueTrendChart.tsx",
      "components/hospital/BedOccupancyTrendChart.tsx",
      "components/researcher/visualization/CorrelationAnalysis.tsx",
      "components/researcher/visualization/ChartConfigPanel.tsx",
    ];

    for (const file of consumers) {
      const content = readSrc(file);
      // Confirm it uses the hook
      expect(content).toContain("useRechartsComponents");
      // Must NOT have a static recharts import
      expect(content).not.toMatch(
        /^import\s+\{[^}]*\}\s+from\s+['"]recharts['"]/m
      );
    }
  });

  it("15. generateVisitInstructionsPDF.ts has a static jsPDF import (known bundling cost)", () => {
    const content = readSrc("utils/generateVisitInstructionsPDF.ts");
    // Documents the known static import — this test fails if someone converts it to dynamic
    expect(content).toMatch(/^import\s+jsPDF\s+from\s+['"]jspdf['"]/m);
    expect(content).toMatch(/^import\s+autoTable\s+from\s+['"]jspdf-autotable['"]/m);
  });
});
