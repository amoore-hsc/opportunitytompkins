## Goal

Add an invisible honeypot field to the Submit a Job dialog. Real users never see or fill it; most spam bots auto-fill every input on a form, so we silently reject any submission where the honeypot is non-empty.

## Changes

### `src/components/SubmitJobDialog.tsx`
- Add a `website` state (the honeypot — a name bots find irresistible).
- Render a hidden `<input name="website">` inside the form, wrapped in a div with `aria-hidden="true"`, `tabIndex={-1}`, `autoComplete="off"`, and CSS that takes it out of the layout entirely (`position: absolute; left: -9999px; opacity: 0; height: 0; width: 0; overflow: hidden`). Using off-screen positioning rather than `display: none` because some bots skip `display:none` fields.
- Include the field in `reset()`.
- In `handleSubmit`, before zod validation: if `website.trim() !== ""`, fake a success toast (so bots can't tell they were caught), reset, close the dialog, and return without calling the edge function.

### `supabase/functions/submit-job-posting/index.ts`
- Add `website: z.string().max(0).optional().nullable()` (or accept the field and reject if non-empty) to the body schema as a server-side backstop in case a bot bypasses the React handler.
- Return a generic 200 success response (no DB insert) when honeypot is filled, so bots get no useful signal.

## Why this approach

- Zero UX friction for real users.
- Zero third-party dependencies, no accounts to set up.
- Defense-in-depth: client-side check stops the request, server-side check stops anyone calling the edge function directly.
- Faking success on detection prevents bots from learning the honeypot's name and adapting.

## Out of scope

Rate limiting, Cloudflare Turnstile, time-based checks — can layer on later if real abuse appears.