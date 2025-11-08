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
      from: "SNAP ABAWD Finder <onboarding@resend.dev>",
      to: [orgEmail],
      subject: `New SNAP ABAWD Client Application - ${opportunityType}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0891b2;">New Client Application</h1>
          
          <p>A SNAP ABAWD client has applied for your opportunity:</p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #0e7490; margin-top: 0;">Opportunity Details</h2>
            <p><strong>Type:</strong> ${opportunityType}</p>
            <p><strong>Description:</strong> ${opportunityDescription}</p>
          </div>

          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #d97706; margin-top: 0;">Client Information</h2>
            <p><strong>Name:</strong> ${clientName}</p>
            <p><strong>Email:</strong> ${clientEmail}</p>
            <p><strong>Phone:</strong> ${clientPhone}</p>
            <p><strong>Hours Requested:</strong> ${hoursRequested}</p>
          </div>

          <div style="background: #ecfccb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #65a30d; margin-top: 0;">Next Steps</h3>
            <ol>
              <li>Contact the client to confirm their participation</li>
              <li>Complete the required documentation on behalf of the beneficiary</li>
              <li>Once the opportunity is filled, email <strong>amoore@hsctc.org</strong> to have it removed from the public list</li>
            </ol>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Thank you for providing opportunities to SNAP ABAWD recipients!<br>
            <strong>SNAP ABAWD Opportunity Finder</strong>
          </p>
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