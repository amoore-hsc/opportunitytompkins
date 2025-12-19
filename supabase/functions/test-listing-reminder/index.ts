import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
  position_title: string | null;
  type: string;
  description: string;
  location: string;
  role_classification: string | null;
  hours_available: string;
  days_times_available: string;
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

const generateListingBlock = (opportunity: Opportunity, editUrl: string): string => {
  const daysSinceCreation = getDaysSinceCreation(opportunity.created_at);
  const positionTitle = opportunity.position_title || opportunity.type;
  
  return `
    <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #1e3a5f;">
      <h3 style="margin: 0 0 15px 0; color: #1e3a5f; font-size: 18px;">${positionTitle}</h3>
      <table style="width: 100%; font-size: 14px; color: #555; margin-bottom: 15px;">
        <tr>
          <td style="padding: 5px 0; font-weight: bold; width: 40%;">Organization:</td>
          <td style="padding: 5px 0;">${opportunity.org_name}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold;">Type:</td>
          <td style="padding: 5px 0;">${opportunity.type}</td>
        </tr>
        ${opportunity.role_classification ? `
        <tr>
          <td style="padding: 5px 0; font-weight: bold;">Classification:</td>
          <td style="padding: 5px 0;">${opportunity.role_classification}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 5px 0; font-weight: bold;">Location:</td>
          <td style="padding: 5px 0;">${opportunity.location}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold;">Posted:</td>
          <td style="padding: 5px 0;">${formatDate(opportunity.created_at)} (${daysSinceCreation} days ago)</td>
        </tr>
      </table>
      <div style="text-align: center;">
        <a href="${editUrl}" style="display: inline-block; background-color: #84cc16; color: #1e3a5f; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 14px;">
          Edit This Listing
        </a>
      </div>
    </div>
  `;
};

const generateConsolidatedEmail = (opportunities: Opportunity[], siteUrl: string): string => {
  const listingBlocks = opportunities.map(opp => {
    const editUrl = `${siteUrl}/edit-opportunity/${opp.edit_token}`;
    return generateListingBlock(opp, editUrl);
  }).join('');

  const listingCount = opportunities.length;
  const listingWord = listingCount === 1 ? 'listing' : 'listings';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Listing Reminder</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="background-color: #1e3a5f; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📋 Your ${listingWord === 'listings' ? 'Listings Need' : 'Listing Needs'} Attention</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Hello${opportunities[0]?.contact_name ? ` ${opportunities[0].contact_name}` : ''},
          </p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 25px;">
            You have <strong>${listingCount} opportunity ${listingWord}</strong> on Tompkins Opportunity that ${listingCount === 1 ? 'has' : 'have'} been active for 60+ days without updates. Please review ${listingCount === 1 ? 'it' : 'them'} to ensure the information is still current.
          </p>
          
          <!-- Listing Blocks -->
          ${listingBlocks}
          
          <!-- What You Can Do -->
          <div style="margin: 25px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1e3a5f; font-size: 16px;">What You Can Do:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 14px; line-height: 1.8;">
              <li><strong>Update your listing</strong> if availability or details have changed</li>
              <li><strong>Remove the listing</strong> if the position has been filled</li>
              <li><strong>No action needed</strong> if everything is still current</li>
            </ul>
          </div>
          
          <p style="font-size: 12px; color: #888; text-align: center; margin: 25px 0;">
            Each edit link is unique to its listing. Please keep them safe.
          </p>
          
          <!-- Help Section -->
          <div style="background-color: #f0f9ff; border-radius: 8px; padding: 15px; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #555;">
              <strong>Questions?</strong><br>
              Contact <a href="mailto:rhinton@uwtc.org" style="color: #1e3a5f;">rhinton@uwtc.org</a>
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #1e3a5f; padding: 20px; text-align: center;">
          <p style="color: #ffffff; margin: 0; font-size: 14px;">
            Thank you for supporting our community!
          </p>
          <p style="color: #a0aec0; margin: 10px 0 0 0; font-size: 12px;">
            Tompkins Opportunity
          </p>
        </div>
        
      </div>
    </body>
    </html>
  `;
};

interface TestEmailRequest {
  email: string;
  contactName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("test-listing-reminder function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, contactName }: TestEmailRequest = await req.json();

    if (!email) {
      throw new Error("Email address is required");
    }

    console.log(`Sending test listing reminder to: ${email}`);

    // Create sample opportunities with dates 60+ days ago
    const now = new Date();
    const seventyFiveDaysAgo = new Date(now);
    seventyFiveDaysAgo.setDate(seventyFiveDaysAgo.getDate() - 75);
    
    const sixtyTwoDaysAgo = new Date(now);
    sixtyTwoDaysAgo.setDate(sixtyTwoDaysAgo.getDate() - 62);

    const sampleOpportunities: Opportunity[] = [
      {
        id: "test-1",
        org_name: "Sample Community Center",
        contact_name: contactName || "Test User",
        org_email: email,
        position_title: "Administrative Assistant",
        type: "Volunteer",
        description: "Help with daily office tasks and community outreach.",
        location: "123 Main Street, Ithaca, NY",
        role_classification: "Administrative Support",
        hours_available: "10-15 hours/week",
        days_times_available: "Weekdays, flexible",
        created_at: seventyFiveDaysAgo.toISOString(),
        edit_token: "test-token-admin-12345"
      },
      {
        id: "test-2",
        org_name: "Sample Community Center",
        contact_name: contactName || "Test User",
        org_email: email,
        position_title: "Customer Service Representative",
        type: "Internship",
        description: "Assist visitors and answer phone inquiries.",
        location: "456 Oak Avenue, Ithaca, NY",
        role_classification: "Customer Service",
        hours_available: "20 hours/week",
        days_times_available: "Monday-Friday, 9am-1pm",
        created_at: sixtyTwoDaysAgo.toISOString(),
        edit_token: "test-token-csr-67890"
      }
    ];

    const siteUrl = "https://oosxopnxaivfdtksrvam.lovableproject.com";
    const emailHtml = generateConsolidatedEmail(sampleOpportunities, siteUrl);

    const subject = `Reminder: Your ${sampleOpportunities.length} Listings Need Attention`;

    const emailResponse = await resend.emails.send({
      from: "Tompkins Opportunity <hello@tompkins-opportunity.org>",
      to: [email],
      subject: subject,
      html: emailHtml,
    });

    console.log("Test email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Test listing reminder sent to ${email}`,
        emailId: emailResponse.data?.id,
        listingsIncluded: sampleOpportunities.length
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in test-listing-reminder function:", error);
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
