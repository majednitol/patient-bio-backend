-- Enable the pgcrypto extension for the digest() function used in access_tokens
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;