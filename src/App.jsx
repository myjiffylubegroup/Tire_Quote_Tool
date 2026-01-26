import React, { useState, useEffect } from 'react';
import TireFinder from './TireFinder';
import StoreInventory from './StoreInventory';
import QuoteBuilder from './QuoteBuilder';
import QuoteView from './QuoteView';

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
  // #/ or #/finder -> TireFinder
  // #/inventory -> StoreInventory
  // #/quote/build -> QuoteBuilder
  // #/quote/:code -> QuoteView
  const path = currentPath.replace('#', '') || '/';
  
  if (path === '/inventory') {
    return <StoreInventory />;
  }
  
  if (path === '/quote/build') {
    return <QuoteBuilder />;
  }
  
  // Match /quote/:code pattern
  if (path.startsWith('/quote/') && path !== '/quote/build') {
    const code = path.replace('/quote/', '');
    return <QuoteView code={code} />;
  }
  
  // Default to Tire Finder
  return <TireFinder />;
}
