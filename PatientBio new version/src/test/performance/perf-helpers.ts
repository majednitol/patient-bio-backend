import { vi } from "vitest";

// ── Data generators ─────────────────────────────────────────────

export interface MockRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  disease_category: string;
  created_at: string;
  title: string;
  status: string;
}

export interface MockUser {
  id: string;
  email: string;
  display_name: string;
  phone: string;
  role: string;
}

const DISEASE_CATEGORIES = ["diabetes", "cardiology", "neurology", "oncology", "hematology", "dermatology", "orthopedics", "pulmonology"];
const STATUSES = ["active", "completed", "pending", "cancelled"];
const FIRST_NAMES = ["Amit", "Priya", "Raj", "Sana", "Vikram", "Neha", "Arjun", "Kavya", "Rohan", "Meera"];
const LAST_NAMES = ["Patel", "Sharma", "Singh", "Kumar", "Gupta", "Verma", "Rao", "Joshi", "Reddy", "Nair"];

export function generateRecords(count: number): MockRecord[] {
  const records: MockRecord[] = new Array(count);
  const baseDate = new Date("2024-01-01").getTime();
  for (let i = 0; i < count; i++) {
    records[i] = {
      id: `rec-${i}`,
      patient_id: `pat-${i % 500}`,
      doctor_id: `doc-${i % 50}`,
      disease_category: DISEASE_CATEGORIES[i % DISEASE_CATEGORIES.length],
      created_at: new Date(baseDate + i * 60000).toISOString(),
      title: `Record ${i}`,
      status: STATUSES[i % STATUSES.length],
    };
  }
  return records;
}

export function generateUsers(count: number): MockUser[] {
  const users: MockUser[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[i % LAST_NAMES.length];
    users[i] = {
      id: `user-${i}`,
      email: `user${i}@example.com`,
      display_name: `${first} ${last} ${i}`,
      phone: `+91${String(9000000000 + i)}`,
      role: "user",
    };
  }
  return users;
}

// ── Array utilities ─────────────────────────────────────────────

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// ── Performance measurement ─────────────────────────────────────

export function measureTime<T>(fn: () => T): { result: T; durationMs: number } {
  const start = performance.now();
  const result = fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

export async function measureTimeAsync<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

// ── Pagination logic (pure extraction of usePagination) ─────────

export function paginationLogic<T>(data: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(data.length / perPage));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * perPage;
  const end = start + perPage;
  const paginatedData = data.slice(start, end);

  return {
    currentPage: safePage,
    totalPages,
    paginatedData,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
    goToPage: (p: number) => Math.max(1, Math.min(p, totalPages)),
  };
}

// ── Visible pages algorithm (pure extraction of DataTablePagination) ──

export function getVisiblePages(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  const pages: (number | "ellipsis")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("ellipsis");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
  }

  return pages;
}

// ── Appointment & Prescription generators ───────────────────────

export interface MockAppointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  hospital_id: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
  reason: string;
  checked_in_at: string | null;
  consultation_started_at: string | null;
  consultation_ended_at: string | null;
  created_at: string;
}

export interface MockMedication {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface MockPrescription {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  diagnosis: string;
  medications: MockMedication[];
  notes: string | null;
  follow_up_date: string | null;
  created_at: string;
}

const REASONS = ["Fever", "Headache", "Follow-up", "Chest pain", "Routine check", "Back pain", "Cough", "Skin rash"];
const DIAGNOSES = ["Viral Fever", "Migraine", "Hypertension", "Type 2 Diabetes", "Upper RTI", "Gastritis", "Dermatitis", "Lumbar Strain"];
const MED_NAMES = ["Paracetamol", "Amoxicillin", "Metformin", "Amlodipine", "Omeprazole", "Cetirizine", "Ibuprofen", "Azithromycin"];
const DOSAGES = ["500mg", "250mg", "100mg", "5mg", "20mg", "10mg"];
const FREQUENCIES = ["Once daily", "Twice daily", "Three times daily", "As needed"];
const DURATIONS = ["3 days", "5 days", "7 days", "14 days", "30 days"];

export function generateAppointments(count: number): MockAppointment[] {
  const appointments: MockAppointment[] = new Array(count);
  const baseDate = new Date("2024-06-01").getTime();
  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor(i / 10);
    const hourSlot = 9 + (i % 10);
    const isCompleted = i % 3 === 0;
    const checkedIn = i % 4 !== 3;
    appointments[i] = {
      id: `apt-${i}`,
      patient_id: `pat-${i % 200}`,
      doctor_id: `doc-${i % 20}`,
      hospital_id: i % 5 === 0 ? null : `hosp-${i % 3}`,
      appointment_date: new Date(baseDate + dayOffset * 86400000).toISOString().split("T")[0],
      start_time: `${String(hourSlot).padStart(2, "0")}:00`,
      end_time: `${String(hourSlot).padStart(2, "0")}:30`,
      status: isCompleted ? "completed" : "confirmed",
      reason: REASONS[i % REASONS.length],
      checked_in_at: checkedIn ? new Date(baseDate + dayOffset * 86400000 + hourSlot * 3600000 - 900000).toISOString() : null,
      consultation_started_at: isCompleted ? new Date(baseDate + dayOffset * 86400000 + hourSlot * 3600000).toISOString() : null,
      consultation_ended_at: isCompleted ? new Date(baseDate + dayOffset * 86400000 + hourSlot * 3600000 + (10 + i % 20) * 60000).toISOString() : null,
      created_at: new Date(baseDate - 86400000).toISOString(),
    };
  }
  return appointments;
}

export function generatePrescriptions(count: number): MockPrescription[] {
  const prescriptions: MockPrescription[] = new Array(count);
  const baseDate = new Date("2024-06-01").getTime();
  for (let i = 0; i < count; i++) {
    const medCount = 3 + (i % 6); // 3-8 medications
    const meds: MockMedication[] = [];
    for (let m = 0; m < medCount; m++) {
      meds.push({
        medication_name: MED_NAMES[(i + m) % MED_NAMES.length],
        dosage: DOSAGES[(i + m) % DOSAGES.length],
        frequency: FREQUENCIES[(i + m) % FREQUENCIES.length],
        duration: DURATIONS[(i + m) % DURATIONS.length],
        instructions: m % 2 === 0 ? "After meals" : "Before meals",
      });
    }
    prescriptions[i] = {
      id: `rx-${i}`,
      appointment_id: `apt-${i}`,
      patient_id: `pat-${i % 200}`,
      doctor_id: `doc-${i % 20}`,
      diagnosis: DIAGNOSES[i % DIAGNOSES.length],
      medications: meds,
      notes: i % 3 === 0 ? "Patient advised rest" : null,
      follow_up_date: i % 2 === 0 ? new Date(baseDate + (7 + i % 14) * 86400000).toISOString().split("T")[0] : null,
      created_at: new Date(baseDate + Math.floor(i / 10) * 86400000).toISOString(),
    };
  }
  return prescriptions;
}

// ── Debounce simulator ──────────────────────────────────────────

export function simulateDebounce(callCount: number, delayMs: number): { fireCount: number } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let fireCount = 0;

  for (let i = 0; i < callCount; i++) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { fireCount++; }, delayMs);
    // Advance by less than delay for all but the last
    if (i < callCount - 1) {
      vi.advanceTimersByTime(delayMs / 2);
    }
  }
  // Flush final timer
  vi.advanceTimersByTime(delayMs + 1);

  return { fireCount };
}
