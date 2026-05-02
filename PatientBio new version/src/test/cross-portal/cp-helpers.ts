import { vi } from "vitest";

// ── Portal user identities ──────────────────────────────────────
export const users = {
  doctor: { id: "doc-cp-001", email: "dr.patel@example.com", role: "doctor" },
  pathologist: { id: "path-cp-002", email: "lab@example.com", role: "pathologist" },
  patient: { id: "pat-cp-003", email: "patient@example.com", role: "user" },
  researcher: { id: "res-cp-004", email: "researcher@example.com", role: "researcher" },
  hospital: { id: "hosp-cp-005", email: "admin@hospital.com", role: "hospital_admin" },
  admin: { id: "admin-cp-006", email: "admin@platform.com", role: "admin" },
};

// ── Shared entity IDs ───────────────────────────────────────────
export const ids = {
  share: "share-cp-100",
  prescription: "rx-cp-200",
  report: "rpt-cp-300",
  appointment: "appt-cp-400",
  broadcast: "bcast-cp-500",
  accessRequest: "dar-cp-600",
  notification: "notif-cp-700",
  hospitalId: "hospital-cp-800",
  wardId: "ward-cp-810",
  bedId: "bed-cp-820",
  admissionId: "adm-cp-830",
  labOrderId: "lab-cp-840",
  invoiceId: "inv-cp-850",
  referralId: "ref-cp-860",
  doctorAccess: "dpa-cp-870",
  intakeId: "intake-cp-880",
  patient: users.patient.id,
  doctor: users.doctor.id,
  pathologist: users.pathologist.id,
  researcher: users.researcher.id,
};

// ── Chainable query builder mock ────────────────────────────────
export function createQueryBuilder(resolvedValue: any = { data: [], error: null }) {
  const builder: any = {};
  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "not", "is", "gt", "lt", "gte", "lte",
    "like", "ilike", "or", "and", "filter",
    "order", "limit", "range", "single", "maybeSingle",
    "textSearch", "match", "contains", "containedBy", "overlaps",
  ];
  for (const m of methods) {
    builder[m] = vi.fn().mockReturnValue(builder);
  }
  // Terminal resolution
  builder.then = (resolve: Function) => resolve(resolvedValue);
  // Allow overriding the resolved value at any point
  builder._resolve = (val: any) => {
    builder.then = (resolve: Function) => resolve(val);
    return builder;
  };
  return builder;
}

// ── Supabase client mock ────────────────────────────────────────
export function createCrossPortalMock() {
  const mockInvoke = vi.fn();
  const queryBuilders = new Map<string, ReturnType<typeof createQueryBuilder>>();

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (!queryBuilders.has(table)) {
      queryBuilders.set(table, createQueryBuilder());
    }
    return queryBuilders.get(table)!;
  });

  const mockSupabase = {
    functions: { invoke: mockInvoke },
    auth: {
      getUser: vi.fn(),
      getClaims: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: mockFrom,
    rpc: vi.fn(),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://storage.example.com/signed" },
          error: null,
        }),
        upload: vi.fn().mockResolvedValue({ data: { path: "file.pdf" }, error: null }),
      }),
    },
  };

  return { mockSupabase, mockInvoke, mockFrom, queryBuilders };
}

// ── Response helpers ────────────────────────────────────────────
export function mockResponse(mockInvoke: ReturnType<typeof vi.fn>, data: any) {
  mockInvoke.mockResolvedValueOnce({ data, error: null });
}

export function mockError(mockInvoke: ReturnType<typeof vi.fn>, error: string) {
  mockInvoke.mockResolvedValueOnce({ data: { error }, error: null });
}

// ── Data factories ──────────────────────────────────────────────
export function makeDoctorPathologistShare(overrides: Record<string, any> = {}) {
  return {
    id: ids.share,
    doctor_id: ids.doctor,
    pathologist_id: ids.pathologist,
    patient_id: ids.patient,
    disease_category: "hematology",
    prescription_id: ids.prescription,
    notes: "Please review CBC panel",
    status: "pending",
    shared_at: new Date().toISOString(),
    completed_at: null,
    ...overrides,
  };
}

export function makePathologistReport(overrides: Record<string, any> = {}) {
  return {
    id: ids.report,
    pathologist_id: ids.pathologist,
    patient_id: ids.patient,
    doctor_id: ids.doctor,
    test_name: "Complete Blood Count",
    status: "completed",
    has_abnormal_values: false,
    is_shared_with_doctor: false,
    is_shared_with_patient: false,
    results: [{ parameter: "WBC", value: "7.5", unit: "x10^3/uL", range: "4.5-11.0", is_abnormal: false }],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeBroadcastRequest(overrides: Record<string, any> = {}) {
  return {
    id: ids.broadcast,
    researcher_id: ids.researcher,
    disease_category: "diabetes",
    research_purpose: "Glucose variability study",
    status: "active",
    patients_notified: 5,
    patients_approved: 0,
    patients_rejected: 0,
    token_offer_per_patient: 10,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeDataAccessRequest(overrides: Record<string, any> = {}) {
  return {
    id: ids.accessRequest,
    patient_id: ids.patient,
    requester_id: ids.researcher,
    requester_type: "researcher",
    disease_category: "diabetes",
    reason: "Glucose variability study",
    status: "pending",
    token_offer: 10,
    broadcast_request_id: ids.broadcast,
    requested_at: new Date().toISOString(),
    responded_at: null,
    ...overrides,
  };
}

export function makeNotification(overrides: Record<string, any> = {}) {
  return {
    id: ids.notification,
    user_id: ids.patient,
    type: "research_data_shared",
    title: "New Research Request",
    message: "A researcher has requested access to your data.",
    is_read: false,
    created_at: new Date().toISOString(),
    metadata: {},
    ...overrides,
  };
}

export function makeDoctorResearcherShare(overrides: Record<string, any> = {}) {
  return {
    id: "drs-cp-800",
    doctor_id: ids.doctor,
    researcher_id: ids.researcher,
    patient_id: ids.patient,
    prescription_id: ids.prescription,
    disease_category: "diabetes",
    research_purpose: "Medication efficacy study",
    notes: "Anonymized data only",
    status: "pending",
    is_anonymized: true,
    shared_at: new Date().toISOString(),
    completed_at: null,
    ...overrides,
  };
}
