-- Add notification preferences columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS notification_push_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"data_access": true, "emergency_access": true, "prescriptions": true, "appointments": true, "requests": true}'::jsonb;