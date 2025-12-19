import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmationEmailRequest {
  orgName: string;
  contactName: string;
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
      contactName,
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
      from: "Tompkins Opportunity <hello@tompkins-opportunity.org>",
      to: [orgEmail],
      subject: `${positionTitle || 'Opportunity'} Role Listing Confirmation`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; font-size: 16px;">
          <div style="padding: 30px 20px;">
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
              <p style="color: #1565c0; line-height: 1.6; font-size: 16px; margin: 0;">Your opportunity has been successfully published. Use this email to review your post and edit the listing with any corrections OR to remove the posting when the opportunity is filled.</p>
            </div>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e3a5f;">
              <h2 style="color: #1e3a5f; margin-top: 0; font-size: 18px;">Your Listing Details</h2>
              <p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>Type:</strong> ${opportunityType}</p>
              <p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>Role Classification:</strong> ${roleClassification}</p>
              ${positionTitle ? `<p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>Position Title:</strong> ${positionTitle}</p>` : ''}
              <p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>Description:</strong> ${description}</p>
              <p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>Location:</strong> ${location}</p>
              <p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>On Bus Route:</strong> ${onBusRoute ? 'Yes' : 'No'}</p>
              <p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>Hours Available:</strong> ${hoursAvailable}</p>
              <p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>Days/Times Available:</strong> ${daysTimesAvailable}</p>
              ${additionalRequirements ? `<p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>Standard Requirements:</strong> ${additionalRequirements}</p>` : ''}
            </div>

            <div style="background: #e0f2f1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #00897b;">
              <h3 style="color: #00695c; margin-top: 0; font-size: 18px;">What Happens Next?</h3>
              <ul style="color: #333; line-height: 1.8; padding-left: 20px; font-size: 16px;">
                <li>Clients can apply directly through the platform</li>
                <li>You'll receive a notification to this address when someone applies</li>
                <li>Contact applicants to confirm availability and interest</li>
                <li>Complete monthly documentation on behalf of the volunteer</li>
                <li>Remove your posting when the position has been filled.</li>
              </ul>
            </div>

            <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7cb342;">
              <h3 style="color: #1e3a5f; margin-top: 0; font-size: 18px;">Update or Remove Your Listing</h3>
              <p style="color: #333; line-height: 1.6; font-size: 16px;">Need to make changes or remove your listing? You can use the edit button below to update available hours or remove the listing when the position is filled.</p>
              <p style="text-align: center; margin: 20px 0;">
                <a href="${editUrl}" style="background-color: #7cb342; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">Edit Your Listing</a>
              </p>
              <p style="font-size: 13px; color: #666; text-align: center;">This link is unique to your listing. Please keep it safe and do not share it publicly.</p>
            </div>

            <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f57c00;">
              <h3 style="color: #1e3a5f; margin-top: 0; font-size: 18px;">Need Help?</h3>
              <p style="color: #333; font-size: 16px;">For additional assistance, please email: <strong style="color: #1e3a5f;">rhinton@uwtc.org</strong></p>
            </div>
          </div>

          <div style="background-color: #1e3a5f; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
            <p style="color: #ffffff; font-size: 16px; margin: 0;">
              🌟 Thank You for Supporting Our Community! 🌟
            </p>
          </div>
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