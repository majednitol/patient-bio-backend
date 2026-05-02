import { describe, it, expect } from "vitest";
import { keywordMatchDoctors, matchDiseasesForDoctors, getAllSymptomKeywords, DISEASE_ALIASES, type DiseaseMatch } from "../smartMatchUtils";
import type { BookableDoctor } from "@/hooks/useBookableDoctors";

function makeDr(overrides: Partial<BookableDoctor> & { id: string }): BookableDoctor {
  return {
    full_name: "Dr Test",
    specialty: "General Medicine",
    has_availability: true,
    diseases_treated: [],
    connection_type: null,
    avatar_url: null,
    qualification: null,
    experience_years: null,
    consultation_fee: null,
    hospital_name: null,
    hospital_id: null,
    ...overrides,
  } as BookableDoctor;
}

// ─── Synonym / Alias Resolution ─────────────────────────────────────
describe("Synonym/Alias Resolution", () => {
  const doctors = [
    makeDr({ id: "d1", specialty: "Endocrinology", diseases_treated: ["Diabetes", "Thyroid Disorder"] }),
    makeDr({ id: "d2", specialty: "Cardiology", diseases_treated: ["Hypertension", "Heart Failure"] }),
    makeDr({ id: "d3", specialty: "Pulmonology", diseases_treated: ["Tuberculosis", "Asthma"] }),
    makeDr({ id: "d4", specialty: "Gastroenterology", diseases_treated: ["Irritable Bowel Syndrome", "Gastritis"] }),
    makeDr({ id: "d5", specialty: "General Surgery", diseases_treated: ["Hemorrhoids", "Hernia"] }),
    makeDr({ id: "d6", specialty: "Urology", diseases_treated: ["Urinary Tract Infection", "Kidney Stones"] }),
    makeDr({ id: "d7", specialty: "Neurology", diseases_treated: ["Epilepsy", "Migraine"] }),
  ];

  it("'sugar' → Diabetes (synonym)", () => {
    const r = keywordMatchDoctors("sugar", doctors);
    const m = r.find(x => x.doctorId === "d1")?.matchedDiseases?.find(d => d.name === "Diabetes");
    expect(m).toBeDefined();
    expect(m!.matchType).toBe("synonym");
    expect(m!.via).toBe("sugar");
  });

  it("'blood sugar' → Diabetes (synonym)", () => {
    const r = keywordMatchDoctors("blood sugar", doctors);
    const m = r.find(x => x.doctorId === "d1")?.matchedDiseases?.find(d => d.name === "Diabetes");
    expect(m).toBeDefined();
    expect(m!.matchType).toBe("synonym");
    expect(m!.via).toBe("blood sugar");
  });

  it("'BP' → Hypertension (synonym, case-insensitive)", () => {
    const r = keywordMatchDoctors("BP", doctors);
    const m = r.find(x => x.doctorId === "d2")?.matchedDiseases?.find(d => d.name === "Hypertension");
    expect(m).toBeDefined();
    expect(m!.matchType).toBe("synonym");
    expect(m!.via).toBe("bp");
  });

  it("'TB' → Tuberculosis (synonym)", () => {
    const r = keywordMatchDoctors("TB", doctors);
    const m = r.find(x => x.doctorId === "d3")?.matchedDiseases?.find(d => d.name === "Tuberculosis");
    expect(m).toBeDefined();
    expect(m!.matchType).toBe("synonym");
    expect(m!.via).toBe("tb");
  });

  it("'piles' → Hemorrhoids (synonym)", () => {
    const r = keywordMatchDoctors("piles", doctors);
    const m = r.find(x => x.doctorId === "d5")?.matchedDiseases?.find(d => d.name === "Hemorrhoids");
    expect(m).toBeDefined();
    expect(m!.matchType).toBe("synonym");
    expect(m!.via).toBe("piles");
  });

  it("'uti' → Urinary Tract Infection (synonym)", () => {
    const r = keywordMatchDoctors("uti", doctors);
    const m = r.find(x => x.doctorId === "d6")?.matchedDiseases?.find(d => d.name === "Urinary Tract Infection");
    expect(m).toBeDefined();
    expect(m!.matchType).toBe("synonym");
  });

  it("'ibs' → Irritable Bowel Syndrome (synonym)", () => {
    const r = keywordMatchDoctors("ibs", doctors);
    const m = r.find(x => x.doctorId === "d4")?.matchedDiseases?.find(d => d.name === "Irritable Bowel Syndrome");
    expect(m).toBeDefined();
    expect(m!.matchType).toBe("synonym");
  });

  it("'fits' → Epilepsy (synonym)", () => {
    const r = keywordMatchDoctors("fits", doctors);
    const m = r.find(x => x.doctorId === "d7")?.matchedDiseases?.find(d => d.name === "Epilepsy");
    expect(m).toBeDefined();
    expect(m!.matchType).toBe("synonym");
    expect(m!.via).toBe("fits");
  });

  it("'stones' → Kidney Stones (synonym)", () => {
    const r = keywordMatchDoctors("stones", doctors);
    const m = r.find(x => x.doctorId === "d6")?.matchedDiseases?.find(d => d.name === "Kidney Stones");
    expect(m).toBeDefined();
    expect(m!.matchType).toBe("synonym");
  });

  it("'acidity' → Gastritis (synonym)", () => {
    const r = keywordMatchDoctors("acidity", doctors);
    const m = r.find(x => x.doctorId === "d4")?.matchedDiseases?.find(d => d.name === "Gastritis");
    expect(m).toBeDefined();
    expect(m!.matchType).toBe("synonym");
  });

  it("'thyroid problem' → Thyroid Disorder (synonym, multi-word alias)", () => {
    const r = keywordMatchDoctors("thyroid problem", doctors);
    const m = r.find(x => x.doctorId === "d1")?.matchedDiseases?.find(d => d.name === "Thyroid Disorder");
    expect(m).toBeDefined();
    expect(m!.matchType).toBe("synonym");
    expect(m!.via).toBe("thyroid problem");
  });
});

