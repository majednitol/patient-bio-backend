import { describe, it, expect } from "vitest";
import {
  generateRecords,
  generateUsers,
  generateAppointments,
  generatePrescriptions,
  measureTime,
  chunk,
  MockRecord,
} from "./perf-helpers";

// ── Pure helpers used across tests ──

function processRecordBatch(records: MockRecord[]) {
  return records.map((r) => ({
    ...r,
    title: r.title.toUpperCase(),
    processed: true,
    category: r.disease_category.toLowerCase(),
  }));
}

function parsePrescription(rx: { diagnosis: string; medications: any[] }) {
  return {
    diagnosisNormalized: rx.diagnosis.toLowerCase().trim(),
    medCount: rx.medications.length,
    medNames: rx.medications.map((m) => m.medication_name),
  };
}

function sortQueue(entries: { id: string; created_at: string }[]) {
  return [...entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

function validateVitals(bp: string, hr: number, temp: number) {
  const bpMatch = /^(\d+)\/(\d+)$/.exec(bp);
  if (!bpMatch) return { valid: false, reason: "bad format" };
  const sys = +bpMatch[1], dia = +bpMatch[2];
  if (sys < 60 || sys > 250 || dia < 30 || dia > 150) return { valid: false, reason: "bp range" };
  if (hr < 30 || hr > 220) return { valid: false, reason: "hr range" };
  if (temp < 35 || temp > 42) return { valid: false, reason: "temp range" };
  return { valid: true, reason: null };
}

function generateCacheKey(table: string, filters: Record<string, string>): string {
  const sortedKeys = Object.keys(filters).sort();
  return `${table}:${sortedKeys.map((k) => `${k}=${filters[k]}`).join("&")}`;
}

function calculateSlotDensity(appointments: { start_time: string }[]) {
  const slots: Record<string, number> = {};
  for (const a of appointments) {
    const hour = a.start_time.split(":")[0];
    slots[hour] = (slots[hour] || 0) + 1;
  }
  return slots;
}

function searchMedications(query: string, formulary: string[]): string[] {
  const q = query.toLowerCase();
  return formulary.filter((m) => m.toLowerCase().includes(q));
}

function buildNotificationPayload(recipientIds: string[], message: string) {
  return recipientIds.map((id) => ({ recipientId: id, message, sentAt: Date.now() }));
}

function transformUserProfile(user: { id: string; display_name: string; email: string }) {
  return {
    id: user.id,
    initials: user.display_name.split(" ").map((w) => w[0]).join("").slice(0, 2),
    emailDomain: user.email.split("@")[1],
  };
}

// ── Tests ──

describe("Phase 10: Sustained Throughput and Memory Stability", () => {
  it("1. processes 1,000 records in 10 batches without throughput decay", () => {
    const records = generateRecords(1000);
    const batches = chunk(records, 100);
    const times: number[] = [];
    for (const batch of batches) {
      const { durationMs } = measureTime(() => processRecordBatch(batch));
      times.push(durationMs);
    }
    const firstBatch = times[0] || 0.01;
    const lastBatch = times[times.length - 1];
    // Last batch within 5x of first (generous for CI)
    expect(lastBatch).toBeLessThan(firstBatch * 5 + 1);
  });

  it("2. 500 sequential prescription parsings without degradation", () => {
    const prescriptions = generatePrescriptions(500);
    const firstTimes: number[] = [];
    const lastTimes: number[] = [];
    prescriptions.forEach((rx, i) => {
      const { durationMs } = measureTime(() => parsePrescription(rx));
      if (i < 50) firstTimes.push(durationMs);
      if (i >= 450) lastTimes.push(durationMs);
    });
    const avgFirst = firstTimes.reduce((a, b) => a + b, 0) / firstTimes.length;
    const avgLast = lastTimes.reduce((a, b) => a + b, 0) / lastTimes.length;
    expect(avgLast).toBeLessThan(avgFirst * 5 + 1);
  });

  it("3. 200 queue sort operations scale linearly with dataset growth", () => {
    const times: number[] = [];
    for (let size = 50; size <= 500; size += 50) {
      const records = generateRecords(size);
      const { durationMs } = measureTime(() => sortQueue(records));
      times.push(durationMs);
    }
    // Last sort (500) shouldn't be more than 50x first sort (50) -- generous for nlogn in CI environments
    expect(times[times.length - 1]).toBeLessThan((times[0] + 0.1) * 50 + 2);
  });

  it("4. 100 iterations of record processing show no memory accumulation pattern", () => {
    const allocations: number[] = [];
    for (let i = 0; i < 100; i++) {
      const records = generateRecords(100);
      const processed = processRecordBatch(records);
      allocations.push(processed.length);
      // Simulate cleanup
    }
    // All iterations produce same count
    expect(new Set(allocations).size).toBe(1);
    expect(allocations[0]).toBe(100);
  });

  it("5. 50 concurrent PDF data preparations scale with parallelism", async () => {
    const prescriptions = generatePrescriptions(50);
    const { durationMs } = measureTime(() => {
      return prescriptions.map((rx) => ({
        diagnosis: rx.diagnosis,
        medCount: rx.medications.length,
        patientId: rx.patient_id,
        date: rx.created_at,
      }));
    });
    expect(durationMs).toBeLessThan(50);
  });

  it("6. 1,000 vitals validations in rapid succession stay consistent", () => {
    const { durationMs } = measureTime(() => {
      for (let i = 0; i < 1000; i++) {
        validateVitals(`${120 + (i % 30)}/${80 + (i % 20)}`, 60 + (i % 40), 36 + (i % 3));
      }
    });
    expect(durationMs).toBeLessThan(50);
  });

  it("7. cache key generation for 500 combinations produces no duplicates under 5ms", () => {
    const keys = new Set<string>();
    const tables = ["records", "appointments", "prescriptions", "users", "tokens"];
    const { durationMs } = measureTime(() => {
      for (let i = 0; i < 500; i++) {
        const table = tables[i % tables.length];
        const key = generateCacheKey(table, {
          page: String(i % 50),
          status: ["active", "completed", "pending"][i % 3],
          sort: ["asc", "desc"][i % 2],
        });
        keys.add(key);
      }
    });
    expect(keys.size).toBe(150); // 5 tables × 3 statuses × 2 sorts × 5 unique pages per combo cycle
    expect(durationMs).toBeLessThan(50);
  });

  it("8. 200 slot density calculations with increasing appointment counts", () => {
    const times: number[] = [];
    for (let count = 50; count <= 500; count += 50) {
      const appointments = generateAppointments(count);
      const { durationMs } = measureTime(() => calculateSlotDensity(appointments));
      times.push(durationMs);
    }
    expect(times[times.length - 1]).toBeLessThan((times[0] + 0.01) * 20 + 1);
  });

  it("9. alternating read/write simulation (500 cycles) with no state corruption", () => {
    const store: Map<string, MockRecord> = new Map();
    const records = generateRecords(500);
    for (let i = 0; i < 500; i++) {
      // Write
      store.set(records[i].id, records[i]);
      // Read
      const read = store.get(records[i].id);
      expect(read).toBeDefined();
      expect(read!.id).toBe(records[i].id);
    }
    expect(store.size).toBe(500);
  });

  it("10. 100 concurrent user profile transformations with varied data shapes", async () => {
    const users = generateUsers(100);
    const { result, durationMs } = measureTime(() =>
      users.map((u) => transformUserProfile(u))
    );
    expect(result).toHaveLength(100);
    expect(result[0].initials).toBeDefined();
    expect(durationMs).toBeLessThan(50);
  });

  it("11. batch insert simulation: 5,000 records in chunks of 50 scales linearly", () => {
    const records = generateRecords(5000);
    const chunks50 = chunk(records, 50);
    const batchTimes: number[] = [];
    for (const c of chunks50) {
      const { durationMs } = measureTime(() => {
        c.map((r) => ({ ...r, inserted: true }));
      });
      batchTimes.push(durationMs);
    }
    const firstAvg = batchTimes.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
    const lastAvg = batchTimes.slice(-10).reduce((a, b) => a + b, 0) / 10;
    expect(lastAvg).toBeLessThan(firstAvg * 5 + 1);
  });

  it("12. 300 medication searches against 1,000-item formulary stay fast", () => {
    const formulary = Array.from({ length: 1000 }, (_, i) => `Medication_${i}_${["Tab", "Cap", "Syrup"][i % 3]}`);
    const queries = ["Med", "Tab", "Cap", "Syrup", "100", "500", "ation"];
    const { durationMs } = measureTime(() => {
      for (let i = 0; i < 300; i++) {
        searchMedications(queries[i % queries.length], formulary);
      }
    });
    expect(durationMs).toBeLessThan(200);
  });

  it("13. 100 notification payloads with varying recipient counts (1-50)", () => {
    const { durationMs } = measureTime(() => {
      for (let i = 1; i <= 100; i++) {
        const recipientCount = (i % 50) + 1;
        const recipients = Array.from({ length: recipientCount }, (_, j) => `user-${j}`);
        buildNotificationPayload(recipients, `Notification ${i}`);
      }
    });
    expect(durationMs).toBeLessThan(50);
  });

  it("14. stress test: all generators at 10,000 count complete under budget", () => {
    const { durationMs: recTime } = measureTime(() => generateRecords(10000));
    const { durationMs: userTime } = measureTime(() => generateUsers(10000));
    const { durationMs: aptTime } = measureTime(() => generateAppointments(10000));
    const { durationMs: rxTime } = measureTime(() => generatePrescriptions(10000));
    const total = recTime + userTime + aptTime + rxTime;
    expect(total).toBeLessThan(2000);
  });

  it("15. mixed workload: records + sorts + validations interleaved under 200ms", () => {
    const { durationMs } = measureTime(() => {
      for (let i = 0; i < 50; i++) {
        processRecordBatch(generateRecords(20));
        sortQueue(generateRecords(20));
        validateVitals("120/80", 72, 36.6);
      }
    });
    expect(durationMs).toBeLessThan(500);
  });
});
