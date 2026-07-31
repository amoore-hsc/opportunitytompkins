import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Job {
  id: string;
  job_title: string;
  employer: string;
  employment_type: string | null;
  wage: string | null;
  location: string | null;
  posting_url: string;
  source_site: string;
  job_category: string | null;
  updated_at: string;
}

interface JobsEmailRequest {
  email: string;
  jobs: Job[];
}

const escapeHtml = (s: string | null | undefined): string => {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const ensureUrl = (url: string): string => {
  if (!url) return "";
  return url.startsWith("http") ? url : `https://${url}`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, jobs }: JobsEmailRequest = await req.json();

    console.log(`Sending jobs email to: ${email}`);
    console.log(`Number of jobs: ${jobs.length}`);

    // Group jobs by category, sorted by descending count (matches site UI)
    const grouped: Record<string, Job[]> = {};
    for (const j of jobs) {
      const cat = j.job_category || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(j);
    }
    const sortedGroups = Object.entries(grouped).sort(
      ([, a], [, b]) => b.length - a.length
    );

    const groupsHtml = sortedGroups
      .map(([category, list]) => {
        const itemsHtml = list
          .map((job) => {
            const url = ensureUrl(job.posting_url);
            const safeUrl = escapeHtml(url);
            return `
<div style="background-color:#f0f7ff; border-left:4px solid #1e3a5f; padding:18px 20px; margin:0 0 16px 0; border-radius:0 8px 8px 0;">
  <h3 style="margin:0 0 4px 0; font-size:17px; color:#1e3a5f;">${escapeHtml(job.job_title)}</h3>
  <p style="margin:0 0 8px 0; font-size:15px; font-weight:600; color:#333;">${escapeHtml(job.employer)}</p>
  ${job.location && job.location.trim() ? `<p style="margin:0 0 6px 0; color:#555;">📍 <strong>Location:</strong> ${escapeHtml(job.location)}</p>` : ""}
  ${job.wage && job.wage.trim() && job.wage.trim() !== "/" ? `<p style="margin:0 0 6px 0; color:#555;">💵 <strong>Pay:</strong> ${escapeHtml(job.wage)}</p>` : ""}
  ${job.employment_type && job.employment_type.trim() ? `<p style="margin:0 0 6px 0; color:#555;">🕐 <strong>Type:</strong> ${escapeHtml(job.employment_type)}</p>` : ""}
  <p style="margin:0 0 10px 0; font-size:12px; color:#999;">Updated ${new Date(job.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
  <div style="text-align:center; margin-top:8px;">
    <a href="${safeUrl}" style="display:inline-block; background-color:#1e3a5f; color:white; text-decoration:none; padding:10px 24px; border-radius:6px; font-weight:bold; font-size:14px;">View Job Posting</a>
  </div>
</div>`;
          })
          .join("");

        return `
<h2 style="margin:24px 0 12px 0; padding-bottom:6px; border-bottom:2px solid #1e3a5f; color:#1e3a5f; font-size:18px;">${escapeHtml(category)} (${list.length})</h2>
${itemsHtml}`;
      })
      .join("");

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Shared Job Listings</title>
</head>
<body style="margin:0; padding:0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.6; color:#333333; background-color:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;">
<tr>
<td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; max-width:600px; border-radius:8px; overflow:hidden;">

<tr>
<td style="background-color:#1e3a5f; padding:30px; text-align:center;">
<h1 style="margin:0; font-size:26px; color:#ffffff;">Shared Job Listings</h1>
</td>
</tr>

<tr>
<td style="padding:30px;">
<p style="margin:0 0 20px 0;">Here ${jobs.length === 1 ? "is" : "are"} the ${jobs.length} ${jobs.length === 1 ? "job" : "jobs"} that matched your filters:</p>
${groupsHtml}
</td>
</tr>

<tr>
<td style="background-color:#1e3a5f; padding:25px; text-align:center;">
<p style="margin:0 0 5px 0; color:#ffffff; font-size:16px;">Need Help?</p>
<p style="margin:0; color:#a0c4e8; font-size:14px;"><a href="mailto:amoore@hsctc.org" style="color:#ffffff; font-weight:bold;">Contact Us</a></p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;

    const emailResponse = await resend.emails.send({
      from: "Tompkins Opportunity <hello@tompkins-opportunity.org>",
      to: [email],
      subject: `Shared Job Listings`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-jobs-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
