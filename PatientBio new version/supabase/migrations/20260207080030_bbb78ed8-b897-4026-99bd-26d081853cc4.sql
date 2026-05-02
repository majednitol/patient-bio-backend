-- Add hospital_lab_order_id column to pathologist_reports for bidirectional linking
ALTER TABLE pathologist_reports
ADD COLUMN hospital_lab_order_id UUID REFERENCES hospital_lab_orders(id);

-- Create index for efficient lookups of hospital-linked reports
CREATE INDEX idx_pathologist_reports_hospital_order 
ON pathologist_reports(hospital_lab_order_id) 
WHERE hospital_lab_order_id IS NOT NULL;