
CREATE OR REPLACE VIEW public.doctor_demand_analytics AS
WITH patient_visit_counts AS (
  SELECT 
    doctor_id,
    patient_id,
    COUNT(*) as visit_count
  FROM appointments
  WHERE status IN ('completed', 'confirmed')
  GROUP BY doctor_id, patient_id
)
SELECT
  d.user_id as doctor_id,
  d.full_name,
  d.specialty,
  d.lab_grade,
  COALESCE(stats.total_appointments, 0)::bigint as total_appointments,
  COALESCE(stats.unique_patients, 0)::bigint as unique_patients,
  COALESCE(stats.appointments_30d, 0)::bigint as appointments_30d,
  COALESCE(stats.appointments_90d, 0)::bigint as appointments_90d,
  COALESCE(stats.repeat_patients, 0)::bigint as repeat_patients,
  COALESCE(
    ROUND(
      stats.repeat_patients::numeric / NULLIF(stats.unique_patients, 0) * 100, 1
    ), 0
  ) as repeat_patient_pct,
  CASE WHEN NULLIF(stats.unique_patients, 0) IS NOT NULL
    THEN ROUND(stats.total_appointments::numeric / stats.unique_patients, 1)
    ELSE 0
  END as avg_visits_per_patient
FROM doctor_profiles d
LEFT JOIN LATERAL (
  SELECT
    COUNT(a.id) as total_appointments,
    COUNT(DISTINCT a.patient_id) as unique_patients,
    COUNT(CASE WHEN a.appointment_date >= (NOW() - INTERVAL '30 days')::date THEN 1 END) as appointments_30d,
    COUNT(CASE WHEN a.appointment_date >= (NOW() - INTERVAL '90 days')::date THEN 1 END) as appointments_90d,
    COUNT(DISTINCT CASE WHEN pv.visit_count >= 2 THEN a.patient_id END) as repeat_patients
  FROM appointments a
  LEFT JOIN patient_visit_counts pv ON pv.doctor_id = a.doctor_id AND pv.patient_id = a.patient_id
  WHERE a.doctor_id = d.user_id AND a.status IN ('completed', 'confirmed')
) stats ON true;

GRANT SELECT ON public.doctor_demand_analytics TO authenticated;
