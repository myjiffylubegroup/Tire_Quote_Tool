// =============================================================================
// CONTACT US PAGE
// =============================================================================
// Route: #/contact
// Purpose: Contact information for P.C.J.L., Inc. corporate and all stores
// =============================================================================

import React from 'react';

const JL_LOGO = 'https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/assets/JL_Multicare_Horz_1C.png';

const STORES = [
  {
    id: '609',
    address: '1860 S Broadway',
    city: 'Santa Maria, CA 93454',
    phone: '(805) 922-1948',
    email: 'store00609@jiffylube.com',
  },
  {
    id: '1002',
    address: '110 Higuera Street',
    city: 'San Luis Obispo, CA 93401',
    phone: '(805) 544-6698',
    email: 'store01002@jiffylube.com',
  },
  {
    id: '1257',
    address: '6015 Hollister Avenue',
    city: 'Goleta, CA 93117',
    phone: '(805) 683-4100',
    email: 'store01257@jiffylube.com',
  },
  {
    id: '1270',
    address: '495 Grand Avenue',
    city: 'Arroyo Grande, CA 93420',
    phone: '(805) 489-7802',
    email: 'store01270@jiffylube.com',
  },
  {
    id: '1396',
    address: '401 West Carrillo Street',
    city: 'Santa Barbara, CA 93101',
    phone: '(805) 564-3393',
    email: 'store01396@jiffylube.com',
  },
  {
    id: '1932',
    address: '7760 El Camino Real',
    city: 'Atascadero, CA 93422',
    phone: '(805) 461-4052',
    email: 'store01932@jiffylube.com',
  },
  {
    id: '2911',
    address: '200 Oak Hill Road',
    city: 'Paso Robles, CA 93446',
    phone: '(805) 237-8301',
    email: 'store02911@jiffylube.com',
  },
  {
    id: '4182',
    address: '3956 State Street',
    city: 'Santa Barbara, CA 93105',
    phone: '(805) 410-8165',
    email: 'store04182@jiffylube.com',
  },
];

const pageStyles = {
  wrapper: {
    fontFamily: "'Segoe UI', sans-serif",
    backgroundColor: '#f1f5f9',
    minHeight: '100vh',
    padding: '20px',
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#8b1538',
    color: 'white',
    padding: '30px',
    textAlign: 'center',
  },
  logo: {
    height: '50px',
    marginBottom: '15px',
    filter: 'brightness(0) invert(1)',
  },
  title: {
    margin: '0',
    fontSize: '24px',
    fontWeight: '700',
  },
  content: {
    padding: '40px',
  },
  sectionTitle: {
    color: '#8b1538',
    fontSize: '20px',
    marginBottom: '15px',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '10px',
  },
  paragraph: {
    color: '#475569',
    lineHeight: '1.7',
    fontSize: '15px',
    marginBottom: '15px',
  },
  section: {
    marginBottom: '35px',
  },
  footer: {
    backgroundColor: '#f8fafc',
    padding: '20px',
    textAlign: 'center',
    borderTop: '1px solid #e2e8f0',
    color: '#94a3b8',
    fontSize: '12px',
  },
  backLink: {
    display: 'inline-block',
    marginBottom: '15px',
    color: '#8b1538',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
  },
};

const contactCardStyle = {
  backgroundColor: '#8b1538',
  borderRadius: '12px',
  padding: '30px',
  textAlign: 'center',
  color: 'white',
  marginBottom: '30px',
};

const contactMethodStyle = {
  display: 'flex',
  justifyContent: 'center',
  gap: '30px',
  flexWrap: 'wrap',
  marginTop: '20px',
};

const contactItemStyle = {
  textAlign: 'center',
};

const contactLabelStyle = {
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  opacity: '0.8',
  marginBottom: '5px',
};

const contactValueStyle = {
  fontSize: '15px',
  fontWeight: '600',
};

const contactLinkStyle = {
  color: 'white',
  textDecoration: 'none',
};

const storeGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: '15px',
};

const storeCardStyle = {
  backgroundColor: '#f8fafc',
  borderRadius: '10px',
  padding: '18px',
  border: '1px solid #e2e8f0',
};

const storeIdStyle = {
  fontSize: '11px',
  fontWeight: '700',
  color: '#8b1538',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '6px',
};

const storeDetailStyle = {
  color: '#475569',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
};

