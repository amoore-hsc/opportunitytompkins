import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { notifyGoogleChat } from "../_shared/googleChat.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Opportunity {
  id: string;
  org_name: string;
  contact_name: string | null;
  org_email: string;
  admin_contact_name: string | null;
  admin_email: string | null;
  position_title: string | null;
  type: string;
  description: string;
  location: string;
  role_classification: string | null;
  hours_available: string;
  days_times_available: string;
  additional_requirements: string | null;
  created_at: string;
  edit_token: string;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

const getDaysSinceCreation = (createdAt: string): number => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const generateListingBlock = (opportunity: Opportunity, editUrl: string, confirmUrl: string): string => {
  const daysSinceCreation = getDaysSinceCreation(opportunity.created_at);
  const positionTitle = opportunity.position_title || opportunity.type;
  
  return `
    <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #1e3a5f;">
      <h3 style="margin: 0 0 15px 0; color: #1e3a5f; font-size: 18px;">${positionTitle}</h3>
      <table style="width: 100%; font-size: 14px; color: #555; margin-bottom: 15px;">
        <tr>
          <td style="padding: 5px 0; font-weight: bold; width: 40%;">Location:</td>
          <td style="padding: 5px 0;">${opportunity.location}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold;">Hours Available:</td>
          <td style="padding: 5px 0;">${opportunity.hours_available}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold;">Days/Times Available:</td>
          <td style="padding: 5px 0;">${opportunity.days_times_available}</td>
        </tr>
        ${opportunity.additional_requirements ? `
        <tr>
          <td style="padding: 5px 0; font-weight: bold;">Requirements:</td>
          <td style="padding: 5px 0;">${opportunity.additional_requirements}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 5px 0; font-weight: bold;">Posted:</td>
          <td style="padding: 5px 0;">${formatDate(opportunity.created_at)} (${daysSinceCreation} days ago)</td>
        </tr>
      </table>
      <div style="text-align: center;">
        <a href="${confirmUrl}" style="display: inline-block; background-color: #2e7d32; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; margin-right: 10px;">
          Confirm Still Active
        </a>
        <a href="${editUrl}" style="display: inline-block; background-color: #1e3a5f; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px;">
          Edit This Listing
        </a>
      </div>
    </div>
  `;
};

const generateConsolidatedEmail = (opportunities: Opportunity[], siteUrl: string): string => {
  const listingBlocks = opportunities.map(opp => {
    const editUrl = `${siteUrl}/edit-opportunity/${opp.edit_token}`;
    const confirmUrl = `${siteUrl}/confirm-listing/${opp.edit_token}`;
    return generateListingBlock(opp, editUrl, confirmUrl);
  }).join('');

  const listingCount = opportunities.length;
  const listingWord = listingCount === 1 ? 'listing' : 'listings';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Listing Reminder</title>
</head>
<body style="margin:0; padding:0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.6; color:#333333; background-color:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;">
<tr>
<td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; max-width:600px; border-radius:8px; overflow:hidden;">

<!-- Header -->
<tr>
<td style="background-color:#1e3a5f; padding:30px; text-align:center;">
<h1 style="margin:0; font-size:28px; color:#ffffff;">Your ${listingWord === 'listings' ? 'Listings Need' : 'Listing Needs'}<br>Attention</h1>
</td>
</tr>

<!-- Main Content -->
<tr>
<td style="padding:30px;">

<p style="margin:0 0 25px 0;">You have <strong>${listingCount} ${listingWord}</strong> on Tompkins Opportunity that ${listingCount === 1 ? 'has' : 'have'} not been updated in 60+ days.</p>

<!-- Action Items Card -->
<div style="background-color:#e6f7e6; border-left:4px solid #2e7d32; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#2e7d32;">Action Items</h2>
<p style="margin:0 0 12px 0;"><strong>If your listing is still accurate:</strong></p>
<p style="margin:0 0 20px 0; padding-left:15px;">&bull; Click the <strong>Confirm Still Active</strong> button below to keep the listing posted</p>
<p style="margin:0 0 12px 0;"><strong>If you need to make changes:</strong></p>
<p style="margin:0 0 8px 0; padding-left:15px;">&bull; Update your listing if availability or details have changed by clicking the <strong>Edit This Listing</strong> button.</p>
<p style="margin:0 0 20px 0; padding-left:15px;">&bull; Remove the listing if the position has been filled. Click the <strong>Edit This Listing</strong> button, then scroll to the bottom of the page and click <strong>Deactivate</strong>.</p>
<p style="margin:0; color:#c62828; font-style:italic;">If you do not take either action, we will automatically archive your post in 14 days.</p>
</div>

<!-- Listing Blocks -->
${listingBlocks}

<p style="margin:0 0 0 0; font-size:13px; color:#666666; text-align:center;">Each edit link is unique to its listing. Please keep them safe.</p>

</td>
</tr>

<!-- Footer -->
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
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-listing-reminder function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for test mode - gated behind admin task secret
    let testMode = false;
    let testEmail = "";
    let manualOpportunityId = "";
    let isAdminManualSend = false;
    let adminSelfEmail = "";
    let sendToSelf = false;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.testMode === true) {
          const adminSecret = Deno.env.get("ADMIN_TASK_SECRET");
          const providedSecret = req.headers.get("x-admin-task-secret");
          if (!adminSecret || providedSecret !== adminSecret) {
            return new Response(
              JSON.stringify({ error: "Unauthorized" }),
              { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }
          testMode = true;
          testEmail = body.testEmail || body.email || "";
          manualOpportunityId = body.opportunityId || "";
        } else if (body.opportunityId) {
          // Manual admin-triggered resend for a specific listing
          const authHeader = req.headers.get("Authorization") || "";
          const token = authHeader.replace(/^Bearer\s+/i, "");
          if (!token) {
            return new Response(
              JSON.stringify({ error: "Unauthorized" }),
              { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }
          const supabaseUrlAuth = Deno.env.get("SUPABASE_URL")!;
          const supabaseServiceKeyAuth = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const authClient = createClient(supabaseUrlAuth, supabaseServiceKeyAuth);
          const { data: userData, error: userErr } = await authClient.auth.getUser(token);
          if (userErr || !userData?.user) {
            return new Response(
              JSON.stringify({ error: "Unauthorized" }),
              { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }
          const { data: isAdminData } = await authClient.rpc("has_role", {
            _user_id: userData.user.id,
            _role: "admin",
          });
          if (!isAdminData) {
            return new Response(
              JSON.stringify({ error: "Forbidden" }),
              { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }
          isAdminManualSend = true;
          manualOpportunityId = body.opportunityId;
          adminSelfEmail = userData.user.email || "";
          sendToSelf = body.sendToSelf === true;
        }
      } catch {
        // No body or invalid JSON, continue with normal mode
      }
    }


    const siteUrl = Deno.env.get("SITE_URL") || "https://oosxopnxaivfdtksrvam.lovableproject.com";

    // Initialize Supabase client with service role for full access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test mode: fetch real listings and send to test email
    if (testMode && testEmail) {
      console.log(`Test mode: fetching real listings to send reminder to ${testEmail}`);
      
      // Fetch a specific opportunity if provided, otherwise up to 3 real active listings
      const baseQuery = supabase
        .from("opportunities")
        .select("id, org_name, contact_name, org_email, admin_contact_name, admin_email, position_title, type, description, location, role_classification, hours_available, days_times_available, additional_requirements, created_at, edit_token");
      const { data: realListings, error: fetchError } = manualOpportunityId
        ? await baseQuery.eq("id", manualOpportunityId)
        : await baseQuery.eq("active", true).limit(3);

      if (fetchError) {
        console.error("Error fetching real listings for test:", fetchError);
        throw new Error(`Failed to fetch listings for test: ${fetchError.message}`);
      }

      if (!realListings || realListings.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "No active listings found to use for testing",
            testMode: true
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      console.log(`Found ${realListings.length} real listing(s) to use for test email`);

      // Use real listings but override the org_email display
      const testOpportunities: Opportunity[] = realListings.map((listing: any) => ({
        ...listing,
        // Keep all real data including edit_token so buttons work
      }));

      const emailHtml = generateConsolidatedEmail(testOpportunities, siteUrl);
      
      const listingCount = testOpportunities.length;
      const subject = listingCount === 1
        ? `[TEST] Reminder: Your "${testOpportunities[0].position_title || testOpportunities[0].type}" Listing Has Not Been Updated in 60+ Days`
        : `[TEST] Reminder: Your ${listingCount} Listings Need Attention`;

      const emailResponse = await resend.emails.send({
        from: "Tompkins Opportunity <hello@tompkins-opportunity.org>",
        to: [testEmail],
        subject: subject,
        html: emailHtml,
      });

      console.log("Test email sent successfully:", emailResponse);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Test reminder email sent to ${testEmail} with ${listingCount} real listing(s)`,
          testMode: true,
          listingsUsed: testOpportunities.map(o => ({ id: o.id, position: o.position_title || o.type, org: o.org_name })),
          emailResponse
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Manual admin-triggered resend for a specific opportunity
    if (isAdminManualSend && manualOpportunityId) {
      const { data: opp, error: oppErr } = await supabase
        .from("opportunities")
        .select("id, org_name, contact_name, org_email, admin_contact_name, admin_email, position_title, type, description, location, role_classification, hours_available, days_times_available, additional_requirements, created_at, edit_token, manual_reminder_count")
        .eq("id", manualOpportunityId)
        .maybeSingle();

      if (oppErr || !opp) {
        return new Response(
          JSON.stringify({ error: "Opportunity not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const realRecipient = (opp.admin_email || opp.org_email);
      const recipient = sendToSelf && adminSelfEmail ? adminSelfEmail : realRecipient;
      const emailHtml = generateConsolidatedEmail([opp as Opportunity], siteUrl);
      const subjectPrefix = sendToSelf ? "[TEST] " : "";
      const subject = `${subjectPrefix}Reminder: Your "${opp.position_title || opp.type}" Listing Needs Attention`;

      const emailResponse = await resend.emails.send({
        from: "Tompkins Opportunity <hello@tompkins-opportunity.org>",
        to: [recipient],
        subject,
        html: emailHtml,
      });

      // Resend returns { data, error } — a failure here is NOT a thrown exception.
      if ((emailResponse as any)?.error) {
        const resendError = (emailResponse as any).error;
        console.error("Resend rejected manual reminder:", JSON.stringify(resendError));
        return new Response(
          JSON.stringify({
            success: false,
            error: resendError?.message || "Email provider rejected the message",
            provider_error: resendError,
            recipient,
          }),
          { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log(
        `Manual reminder accepted by Resend (id: ${(emailResponse as any)?.data?.id}) for ${recipient}`
      );

      let newCount = opp.manual_reminder_count || 0;
      let nowIso = new Date().toISOString();
      if (!sendToSelf) {
        newCount = newCount + 1;
        const { error: updateError } = await supabase
          .from("opportunities")
          .update({
            manual_reminder_count: newCount,
            last_manual_reminder_at: nowIso,
            reminder_sent_at: nowIso,
          })
          .eq("id", opp.id);

        if (updateError) {
          console.error("Failed to update manual reminder counters:", updateError);
        }
      }


      return new Response(
        JSON.stringify({
          success: true,
          message: sendToSelf
            ? `Test reminder sent to ${recipient} (would have gone to ${realRecipient})`
            : `Reminder resent to ${recipient}`,
          recipient,
          test: sendToSelf,
          manual_reminder_count: newCount,
          last_manual_reminder_at: sendToSelf ? opp.last_manual_reminder_at : nowIso,
          emailResponse,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }



    // Query opportunities that need reminders:
    // - Active volunteer listings
    // - Not updated in 60+ days
    // - No reminder sent since the listing was last updated (every edit re-arms the reminder)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    console.log(`Looking for opportunities not updated since: ${sixtyDaysAgo.toISOString()}`);

    const { data: opportunities, error: fetchError } = await supabase
      .from("opportunities")
      .select("id, org_name, contact_name, org_email, admin_contact_name, admin_email, position_title, type, description, location, role_classification, hours_available, days_times_available, additional_requirements, created_at, edit_token, updated_at, reminder_sent_at")
      .eq("active", true)
      .eq("type", "volunteer")
      .lte("updated_at", sixtyDaysAgo.toISOString());

    if (fetchError) {
      console.error("Error fetching opportunities:", fetchError);
      throw new Error(`Failed to fetch opportunities: ${fetchError.message}`);
    }

    // Column-to-column comparison must happen in code: eligible when no reminder has
    // ever been sent, or the last reminder predates the listing's most recent update.
    const eligibleOpportunities = ((opportunities || []) as (Opportunity & {
      updated_at: string;
      reminder_sent_at: string | null;
    })[]).filter(
      (opp) =>
        !opp.reminder_sent_at ||
        new Date(opp.reminder_sent_at).getTime() < new Date(opp.updated_at).getTime(),
    ) as Opportunity[];


    console.log(`Found ${eligibleOpportunities.length} opportunities needing reminders`);

    if (eligibleOpportunities.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No opportunities need reminders at this time",
          reminders_sent: 0,
          emails_sent: 0
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Group opportunities by the email that should receive the reminder (admin_email or org_email)
    const groupedByEmail = new Map<string, Opportunity[]>();
    for (const opp of eligibleOpportunities) {
      const email = (opp.admin_email || opp.org_email).toLowerCase();
      if (!groupedByEmail.has(email)) {
        groupedByEmail.set(email, []);
      }
      groupedByEmail.get(email)!.push(opp);
    }

    console.log(`Grouped into ${groupedByEmail.size} unique contact emails`);

    // siteUrl already defined above
    let emailsSent = 0;
    let listingsUpdated = 0;
    const errors: string[] = [];

    // Process each email group
    for (const [email, opps] of groupedByEmail) {
      try {
        console.log(`Sending consolidated reminder to ${email} for ${opps.length} listing(s)`);

        const emailHtml = generateConsolidatedEmail(opps, siteUrl);
        
        // Generate subject line
        const listingCount = opps.length;
        const subject = listingCount === 1
          ? `Reminder: Your "${opps[0].position_title || opps[0].type}" Listing Has Not Been Updated in 60+ Days`
          : `Reminder: Your ${listingCount} Listings Need Attention`;

        const emailResponse = await resend.emails.send({
          from: "Tompkins Opportunity <hello@tompkins-opportunity.org>",
          to: [email],
          subject: subject,
          html: emailHtml,
        });

        console.log(`Email sent successfully to ${email}:`, emailResponse);
        emailsSent++;

        // Update reminder_sent_at for all opportunities in this group
        const oppIds = opps.map(o => o.id);
        const { error: updateError } = await supabase
          .from("opportunities")
          .update({ reminder_sent_at: new Date().toISOString() })
          .in("id", oppIds);

        if (updateError) {
          console.error(`Error updating reminder_sent_at for opportunities:`, updateError);
          errors.push(`Failed to update reminder_sent_at for ${oppIds.length} opportunities`);
        } else {
          listingsUpdated += oppIds.length;
        }

      } catch (emailError: any) {
        console.error(`Error sending email to ${email}:`, emailError);
        errors.push(`Failed to send email to ${email}: ${emailError.message}`);
      }
    }

    console.log(`Reminder process complete. Sent ${emailsSent} emails covering ${listingsUpdated} listings.`);

    if (emailsSent > 0 || errors.length > 0) {
      await notifyGoogleChat({
        icon: "⏰",
        title: "Listing reminders sent",
        fields: [
          { label: "Emails sent", value: String(emailsSent) },
          { label: "Listings covered", value: String(listingsUpdated) },
          ...(errors.length > 0
            ? [{ label: "Errors", value: String(errors.length) }]
            : []),
        ],
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${emailsSent} consolidated reminder emails covering ${listingsUpdated} listings`,
        emails_sent: emailsSent,
        listings_updated: listingsUpdated,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-listing-reminder function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
