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
      from: "Tompkins Opportunity <onboarding@resend.dev>",
      to: [orgEmail],
      subject: "Your Opportunity Has Been Listed!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background-color: #1e3a5f; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Thank You for Listing an Opportunity!</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <p style="color: #1e3a5f; font-size: 16px;">Dear ${contactName},</p>
            
            <p style="color: #333; line-height: 1.6;">Your opportunity has been successfully published to Tompkins County Opportunity Finder. Use this email to review your post and edit the listing with any corrections OR to remove the posting if the opportunity has been filled.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e3a5f;">
              <h2 style="color: #1e3a5f; margin-top: 0; font-size: 18px;">Your Listing Details</h2>
              <p style="margin: 8px 0; color: #333;"><strong>Type:</strong> ${opportunityType}</p>
              <p style="margin: 8px 0; color: #333;"><strong>Role Classification:</strong> ${roleClassification}</p>
              ${positionTitle ? `<p style="margin: 8px 0; color: #333;"><strong>Position Title:</strong> ${positionTitle}</p>` : ''}
              <p style="margin: 8px 0; color: #333;"><strong>Description:</strong> ${description}</p>
              <p style="margin: 8px 0; color: #333;"><strong>Location:</strong> ${location}</p>
              <p style="margin: 8px 0; color: #333;"><strong>On Bus Route:</strong> ${onBusRoute ? 'Yes' : 'No'}</p>
              <p style="margin: 8px 0; color: #333;"><strong>Hours Available:</strong> ${hoursAvailable}</p>
              <p style="margin: 8px 0; color: #333;"><strong>Days/Times Available:</strong> ${daysTimesAvailable}</p>
              ${additionalRequirements ? `<p style="margin: 8px 0; color: #333;"><strong>Standard Requirements:</strong> ${additionalRequirements}</p>` : ''}
            </div>

            <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7cb342;">
              <h3 style="color: #1e3a5f; margin-top: 0; font-size: 16px;">Edit Your Listing</h3>
              <p style="color: #333; line-height: 1.6;">Need to make changes or remove your listing? Use the secure link below to edit your listing at any time:</p>
              <p style="text-align: center; margin: 20px 0;">
                <a href="${editUrl}" style="background-color: #7cb342; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 14px;">Edit Your Listing</a>
              </p>
              <p style="font-size: 12px; color: #666; text-align: center;">This link is unique to your listing. Please keep it safe and do not share it publicly.</p>
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e3a5f;">
              <h3 style="color: #1e3a5f; margin-top: 0; font-size: 16px;">What Happens Next?</h3>
              <ul style="color: #333; line-height: 1.8; padding-left: 20px;">
                <li>Clients can apply directly through the platform</li>
                <li>You'll receive a notification to this address when someone applies</li>
                <li>Contact applicants to confirm availability and interest</li>
                <li>Complete monthly documentation on behalf of the volunteer</li>
                <li>Remove your posting when the position has been filled. You can also use the edit link to update hours available per week if a position has been partially filled.</li>
              </ul>
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