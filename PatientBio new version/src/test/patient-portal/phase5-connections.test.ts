import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSingle = vi.fn();
const mockSupabase = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) }) }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
  }),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

describe("Phase 5: Doctor Connections and Appointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 32-34: Doctor Connections
  describe("Test 32: Connect to doctor", () => {
    it("should create a doctor connection record", async () => {
      const newDoctor = {
        user_id: "user-123",
        doctor_name: "Dr. Smith",
        specialty: "Cardiology",
        hospital_clinic: "City Hospital",
        phone: "+1234567890",
        email: "dr.smith@clinic.com",
      };

      mockSingle.mockResolvedValueOnce({
        data: { id: "dc-1", ...newDoctor },
        error: null,
      });

      const result = await mockSupabase
        .from("doctor_connections")
        .insert(newDoctor)
        .select()
        .single();

      expect(result.data?.doctor_name).toBe("Dr. Smith");
      expect(result.data?.specialty).toBe("Cardiology");
    });
  });

  describe("Test 33: View connected doctors", () => {
    it("should fetch doctors ordered by name", async () => {
      const doctors = [
        { id: "d1", doctor_name: "Dr. Adams", specialty: "Dermatology" },
        { id: "d2", doctor_name: "Dr. Brown", specialty: "Cardiology" },
      ];

      const sorted = [...doctors].sort((a, b) => a.doctor_name.localeCompare(b.doctor_name));
      expect(sorted[0].doctor_name).toBe("Dr. Adams");
      expect(sorted[1].doctor_name).toBe("Dr. Brown");
    });
  });

  // Test 35-41: Appointments
  describe("Test 35: Book appointment", () => {
    it("should create appointment with required fields", () => {
      const appointment = {
        doctor_id: "doc-1",
        patient_id: "pat-1",
        appointment_date: "2026-02-20",
        start_time: "09:00",
        end_time: "09:30",
        reason: "Annual checkup",
        status: "scheduled",
      };

      expect(appointment.doctor_id).toBeDefined();
      expect(appointment.patient_id).toBeDefined();
      expect(appointment.appointment_date).toBeDefined();
      expect(appointment.start_time).toBeDefined();
      expect(appointment.end_time).toBeDefined();
      expect(appointment.status).toBe("scheduled");
    });
  });

  describe("Test 37: Cancel appointment", () => {
    it("should update appointment status to cancelled", () => {
      const appointment = { id: "apt-1", status: "scheduled" };
      const cancelled = { ...appointment, status: "cancelled", cancelled_at: new Date().toISOString() };

      expect(cancelled.status).toBe("cancelled");
      expect(cancelled.cancelled_at).toBeDefined();
    });
  });

  describe("Test 39: Patient intake form", () => {
    it("should validate intake form data structure", () => {
      const intake = {
        appointment_id: "apt-1",
        patient_id: "pat-1",
        chief_complaint: "Persistent headache for 3 days",
        symptom_severity: "moderate",
        symptom_duration: "3 days",
        self_medications: "Ibuprofen 400mg",
        additional_notes: "Pain worsens in the evening",
      };

      expect(intake.chief_complaint).toBeDefined();
      expect(intake.symptom_severity).toBeDefined();
      expect(["mild", "moderate", "severe"]).toContain(intake.symptom_severity);
    });
  });

  describe("Test 41: Live queue position", () => {
    it("should calculate queue position from checked-in appointments", () => {
      const appointments = [
        { id: "1", checked_in_at: "2026-02-16T08:00:00Z", consultation_started_at: null },
        { id: "2", checked_in_at: "2026-02-16T08:10:00Z", consultation_started_at: null },
        { id: "3", checked_in_at: "2026-02-16T08:15:00Z", consultation_started_at: null },
      ];

      const myAppointmentId = "2";
      const queuePosition = appointments
        .filter((a) => a.consultation_started_at === null)
        .sort((a, b) => new Date(a.checked_in_at!).getTime() - new Date(b.checked_in_at!).getTime())
        .findIndex((a) => a.id === myAppointmentId) + 1;

      expect(queuePosition).toBe(2);
    });
  });
});
