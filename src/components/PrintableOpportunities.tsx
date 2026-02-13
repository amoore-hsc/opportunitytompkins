import { Opportunity } from "@/pages/Opportunities";

interface PrintableOpportunitiesProps {
  opportunities: Opportunity[];
}

export const PrintableOpportunities = ({ opportunities }: PrintableOpportunitiesProps) => {
  return (
    <div className="print-only">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-only, .print-only * {
            visibility: visible;
          }
          .print-only {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            box-sizing: border-box;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            margin: 0.5cm;
          }
        }
        @media screen {
          .print-only {
            display: none;
          }
        }
      `}</style>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
          Tompkins Opportunity
        </h1>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
          {opportunities.length} {opportunities.length === 1 ? 'Opportunity' : 'Opportunities'} Found
        </p>
        
        {opportunities.map((opp, index) => {
          const isEducation = opp.type === "education";
          return (
            <div key={opp.id} style={{ 
              marginBottom: '20px', 
              paddingBottom: '15px', 
              borderBottom: index < opportunities.length - 1 ? '1px solid #e0e0e0' : 'none' 
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>
                {opp.org_name}
              </h2>
              {!isEducation && opp.position_title && (
                <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '5px' }}>
                  {opp.position_title}
                </div>
              )}
              {isEducation && opp.program_name && (
                <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '5px' }}>
                  {opp.program_name}
                </div>
              )}
              <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                <strong>Type:</strong> {isEducation ? "Education & Training" : "Volunteer"}
              </div>
              {!isEducation && opp.role_classification && (
                <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                  <strong>Role Classification:</strong> {opp.role_classification}
                </div>
              )}
              {isEducation && opp.program_components && (
                <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                  <strong>Program Components:</strong> {opp.program_components}
                </div>
              )}
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                <strong>Description:</strong> {opp.description}
              </div>
              {!isEducation && opp.location && opp.location !== "N/A" && (
                <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                  <strong>Location:</strong> {opp.location}
                  {opp.on_bus_route && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#0066cc' }}>🚌 On Bus Route</span>}
                </div>
              )}
              {isEducation && opp.website && (
                <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                  <strong>Website:</strong> {opp.website}
                </div>
              )}
              <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                <strong>Hours Available:</strong> {opp.hours_available} per week
              </div>
              {opp.days_times_available && opp.days_times_available !== "N/A" && (
                <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                  <strong>{isEducation ? "Schedule:" : "Days/Times:"}</strong> {opp.days_times_available}
                </div>
              )}
              {opp.additional_requirements && (
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                  <strong>{isEducation ? "Minimum Requirements:" : "Additional Requirements:"}</strong> {opp.additional_requirements}
                </div>
              )}
              {!isEducation && (
                <div style={{ fontSize: '14px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
                  <strong>Contact:</strong>
                  <div style={{ marginLeft: '10px' }}>
                    Phone: {opp.org_phone}<br />
                    Email: {opp.org_email}
                  </div>
                </div>
              )}
              <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                Updated {new Date(opp.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          );
        })}
        
        <div style={{ marginTop: '30px', fontSize: '12px', color: '#666', borderTop: '1px solid #e0e0e0', paddingTop: '15px' }}>
          <p>For help or questions, contact: rhinton@uwtc.org</p>
          <p>Powered by Tompkins Opportunity</p>
        </div>
      </div>
    </div>
  );
};
