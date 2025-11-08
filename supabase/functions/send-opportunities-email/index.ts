import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Opportunity {
  id: string;
  type: string;
  description: string;
  location: string;
  on_bus_route: boolean;
  hours_available: string;
  days_times_available: string;
  additional_requirements: string | null;
  org_name: string;
  org_email: string;
  org_phone: string;
}

interface OpportunitiesEmailRequest {
  email: string;
  opportunities: Opportunity[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, opportunities }: OpportunitiesEmailRequest = await req.json();

    console.log(`Sending opportunities email to: ${email}`);
    console.log(`Number of opportunities: ${opportunities.length}`);

    // Generate HTML for opportunities list
    const opportunitiesHtml = opportunities.map((opp) => `
      <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
        <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">
          ${opp.org_name}
        </h3>
        <p style="margin: 6px 0; font-size: 14px; color: #333;">
          <strong>Type:</strong> ${opp.type}
        </p>
        <p style="margin: 6px 0; font-size: 14px; color: #333;">
          <strong>Location:</strong> ${opp.location}
          ${opp.on_bus_route ? '<span style="margin-left: 8px; padding: 2px 8px; background-color: #0066cc; color: white; border-radius: 4px; font-size: 12px;">🚌 On Bus Route</span>' : ''}
        </p>
        <p style="margin: 6px 0; font-size: 14px; color: #333;">
          <strong>Hours Available:</strong> ${opp.hours_available}
        </p>
        <p style="margin: 6px 0; font-size: 14px; color: #333;">
          <strong>Days/Times:</strong> ${opp.days_times_available}
        </p>
        <p style="margin: 6px 0; font-size: 14px; color: #333;">
          <strong>Description:</strong> ${opp.description}
        </p>
        ${opp.additional_requirements ? `
          <p style="margin: 6px 0; font-size: 14px; color: #333;">
            <strong>Additional Requirements:</strong> ${opp.additional_requirements}
          </p>
        ` : ''}
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
          <p style="margin: 4px 0; font-size: 14px; color: #333;">
            <strong>Contact Information:</strong>
          </p>
          <p style="margin: 4px 0 4px 16px; font-size: 14px; color: #555;">
            Phone: ${opp.org_phone}<br/>
            Email: <a href="mailto:${opp.org_email}" style="color: #0066cc; text-decoration: none;">${opp.org_email}</a>
          </p>
        </div>
      </div>
    `).join('');

    const emailResponse = await resend.emails.send({
      from: "Tompkins County Opportunity Finder <onboarding@resend.dev>",
      to: [email],
      subject: `Your ${opportunities.length} Filtered ${opportunities.length === 1 ? 'Opportunity' : 'Opportunities'} from Tompkins County`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h1 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 700; color: #1a1a1a;">
                Tompkins County Opportunity Finder
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #666;">
                Here ${opportunities.length === 1 ? 'is' : 'are'} the ${opportunities.length} ${opportunities.length === 1 ? 'opportunity' : 'opportunities'} that matched your filters:
              </p>
              
              ${opportunitiesHtml}
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center;">
                <p style="margin: 8px 0; font-size: 14px; color: #666;">
                  Need help or have questions?
                </p>
                <p style="margin: 8px 0; font-size: 14px; color: #666;">
                  Contact us at: <a href="mailto:amoore@hsctc.org" style="color: #0066cc; text-decoration: none;">amoore@hsctc.org</a>
                </p>
                <p style="margin: 16px 0 0 0; font-size: 12px; color: #999;">
                  Powered by Tompkins County Opportunity Finder
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-opportunities-email function:", error);
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
