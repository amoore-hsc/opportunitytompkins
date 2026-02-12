
-- Add admin contact columns (no phone needed per user request)
ALTER TABLE public.opportunities ADD COLUMN admin_contact_name text;
ALTER TABLE public.opportunities ADD COLUMN admin_email text;
