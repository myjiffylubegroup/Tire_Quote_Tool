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
import MechanicalFinder from './MechanicalFinder';
import MechanicalQuoteView from './MechanicalQuoteView';
import TermsConditions from './TermsConditions';
import DoNotSell from './DoNotSell';
import Reports from './Reports';

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
  // #/sms-consent -> SmsConsent (SMS opt-in & terms)
  // #/privacy-policy -> PrivacyPolicy
  // #/terms -> TermsConditions
  // #/do-not-sell -> DoNotSell (CCPA compliance)
  //
  // PROTECTED ROUTES (staff PIN required):
  // #/quotes -> QuoteLookup
  // #/quote/build -> QuoteBuilder (also handles ?revise=uuid)
  // #/enterprise -> EnterpriseTireFinder
  // #/fleet -> FleetTireFinder
  // #/reports -> Reports
  
  // Strip query params for route matching (e.g., /quote/build?revise=xxx -> /quote/build)
  const fullPath = currentPath.replace('#', '') || '/';
  const path = fullPath.split('?')[0];
  
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

  if (path === '/do-not-sell') {
    return <DoNotSell />;
  }
  
  // QuoteView - public (customer has the short code link)
  // Also handles ?edit=true param (QuoteView reads it from hash internally)
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

  if (path === '/reports') {
    return (
      <StaffPinGate>
        <Reports />
      </StaffPinGate>
    );
  }
  
  // MechanicalQuoteView - public (customer has the short code link)
  if (path.startsWith('/mechanical/') && path !== '/mechanical/') {
    const code = path.replace('/mechanical/', '');
    return <MechanicalQuoteView code={code} />;
  }

  if (path === '/mechanical') {
    const revisionMode = fullPath.includes('mode=revision');
    return (
      <StaffPinGate>
        <MechanicalFinder revisionMode={revisionMode} />
      </StaffPinGate>
    );
  }

  // === DEFAULT (public) ===
  return <TireFinder />;
}
