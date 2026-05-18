// =============================================================================
// TERMS & CONDITIONS PAGE
// =============================================================================
// Route: #/terms
// Purpose: Website terms of use + Mobile Text Terms for Twilio compliance
// Adapted from JLI franchise and South Bay Lube franchisee templates
// =============================================================================

import React from 'react';

const JL_LOGO = 'https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/assets/JL_Multicare_Horz_1C.png';

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
  subsectionTitle: {
    color: '#334155',
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '10px',
    marginTop: '20px',
  },
  paragraph: {
    color: '#475569',
    lineHeight: '1.7',
    fontSize: '15px',
    marginBottom: '15px',
  },
  list: {
    color: '#475569',
    lineHeight: '2',
    fontSize: '15px',
    paddingLeft: '25px',
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

const TermsConditions = () => {
  return (
    <div style={pageStyles.wrapper}>
      <div style={pageStyles.container}>

        {/* Header */}
        <div style={pageStyles.header}>
          <a href="#/">
            <img src={JL_LOGO} alt="Jiffy Lube MultiCare" style={pageStyles.logo} />
          </a>
          <h1 style={pageStyles.title}>Terms & Conditions</h1>
        </div>

        {/* Content */}
        <div style={pageStyles.content}>

          <a href="#/" style={pageStyles.backLink}>← Back to Tire Finder</a>

          <p style={{ ...pageStyles.paragraph, fontStyle: 'italic', color: '#64748b' }}>
            Last Updated: May 2026
          </p>

          {/* Introduction */}
          <section style={pageStyles.section}>
            <p style={pageStyles.paragraph}>
              This website (tires.myjiffylube.ai) is operated by P.C.J.L., Inc., operating Jiffy Lube 
              MultiCare service centers in California. Throughout this site, the terms "we", "us", and 
              "our" refer to P.C.J.L., Inc. We offer this website, including all information, tools, and 
              services available from this site, conditioned upon your acceptance of all terms, conditions, 
              policies, and notices stated here.
            </p>
            <p style={pageStyles.paragraph}>
              By visiting our site and/or using our tire quote tools, you engage in our "Service" and agree 
              to be bound by the following terms and conditions. Please read these Terms of Service carefully 
              before accessing or using our website. If you do not agree to all the terms and conditions of 
              this agreement, then you may not access the website or use any services.
            </p>
          </section>

          {/* Section 1 - Website Terms */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>1. Website Terms</h2>
            <p style={pageStyles.paragraph}>
              By agreeing to these Terms of Service, you represent that you are at least 18 years of age. 
              You may not use our products or services for any illegal or unauthorized purpose, nor may you, 
              in the use of the Service, violate any laws in your jurisdiction.
            </p>
            <p style={pageStyles.paragraph}>
              You must not transmit any worms, viruses, or any code of a destructive nature. A breach or 
              violation of any of the Terms will result in an immediate termination of your access to our Services.
            </p>
          </section>

          {/* Section 2 - Tire Quote Service */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>2. Tire Quote Service</h2>
            <p style={pageStyles.paragraph}>
              Our tire quote tool provides estimated pricing for tire products and installation services at 
              our Jiffy Lube MultiCare locations. Quotes are estimates and are subject to the following conditions:
            </p>
            <ul style={pageStyles.list}>
              <li>Tire prices and availability are subject to change without notice and are based on current 
                distributor inventory at the time of the quote.</li>
              <li>Quotes are valid for a limited time as indicated on the quote document.</li>
              <li>Final pricing may vary based on actual vehicle inspection, tire availability at the time 
                of service, and applicable taxes.</li>
              <li>Promotional discounts are subject to specific terms and may not be combined with other offers 
                unless otherwise stated.</li>
              <li>Tire installation, balancing, and related services are performed at our service centers and 
                are subject to availability and scheduling.</li>
            </ul>
          </section>

          {/* Section 3 - Accuracy of Information */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>3. Accuracy of Information</h2>
            <p style={pageStyles.paragraph}>
              We are not responsible if information made available on this site is not accurate, complete, or 
              current. The material on this site is provided for general information only and should not be 
              relied upon as the sole basis for making purchasing decisions without confirming pricing and 
              availability with the service center directly.
            </p>
            <p style={pageStyles.paragraph}>
              Vehicle fitment data is provided by MOTOR Information Systems. Tire inventory and pricing data 
              is provided by USAutoForce (USVenture). While we strive to keep this information current and 
              accurate, we cannot guarantee that every data point is error-free.
            </p>
          </section>

          {/* Section 4 - Prices and Payment */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>4. Prices and Payment</h2>
            <p style={pageStyles.paragraph}>
              Prices for our products and services are subject to change without notice. We reserve the right 
              to modify or discontinue any product or service at any time without notice. We shall not be 
              liable to you or to any third party for any modification, price change, or discontinuance of a 
              product or service.
            </p>
            <p style={pageStyles.paragraph}>
              Payment for services may be made at the service center at the time of service, or through our 
              online PayPal invoice system when available. All prices shown in tire quotes include applicable 
              taxes as calculated based on your service center location.
            </p>
          </section>

          {/* Section 5 - Third-Party Services */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>5. Third-Party Services</h2>
            <p style={pageStyles.paragraph}>
              Our website may utilize or link to third-party services including payment processing (PayPal), 
              email delivery, and SMS messaging. We are not responsible for the 
              content, privacy policies, or practices of any third-party services.
            </p>
            <p style={pageStyles.paragraph}>
              Your use of third-party services is at your own risk and subject to those services' own terms 
              and conditions. We encourage you to review the terms and privacy policies of any third-party 
              services you interact with through our website.
            </p>
          </section>

          {/* Section 6 - Intellectual Property */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>6. Intellectual Property</h2>
            <p style={pageStyles.paragraph}>
              The Jiffy Lube® name, logo, and related trademarks are the property of Jiffy Lube International, 
              Inc. and are used under franchise agreement. All content on this website, including text, graphics, 
              and software, is the property of P.C.J.L., Inc. or its licensors and is protected by applicable 
              intellectual property laws.
            </p>
            <p style={pageStyles.paragraph}>
              You may not reproduce, duplicate, copy, sell, resell, or exploit any portion of the Service 
              without express written permission from us.
            </p>
          </section>

          {/* Section 7 - Limitation of Liability */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>7. Limitation of Liability</h2>
            <p style={pageStyles.paragraph}>
              In no event shall P.C.J.L., Inc., our directors, officers, employees, affiliates, agents, 
              contractors, or licensors be liable for any injury, loss, claim, or any direct, indirect, 
              incidental, punitive, special, or consequential damages of any kind arising out of or in any 
              way connected with use of this website or our tire quote service.
            </p>
            <p style={pageStyles.paragraph}>
              Our sole liability, and your sole and exclusive remedy, for any cause or claim whatsoever shall 
              be limited to the amount paid by you for any product or service purchased from us.
            </p>
          </section>

          {/* Section 8 - Mobile Text Terms of Use */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>8. Mobile Text Terms of Use</h2>
            <p style={pageStyles.paragraph}>
              These Mobile Text Terms of Use ("Mobile TOU") govern your use of the text messaging service 
              provided by P.C.J.L., Inc. ("the Company"). By opting into our SMS program, you agree to this 
              Mobile TOU, our <a href="#/privacy-policy" style={{ color: '#8b1538' }}>Privacy Policy</a>, 
              and these Terms & Conditions.
            </p>

            <h3 style={pageStyles.subsectionTitle}>Program Description</h3>
            <p style={pageStyles.paragraph}>
              We operate two distinct SMS programs:
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Tire Quote SMS Program:</strong> Sends customers messages related to their tire quote, 
              including tire quote delivery, tire safety follow-ups based on tread depth inspection results, 
              re-engagement messages, and quote expiration reminders. Marketing messages may include 
              promotional offers to encourage customers to return for tire replacement. Customers who 
              do not confirm marketing opt-in will only receive informational messages. All messages 
              relate solely to the customer's tire quote and vehicle tire safety.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Identity Verification SMS Program:</strong> Sends customers a single one-time 6-digit 
              numeric verification code when they request one from any of our customer-facing applications 
              at tires.myjiffylube.ai (including our tire finder, customer-facing quote retrieval, and 
              self-service intake kiosks at Jiffy Lube MultiCare locations). The code is used to confirm 
              the customer's identity, is valid for approximately 5 minutes, and contains no marketing 
              content. The customer initiates this action by entering their phone number into one of our 
              applications and tapping a button to request a code; no code is sent without that action.
            </p>
            <p style={pageStyles.paragraph}>
              Each program has its own consent mechanism. Opting out of one program does not automatically 
              opt out of the other.
            </p>

            <h3 style={pageStyles.subsectionTitle}>Consent</h3>
            <p style={pageStyles.paragraph}>
              <strong>Tire Quote SMS Program:</strong> By providing your mobile phone number and requesting 
              a tire quote via SMS, you expressly consent to receive text messages from P.C.J.L., Inc. at 
              the phone number provided, including marketing messages with promotional offers related to 
              your tire quote if you confirm by replying YES. Consent is not a condition of purchase.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Identity Verification SMS Program:</strong> By entering your phone number into one of 
              our customer-facing applications and tapping a button to receive a verification code, you 
              expressly consent to receive a single SMS message at the phone number provided containing the 
              verification code. Consent is not a condition of purchase.
            </p>
            <p style={pageStyles.paragraph}>
              In both cases, you also agree to pay any charges to your wireless bill or have them deducted 
              from your prepaid balance for receiving text messages.
            </p>

            <h3 style={pageStyles.subsectionTitle}>Message Frequency</h3>
            <p style={pageStyles.paragraph}>
              <strong>Tire Quote SMS Program:</strong> Up to 5 messages per tire quote over a 14-day period. 
              Messages include quote delivery, tire safety follow-ups, and expiration reminders. Marketing 
              messages may include promotional offers. If you purchase tires before all messages are sent, 
              remaining follow-ups stop and you receive a purchase confirmation instead.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Identity Verification SMS Program:</strong> One message per verification code request. 
              You may request additional codes if needed (e.g., the original code did not arrive or has 
              expired). Most customers receive a single code per session.
            </p>

            <h3 style={pageStyles.subsectionTitle}>Opting Out</h3>
            <p style={pageStyles.paragraph}>
              You may opt out of receiving text messages at any time by replying <strong>STOP</strong> to 
              any message from us. You will receive a final confirmation message acknowledging your opt-out. 
              After opting out, you will no longer receive SMS messages from us unless you opt in again.
            </p>

            <h3 style={pageStyles.subsectionTitle}>Help</h3>
            <p style={pageStyles.paragraph}>
              For help with our SMS service, reply <strong>HELP</strong> to any message, email us at 
              support@myjiffylube.com, or call (805) 354-7077.
            </p>

            <h3 style={pageStyles.subsectionTitle}>Message and Data Rates</h3>
            <p style={pageStyles.paragraph}>
              Message and data rates may apply depending on your mobile carrier and plan. We do not charge 
              for SMS messages, but your carrier's standard messaging rates may apply.
            </p>

            <h3 style={pageStyles.subsectionTitle}>Supported Carriers</h3>
            <p style={pageStyles.paragraph}>
              Our SMS service works with all major U.S. carriers including AT&T, T-Mobile, Verizon Wireless, 
              and most regional carriers. Carrier support is not guaranteed and may change.
            </p>

            <h3 style={pageStyles.subsectionTitle}>Privacy</h3>
            <p style={pageStyles.paragraph}>
              Phone numbers and SMS opt-in consent data collected for our SMS programs are used solely for 
              the purposes described above (tire quote messaging and identity verification codes for our 
              customer-facing applications). We will not share your opt-in to our SMS campaigns with any 
              third party for purposes unrelated to providing you with the services of those campaigns. We 
              may share your personal data, including your SMS opt-in or consent status, with third parties 
              that help us provide our messaging services, including but not limited to platform providers, 
              phone companies, and any other vendors who assist us in the delivery of text messages. We do 
              not sell, rent, or otherwise share your mobile phone number or SMS consent information with 
              third parties for promotional or marketing purposes. All of the above categories exclude text 
              messaging originator opt-in data and consent; this information will not be shared with any 
              third parties. For full details, see 
              our <a href="#/privacy-policy" style={{ color: '#8b1538' }}>Privacy Policy</a> and{' '}
              <a href="#/sms-consent" style={{ color: '#8b1538' }}>SMS Consent & Terms</a> page.
            </p>
          </section>

          {/* Section 9 - Governing Law */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>9. Governing Law</h2>
            <p style={pageStyles.paragraph}>
              These Terms of Service and any separate agreements whereby we provide you services shall be 
              governed by and construed in accordance with the laws of the State of California, without 
              regard to its conflict of law provisions.
            </p>
          </section>

          {/* Section 10 - Changes to Terms */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>10. Changes to Terms & Conditions</h2>
            <p style={pageStyles.paragraph}>
              We reserve the right to update, change, or replace any part of these Terms of Service by posting 
              updates to our website. It is your responsibility to check this page periodically for changes. 
              Your continued use of the website following the posting of any changes constitutes acceptance 
              of those changes.
            </p>
          </section>

          {/* Contact */}
          <section style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '25px',
            textAlign: 'center',
          }}>
            <h2 style={{ color: '#8b1538', fontSize: '18px', marginBottom: '15px' }}>
              Contact Us
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', margin: '0' }}>
              Questions about these Terms & Conditions? Contact us:
            </p>
            <p style={{ color: '#475569', lineHeight: '1.8', fontSize: '15px', marginTop: '15px', marginBottom: '0' }}>
              <strong>P.C.J.L., Inc.</strong><br />
              Operating Jiffy Lube MultiCare locations in California<br />
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
            <a href="#/sms-consent" style={{ color: '#64748b', textDecoration: 'none' }}>SMS Terms</a>
          </p>
          <p style={{ margin: '0' }}>
            © 2026 P.C.J.L., Inc. Operating Jiffy Lube MultiCare locations in California
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsConditions;
