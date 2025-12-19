import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Weekly report function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate date range (past 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`Generating report for ${startDateStr} to ${endDateStr}`);

    // Fetch application counts with opportunity details
    const { data: counts, error: countsError } = await supabaseClient
      .from('application_counts')
      .select(`
        count,
        application_date,
        opportunity_id,
        opportunities (
          position_title,
          org_name,
          role_classification,
          type
        )
      `)
      .gte('application_date', startDateStr)
      .lte('application_date', endDateStr);

    if (countsError) {
      console.error("Error fetching counts:", countsError);
      throw countsError;
    }

    console.log(`Found ${counts?.length || 0} application count records`);

    // Aggregate by opportunity
    const opportunityTotals: Record<string, { 
      title: string; 
      orgName: string; 
      roleClassification: string;
      type: string;
      count: number 
    }> = {};
    
    const roleClassificationTotals: Record<string, number> = {};
    let totalApplications = 0;

    for (const record of counts || []) {
      const opp = record.opportunities as any;
      if (!opp) continue;

      const key = record.opportunity_id;
      if (!opportunityTotals[key]) {
        opportunityTotals[key] = {
          title: opp.position_title || 'Untitled Position',
          orgName: opp.org_name,
          roleClassification: opp.role_classification || 'Uncategorized',
          type: opp.type,
          count: 0
        };
      }
      opportunityTotals[key].count += record.count;
      totalApplications += record.count;

      // Track by role classification
      const role = opp.role_classification || 'Uncategorized';
      roleClassificationTotals[role] = (roleClassificationTotals[role] || 0) + record.count;
    }

    // Sort opportunities by count (descending)
    const sortedOpportunities = Object.values(opportunityTotals)
      .sort((a, b) => b.count - a.count);

    // Sort role classifications by count (descending)
    const sortedRoles = Object.entries(roleClassificationTotals)
      .sort((a, b) => b[1] - a[1]);

    // Format date range for display
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    };

    // Build email HTML
    const opportunityRows = sortedOpportunities.length > 0
      ? sortedOpportunities.map(opp => `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              <strong>${opp.title}</strong><br>
              <span style="color: #6b7280; font-size: 14px;">${opp.orgName}</span>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
              <span style="background: #1e3a5f; color: white; padding: 4px 12px; border-radius: 20px; font-weight: bold;">
                ${opp.count}
              </span>
            </td>
          </tr>
        `).join('')
      : `<tr><td colspan="2" style="padding: 20px; text-align: center; color: #6b7280;">No applications this week</td></tr>`;

    const roleRows = sortedRoles.length > 0
      ? sortedRoles.map(([role, count]) => `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${role}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold;">${count}</td>
          </tr>
        `).join('')
      : '';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #ffffff;">
        <div style="background: #1e3a5f; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">📊 Weekly Application Report</h1>
          <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 16px;">
            ${formatDate(startDate)} – ${formatDate(endDate)}
          </p>
        </div>
        
        <div style="padding: 30px;">
          <div style="background: linear-gradient(135deg, #7cb342, #558b2f); padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <p style="color: rgba(255,255,255,0.9); margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Total Applications</p>
            <p style="color: #ffffff; margin: 0; font-size: 48px; font-weight: bold;">${totalApplications}</p>
          </div>

          <h2 style="color: #1e3a5f; margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px;">
            Applications by Opportunity
          </h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 12px; text-align: left; color: #1e3a5f;">Opportunity</th>
                <th style="padding: 12px; text-align: center; color: #1e3a5f;">Applications</th>
              </tr>
            </thead>
            <tbody>
              ${opportunityRows}
            </tbody>
          </table>

          ${sortedRoles.length > 0 ? `
            <h2 style="color: #1e3a5f; margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px;">
              Applications by Role Classification
            </h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="padding: 10px; text-align: left; color: #1e3a5f;">Classification</th>
                  <th style="padding: 10px; text-align: center; color: #1e3a5f;">Applications</th>
                </tr>
              </thead>
              <tbody>
                ${roleRows}
              </tbody>
            </table>
          ` : ''}
        </div>

        <div style="background-color: #1e3a5f; padding: 20px; text-align: center;">
          <p style="color: #ffffff; font-size: 14px; margin: 0;">
            Tompkins County Opportunity Finder<br>
            <span style="color: #94a3b8;">This is an automated weekly report</span>
          </p>
        </div>
      </div>
    `;

    // Send the email
    const emailResponse = await resend.emails.send({
      from: "Tompkins Opportunity <onboarding@resend.dev>",
      to: ["billmoorebusiness@gmail.com"],
      subject: `Weekly Application Report - ${formatDate(startDate)} to ${formatDate(endDate)}`,
      html: emailHtml,
    });

    console.log("Weekly report email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      totalApplications,
      opportunityCount: sortedOpportunities.length,
      emailResponse 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-weekly-report function:", error);
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