// ─── Exact Matching ─────────────────────────────────────────────────
describe("Exact Matching", () => {
  const doctors = [
    makeDr({ id: "d1", specialty: "Endocrinology", diseases_treated: ["Diabetes"] }),
    makeDr({ id: "d2", specialty: "Pulmonology", diseases_treated: ["Asthma", "Pneumonia"] }),
  ];

  it("'diabetes' exactly matches disease 'Diabetes'", () => {
    const r = keywordMatchDoctors("diabetes", doctors);
    const m = r.find(x => x.doctorId === "d1")?.matchedDiseases?.find(d => d.name === "Diabetes");
    expect(m).toBeDefined();
    expect(m!.matchType).toBe("exact");
    expect(m!.via).toBeUndefined();
  });

  it("'asthma' matches disease 'Asthma' as exact (disease name appears in input)", () => {
    const r = keywordMatchDoctors("asthma", doctors);
    const m = r.find(x => x.doctorId === "d2")?.matchedDiseases?.find(d => d.name === "Asthma");
    expect(m).toBeDefined();
    expect(m!.matchType).toBe("exact"); // exact match wins over alias
  });

  it("'pneumonia' matches disease 'Pneumonia' as exact (disease name appears in input)", () => {
    const r = keywordMatchDoctors("pneumonia", doctors);
    const m = r.find(x => x.doctorId === "d2")?.matchedDiseases?.find(d => d.name === "Pneumonia");
    expect(m).toBeDefined();
    expect(m!.matchType).toBe("exact"); // exact match wins over alias
  });

  it("exact match gets higher score than synonym for same disease", () => {
    const exact = keywordMatchDoctors("diabetes", doctors);
    const synonym = keywordMatchDoctors("sugar", doctors);
    const exactScore = exact.find(x => x.doctorId === "d1")?.scoreBreakdown?.diseaseScore ?? 0;
    const synScore = synonym.find(x => x.doctorId === "d1")?.scoreBreakdown?.diseaseScore ?? 0;
    expect(exactScore).toBeGreaterThan(synScore);
  });
});

