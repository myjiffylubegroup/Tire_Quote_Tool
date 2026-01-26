import React, { useState, useEffect } from 'react';
import TireFinder from './TireFinder';
import StoreInventory from './StoreInventory';

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
  const path = currentPath.replace('#', '') || '/';
  
  if (path === '/inventory') {
    return <StoreInventory />;
  }
  
  // Default to Tire Finder
  return <TireFinder />;
}
