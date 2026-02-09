// =============================================================================
// ABOUT US PAGE
// =============================================================================
// Route: #/about
// Purpose: Company overview and store locations for P.C.J.L., Inc.
// =============================================================================

import React from 'react';

const JL_LOGO = 'https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/assets/JL_Multicare_Horz_1C.png';

const STORES = [
  {
    id: '609',
    name: 'Jiffy Lube MultiCare',
    address: '1860 S Broadway',
    city: 'Santa Maria, CA 93454',
    phone: '(805) 922-1948',
    email: 'store00609@jiffylube.com',
  },
  {
    id: '1002',
    name: 'Jiffy Lube MultiCare',
    address: '110 Higuera Street',
    city: 'San Luis Obispo, CA 93401',
    phone: '(805) 544-6698',
    email: 'store01002@jiffylube.com',
  },
  {
    id: '1257',
    name: 'Jiffy Lube MultiCare',
    address: '6015 Hollister Avenue',
    city: 'Goleta, CA 93117',
    phone: '(805) 683-4100',
    email: 'store01257@jiffylube.com',
  },
  {
    id: '1270',
    name: 'Jiffy Lube MultiCare',
    address: '495 Grand Avenue',
    city: 'Arroyo Grande, CA 93420',
    phone: '(805) 489-7802',
    email: 'store01270@jiffylube.com',
  },
  {
    id: '1396',
    name: 'Jiffy Lube MultiCare',
    address: '401 West Carrillo Street',
    city: 'Santa Barbara, CA 93101',
    phone: '(805) 564-3393',
    email: 'store01396@jiffylube.com',
  },
  {
    id: '1932',
    name: 'Jiffy Lube MultiCare',
    address: '7760 El Camino Real',
    city: 'Atascadero, CA 93422',
    phone: '(805) 461-4052',
    email: 'store01932@jiffylube.com',
  },
  {
    id: '2911',
    name: 'Jiffy Lube MultiCare',
    address: '200 Oak Hill Road',
    city: 'Paso Robles, CA 93446',
    phone: '(805) 237-8301',
    email: 'store02911@jiffylube.com',
  },
  {
    id: '4182',
    name: 'Jiffy Lube MultiCare',
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

const storeCardStyle = {
  backgroundColor: '#f8fafc',
  borderRadius: '10px',
  padding: '20px',
  marginBottom: '15px',
  border: '1px solid #e2e8f0',
};

const storeHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '10px',
};

const storeNameStyle = {
  color: '#8b1538',
  fontSize: '16px',
  fontWeight: '700',
  margin: '0',
};

const storeBadgeStyle = {
  backgroundColor: '#8b1538',
  color: 'white',
  fontSize: '11px',
  fontWeight: '700',
  padding: '3px 8px',
  borderRadius: '4px',
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

const AboutUs = () => {
  return (
    <div style={pageStyles.wrapper}>
      <div style={pageStyles.container}>

        {/* Header */}
        <div style={pageStyles.header}>
          <a href="#/">
            <img src={JL_LOGO} alt="Jiffy Lube MultiCare" style={pageStyles.logo} />
          </a>
          <h1 style={pageStyles.title}>About Us</h1>
        </div>

        {/* Content */}
        <div style={pageStyles.content}>

          <a href="#/" style={pageStyles.backLink}>← Back to Tire Finder</a>

          {/* Who We Are */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>Who We Are</h2>
            <p style={pageStyles.paragraph}>
              P.C.J.L., Inc. is a family-owned company operating eight Jiffy Lube MultiCare service centers 
              along California's beautiful Central Coast. From Santa Barbara to Paso Robles, our locations 
              serve communities across San Luis Obispo and Santa Barbara counties with comprehensive automotive 
              maintenance services.
            </p>
            <p style={pageStyles.paragraph}>
              As an independently owned and operated Jiffy Lube franchisee, we combine the trusted Jiffy Lube 
              brand with local ownership and personalized customer care. Our team is committed to providing 
              honest, reliable service — whether it's an oil change, brake service, or helping you find the 
              right tires for your vehicle.
            </p>
          </section>

          {/* Our Tire Quote Tool */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>Our Tire Quote Tool</h2>
            <p style={pageStyles.paragraph}>
              This website (tires.myjiffylube.ai) is our tire quoting platform, designed to make getting a 
              tire quote fast, transparent, and easy. Simply look up your vehicle, browse available tires with 
              real-time pricing and inventory, and receive a detailed quote you can print, email, or text to 
              yourself.
            </p>
            <p style={pageStyles.paragraph}>
              Our tire pricing includes installation, balancing, valve stems, and disposal — so the price you 
              see is the price you pay. No hidden fees, no surprises.
            </p>
          </section>

          {/* Our Locations */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>Our Locations</h2>
            <p style={pageStyles.paragraph}>
              We operate eight Jiffy Lube MultiCare locations across California's Central Coast:
            </p>

            {STORES.map((store) => (
              <div key={store.id} style={storeCardStyle}>
                <div style={storeHeaderStyle}>
                  <h3 style={storeNameStyle}>{store.name}</h3>
                  <span style={storeBadgeStyle}>Store #{store.id}</span>
                </div>
                <p style={storeDetailStyle}>
                  {store.address}<br />
                  {store.city}<br />
                  <a href={`tel:${store.phone.replace(/[^\d]/g, '')}`} style={storeLinkStyle}>
                    {store.phone}
                  </a>
                  {' · '}
                  <a href={`mailto:${store.email}`} style={storeLinkStyle}>
                    {store.email}
                  </a>
                </p>
              </div>
            ))}
          </section>

          {/* Corporate Office */}
          <section style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '25px',
            textAlign: 'center',
          }}>
            <h2 style={{ color: '#8b1538', fontSize: '18px', marginBottom: '15px' }}>
              Corporate Office
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.8', fontSize: '15px', margin: '0' }}>
              <strong>P.C.J.L., Inc.</strong><br />
              1440 Jason Way STE 100<br />
              Santa Maria, CA 93455<br />
              Phone: (805) 354-7077<br />
              Email: support@myjiffylube.com
            </p>
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

export default AboutUs;
