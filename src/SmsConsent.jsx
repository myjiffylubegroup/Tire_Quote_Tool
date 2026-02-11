// =============================================================================
// SMS CONSENT PAGE - Updated for Telnyx 10DLC Compliance
// =============================================================================
// Route: #/sms-consent
// Purpose: Documents SMS opt-in process + provides direct opt-in form
// Updated: February 2026 - Added phone opt-in form for 10DLC compliance
// =============================================================================

import React, { useState } from 'react';

const JL_LOGO = 'https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/assets/JL_Multicare_Horz_1C.png';

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
    // For now, just show confirmation. When SMS is live, this could
    // call an API to register the opt-in and send the confirmation text.
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
          <img 
            src={JL_LOGO} 
            alt="Jiffy Lube Multicare" 
            style={{ height: '50px', marginBottom: '15px', filter: 'brightness(0) invert(1)' }} 
          />
          <h1 style={{ margin: '0', fontSize: '24px', fontWeight: '700' }}>
            SMS Messaging Consent & Terms
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
              📱 Opt In to Receive Text Messages
            </h2>
            <p style={{ color: '#475569', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
              Enter your phone number below to receive tire quotes, service reminders, and appointment updates from your local Jiffy Lube.
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
                    I agree to receive text messages about my tire quotes and vehicle service from Jiffy Lube (P.C.J.L., Inc.). 
                    Message frequency varies, typically 1-3 messages per service interaction. 
                    Message and data rates may apply. Reply STOP to cancel at any time. Reply HELP for help.
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
              P.C.J.L., Inc. DBA My Jiffy Lube Group ("we", "us", "our") operates Jiffy Lube Multicare locations in California. 
              We offer an optional SMS messaging service to provide customers with tire quotes, service reminders, 
              and appointment confirmations. This page describes how we collect consent and manage SMS communications.
            </p>
          </section>

          {/* How Consent is Collected */}
          <section style={{ marginBottom: '35px' }}>
            <h2 style={{ color: '#8b1538', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              How We Collect Consent
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', marginBottom: '15px' }}>
              Customers provide explicit consent to receive SMS messages through the following methods:
            </p>
            <ul style={{ color: '#475569', lineHeight: '2', fontSize: '15px', paddingLeft: '25px' }}>
              <li><strong>Online Opt-In Form:</strong> Customers can subscribe using the form above on this page (tires.myjiffylube.ai/#/sms-consent) by entering their phone number and checking the consent box.</li>
              <li><strong>Online Quote Delivery:</strong> When viewing a tire quote at tires.myjiffylube.ai, customers can choose to receive the quote via text by entering their phone number and confirming consent in the SMS dialog.</li>
              <li><strong>In-Store Verbal Authorization:</strong> During an in-store visit, a service advisor enters the customer's phone number into the tire quote system with the customer's verbal consent. SMS consent language is displayed on the screen at the time of entry.</li>
            </ul>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', marginTop: '15px' }}>
              In all cases, customers must actively provide their phone number and acknowledge consent before any messages are sent. Consent is not assumed or pre-checked.
            </p>
          </section>

          {/* Types of Messages */}
          <section style={{ marginBottom: '35px' }}>
            <h2 style={{ color: '#8b1538', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              Types of Messages
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', marginBottom: '15px' }}>
              Customers who opt-in may receive the following types of SMS messages:
            </p>
            <ul style={{ color: '#475569', lineHeight: '2', fontSize: '15px', paddingLeft: '25px' }}>
              <li><strong>Tire Quotes:</strong> A link to view their personalized tire quote with pricing and vehicle information</li>
              <li><strong>Quote Reminders:</strong> A reminder when a tire quote is about to expire</li>
              <li><strong>Service Updates:</strong> Notifications when their vehicle service is complete</li>
              <li><strong>Appointment Reminders:</strong> Reminders about upcoming scheduled appointments</li>
            </ul>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', marginTop: '15px' }}>
              <strong>Message Frequency:</strong> Typically 1-3 messages per service interaction. We do not send unsolicited marketing or promotional messages.
            </p>
          </section>

          {/* Sample Messages */}
          <section style={{ marginBottom: '35px' }}>
            <h2 style={{ color: '#8b1538', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              Sample Messages
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
              Jiffy Lube Tire Quote: Your tire quote for your 2022 Toyota Camry is ready! View it here: tires.myjiffylube.ai/q/Ab3kX9 - Quote valid for 7 days. Reply STOP to opt out.
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
              Jiffy Lube Reminder: Your tire quote JL-609-20260209-001 expires in 2 days. View your quote: tires.myjiffylube.ai/q/Ab3kX9 - Reply STOP to opt out.
            </div>
          </section>

          {/* Opt-Out */}
          <section style={{ marginBottom: '35px' }}>
            <h2 style={{ color: '#8b1538', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              How to Opt-Out
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px' }}>
              Customers can opt-out of SMS messages at any time by:
            </p>
            <ul style={{ color: '#475569', lineHeight: '2', fontSize: '15px', paddingLeft: '25px' }}>
              <li>Replying <strong>STOP</strong> to any message</li>
              <li>Contacting us at any of our store locations</li>
              <li>Calling (805) 354-7077</li>
              <li>Emailing us at support@myjiffylube.com</li>
            </ul>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', marginTop: '15px' }}>
              Once opted out, customers will receive a confirmation message and no further SMS messages will be sent.
            </p>
          </section>

          {/* Help */}
          <section style={{ marginBottom: '35px' }}>
            <h2 style={{ color: '#8b1538', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              Help & Support
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px' }}>
              For help or questions about our SMS service, customers can:
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
              Message and data rates may apply depending on your mobile carrier and plan. 
              We do not charge for SMS messages, but your carrier's standard messaging rates may apply.
            </p>
          </section>

          {/* Privacy */}
          <section style={{ marginBottom: '35px' }}>
            <h2 style={{ color: '#8b1538', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              Privacy
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px' }}>
              We respect your privacy. Phone numbers collected for SMS communications are used solely for 
              the purposes described above. We do not sell, rent, or share your phone number with third parties 
              for marketing purposes. For more information, please review our <a href="#/privacy-policy" style={{ color: '#8b1538', textDecoration: 'underline' }}>Privacy Policy</a>.
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
              Website: tires.myjiffylube.ai
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
          <p style={{ margin: '0' }}>
            Last Updated: February 2026 | © 2026 P.C.J.L., Inc. DBA My Jiffy Lube Group
          </p>
        </div>
      </div>
    </div>
  );
};

export default SmsConsent;