// ─── Multi-Word Phrase Matching ─────────────────────────────────────
describe("Multi-Word Phrase Matching", () => {
  const doctors = [
    makeDr({ id: "d1", specialty: "Orthopedics", diseases_treated: ["Back Pain", "Sciatica"] }),
    makeDr({ id: "d2", specialty: "Cardiology", diseases_treated: ["Hypertension", "Angina"] }),
    makeDr({ id: "d3", specialty: "Endocrinology", diseases_treated: ["Diabetes"] }),
  ];

  it("'back pain' matches as a phrase", () => {
    const r = keywordMatchDoctors("back pain", doctors);
    const m = r.find(x => x.doctorId === "d1")?.matchedDiseases?.find(d => d.name === "Back Pain");
    expect(m).toBeDefined();
  });

  it("'high blood pressure' → Hypertension via synonym phrase", () => {
    const r = keywordMatchDoctors("high blood pressure", doctors);
    const m = r.find(x => x.doctorId === "d2")?.matchedDiseases?.find(d => d.name === "Hypertension");
    expect(m).toBeDefined();
    expect(m!.matchType).toBe("synonym");
    expect(m!.via).toBe("high blood pressure");
  });

  it("'sugar level' → Diabetes via synonym phrase", () => {
    const r = keywordMatchDoctors("sugar level", doctors);
    const m = r.find(x => x.doctorId === "d3")?.matchedDiseases?.find(d => d.name === "Diabetes");
    expect(m).toBeDefined();
    expect(m!.matchType).toBe("synonym");
    expect(m!.via).toBe("sugar level");
  });

  it("'low blood pressure' → Hypotension via synonym phrase", () => {
    const drWithHypotension = [
      makeDr({ id: "d1", specialty: "Cardiology", diseases_treated: ["Hypotension"] }),
    ];
    const r = keywordMatchDoctors("low blood pressure", drWithHypotension);
    const m = r.find(x => x.doctorId === "d1")?.matchedDiseases?.find(d => d.name === "Hypotension");
    expect(m).toBeDefined();
    expect(m!.matchType).toBe("synonym");
    expect(m!.via).toBe("low blood pressure");
  });
});

// ─── Tiered Scoring ─────────────────────────────────────────────────
describe("Tiered Scoring", () => {
  const doctors = [
    makeDr({ id: "d1", specialty: "General Medicine", diseases_treated: ["Diabetes", "Influenza", "Asthma"] }),
  ];

  it("exact(+4) > synonym(+3) > weak-substring(+1)", () => {
    const exactScore = keywordMatchDoctors("diabetes", doctors).find(r => r.doctorId === "d1")?.scoreBreakdown?.diseaseScore ?? 0;
    const synonymScore = keywordMatchDoctors("sugar", doctors).find(r => r.doctorId === "d1")?.scoreBreakdown?.diseaseScore ?? 0;
    const substringScore = keywordMatchDoctors("flu", doctors).find(r => r.doctorId === "d1")?.scoreBreakdown?.diseaseScore ?? 0;

    expect(exactScore).toBe(4);
    expect(synonymScore).toBe(3);
    expect(substringScore).toBe(1);
  });

  it("strong substring (>=5 chars) scores +2", () => {
    const drLong = [makeDr({ id: "d1", specialty: "General Medicine", diseases_treated: ["Asthmatic Bronchitis"] })];
    const r = keywordMatchDoctors("asthma", drLong);
    const score = r.find(x => x.doctorId === "d1")?.scoreBreakdown?.diseaseScore ?? 0;
    expect(score).toBe(2);
  });

  it("multiple disease matches accumulate scores", () => {
    const r = keywordMatchDoctors("diabetes asthma", doctors);
    const score = r.find(x => x.doctorId === "d1")?.scoreBreakdown?.diseaseScore ?? 0;
    // diabetes exact +4, asthma exact +4 = 8 (both are canonical disease names)
    expect(score).toBe(8);
  });

  it("connection bonus adds to total score", () => {
    const connected = [
      makeDr({ id: "d1", specialty: "Endocrinology", diseases_treated: ["Diabetes"], connection_type: "granted_access" }),
    ];
    const r = keywordMatchDoctors("diabetes", connected);
    const d = r.find(x => x.doctorId === "d1");
    expect(d!.scoreBreakdown!.connectionBonus).toBe(2);
    expect(d!.score).toBe(d!.scoreBreakdown!.diseaseScore + d!.scoreBreakdown!.specialtyScore + 2);
  });
});

