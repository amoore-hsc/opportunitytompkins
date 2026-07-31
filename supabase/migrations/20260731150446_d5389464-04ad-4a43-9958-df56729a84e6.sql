CREATE TABLE public.feedback_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature')),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 5 AND 4000),
  submitter_name TEXT CHECK (submitter_name IS NULL OR char_length(submitter_name) <= 200),
  submitter_email TEXT CHECK (submitter_email IS NULL OR char_length(submitter_email) <= 320),
  page_path TEXT CHECK (page_path IS NULL OR char_length(page_path) <= 500),
  user_agent TEXT CHECK (user_agent IS NULL OR char_length(user_agent) <= 500),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'done')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT INSERT ON public.feedback_submissions TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.feedback_submissions TO authenticated;
GRANT ALL ON public.feedback_submissions TO service_role;

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback"
  ON public.feedback_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view feedback"
  ON public.feedback_submissions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update feedback"
  ON public.feedback_submissions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete feedback"
  ON public.feedback_submissions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_feedback_submissions_updated_at
  BEFORE UPDATE ON public.feedback_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_feedback_submissions_created_at ON public.feedback_submissions (created_at DESC);