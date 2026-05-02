/**
 * Maps notification type + metadata to a dashboard route.
 * Returns null if no navigation applies.
 */
export function getNotificationRoute(
  type: string,
  metadata?: Record<string, unknown> | null
): string | null {
  switch (type) {
    case "access_request":
    case "request_approved":
    case "request_rejected":
    case "research_data_shared":
      return "/dashboard/requests";

    case "data_viewed":
    case "data_access":
    case "emergency_access":
      return "/dashboard/access-analytics";

    case "prescription_added":
      return "/dashboard/prescriptions";

    case "report_shared":
      return "/dashboard/lab-reports";

    case "family_link_request":
    case "family_link_approved":
    case "family_link_rejected":
      return "/dashboard/family";

    case "verification_approved":
    case "verification_rejected":
      return "/dashboard/profile";

    case "medication_reminder":
      return "/dashboard/health-data";

    case "appointment_booked":
      return "/doctor/appointments";

    case "appointment_confirmed":
    case "appointment_cancelled":
    case "appointment_completed":
    case "appointment_rescheduled":
      return "/dashboard/appointments";

    // Admin-specific notification types
    case "new_user_signup":
      return "/admin/users";

    case "verification_request":
      return "/admin/verifications";

    case "system_health_alert":
      return "/admin/system-health";

    case "contact_message":
      return "/admin/messages";

    case "role_change":
      return "/admin/users";

    case "backup_completed":
      return "/admin/backup";

    // Diagnostic/Pathologist-specific notification types
    case "lab_order_received":
      return "/pathologist/hospital-orders";

    case "doctor_referral":
      return "/pathologist/from-doctors";

    case "sample_status_update":
      return "/pathologist/sample-tracking";

    case "patient_share_received":
      return "/pathologist/patient-shares";

    case "invoice_payment":
      return "/pathologist/billing";

    // Researcher-specific notification types
    case "broadcast_approved":
    case "broadcast_rejected":
    case "broadcast_response":
      return "/researcher/broadcast-requests";

    case "study_invitation":
    case "study_invitation_accepted":
    case "study_invitation_declined":
      return "/researcher/collaboration";

    case "researcher_share_received":
      return "/researcher/patient-shares";

    case "dua_approved":
    case "dua_expired":
    case "dua_submitted":
      return "/researcher/data-governance";

    case "cohort_drift_detected":
      return "/researcher/cohort-builder";

    case "export_completed":
      return "/researcher/data-export";

    case "study_milestone_due":
    case "study_created":
      return "/researcher/studies";

    case "collaboration_message":
      return "/researcher/collaboration";

    case "data_quality_alert":
      return "/researcher/data-quality";

    case "pool_contribution_available":
      return "/researcher/global-data-pool";

    case "publication_status_change":
      return "/researcher/publications";

    default:
      return null;
  }
}
