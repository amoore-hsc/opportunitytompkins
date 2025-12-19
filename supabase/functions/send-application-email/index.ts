import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApplicationEmailRequest {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  hoursRequested: string;
  orgEmail: string;
  orgName: string;
  opportunityDescription: string;
  opportunityType: string;
  positionTitle: string;
  opportunityId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Application email function invoked");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      clientName, 
      clientEmail, 
      clientPhone, 
      hoursRequested, 
      orgEmail, 
      orgName,
      opportunityDescription,
      opportunityType,
      positionTitle,
      opportunityId
    }: ApplicationEmailRequest = await req.json();

    console.log(`Sending application email to ${orgEmail} from ${clientName}`);

    // Track application count (aggregated, no personal data stored)
    if (opportunityId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
        
        const today = new Date().toISOString().split('T')[0];
        
        // Try to increment existing count, or insert new row
        const { data: existing } = await supabaseClient
          .from('application_counts')
          .select('id, count')
          .eq('opportunity_id', opportunityId)
          .eq('application_date', today)
          .maybeSingle();
        
        if (existing) {
          await supabaseClient
            .from('application_counts')
            .update({ count: existing.count + 1 })
            .eq('id', existing.id);
          console.log(`Incremented application count for opportunity ${opportunityId}`);
        } else {
          await supabaseClient
            .from('application_counts')
            .insert({ opportunity_id: opportunityId, application_date: today, count: 1 });
          console.log(`Created new application count for opportunity ${opportunityId}`);
        }
      } catch (countError) {
        console.error("Error tracking application count:", countError);
        // Don't fail the email send if count tracking fails
      }
    }

    const emailResponse = await resend.emails.send({
      from: "Tompkins County Opportunity Finder <hello@tompkins-opportunity.org>",
      to: [orgEmail],
      subject: `New Application - ${positionTitle || 'Position'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: #1e3a5f; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Client Application</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <p style="color: #1e3a5f; font-size: 16px;">Dear ${orgName},</p>
            
            <p style="color: #333; line-height: 1.6;">You have a new application through Tompkins County Opportunity Finder.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e3a5f;">
              <h2 style="color: #1e3a5f; margin-top: 0; font-size: 18px;">Opportunity Details</h2>
              <p style="margin: 8px 0;"><strong>Position Title:</strong> ${positionTitle || 'Not specified'}</p>
            </div>

            <div style="background: #f0f7e6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7cb342;">
              <h2 style="color: #1e3a5f; margin-top: 0; font-size: 18px;">Client Information</h2>
              <p style="margin: 8px 0;"><strong>Name:</strong> ${clientName}</p>
              <p style="margin: 8px 0;"><strong>Email:</strong> ${clientEmail}</p>
              <p style="margin: 8px 0;"><strong>Phone:</strong> ${clientPhone}</p>
              <p style="margin: 8px 0;"><strong>Hours Requested:</strong> ${hoursRequested}</p>
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e3a5f;">
              <h3 style="color: #1e3a5f; margin-top: 0; font-size: 16px;">Next Steps</h3>
              <ol style="color: #333; line-height: 1.8; padding-left: 20px;">
                <li>Contact the applicant to confirm their availability and interest</li>
                <li>Complete monthly documentation on behalf of the volunteer</li>
                <li>Remove your posting when the position has been filled using the edit link from your confirmation email. You can also use the same link to edit the hours available per week if a position has been partially filled.</li>
              </ol>
            </div>

            <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f57c00;">
              <h3 style="color: #1e3a5f; margin-top: 0; font-size: 16px;">Need Help?</h3>
              <p style="color: #333;">For additional assistance, please email: <strong style="color: #1e3a5f;">rhinton@uwtc.org</strong></p>
            </div>
          </div>

          <div style="background-color: #1e3a5f; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
            <p style="color: #ffffff; font-size: 14px; margin: 0;">
              Thank you for supporting our community!<br>
              <strong>Tompkins County Opportunity Finder</strong>
            </p>
          </div>
        </div>
      `,
    });

    console.log("Application email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-application-email function:", error);
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