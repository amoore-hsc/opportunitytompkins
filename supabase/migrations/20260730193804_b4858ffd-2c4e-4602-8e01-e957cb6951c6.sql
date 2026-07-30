CREATE TABLE public.client_errors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message text NOT NULL,
  stack text,
  path text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.client_errors TO anon;
GRANT INSERT, SELECT, DELETE ON public.client_errors TO authenticated;
GRANT ALL ON public.client_errors TO service_role;

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can report a client error"
ON public.client_errors FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(coalesce(message, '')) BETWEEN 1 AND 2000
  AND length(coalesce(stack, '')) <= 8000
  AND length(coalesce(path, '')) <= 500
  AND length(coalesce(user_agent, '')) <= 500
);

CREATE POLICY "Admins can view client errors"
ON public.client_errors FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete client errors"
ON public.client_errors FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_client_errors_created_at ON public.client_errors (created_at DESC);