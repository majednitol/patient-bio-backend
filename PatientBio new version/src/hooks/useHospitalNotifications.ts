import { supabase } from "@/integrations/supabase/client";

interface NotifyStaffParams {
  hospital_id: string;
  event_type: "admission" | "discharge" | "appointment" | "doctor_application" | "lab_consent_approved" | "lab_consent_rejected" | "lab_results_ready";
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  exclude_user_id?: string;
}

/**
 * Send notifications to all active hospital staff
 */
export const notifyHospitalStaff = async (params: NotifyStaffParams) => {
  try {
    const { data, error } = await supabase.functions.invoke(
      "notify-hospital-staff",
      {
        body: params,
      }
    );

    if (error) {
      console.error("Error notifying hospital staff:", error);
      return { success: false, error };
    }

    console.log("Staff notified:", data);
    return { success: true, data };
  } catch (err) {
    console.error("Failed to notify staff:", err);
    return { success: false, error: err };
  }
};

/**
 * Notification helper functions for common hospital events
 */
export const hospitalNotifications = {
  admission: (
    hospitalId: string,
    patientName: string,
    wardName: string,
    excludeUserId?: string
  ) =>
    notifyHospitalStaff({
      hospital_id: hospitalId,
      event_type: "admission",
      title: "New Patient Admission",
      message: `${patientName} has been admitted to ${wardName}`,
      metadata: { patient_name: patientName, ward_name: wardName },
      exclude_user_id: excludeUserId,
    }),

  discharge: (
    hospitalId: string,
    patientName: string,
    excludeUserId?: string
  ) =>
    notifyHospitalStaff({
      hospital_id: hospitalId,
      event_type: "discharge",
      title: "Patient Discharged",
      message: `${patientName} has been discharged`,
      metadata: { patient_name: patientName },
      exclude_user_id: excludeUserId,
    }),

  appointment: (
    hospitalId: string,
    patientName: string,
    doctorName: string,
    appointmentDate: string,
    excludeUserId?: string
  ) =>
    notifyHospitalStaff({
      hospital_id: hospitalId,
      event_type: "appointment",
      title: "New Appointment Booked",
      message: `${patientName} booked an appointment with Dr. ${doctorName} on ${appointmentDate}`,
      metadata: {
        patient_name: patientName,
        doctor_name: doctorName,
        appointment_date: appointmentDate,
      },
      exclude_user_id: excludeUserId,
    }),

  doctorApplication: (
    hospitalId: string,
    doctorName: string,
    specialty: string,
    excludeUserId?: string
  ) =>
    notifyHospitalStaff({
      hospital_id: hospitalId,
      event_type: "doctor_application",
      title: "New Doctor Application",
      message: `Dr. ${doctorName} (${specialty}) has applied to join the hospital`,
      metadata: { doctor_name: doctorName, specialty },
      exclude_user_id: excludeUserId,
    }),

  labConsentApproved: (
    hospitalId: string,
    patientName: string,
    testNames: string,
    excludeUserId?: string
  ) =>
    notifyHospitalStaff({
      hospital_id: hospitalId,
      event_type: "lab_consent_approved",
      title: "Lab Consent Approved",
      message: `${patientName} approved consent for: ${testNames}`,
      metadata: { patient_name: patientName, tests: testNames },
      exclude_user_id: excludeUserId,
    }),

  labConsentRejected: (
    hospitalId: string,
    patientName: string,
    testNames: string,
    excludeUserId?: string
  ) =>
    notifyHospitalStaff({
      hospital_id: hospitalId,
      event_type: "lab_consent_rejected",
      title: "Lab Consent Rejected",
      message: `${patientName} rejected consent for: ${testNames}`,
      metadata: { patient_name: patientName, tests: testNames },
      exclude_user_id: excludeUserId,
    }),

  labResultsReady: (
    hospitalId: string,
    patientName: string,
    testNames: string,
    excludeUserId?: string
  ) =>
    notifyHospitalStaff({
      hospital_id: hospitalId,
      event_type: "lab_results_ready",
      title: "Lab Results Ready",
      message: `Results ready for ${patientName}: ${testNames}`,
      metadata: { patient_name: patientName, tests: testNames },
      exclude_user_id: excludeUserId,
    }),
};