// ─── Abbreviation Support ───────────────────────────────────────────
describe("Abbreviation Support", () => {
  const doctors = [
    makeDr({ id: "d1", specialty: "Pulmonology", diseases_treated: ["Tuberculosis"] }),
    makeDr({ id: "d2", specialty: "Urology", diseases_treated: ["Urinary Tract Infection"] }),
    makeDr({ id: "d3", specialty: "Gastroenterology", diseases_treated: ["Irritable Bowel Syndrome"] }),
  ];

  it("'tb' (2-char known abbreviation) matches", () => {
    expect(keywordMatchDoctors("tb", doctors).length).toBeGreaterThan(0);
  });

  it("'uti' (3-char abbreviation) matches", () => {
    expect(keywordMatchDoctors("uti", doctors).length).toBeGreaterThan(0);
  });

  it("'ibs' (3-char abbreviation) matches", () => {
    expect(keywordMatchDoctors("ibs", doctors).length).toBeGreaterThan(0);
  });

  it("random 2-char 'xy' does NOT match", () => {
    expect(keywordMatchDoctors("xy", doctors).length).toBe(0);
  });

  it("random 2-char 'ab' does NOT match", () => {
    expect(keywordMatchDoctors("ab", doctors).length).toBe(0);
  });

  it("'bp' (2-char) matches when doctor has Hypertension", () => {
    const drBP = [makeDr({ id: "d1", specialty: "Cardiology", diseases_treated: ["Hypertension"] })];
    expect(keywordMatchDoctors("bp", drBP).length).toBeGreaterThan(0);
  });
});

