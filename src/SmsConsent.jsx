// =============================================================================
// SMS CONSENT PAGE - Telnyx 10DLC Compliance
// =============================================================================
// Route: #/sms-consent
// Purpose: SMS opt-in form + terms + privacy for two programs:
//          (1) Tire quote messaging
//          (2) Identity verification codes across customer-facing apps
// Updated: May 2026 - Added identity verification SMS program (Program 2)
//          Original: February 2026 - Aligned to tire quote SMS journey for Telnyx 10DLC
// =============================================================================

import React, { useState } from 'react';

const JL_LOGO = '/images/JL_Multicare_Horz_1C.png';

const SmsConsent = () => {
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6,10)}`;
  };

  const handlePhoneChange = (e) => {
    setPhone(formatPhoneNumber(e.target.value));
  };

  const handleOptIn = (e) => {
    e.preventDefault();
    if (!consent || phone.replace(/\D/g, '').length < 10) return;
    // When SMS is live, this will call an API to register the opt-in
    // and send the confirmation text message
    setSubmitted(true);
  };

  return (
    <div style={{ 
      fontFamily: "'Segoe UI', sans-serif", 
      backgroundColor: '#f1f5f9', 
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        backgroundColor: 'white', 
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        
        {/* Header */}
        <div style={{ 
          backgroundColor: '#8b1538', 
          color: 'white', 
          padding: '30px',
          textAlign: 'center'
        }}>
          <a href="#/">
            <img 
              src={JL_LOGO} 
              alt="Jiffy Lube Multicare" 
              style={{ height: '50px', marginBottom: '15px', filter: 'brightness(0) invert(1)' }} 
            />
          </a>
          <h1 style={{ margin: '0', fontSize: '24px', fontWeight: '700' }}>
            SMS Tire Quote Messaging — Consent & Terms
          </h1>
        </div>

        {/* Content */}
        <div style={{ padding: '40px' }}>

          {/* ========== OPT-IN FORM ========== */}
          <section style={{ 
            marginBottom: '40px', 
            backgroundColor: '#f0fdf4', 
            border: '2px solid #86efac', 
            borderRadius: '16px', 
            padding: '30px',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#166534', fontSize: '20px', marginBottom: '8px', marginTop: '0' }}>
              📱 Opt In to Receive Your Tire Quote via Text
            </h2>
            <p style={{ color: '#475569', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
              Enter your phone number below to receive tire quote messages from your local Jiffy Lube Multicare.
            </p>

            {!submitted ? (
              <div>
                {/* Phone Input */}
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(805) 555-1234"
                  style={{
                    width: '280px',
                    maxWidth: '100%',
                    padding: '14px 20px',
                    border: '2px solid #86efac',
                    borderRadius: '12px',
                    fontSize: '18px',
                    fontWeight: '600',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                    marginBottom: '16px',
                    display: 'block',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                  }}
                />

                {/* Consent Checkbox */}
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '10px', 
                  cursor: 'pointer',
                  maxWidth: '500px',
                  margin: '0 auto 20px auto',
                  textAlign: 'left'
                }}>
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    style={{ 
                      marginTop: '2px', 
                      width: '20px', 
                      height: '20px', 
                      accentColor: '#22c55e',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  />
                  <span style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                    By providing your phone number and clicking "Subscribe," you agree to receive SMS tire quote 
                    messages from Jiffy Lube Multicare (P.C.J.L., Inc.), including tire quote delivery, tire safety 
                    follow-ups, and marketing messages with promotional offers related to your tire quote. You will 
                    receive up to 5 messages per tire quote. Message frequency may vary. Standard message and data 
                    rates may apply. Reply STOP to opt out at any time. Reply HELP for help. Consent is not a 
                    condition of purchase. Your mobile information will not be sold or shared with third parties 
                    for promotional or marketing purposes.
                  </span>
                </label>

                {/* Submit Button */}
                <button
                  onClick={handleOptIn}
                  disabled={!consent || phone.replace(/\D/g, '').length < 10}
                  style={{
                    padding: '14px 40px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: consent && phone.replace(/\D/g, '').length >= 10 ? '#22c55e' : '#ccc',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '700',
                    letterSpacing: '1px',
                    cursor: consent && phone.replace(/\D/g, '').length >= 10 ? 'pointer' : 'not-allowed'
                  }}
                >
                  SUBSCRIBE
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
                <p style={{ fontSize: '16px', fontWeight: '600', color: '#166534', marginBottom: '5px' }}>
                  You're subscribed!
                </p>
                <p style={{ fontSize: '13px', color: '#475569' }}>
                  You'll receive a confirmation text at {phone}. Reply STOP at any time to opt out.
                </p>
              </div>
            )}
          </section>
          
          {/* Overview */}
          <section style={{ marginBottom: '35px' }}>
            <h2 style={{ color: '#8b1538', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              Overview
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px' }}>
              P.C.J.L., Inc. DBA My Jiffy Lube Group ("we", "us", "our") operates Jiffy Lube Multicare locations 
              in California. We offer two distinct optional SMS services to our customers: (1) a tire quote 
              messaging program that delivers personalized tire quotes and related follow-up messages, and 
              (2) an identity verification program that delivers one-time numeric codes to confirm customer 
              identity when using our customer-facing applications (including our tire finder, customer-facing 
              quote retrieval, and self-service intake kiosks). Each program has its own opt-in mechanism, 
              message content, and frequency. This page describes both programs.
            </p>
          </section>

          {/* How Consent is Collected — Tire Quote Messages */}
          <section style={{ marginBottom: '35px' }}>
            <h2 style={{ color: '#8b1538', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              How We Collect Consent — Tire Quote Messages
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', marginBottom: '15px' }}>
              Customers provide explicit consent to receive SMS messages through the following method:
            </p>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', marginBottom: '15px' }}>
              <strong>In-Store Verbal Consent:</strong> When a customer visits one of our 8 Jiffy Lube Multicare 
              locations in California for a tire inspection, the service advisor asks: "Would you like to receive 
              your tire quote via text message?" If the customer says "yes," the advisor reads the following consent 
              disclosure: "By providing your phone number, you agree to receive SMS tire quote messages from 
              Jiffy Lube Multicare. You will receive up to 5 messages related to your tire quote. Message frequency 
              may vary. Standard message and data rates may apply. Reply STOP to opt out at any time. Reply HELP 
              for help. Consent is not a condition of purchase. Your mobile information will not be sold or shared 
              with third parties for promotional or marketing purposes." The customer then provides their phone 
              number, which is entered into the tire quote system.
            </p>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px' }}>
              In all cases, customers must actively provide their phone number and acknowledge consent before any 
              messages are sent. Consent is not assumed or pre-checked.
            </p>
          </section>

          {/* Types of Messages — Tire Quote Messages */}
          <section style={{ marginBottom: '35px' }}>
            <h2 style={{ color: '#8b1538', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              Types of Messages — Tire Quote Messages
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', marginBottom: '15px' }}>
              Customers who opt in will receive up to 5 SMS messages per tire quote, all related to their tire 
              quote and vehicle tire safety:
            </p>
            <ul style={{ color: '#475569', lineHeight: '2', fontSize: '15px', paddingLeft: '25px' }}>
              <li><strong>Opt-In Confirmation:</strong> A confirmation message verifying your subscription to tire quote messages</li>
              <li><strong>Tire Quote Delivery:</strong> A link to view your personalized tire quote with pricing and vehicle information</li>
              <li><strong>Tire Safety Follow-Up:</strong> A message referencing your tire inspection results and the importance of tire replacement based on your tread depth readings</li>
              <li><strong>Re-Engagement:</strong> A follow-up offering to answer questions or provide alternative tire options if you have not yet returned for service</li>
              <li><strong>Quote Expiration Reminder:</strong> A final reminder that your tire quote is about to expire, which may include a special offer</li>
            </ul>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', marginTop: '15px' }}>
              If you purchase tires before all messages are sent, the remaining follow-up messages will stop and 
              you will receive a purchase confirmation with warranty registration information instead.
            </p>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', marginTop: '10px' }}>
              <strong>Message Frequency:</strong> Up to 5 messages per tire quote over a 14-day period. We do not 
              send unsolicited marketing or promotional messages unrelated to your tire quote.
            </p>
          </section>

          {/* Sample Messages — Tire Quote Messages */}
          <section style={{ marginBottom: '35px' }}>
            <h2 style={{ color: '#8b1538', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              Sample Messages — Tire Quote Messages
            </h2>
            <div style={{ 
              backgroundColor: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              borderRadius: '12px', 
              padding: '20px',
              fontFamily: 'monospace',
              fontSize: '14px',
              color: '#334155',
              marginBottom: '15px'
            }}>
              Jiffy Lube Multicare: Your tire quote for your 2022 Toyota Camry is ready. View your quote here: tires.myjiffylube.ai/#/quote/Ab3kX9 - Reply STOP to opt out.
            </div>
            <div style={{ 
              backgroundColor: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              borderRadius: '12px', 
              padding: '20px',
              fontFamily: 'monospace',
              fontSize: '14px',
              color: '#334155'
            }}>
              Jiffy Lube Multicare: During your inspection we measured 2 tires in the red zone (under 3/32). Safe stopping distance is significantly reduced. View your tire quote: tires.myjiffylube.ai/#/quote/Ab3kX9 - Your quote expires in 7 days. Reply STOP to opt out.
            </div>
          </section>

          {/* ========================================================== */}
          {/* SMS PROGRAM 2: Identity Verification Codes                  */}
          {/* ========================================================== */}

          {/* Program 2 Intro */}
          <section style={{ marginBottom: '35px' }}>
            <h2 style={{ color: '#8b1538', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              SMS Program 2: Identity Verification Codes
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px' }}>
              In addition to the tire quote SMS program described above, we operate a separate SMS program 
              for delivering one-time numeric verification codes to customers using our customer-facing 
              applications. This program supports identity verification across multiple touchpoints, 
              including our tire finder and customer-facing quote retrieval at <strong>tires.myjiffylube.ai</strong>, 
              and our self-service intake kiosks at <strong>greets.myjiffylube.ai</strong> accessed by 
              scanning a QR code at Jiffy Lube Multicare locations. This is a distinct service with its 
              own opt-in mechanism, message content, and message frequency.
            </p>
          </section>

          {/* How Consent is Collected — Identity Verification */}
          <section style={{ marginBottom: '35px' }}>
            <h2 style={{ color: '#8b1538', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              How We Collect Consent — Identity Verification
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', marginBottom: '15px' }}>
              Customers provide explicit consent to receive a verification code by performing the following 
              action within one of our customer-facing applications:
            </p>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', marginBottom: '15px' }}>
              <strong>Customer-Initiated Opt-In:</strong> The customer enters their mobile phone number into 
              an input field and taps a button clearly labeled to indicate that a verification code will be 
              sent (for example, "Send me a verification code" or "Text me a code"). The act of entering the 
              phone number and tapping the button constitutes the customer's express consent to receive one 
              SMS message containing the verification code at the number provided. No verification code is 
              sent unless the customer initiates this action. Specific touchpoints where this opt-in occurs 
              today include our self-service intake kiosks (accessed by scanning a QR code at a store 
              entrance), our tire finder application, and our customer-facing quote retrieval. We may add 
              additional verification touchpoints across our customer-facing applications over time; in all 
              cases the opt-in mechanism follows the customer-initiated pattern described above.
            </p>
          </section>

          {/* Types of Messages — Identity Verification */}
          <section style={{ marginBottom: '35px' }}>
            <h2 style={{ color: '#8b1538', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              Types of Messages — Identity Verification
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', marginBottom: '15px' }}>
              Customers who request a verification code will receive a single SMS message containing a 
              6-digit numeric code valid for approximately 5 minutes. If the customer's code does not arrive 
              or expires, they may request a new code from within the application, which triggers one 
              additional SMS. No further messages are sent unless the customer requests another code.
            </p>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', marginBottom: '15px' }}>
              The identity verification SMS program is strictly transactional. We do not send marketing, 
              promotional, or any other content through this program. The verification SMS contains no 
              embedded links and no embedded phone numbers.
            </p>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px' }}>
              <strong>Message Frequency:</strong> One SMS message per verification request initiated by the 
              customer. The customer fully controls how many messages they receive by choosing how many 
              times they request a code. Most customers will receive a single verification code per session.
            </p>
          </section>

          {/* Sample Message — Identity Verification */}
          <section style={{ marginBottom: '35px' }}>
            <h2 style={{ color: '#8b1538', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              Sample Message — Identity Verification
            </h2>
            <div style={{ 
              backgroundColor: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              borderRadius: '12px', 
              padding: '20px',
              fontFamily: 'monospace',
              fontSize: '14px',
              color: '#334155'
            }}>
              Jiffy Lube Multicare: Your verification code is 482913. This code expires in 5 minutes. Reply STOP to opt out, HELP for help.
            </div>
          </section>

          {/* Opt-Out */}
          <section style={{ marginBottom: '35px' }}>
            <h2 style={{ color: '#8b1538', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              How to Opt Out
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px' }}>
              You can opt out of SMS messages at any time by:
            </p>
            <ul style={{ color: '#475569', lineHeight: '2', fontSize: '15px', paddingLeft: '25px' }}>
              <li>Replying <strong>STOP</strong> to any message</li>
              <li>Contacting us at any of our store locations</li>
              <li>Calling (805) 354-7077</li>
              <li>Emailing support@myjiffylube.com</li>
            </ul>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', marginTop: '15px' }}>
              Once opted out, you will receive a final confirmation message and no further SMS messages will be sent 
              unless you opt in again by texting START.
            </p>
          </section>

          {/* Help */}
          <section style={{ marginBottom: '35px' }}>
            <h2 style={{ color: '#8b1538', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              Help & Support
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px' }}>
              For help or questions about our SMS service:
            </p>
            <ul style={{ color: '#475569', lineHeight: '2', fontSize: '15px', paddingLeft: '25px' }}>
              <li>Reply <strong>HELP</strong> to any message</li>
              <li>Call (805) 354-7077</li>
              <li>Visit any of our Jiffy Lube Multicare locations</li>
              <li>Email support@myjiffylube.com</li>
            </ul>
          </section>

          {/* Costs */}
          <section style={{ marginBottom: '35px' }}>
            <h2 style={{ color: '#8b1538', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              Message & Data Rates
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px' }}>
              Standard message and data rates may apply depending on your mobile carrier and plan. 
              We do not charge for SMS messages, but your carrier's standard messaging rates may apply. 
              Consent is not a condition of purchase.
            </p>
          </section>

          {/* Privacy */}
          <section style={{ marginBottom: '35px' }}>
            <h2 style={{ color: '#8b1538', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              SMS Privacy Policy
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', marginBottom: '15px' }}>
              We respect your privacy. Phone numbers and SMS opt-in consent data collected for our SMS 
              programs are used solely for the purposes described on this page (tire quote messaging and 
              identity verification codes for our customer-facing applications).
            </p>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', marginBottom: '15px' }}>
              We will not share your opt-in to our SMS campaigns with any third party for purposes unrelated 
              to providing you with the services of those campaigns. We may share your personal data, 
              including your SMS opt-in or consent status, with third parties that help us provide our 
              messaging services, including but not limited to platform providers, phone companies, and any 
              other vendors who assist us in the delivery of text messages.
            </p>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px' }}>
              We do not sell, rent, or otherwise share your mobile phone number or SMS consent information with 
              third parties for promotional or marketing purposes. All of the above categories exclude text 
              messaging originator opt-in data and consent; this information will not be shared with any third 
              parties. For our full privacy policy, please 
              visit our <a href="#/privacy-policy" style={{ color: '#8b1538', textDecoration: 'underline' }}>Privacy Policy</a> page.
            </p>
          </section>

          {/* Contact */}
          <section style={{ 
            backgroundColor: '#f8fafc', 
            borderRadius: '12px', 
            padding: '25px',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#8b1538', fontSize: '18px', marginBottom: '15px' }}>
              Contact Us
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', margin: '0' }}>
              <strong>P.C.J.L., Inc. DBA My Jiffy Lube Group</strong><br/>
              Operating Jiffy Lube Multicare locations in California<br/>
              Phone: (805) 354-7077<br/>
              Email: support@myjiffylube.com<br/>
              Websites: tires.myjiffylube.ai, greets.myjiffylube.ai
            </p>
          </section>

        </div>

        {/* Footer */}
        <div style={{ 
          backgroundColor: '#f8fafc', 
          padding: '20px', 
          textAlign: 'center',
          borderTop: '1px solid #e2e8f0',
          color: '#94a3b8',
          fontSize: '12px'
        }}>
          <p style={{ margin: '0 0 8px 0' }}>
            <a href="#/privacy-policy" style={{ color: '#64748b', marginRight: '15px', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="#/terms" style={{ color: '#64748b', marginRight: '15px', textDecoration: 'none' }}>Terms & Conditions</a>
            <a href="#/sms-consent" style={{ color: '#64748b', textDecoration: 'none' }}>SMS Terms</a>
          </p>
          <p style={{ margin: '0' }}>
            Last Updated: May 2026 | © 2026 P.C.J.L., Inc. DBA My Jiffy Lube Group
          </p>
        </div>
      </div>
    </div>
  );
};

export default SmsConsent;
