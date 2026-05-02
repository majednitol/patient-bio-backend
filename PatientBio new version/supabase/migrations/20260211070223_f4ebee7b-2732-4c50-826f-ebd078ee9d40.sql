
-- Add doctor_staff to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'doctor_staff';

-- Update can_access_portal to allow doctor_staff on doctor portal
CREATE OR REPLACE FUNCTION public.can_access_portal(_user_id uuid, _portal text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
BEGIN
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
  
  RETURN CASE _portal
    WHEN 'patient' THEN user_role = 'user'
    WHEN 'doctor' THEN user_role IN ('doctor', 'doctor_staff')
    WHEN 'hospital' THEN user_role = 'hospital_admin'
    WHEN 'pathologist' THEN user_role = 'pathologist'
    WHEN 'researcher' THEN user_role = 'researcher'
    ELSE false
  END;
END;
$function$;

-- Update get_user_portal to map doctor_staff to doctor portal
CREATE OR REPLACE FUNCTION public.get_user_portal(_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    WHEN 'doctor_staff' THEN 'doctor'
    WHEN 'hospital_admin' THEN 'hospital'
    WHEN 'pathologist' THEN 'pathologist'
    WHEN 'researcher' THEN 'researcher'
    WHEN 'admin' THEN 'admin'
    ELSE NULL
  END;
END;
$function$;

-- Update handle_new_user to handle doctor_staff portal type
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  portal_val text;
  role_to_assign app_role;
BEGIN
  portal_val := NEW.raw_user_meta_data->>'portal_type';
  
  INSERT INTO public.user_profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  
  IF portal_val IS NOT NULL THEN
    CASE portal_val
      WHEN 'patient' THEN role_to_assign := 'user';
      WHEN 'doctor' THEN role_to_assign := 'doctor';
      WHEN 'doctor_staff' THEN role_to_assign := 'doctor_staff';
      WHEN 'hospital' THEN role_to_assign := 'hospital_admin';
      WHEN 'pathologist' THEN role_to_assign := 'pathologist';
      WHEN 'researcher' THEN role_to_assign := 'researcher';
      ELSE role_to_assign := 'user';
    END CASE;
  ELSE
    role_to_assign := 'user';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, role_to_assign)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$function$;
