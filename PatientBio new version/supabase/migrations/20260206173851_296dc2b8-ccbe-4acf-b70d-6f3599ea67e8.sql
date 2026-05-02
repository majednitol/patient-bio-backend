-- Make sure pgcrypto is available in public schema as well
-- This allows functions in public schema to use digest()
DROP EXTENSION IF EXISTS pgcrypto;
CREATE EXTENSION pgcrypto WITH SCHEMA public;