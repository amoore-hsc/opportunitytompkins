import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * True when the request comes from another edge function (service role key)
 * or from a signed-in admin. Used by functions that send emails on an admin's
 * behalf, so the public can't use them to send mail from our domain.
 */
export async function isAdminOrServiceCaller(req: Request): Promise<boolean> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (serviceKey && token === serviceKey) return true;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData?.user) return false;

  const { data: isAdmin } = await admin.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  return isAdmin === true;
}
