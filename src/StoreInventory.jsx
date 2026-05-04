import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';
const API_KEY = 'TIRES2026';

// Store list with city names - matches TireFinder
const STORES = [
  { id: 609, name: 'Santa Maria' },
  { id: 1002, name: 'San Luis Obispo' },
  { id: 1257, name: 'Goleta' },
  { id: 1270, name: 'Arroyo Grande' },
  { id: 1396, name: 'Santa Barbara (Downtown)' },
  { id: 1932, name: 'Atascadero' },
  { id: 2911, name: 'Paso Robles' },
  { id: 4182, name: 'Santa Barbara (Upper State)' },
];

// Summary card component
const SummaryCard = ({ label, value, subtext }) => (
  <div style={{
    backgroundColor: '#f3e8ff',
    padding: '15px 25px',
    borderRadius: '10px',
    textAlign: 'center',
    minWidth: '120px',
  }}>
    <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>
      {label}
    </div>
    <div style={{ fontSize: '24px', fontWeight: '700', color: '#9b59b6' }}>
      {value}
    </div>
    {subtext && (
      <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>
        {subtext}
      </div>
    )}
  </div>
);

export default function StoreInventory() {
  const [selectedStore, setSelectedStore] = useState('');
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [showCost, setShowCost] = useState(true);
  const [sortField, setSortField] = useState('tire_size');
  const [sortDirection, setSortDirection] = useState('asc');

  // Fetch inventory when store changes
  useEffect(() => {
    if (!selectedStore) {
      setInventory([]);
      setSummary(null);
      return;
    }

    const fetchInventory = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE}/store-inventory?store_id=${selectedStore}&key=${API_KEY}`
        );
        const data = await response.json();

        if (data.success) {
          setInventory(data.data);
          setSummary(data.summary);
        } else {
          setError(data.error || 'Failed to load inventory');
        }
      } catch (e) {
        setError('Failed to connect to server');
      }

      setLoading(false);
    };

    fetchInventory();
  }, [selectedStore]);

  // Filter inventory based on search
  const filteredInventory = inventory.filter(item => {
    if (!searchFilter) return true;
    const search = searchFilter.toLowerCase();
    return (
      (item.description && item.description.toLowerCase().includes(search)) ||
      (item.tire_size && item.tire_size.toLowerCase().includes(search)) ||
      (item.brand && item.brand.toLowerCase().includes(search)) ||
      (item.item_code && item.item_code.toLowerCase().includes(search))
    );
  });

  // Sort inventory
  const sortedInventory = [...filteredInventory].sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';
    
    // Handle numeric fields
    if (['quantity_on_hand', 'cost', 'retail'].includes(sortField)) {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Handle column header click for sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort indicator
  const getSortIndicator = (field) => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  // Export to CSV
  const exportCSV = () => {
    const headers = showCost 
      ? ['Tire Size', 'Part Number', 'Brand', 'Description', 'QOH', 'Cost', 'Retail']
      : ['Tire Size', 'Part Number', 'Brand', 'Description', 'QOH', 'Retail'];
    
    const rows = sortedInventory.map(item => {
      const row = [
        item.tire_size || '',
        item.item_code || '',
        item.brand || '',
        `"${(item.description || '').replace(/"/g, '""')}"`,
        item.quantity_on_hand,
      ];
      if (showCost) row.push(item.cost.toFixed(2));
      row.push(item.retail.toFixed(2));
      return row.join(',');
    });

    const storeName = STORES.find(s => s.id === parseInt(selectedStore))?.name || selectedStore;
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_${selectedStore}_${storeName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedStoreName = STORES.find(s => s.id === parseInt(selectedStore))?.name || '';

  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navbar
        currentPage="inventory"
        selectedStore={selectedStore}
        onStoreChange={setSelectedStore}
        showStorePlaceholder={true}
      />

      {/* Hero Banner - matches TireFinder */}
      <div style={{
        background: 'linear-gradient(180deg, #a8d4e6 0%, #d4e4e8 40%, #e8ebe8 60%, #9ca3af 100%)',
        padding: '60px 20px',
        position: 'relative',
      }}>
      </div>

      {/* Main Content - overlapping the hero like TireFinder */}
      <div style={{ maxWidth: '1200px', margin: '-40px auto 40px', padding: '0 20px', position: 'relative', zIndex: 10 }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 4px 25px rgba(0,0,0,0.15)',
          padding: '40px',
        }}>
          {/* Title */}
          <h1 style={{
            color: '#9b59b6',
            fontSize: '28px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '5px',
            letterSpacing: '2px',
          }}>
            STORE TIRE INVENTORY
          </h1>
          <p style={{
            color: '#666',
            fontSize: '13px',
            textAlign: 'center',
            marginBottom: '35px',
            letterSpacing: '4px',
            fontWeight: '600',
          }}>
            VIEW IN-STOCK TIRES BY LOCATION
          </p>

          {/* Loading State */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9b59b6' }}>
              <p style={{ fontSize: '16px' }}>🔍 Loading inventory...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#e74c3c' }}>
              <p style={{ fontSize: '16px' }}>{error}</p>
            </div>
          )}

          {/* Initial State - No Store Selected */}
          {!selectedStore && !loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>🛞</div>
              <p style={{ fontSize: '16px' }}>Select a store from the header to view tire inventory</p>
            </div>
          )}

          {/* Results */}
          {!loading && !error && selectedStore && summary && (
            <>
              {/* Summary Cards */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '20px', 
                marginBottom: '25px',
                flexWrap: 'wrap'
              }}>
                <SummaryCard 
                  label="Store" 
                  value={selectedStore} 
                  subtext={selectedStoreName}
                />
                <SummaryCard 
                  label="SKUs" 
                  value={summary.total_skus} 
                  subtext="unique items"
                />
                <SummaryCard 
                  label="Units" 
                  value={summary.total_units} 
                  subtext="in stock"
                />
                <SummaryCard 
                  label="Brands" 
                  value={summary.unique_brands} 
                  subtext="available"
                />
              </div>

              {/* Controls Row */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '15px'
              }}>
                {/* Search Input */}
                <input
                  type="text"
                  placeholder="🔍 Filter by size, brand, description..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={{
                    padding: '10px 15px',
                    border: '2px solid #9b59b6',
                    borderRadius: '25px',
                    fontSize: '13px',
                    width: '300px',
                    maxWidth: '100%',
                    outline: 'none',
                  }}
                />

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Hide/Show Cost Toggle */}
                  <button
                    onClick={() => setShowCost(!showCost)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: showCost ? '#9b59b6' : '#e0e0e0',
                      color: showCost ? 'white' : '#666',
                      border: 'none',
                      borderRadius: '25px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      letterSpacing: '1px',
                    }}
                  >
                    {showCost ? '👁 HIDE COST' : '👁 SHOW COST'}
                  </button>

                  {/* Export Button */}
                  <button
                    onClick={exportCSV}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#27ae60',
                      color: 'white',
                      border: 'none',
                      borderRadius: '25px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      letterSpacing: '1px',
                    }}
                  >
                    📥 EXPORT CSV
                  </button>
                </div>
              </div>

              {/* Results Count */}
              {searchFilter && (
                <p style={{ color: '#666', fontSize: '13px', marginBottom: '15px' }}>
                  Showing {sortedInventory.length} of {inventory.length} items
                </p>
              )}

              {/* Inventory Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  fontSize: '14px',
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f8f8', borderBottom: '2px solid #9b59b6' }}>
                      <th 
                        onClick={() => handleSort('tire_size')}
                        style={{ 
                          padding: '12px 10px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#333',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }}
                      >
                        Tire Size{getSortIndicator('tire_size')}
                      </th>
                      <th 
                        onClick={() => handleSort('item_code')}
                        style={{ 
                          padding: '12px 10px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#333',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }}
                      >
                        Part #{getSortIndicator('item_code')}
                      </th>
                      <th 
                        onClick={() => handleSort('brand')}
                        style={{ 
                          padding: '12px 10px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#333',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }}
                      >
                        Brand{getSortIndicator('brand')}
                      </th>
                      <th 
                        onClick={() => handleSort('description')}
                        style={{ 
                          padding: '12px 10px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#333',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }}
                      >
                        Description{getSortIndicator('description')}
                      </th>
                      <th 
                        onClick={() => handleSort('quantity_on_hand')}
                        style={{ 
                          padding: '12px 10px',
                          textAlign: 'center',
                          fontWeight: '600',
                          color: '#333',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }}
                      >
                        QOH{getSortIndicator('quantity_on_hand')}
                      </th>
                      {showCost && (
                        <th 
                          onClick={() => handleSort('cost')}
                          style={{ 
                            padding: '12px 10px',
                            textAlign: 'right',
                            fontWeight: '600',
                            color: '#333',
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                          }}
                        >
                          Cost{getSortIndicator('cost')}
                        </th>
                      )}
                      <th 
                        onClick={() => handleSort('retail')}
                        style={{ 
                          padding: '12px 10px',
                          textAlign: 'right',
                          fontWeight: '600',
                          color: '#333',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }}
                      >
                        Retail{getSortIndicator('retail')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedInventory.map((item, idx) => (
                      <tr 
                        key={item.store_item_id || idx}
                        style={{ 
                          borderBottom: '1px solid #eee',
                          backgroundColor: item.quantity_on_hand <= 2 ? '#fff3cd' : 'white',
                        }}
                      >
                        <td style={{ padding: '12px 10px', fontWeight: '600', color: '#9b59b6' }}>
                          {item.tire_size || '-'}
                        </td>
                        <td style={{ padding: '12px 10px', fontSize: '12px', color: '#666' }}>
                          {item.item_code || '-'}
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          {item.brand || '-'}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'left', maxWidth: '300px' }}>
                          <span style={{ fontSize: '13px' }}>{item.description}</span>
                        </td>
                        <td style={{ 
                          padding: '12px 10px',
                          textAlign: 'center',
                          fontWeight: '700',
                          color: item.quantity_on_hand <= 2 ? '#e67e22' : '#27ae60'
                        }}>
                          {item.quantity_on_hand}
                        </td>
                        {showCost && (
                          <td style={{ padding: '12px 10px', textAlign: 'right', color: '#666' }}>
                            ${item.cost.toFixed(2)}
                          </td>
                        )}
                        <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '600' }}>
                          ${item.retail.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Empty State */}
              {sortedInventory.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                  <p>No tires match your search criteria</p>
                </div>
              )}

              {/* Low Stock Legend */}
              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  backgroundColor: '#fff3cd', 
                  border: '1px solid #ddd',
                  borderRadius: '3px'
                }}></div>
                <span style={{ fontSize: '12px', color: '#666' }}>Low stock (2 or fewer units)</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ backgroundColor: '#2c3e50', color: '#95a5a6', padding: '30px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '12px' }}>
            <a href="#/about" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>About Us</a>
            <a href="#/contact" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>Contact</a>
            <a href="#/privacy-policy" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>Privacy Policy</a>
            <a href="#/terms" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>Terms & Conditions</a>
            <a href="#/sms-consent" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>SMS Terms</a>
            <a href="#/do-not-sell" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px' }}>Do Not Sell My Info</a>
          </div>
          <p style={{ fontSize: '13px', marginBottom: '8px' }}>
            © 2026 P.C.J.L., Inc. Tire data provided by MOTOR & USAutoForce.
          </p>
          <p style={{ fontSize: '11px', color: '#7f8c8d' }}>
            tires.myjiffylube.ai
          </p>
        </div>
      </footer>
    </div>
  );
}
