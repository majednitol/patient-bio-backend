import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook for sending notifications related to doctor-pathologist workflow
 */
export const useDoctorPathologistNotifications = () => {
  const { createNotification } = useNotifications();
  const { user } = useAuth();

  /**
   * Notify pathologist about a new referral from a doctor
   */
  const notifyPathologistOfReferral = async (
    pathologistId: string,
    patientId: string,
    diseaseCategory?: string
  ) => {
    try {
      await createNotification({
        user_id: pathologistId,
        type: "referral_received",
        title: "New Patient Referral",
        message: `You received a new patient referral${
          diseaseCategory ? ` for ${diseaseCategory.replace("_", " ")}` : ""
        }. Check your Data From Doctors page.`,
        metadata: {
          patient_id: patientId,
          disease_category: diseaseCategory,
          from_doctor_id: user?.id,
        },
      });
    } catch (error) {
      console.error("Failed to send referral notification:", error);
    }
  };

  /**
   * Notify doctor that a report has been shared with them
   */
  const notifyDoctorOfSharedReport = async (
    doctorId: string,
    reportName: string,
    patientId: string
  ) => {
    try {
      await createNotification({
        user_id: doctorId,
        type: "report_shared",
        title: "New Report Shared",
        message: `A diagnostic report "${reportName}" has been shared with you.`,
        metadata: {
          report_name: reportName,
          patient_id: patientId,
          from_pathologist_id: user?.id,
        },
      });
    } catch (error) {
      console.error("Failed to send report notification:", error);
    }
  };

  /**
   * Notify pathologist that their referral status was updated
   */
  const notifyReferralStatusUpdate = async (
    pathologistId: string,
    status: string,
    patientId: string
  ) => {
    try {
      await createNotification({
        user_id: pathologistId,
        type: "referral_status_update",
        title: "Referral Status Updated",
        message: `A referral has been marked as ${status}.`,
        metadata: {
          patient_id: patientId,
          new_status: status,
        },
      });
    } catch (error) {
      console.error("Failed to send status update notification:", error);
    }
  };

  /**
   * Notify doctor immediately about critical lab values
   */
  const notifyDoctorOfCriticalValue = async (
    doctorId: string,
    patientId: string,
    reportName: string,
    criticalDetails: string
  ) => {
    try {
      await createNotification({
        user_id: doctorId,
        type: "report_shared",
        title: "🚨 CRITICAL Lab Value Alert",
        message: `Critical values detected in "${reportName}": ${criticalDetails}. Immediate review required.`,
        metadata: {
          patient_id: patientId,
          report_name: reportName,
          critical_details: criticalDetails,
          is_critical_alert: true,
          from_pathologist_id: user?.id,
        },
      });
    } catch (error) {
      console.error("Failed to send critical value notification:", error);
    }
  };

  return {
    notifyPathologistOfReferral,
    notifyDoctorOfSharedReport,
    notifyReferralStatusUpdate,
    notifyDoctorOfCriticalValue,
  };
};
