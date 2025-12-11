import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
      opportunityType
    }: ApplicationEmailRequest = await req.json();

    console.log(`Sending application email to ${orgEmail} from ${clientName}`);

    const emailResponse = await resend.emails.send({
      from: "Tompkins County Opportunity Finder <onboarding@resend.dev>",
      to: [orgEmail],
      subject: `New Client Application - ${opportunityType}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: #1e3a5f; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Client Application</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <p style="color: #1e3a5f; font-size: 16px;">Dear ${orgName},</p>
            
            <p style="color: #333; line-height: 1.6;">A client has applied for your opportunity through Tompkins County Opportunity Finder.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e3a5f;">
              <h2 style="color: #1e3a5f; margin-top: 0; font-size: 18px;">Opportunity Details</h2>
              <p style="margin: 8px 0;"><strong>Type:</strong> ${opportunityType}</p>
              <p style="margin: 8px 0;"><strong>Description:</strong> ${opportunityDescription}</p>
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
                <li>Contact the client to confirm their participation</li>
                <li>Complete monthly documentation on behalf of clients</li>
                <li>Remove your posting when the position has been filled using the edit link from your confirmation email</li>
              </ol>
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 30px; text-align: center;">
              Thank you for supporting our community!<br>
              <strong style="color: #1e3a5f;">Tompkins County Opportunity Finder</strong>
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