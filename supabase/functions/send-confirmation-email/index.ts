import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmationEmailRequest {
  orgName: string;
  orgEmail: string;
  opportunityType: string;
  roleClassification: string;
  positionTitle: string | null;
  additionalRequirements: string | null;
  description: string;
  location: string;
  onBusRoute: boolean;
  hoursAvailable: string;
  daysTimesAvailable: string;
  editToken: string;
  siteUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Confirmation email function invoked");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      orgName, 
      orgEmail, 
      opportunityType,
      roleClassification,
      positionTitle,
      additionalRequirements,
      description,
      location,
      onBusRoute,
      hoursAvailable,
      daysTimesAvailable,
      editToken,
      siteUrl
    }: ConfirmationEmailRequest = await req.json();

    console.log(`Sending confirmation email to ${orgEmail}`);

    const editUrl = `${siteUrl}/edit-opportunity/${editToken}`;

    const emailResponse = await resend.emails.send({
      from: "SNAP ABAWD Finder <onboarding@resend.dev>",
      to: [orgEmail],
      subject: "Your Opportunity Has Been Listed!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0891b2;">Thank You for Listing an Opportunity!</h1>
          
          <p>Dear ${orgName},</p>
          
          <p>Your opportunity has been successfully published to the SNAP ABAWD Opportunity Finder. Here's a summary of your listing:</p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #0e7490; margin-top: 0;">Your Listing Details</h2>
            <p><strong>Type:</strong> ${opportunityType}</p>
            <p><strong>Role Classification:</strong> ${roleClassification}</p>
            ${positionTitle ? `<p><strong>Position Title:</strong> ${positionTitle}</p>` : ''}
            <p><strong>Description:</strong> ${description}</p>
            <p><strong>Location:</strong> ${location}</p>
            <p><strong>On Bus Route:</strong> ${onBusRoute ? 'Yes' : 'No'}</p>
            <p><strong>Hours Available:</strong> ${hoursAvailable}</p>
            <p><strong>Days/Times Available:</strong> ${daysTimesAvailable}</p>
            ${additionalRequirements ? `<p><strong>Standard Requirements:</strong> ${additionalRequirements}</p>` : ''}
          </div>

          <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #059669; margin-top: 0;">Edit Your Listing</h3>
            <p>Need to make changes? Use the secure link below to edit your listing at any time:</p>
            <p style="text-align: center; margin: 15px 0;">
              <a href="${editUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Edit Your Listing</a>
            </p>
            <p style="font-size: 12px; color: #666;">This link is unique to your listing. Please keep it safe and do not share it publicly.</p>
          </div>

          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #d97706; margin-top: 0;">What Happens Next?</h3>
            <ul>
              <li>Your opportunity is now visible to SNAP ABAWD recipients</li>
              <li>Clients can apply directly through the platform</li>
              <li>You'll receive an email when someone applies</li>
              <li>Contact applicants to confirm participation</li>
              <li>Complete required documentation on behalf of beneficiaries</li>
            </ul>
          </div>

          <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">Need Help?</h3>
            <p>For additional assistance, please email: <strong>amoore@hsctc.org</strong></p>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Thank you for supporting SNAP ABAWD recipients!<br>
            <strong>SNAP ABAWD Opportunity Finder</strong>
          </p>
        </div>
      `,
    });

    console.log("Confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-confirmation-email function:", error);
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