const storeLinkStyle = {
  color: '#8b1538',
  textDecoration: 'none',
  fontWeight: '500',
};

const ContactUs = () => {
  return (
    <div style={pageStyles.wrapper}>
      <div style={pageStyles.container}>

        {/* Header */}
        <div style={pageStyles.header}>
          <a href="#/">
            <img src={JL_LOGO} alt="Jiffy Lube MultiCare" style={pageStyles.logo} />
          </a>
          <h1 style={pageStyles.title}>Contact Us</h1>
        </div>

        {/* Content */}
        <div style={pageStyles.content}>

          <a href="#/" style={pageStyles.backLink}>← Back to Tire Finder</a>

          {/* Corporate Contact Card */}
          <div style={contactCardStyle}>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '20px', fontWeight: '700' }}>
              P.C.J.L., Inc.
            </h2>
            <p style={{ margin: '0', fontSize: '14px', opacity: '0.9' }}>
              Operating Jiffy Lube MultiCare locations in California
            </p>

            <div style={contactMethodStyle}>
              <div style={contactItemStyle}>
                <p style={contactLabelStyle}>Phone</p>
                <p style={contactValueStyle}>
                  <a href="tel:8053547077" style={contactLinkStyle}>(805) 354-7077</a>
                </p>
              </div>
              <div style={contactItemStyle}>
                <p style={contactLabelStyle}>Email</p>
                <p style={contactValueStyle}>
                  <a href="mailto:support@myjiffylube.com" style={contactLinkStyle}>support@myjiffylube.com</a>
                </p>
              </div>
              <div style={contactItemStyle}>
                <p style={contactLabelStyle}>Address</p>
                <p style={contactValueStyle}>
                  1440 Jason Way STE 100<br />
                  Santa Maria, CA 93455
                </p>
              </div>
            </div>
          </div>

          {/* General Inquiries */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>General Inquiries</h2>
            <p style={pageStyles.paragraph}>
              For general questions, customer support, tire quote inquiries, or feedback, please contact our 
              corporate office at <a href="mailto:support@myjiffylube.com" style={storeLinkStyle}>support@myjiffylube.com</a> or 
              call <a href="tel:8053547077" style={storeLinkStyle}>(805) 354-7077</a>. We typically respond 
              to email inquiries within one business day.
            </p>
          </section>

          {/* Privacy Requests */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>Privacy Requests</h2>
            <p style={pageStyles.paragraph}>
              For privacy-related requests, including access to your personal information, deletion requests, 
              or to opt out of communications, please email support@myjiffylube.com or call (805) 354-7077. 
              See our <a href="#/privacy-policy" style={storeLinkStyle}>Privacy Policy</a> for full details 
              on your rights.
            </p>
          </section>

          {/* Store Locations */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>Our Locations</h2>
            <p style={pageStyles.paragraph}>
              For service appointments, pricing questions, or store-specific inquiries, contact the location 
              nearest you:
            </p>

            <div style={storeGridStyle}>
              {STORES.map((store) => (
                <div key={store.id} style={storeCardStyle}>
                  <p style={storeIdStyle}>Store #{store.id}</p>
                  <p style={storeDetailStyle}>
                    {store.address}<br />
                    {store.city}<br />
                    <a href={`tel:${store.phone.replace(/[^\d]/g, '')}`} style={storeLinkStyle}>
                      {store.phone}
                    </a>
                    <br />
                    <a href={`mailto:${store.email}`} style={storeLinkStyle}>
                      {store.email}
                    </a>
                  </p>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Footer */}
        <div style={pageStyles.footer}>
          <p style={{ margin: '0 0 8px 0' }}>
            <a href="#/privacy-policy" style={{ color: '#64748b', marginRight: '15px', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="#/terms" style={{ color: '#64748b', marginRight: '15px', textDecoration: 'none' }}>Terms & Conditions</a>
            <a href="#/sms-consent" style={{ color: '#64748b', marginRight: '15px', textDecoration: 'none' }}>SMS Terms</a>
            <a href="#/do-not-sell" style={{ color: '#64748b', marginRight: '15px', textDecoration: 'none' }}>Do Not Sell My Info</a>
            <a href="#/contact" style={{ color: '#64748b', textDecoration: 'none' }}>Contact Us</a>
          </p>
          <p style={{ margin: '0' }}>
            © 2026 P.C.J.L., Inc. Operating Jiffy Lube MultiCare locations in California
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
