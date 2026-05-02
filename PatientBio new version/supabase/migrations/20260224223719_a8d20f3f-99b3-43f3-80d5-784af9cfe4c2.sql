
-- Create a view that aggregates doctor rating stats from consultation_feedback
CREATE OR REPLACE VIEW public.doctor_rating_stats AS
SELECT
  dp.user_id AS doctor_id,
  ROUND(AVG(cf.rating)::numeric, 1) AS avg_rating,
  COUNT(cf.id)::integer AS total_reviews,
  ROUND(
    AVG(CASE WHEN cf.created_at >= now() - interval '6 months' THEN cf.rating END)::numeric,
    1
  ) AS recent_avg
FROM public.doctor_profiles dp
LEFT JOIN public.consultation_feedback cf ON cf.doctor_id = dp.user_id
GROUP BY dp.user_id;
