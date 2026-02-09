import React, { useState, useEffect } from 'react';
import TireFinder from './TireFinder';
import StoreInventory from './StoreInventory';
import QuoteBuilder from './QuoteBuilder';
import QuoteView from './QuoteView';
import QuoteLookup from './QuoteLookup';
import EnterpriseTireFinder from './EnterpriseTireFinder';
import FleetTireFinder from './FleetTireFinder';
import StaffPinGate from './StaffPinGate';
import SmsConsent from './SmsConsent';
import PrivacyPolicy from './PrivacyPolicy';
import TermsConditions from './TermsConditions';
import AboutUs from './AboutUs';
import ContactUs from './ContactUs';
import DoNotSell from './DoNotSell';

// Simple hash-based router (no additional dependencies needed)
export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.hash || '#/');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash || '#/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Route to appropriate component
  // PUBLIC ROUTES (no auth required):
  // #/ or #/finder -> TireFinder
  // #/inventory -> StoreInventory
  // #/quote/:code -> QuoteView (customer link)
  // #/sms-consent -> SmsConsent (Twilio compliance)
  // #/privacy-policy -> PrivacyPolicy
  // #/terms -> TermsConditions
  // #/about -> AboutUs
  // #/contact -> ContactUs
  // #/do-not-sell -> DoNotSell (CCPA compliance)
  //
  // PROTECTED ROUTES (staff PIN required):
  // #/quotes -> QuoteLookup
  // #/quote/build -> QuoteBuilder
  // #/enterprise -> EnterpriseTireFinder
  // #/fleet -> FleetTireFinder
  
  const path = currentPath.replace('#', '') || '/';
  
  // === PUBLIC ROUTES ===
  
  if (path === '/inventory') {
    return <StoreInventory />;
  }
  
  if (path === '/sms-consent') {
    return <SmsConsent />;
  }
  
  if (path === '/privacy-policy') {
    return <PrivacyPolicy />;
  }
  
  if (path === '/terms') {
    return <TermsConditions />;
  }
  
  if (path === '/about') {
    return <AboutUs />;
  }
  
  if (path === '/contact') {
    return <ContactUs />;
  }
  
  if (path === '/do-not-sell') {
    return <DoNotSell />;
  }
  
  // QuoteView - public (customer has the short code link)
  if (path.startsWith('/quote/') && path !== '/quote/build') {
    const code = path.replace('/quote/', '');
    return <QuoteView code={code} />;
  }
  
  // === PROTECTED ROUTES (wrapped with StaffPinGate) ===
  
  if (path === '/quotes') {
    return (
      <StaffPinGate>
        <QuoteLookup />
      </StaffPinGate>
    );
  }
  
  if (path === '/quote/build') {
    return (
      <StaffPinGate>
        <QuoteBuilder />
      </StaffPinGate>
    );
  }
  
  if (path === '/enterprise') {
    return (
      <StaffPinGate>
        <EnterpriseTireFinder />
      </StaffPinGate>
    );
  }
  
  if (path === '/fleet') {
    return (
      <StaffPinGate>
        <FleetTireFinder />
      </StaffPinGate>
    );
  }
  
  // === DEFAULT (public) ===
  return <TireFinder />;
}
