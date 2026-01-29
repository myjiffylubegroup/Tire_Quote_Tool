// =============================================================================
// SMS CONSENT PAGE - For Twilio Verification
// =============================================================================
// Route: #/sms-consent
// Purpose: Documents SMS opt-in process for Twilio compliance
// =============================================================================

import React from 'react';

const JL_LOGO = 'https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/assets/JL_Multicare_Horz_1C.png';

const SmsConsent = () => {
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
              <li><strong>Online Quote Request:</strong> When using our online tire quote system at tires.myjiffylube.ai, customers enter their phone number and check the consent box stating "I agree to receive text messages about my tire quote from Jiffy Lube" before submitting.</li>
              <li><strong>Verbal Authorization:</strong> When requesting a tire quote by phone or in-store, customers verbally provide their mobile phone number and authorize us to send their quote via text message.</li>
            </ul>
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
              <li><strong>Service Updates:</strong> Notifications when their vehicle service is complete</li>
              <li><strong>Appointment Reminders:</strong> Reminders about upcoming scheduled appointments</li>
            </ul>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', marginTop: '15px' }}>
              <strong>Message Frequency:</strong> Typically 1-3 messages per service visit. We do not send marketing or promotional messages.
            </p>
          </section>

          {/* Sample Message */}
          <section style={{ marginBottom: '35px' }}>
            <h2 style={{ color: '#8b1538', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              Sample Message
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
              Your Jiffy Lube tire quote is ready! View your quote here: https://tires.myjiffylube.ai/quote/ABC123 - My Jiffy Lube<br/><br/>
              Reply STOP to opt out.
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
              <li>Emailing us at info@myjiffylube.ai</li>
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
              <li>Visit any of our Jiffy Lube Multicare locations</li>
              <li>Email us at info@myjiffylube.ai</li>
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
              for marketing purposes. For more information, please review our Privacy Policy.
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
              Email: info@myjiffylube.ai<br/>
              Website: myjiffylube.ai
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
            Last Updated: January 2026 | © 2026 P.C.J.L., Inc. DBA My Jiffy Lube Group
          </p>
        </div>
      </div>
    </div>
  );
};

export default SmsConsent;
