
ALTER TABLE public.data_access_requests DROP CONSTRAINT data_access_requests_requester_type_check;
ALTER TABLE public.data_access_requests ADD CONSTRAINT data_access_requests_requester_type_check CHECK (requester_type = ANY (ARRAY['doctor'::text, 'pathologist'::text, 'pharmacy'::text, 'lab'::text, 'researcher'::text]));