// ─── Edge Cases ─────────────────────────────────────────────────────
describe("Edge Cases", () => {
  it("empty input returns no matches", () => {
    const doctors = [makeDr({ id: "d1", diseases_treated: ["Diabetes"] })];
    expect(keywordMatchDoctors("", doctors)).toHaveLength(0);
  });

  it("doctor without availability is excluded", () => {
    const doctors = [makeDr({ id: "d1", has_availability: false, diseases_treated: ["Diabetes"] })];
    expect(keywordMatchDoctors("diabetes", doctors)).toHaveLength(0);
  });

  it("doctor with empty diseases_treated still matches by specialty", () => {
    const doctors = [makeDr({ id: "d1", specialty: "Cardiology", diseases_treated: [] })];
    const r = keywordMatchDoctors("chest pain", doctors);
    expect(r.length).toBe(1);
    expect(r[0].scoreBreakdown!.diseaseScore).toBe(0);
    expect(r[0].scoreBreakdown!.specialtyScore).toBeGreaterThan(0);
  });

  it("duplicate diseases in doctor profile are not double-counted", () => {
    const doctors = [makeDr({ id: "d1", diseases_treated: ["Diabetes", "Diabetes"] })];
    const r = keywordMatchDoctors("diabetes", doctors);
    expect(r[0].scoreBreakdown!.diseaseScore).toBe(4); // only counted once
  });

  it("returns at most 5 results", () => {
    const doctors = Array.from({ length: 10 }, (_, i) =>
      makeDr({ id: `d${i}`, specialty: "Cardiology", diseases_treated: ["Hypertension"] })
    );
    expect(keywordMatchDoctors("chest pain heart", doctors).length).toBeLessThanOrEqual(5);
  });

  it("combined symptom + disease input matches both specialty and disease", () => {
    const doctors = [
      makeDr({ id: "d1", specialty: "Endocrinology", diseases_treated: ["Diabetes"] }),
    ];
    const r = keywordMatchDoctors("diabetes hormone", doctors);
    const d = r.find(x => x.doctorId === "d1");
    expect(d!.scoreBreakdown!.specialtyScore).toBeGreaterThan(0);
    expect(d!.scoreBreakdown!.diseaseScore).toBeGreaterThan(0);
  });

  // ── New edge cases ──

  it("whitespace-only input returns empty", () => {
    const doctors = [makeDr({ id: "d1", diseases_treated: ["Diabetes"] })];
    expect(keywordMatchDoctors("   ", doctors)).toHaveLength(0);
  });

  it("null diseases_treated returns match by specialty only", () => {
    const doctors = [makeDr({ id: "d1", specialty: "Cardiology", diseases_treated: null as unknown as string[] })];
    const r = keywordMatchDoctors("chest pain", doctors);
    expect(r.length).toBe(1);
    expect(r[0].scoreBreakdown!.diseaseScore).toBe(0);
    expect(r[0].scoreBreakdown!.specialtyScore).toBeGreaterThan(0);
  });

  it("special characters in input still match", () => {
    const doctors = [makeDr({ id: "d1", diseases_treated: ["Diabetes"] })];
    const r1 = keywordMatchDoctors("diabetes!!!", doctors);
    expect(r1.length).toBeGreaterThan(0);
  });

  it("single character input returns empty", () => {
    const doctors = [makeDr({ id: "d1", diseases_treated: ["Diabetes", "Asthma"] })];
    expect(keywordMatchDoctors("a", doctors)).toHaveLength(0);
  });

  it("doctor with null specialty matches by disease only", () => {
    const doctors = [makeDr({ id: "d1", specialty: null as unknown as string, diseases_treated: ["Diabetes"] })];
    const r = keywordMatchDoctors("diabetes", doctors);
    expect(r.length).toBe(1);
    expect(r[0].scoreBreakdown!.diseaseScore).toBe(4);
  });

  it("all doctors lacking availability returns empty", () => {
    const doctors = [
      makeDr({ id: "d1", has_availability: false, diseases_treated: ["Diabetes"] }),
      makeDr({ id: "d2", has_availability: false, diseases_treated: ["Asthma"] }),
    ];
    expect(keywordMatchDoctors("diabetes asthma", doctors)).toHaveLength(0);
  });

  it("input with extra spaces still matches", () => {
    const doctors = [
      makeDr({ id: "d1", diseases_treated: ["Diabetes"] }),
      makeDr({ id: "d2", diseases_treated: ["Asthma"] }),
    ];
    const r = keywordMatchDoctors("  diabetes   asthma  ", doctors);
    expect(r.length).toBe(2);
  });

  it("very long input (50+ words) does not crash", () => {
    const doctors = [makeDr({ id: "d1", diseases_treated: ["Diabetes"] })];
    const longInput = Array(60).fill("word").join(" ") + " diabetes";
    const r = keywordMatchDoctors(longInput, doctors);
    expect(r.length).toBeGreaterThan(0);
  });

  it("no doctors at all (empty array) returns empty", () => {
    expect(keywordMatchDoctors("diabetes", [])).toHaveLength(0);
  });

  it("duplicate alias matches (sugar + blood sugar) count disease only once", () => {
    const doctors = [makeDr({ id: "d1", diseases_treated: ["Diabetes"] })];
    const r = keywordMatchDoctors("sugar blood sugar", doctors);
    // Diabetes should be matched only once via the `seen` set
    const diseases = r[0]?.matchedDiseases ?? [];
    const diabetesMatches = diseases.filter(d => d.name === "Diabetes");
    expect(diabetesMatches).toHaveLength(1);
  });

  it("max 5 results verified with disease matching path", () => {
    const doctors = Array.from({ length: 10 }, (_, i) =>
      makeDr({ id: `d${i}`, diseases_treated: ["Diabetes"] })
    );
    expect(keywordMatchDoctors("diabetes", doctors).length).toBeLessThanOrEqual(5);
  });

  it("combined specialty + synonym + exact in single query", () => {
    const doctors = [
      makeDr({ id: "d1", specialty: "Cardiology", diseases_treated: ["Diabetes", "Hypertension"] }),
    ];
    const r = keywordMatchDoctors("chest pain diabetes sugar", doctors);
    const d = r.find(x => x.doctorId === "d1");
    expect(d).toBeDefined();
    expect(d!.scoreBreakdown!.specialtyScore).toBeGreaterThan(0);
    expect(d!.scoreBreakdown!.diseaseScore).toBeGreaterThan(0);
    // Should have matched at least Diabetes (exact) and Hypertension (via synonym "sugar" doesn't map to hypertension, but "chest pain" hits specialty)
    expect(d!.matchedDiseases!.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── AI Path: matchDiseasesForDoctors ───────────────────────────────
describe("matchDiseasesForDoctors (AI path)", () => {
  const doctors = [
    makeDr({ id: "d1", specialty: "Endocrinology", diseases_treated: ["Diabetes", "Thyroid Disorder"] }),
    makeDr({ id: "d2", specialty: "Cardiology", diseases_treated: ["Hypertension"] }),
    makeDr({ id: "d3", specialty: "Orthopedics", diseases_treated: [] }),
  ];

  it("returns disease matches for 'sugar'", () => {
    const map = matchDiseasesForDoctors("sugar", doctors);
    expect(map.has("d1")).toBe(true);
    expect(map.get("d1")!.matches[0].name).toBe("Diabetes");
    expect(map.get("d1")!.matches[0].matchType).toBe("synonym");
  });

  it("skips doctors with no diseases_treated", () => {
    const map = matchDiseasesForDoctors("sugar", doctors);
    expect(map.has("d3")).toBe(false);
  });

  it("returns empty map for unrelated symptoms", () => {
    const map = matchDiseasesForDoctors("xyz", doctors);
    expect(map.size).toBe(0);
  });

  it("handles multiple synonym matches across doctors", () => {
    const map = matchDiseasesForDoctors("sugar bp", doctors);
    expect(map.has("d1")).toBe(true);
    expect(map.has("d2")).toBe(true);
  });

  it("exact match scores higher than synonym in AI path", () => {
    const map = matchDiseasesForDoctors("diabetes", doctors);
    const exactScore = map.get("d1")!.score;
    const synMap = matchDiseasesForDoctors("sugar", doctors);
    const synScore = synMap.get("d1")!.score;
    expect(exactScore).toBeGreaterThan(synScore);
  });

  it("null diseases_treated doctor is skipped without error", () => {
    const drs = [makeDr({ id: "d1", diseases_treated: null as unknown as string[] })];
    const map = matchDiseasesForDoctors("diabetes", drs);
    expect(map.size).toBe(0);
  });

  it("multi-word phrase matches in AI path", () => {
    const map = matchDiseasesForDoctors("high blood pressure", doctors);
    expect(map.has("d2")).toBe(true);
    expect(map.get("d2")!.matches[0].name).toBe("Hypertension");
    expect(map.get("d2")!.matches[0].matchType).toBe("synonym");
  });
});

// ─── getAllSymptomKeywords ───────────────────────────────────────────
describe("getAllSymptomKeywords", () => {
  it("includes alias terms like 'sugar', 'bp', 'tb', 'piles'", () => {
    const kw = getAllSymptomKeywords();
    expect(kw).toContain("sugar");
    expect(kw).toContain("bp");
    expect(kw).toContain("tb");
    expect(kw).toContain("piles");
    expect(kw).toContain("uti");
  });

  it("includes specialty symptom keywords", () => {
    const kw = getAllSymptomKeywords();
    expect(kw).toContain("headache");
    expect(kw).toContain("fever");
    expect(kw).toContain("chest pain");
  });

  it("has no duplicates", () => {
    const kw = getAllSymptomKeywords();
    expect(new Set(kw).size).toBe(kw.length);
  });

  it("is sorted alphabetically", () => {
    const kw = getAllSymptomKeywords();
    const sorted = [...kw].sort();
    expect(kw).toEqual(sorted);
  });

  it("includes multi-word alias phrases", () => {
    const kw = getAllSymptomKeywords();
    expect(kw).toContain("blood sugar");
    expect(kw).toContain("high blood pressure");
    expect(kw).toContain("back pain");
  });

  it("returns a non-empty array", () => {
    const kw = getAllSymptomKeywords();
    expect(kw.length).toBeGreaterThan(50); // we have many aliases + specialty keywords
  });
});

// ─── DISEASE_ALIASES map integrity ──────────────────────────────────
describe("DISEASE_ALIASES map", () => {
  it("all values are non-empty strings", () => {
    for (const [key, val] of Object.entries(DISEASE_ALIASES)) {
      expect(typeof val).toBe("string");
      expect(val.length).toBeGreaterThan(0);
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    }
  });

  it("all keys are lowercase", () => {
    for (const key of Object.keys(DISEASE_ALIASES)) {
      expect(key).toBe(key.toLowerCase());
    }
  });

  it("has at least 100 entries", () => {
    expect(Object.keys(DISEASE_ALIASES).length).toBeGreaterThanOrEqual(100);
  });

  it("common abbreviations map to expected diseases", () => {
    expect(DISEASE_ALIASES["tb"]).toBe("Tuberculosis");
    expect(DISEASE_ALIASES["bp"]).toBe("Hypertension");
    expect(DISEASE_ALIASES["uti"]).toBe("Urinary Tract Infection");
    expect(DISEASE_ALIASES["ibs"]).toBe("Irritable Bowel Syndrome");
    expect(DISEASE_ALIASES["pcos"]).toBe("Polycystic Ovary Syndrome");
  });

  it("no alias key maps to an empty string value", () => {
    for (const val of Object.values(DISEASE_ALIASES)) {
      expect(val.trim().length).toBeGreaterThan(0);
    }
  });
});
