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
        
        {opportunities.map((opp, index) => (
          <div key={opp.id} style={{ 
            marginBottom: '20px', 
            paddingBottom: '15px', 
            borderBottom: index < opportunities.length - 1 ? '1px solid #e0e0e0' : 'none' 
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
              {opp.org_name}
            </h2>
            <div style={{ fontSize: '14px', marginBottom: '5px' }}>
              <strong>Type:</strong> {opp.type}
            </div>
            <div style={{ fontSize: '14px', marginBottom: '5px' }}>
              <strong>Location:</strong> {opp.location}
              {opp.on_bus_route && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#0066cc' }}>🚌 On Bus Route</span>}
            </div>
            <div style={{ fontSize: '14px', marginBottom: '5px' }}>
              <strong>Hours:</strong> {opp.hours_available}
            </div>
            <div style={{ fontSize: '14px', marginBottom: '5px' }}>
              <strong>Days/Times:</strong> {opp.days_times_available}
            </div>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>
              <strong>Description:</strong> {opp.description}
            </div>
            {opp.additional_requirements && (
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                <strong>Requirements:</strong> {opp.additional_requirements}
              </div>
            )}
            <div style={{ fontSize: '14px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
              <strong>Contact:</strong>
              <div style={{ marginLeft: '10px' }}>
                Phone: {opp.org_phone}<br />
                Email: {opp.org_email}
              </div>
            </div>
          </div>
        ))}
        
        <div style={{ marginTop: '30px', fontSize: '12px', color: '#666', borderTop: '1px solid #e0e0e0', paddingTop: '15px' }}>
          <p>For help or questions, contact: amoore@hsctc.org</p>
          <p>Powered by Tompkins Opportunity</p>
        </div>
      </div>
    </div>
  );
};
