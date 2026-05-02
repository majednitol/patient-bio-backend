-- Create portal_type enum for strict portal identification
CREATE TYPE public.portal_type AS ENUM (
  'patient', 
  'doctor', 
  'hospital', 
  'pathologist', 
  'researcher'
);

-- Create helper function to check if user can access a specific portal
CREATE OR REPLACE FUNCTION public.can_access_portal(_user_id uuid, _portal text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Get user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
  
  -- Check if role matches portal
  RETURN CASE _portal
    WHEN 'patient' THEN user_role = 'user'
    WHEN 'doctor' THEN user_role = 'doctor'
    WHEN 'hospital' THEN user_role = 'hospital_admin'
    WHEN 'pathologist' THEN user_role = 'pathologist'
    WHEN 'researcher' THEN user_role = 'researcher'
    ELSE false
  END;
END;
$$;

-- Create function to get user's portal type from their role
CREATE OR REPLACE FUNCTION public.get_user_portal(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
BEGIN
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
  
  RETURN CASE user_role
    WHEN 'user' THEN 'patient'
    WHEN 'doctor' THEN 'doctor'
    WHEN 'hospital_admin' THEN 'hospital'
    WHEN 'pathologist' THEN 'pathologist'
    WHEN 'researcher' THEN 'researcher'
    WHEN 'admin' THEN 'admin'
    ELSE NULL
  END;
END;
$$;

-- Update handle_new_user trigger to assign role based on portal_type metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  portal_val text;
  role_to_assign app_role;
BEGIN
  -- Get portal type from signup metadata
  portal_val := NEW.raw_user_meta_data->>'portal_type';
  
  -- Create user profile (for all users)
  INSERT INTO public.user_profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  
  -- Assign role based on portal
  IF portal_val IS NOT NULL THEN
    CASE portal_val
      WHEN 'patient' THEN role_to_assign := 'user';
      WHEN 'doctor' THEN role_to_assign := 'doctor';
      WHEN 'hospital' THEN role_to_assign := 'hospital_admin';
      WHEN 'pathologist' THEN role_to_assign := 'pathologist';
      WHEN 'researcher' THEN role_to_assign := 'researcher';
      ELSE role_to_assign := 'user'; -- Default to patient
    END CASE;
  ELSE
    -- Default to patient/user if no portal specified (legacy behavior)
    role_to_assign := 'user';
  END IF;
  
  -- Insert role (ignore if already exists)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, role_to_assign)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;