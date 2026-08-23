import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import CustomerVehicleLookup, { hasCustomerIdentity } from './CustomerVehicleLookup';

import { API_BASE } from './config';
const API_KEY = 'TIRES2026';

// Store list with warehouse assignments and city names
const STORES = [
  { id: 609, name: 'Santa Maria', warehouse: 'fresno' },
  { id: 1002, name: 'San Luis Obispo', warehouse: 'fresno' },
  { id: 1257, name: 'Goleta', warehouse: 'santa_clarita' },
  { id: 1270, name: 'Arroyo Grande', warehouse: 'fresno' },
  { id: 1396, name: 'Santa Barbara (Downtown)', warehouse: 'santa_clarita' },
  { id: 1932, name: 'Atascadero', warehouse: 'fresno' },
  { id: 2911, name: 'Paso Robles', warehouse: 'fresno' },
  { id: 4182, name: 'Santa Barbara (Upper State)', warehouse: 'santa_clarita' },
];

// Quantity options
const QTY_OPTIONS = [1, 2, 3, 4, 5, 6];

// Fallback static options if API fails
const FALLBACK_WIDTHS = ['155','165','175','185','195','205','215','225','235','245','255','265','275','285','295','305','315','325','335'];
const FALLBACK_ASPECTS = ['25','30','35','40','45','50','55','60','65','70','75','80','85'];
const FALLBACK_RIMS = ['13','14','15','16','17','18','19','20','21','22','24'];

// Styled Select Dropdown matching Nexen exactly
const SelectDropdown = ({ value, onChange, options, placeholder, disabled }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    style={{
      width: '100%',
      padding: '10px 15px',
      border: '2px solid #9b59b6',
      borderRadius: '25px',
      backgroundColor: disabled ? '#f5f5f5' : 'white',
      color: disabled ? '#999' : '#333',
      fontSize: '13px',
      fontWeight: '600',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      outline: 'none',
      appearance: 'none',
      backgroundImage: disabled ? 'none' : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239b59b6' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 15px center',
    }}
  >
    <option value="">{placeholder}</option>
    {options.map((opt) => (
      <option key={typeof opt === 'object' ? opt.value : opt} value={typeof opt === 'object' ? opt.value : opt}>
        {typeof opt === 'object' ? opt.label : opt}
      </option>
    ))}
  </select>
);

// Tire Specs Results Component - handles multiple OE tire sizes
const TireSpecsResults = ({ specs, vehicle, onSearchInventory, onSelectSize }) => {
  if (!specs || specs.length === 0) return null;

  // If multiple tire sizes, show selection
  if (specs.length > 1) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '30px',
        marginTop: '30px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      }}>
        <h3 style={{
          color: '#9b59b6',
          fontSize: '18px',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '10px',
          textTransform: 'uppercase',
          letterSpacing: '2px',
        }}>
          Multiple OE Tire Sizes for {vehicle}
        </h3>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '13px', marginBottom: '20px' }}>
          This vehicle has {specs.length} factory tire size options. Select one:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {specs.map((spec, idx) => (
            <div 
              key={idx}
              onClick={() => onSelectSize(spec)}
              style={{
                border: '2px solid #9b59b6',
                borderRadius: '10px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: 'white',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3e8ff'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#9b59b6' }}>
                    {spec.tire_size}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                    {spec.rim_size} rim • Load {spec.load_index} • Speed {spec.speed_index}
                    {spec.load_range && ` • ${spec.load_range}`}
                  </div>
                  {spec.custom_note && (
                    <div style={{ fontSize: '11px', color: '#e67e22', marginTop: '3px' }}>
                      Note: {spec.custom_note}
                    </div>
                  )}
                </div>
                <button
                  style={{
                    backgroundColor: '#27ae60',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  SELECT & SEARCH →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Single tire size - show details
  const spec = specs[0];
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '10px',
      padding: '30px',
      marginTop: '30px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    }}>
      <h3 style={{
        color: '#9b59b6',
        fontSize: '18px',
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: '20px',
        textTransform: 'uppercase',
        letterSpacing: '2px',
      }}>
        Tire Specifications for {vehicle}
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px',
      }}>
        <SpecBox label="Tire Size" value={spec.tire_size} highlight />
        <SpecBox label="Rim Size" value={spec.rim_size} />
        <SpecBox label="Bolt Pattern" value={spec.bolt_pattern} />
        <SpecBox label="Load Index" value={spec.load_index} />
        <SpecBox label="Speed Rating" value={spec.speed_index} />
        <SpecBox label="Hub Bore" value={spec.hubbore ? `${spec.hubbore}mm` : '-'} />
      </div>

      {spec.is_staggered && spec.tire_size_rear && (
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
          <p style={{ color: '#9b59b6', fontWeight: '600', textAlign: 'center', marginBottom: '15px' }}>
            ⚡ Staggered Fitment (Different Front/Rear)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <SpecBox label="Rear Tire Size" value={spec.tire_size_rear} highlight />
            <SpecBox label="Rear Rim Size" value={spec.rim_size_rear} />
          </div>
        </div>
      )}

      {/* Search Inventory Button */}
      <div style={{ textAlign: 'center', marginTop: '25px' }}>
        <button
          onClick={() => onSearchInventory(spec.tire_size, spec)}
          style={{
            backgroundColor: '#27ae60',
            color: 'white',
            border: 'none',
            padding: '14px 40px',
            borderRadius: '25px',
            fontSize: '13px',
            fontWeight: '700',
            letterSpacing: '2px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
          }}
        >
          🔍 SEARCH INVENTORY FOR {spec.tire_size}
        </button>
      </div>
    </div>
  );
};

const SpecBox = ({ label, value, highlight }) => (
  <div style={{
    backgroundColor: highlight ? '#f3e8ff' : '#f8f8f8',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>
      {label}
    </div>
    <div style={{ fontSize: highlight ? '18px' : '14px', fontWeight: '700', color: highlight ? '#9b59b6' : '#333' }}>
      {value || '-'}
    </div>
  </div>
);

// Inventory Results Component
// Friendly brand labels for the filter dropdown (falls back to the raw code)
const BRAND_LABELS = { NEX: 'Nexen', ADV: 'Advanta' };
const brandDisplay = (code) => BRAND_LABELS[code] || code || 'Other';

const InventoryResults = ({ results, storeId, loading, qtyNeeded, selections, onSelectionChange, onContinueToQuote }) => {
  // Client-side brand filter + sort over the already-returned results.
  // Hooks must run before any early return.
  const [brandFilter, setBrandFilter] = useState('');
  const [sortMode, setSortMode] = useState('default');

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#9b59b6' }}>
        <p style={{ fontSize: '14px' }}>🔍 Searching inventory...</p>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return null;
  }

  const store = STORES.find(s => s.id === parseInt(storeId));
  const primaryWarehouse = store?.warehouse || 'fresno';
  const hasChosen = !!selections.chosen;

  // ── Brand filter + sort (client-side, over the results already returned) ──
  // Brand options come from the full result set; Nexen/Advanta surface first to
  // match the group's preferred-brand strategy, then alphabetical.
  const brandOptions = [...new Set(results.map(t => t.brand_code).filter(Boolean))]
    .sort((a, b) => {
      const rank = (c) => (c === 'NEX' ? 0 : c === 'ADV' ? 1 : 2);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return brandDisplay(a).localeCompare(brandDisplay(b));
    });

  let displayResults = brandFilter
    ? results.filter(t => t.brand_code === brandFilter)
    : results;

  if (sortMode === 'price') {
    displayResults = [...displayResults].sort((a, b) => (a.cost || 0) - (b.cost || 0));
  } else if (sortMode === 'brand') {
    displayResults = [...displayResults].sort((a, b) => {
      const cmp = brandDisplay(a.brand_code).localeCompare(brandDisplay(b.brand_code));
      return cmp !== 0 ? cmp : (a.cost || 0) - (b.cost || 0);
    });
  }
  // sortMode === 'default' → keep backend order (Store stock → NEXEN → ADVANTA → Price)

  const sortLabel = sortMode === 'price'
    ? 'Price (low → high)'
    : sortMode === 'brand'
    ? 'Brand (A → Z)'
    : 'Store Stock → NEXEN → ADVANTA → Price';

  const selectStyle = {
    padding: '6px 10px', borderRadius: '8px', border: '1px solid #d1d5db',
    fontSize: '12px', color: '#333', backgroundColor: 'white', cursor: 'pointer',
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '10px',
      padding: '25px',
      marginTop: '25px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    }}>
      <h3 style={{
        color: '#9b59b6',
        fontSize: '16px',
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: '5px',
        textTransform: 'uppercase',
        letterSpacing: '2px',
      }}>
        Available Tires ({displayResults.length}{brandFilter ? ` of ${results.length}` : ''})
      </h3>
      <p style={{ textAlign: 'center', color: '#888', fontSize: '11px', marginBottom: '8px' }}>
        Primary: {primaryWarehouse === 'fresno' ? 'Fresno (4703)' : 'Santa Clarita (4708)'} • 
        Min Qty: {qtyNeeded} • Sorted: {sortLabel}
      </p>
      <p style={{ textAlign: 'center', color: '#9b59b6', fontSize: '11px', marginBottom: '20px', fontStyle: 'italic' }}>
        Select <strong>Best Value</strong> (required), plus optional <strong>Economy</strong> & <strong>Premium</strong> alternatives
      </p>

      {/* Brand filter + sort controls */}
      <div style={{
        display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center',
        justifyContent: 'center', marginBottom: '20px',
      }}>
        <label style={{ fontSize: '11px', color: '#666', fontWeight: '600' }}>
          Brand:{' '}
          <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} style={selectStyle}>
            <option value="">All brands</option>
            {brandOptions.map((code) => (
              <option key={code} value={code}>{brandDisplay(code)}</option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: '11px', color: '#666', fontWeight: '600' }}>
          Sort:{' '}
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} style={selectStyle}>
            <option value="default">Recommended</option>
            <option value="price">Price (low → high)</option>
            <option value="brand">Brand (A → Z)</option>
          </select>
        </label>
        {brandFilter && (
          <button
            onClick={() => setBrandFilter('')}
            style={{
              padding: '6px 12px', borderRadius: '8px', border: '1px solid #9b59b6',
              backgroundColor: 'white', color: '#9b59b6', fontSize: '11px', fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Clear ✕
          </button>
        )}
      </div>

      {/* Floating Continue Bar */}
      {hasChosen && (
        <div style={{
          position: 'sticky', top: '0', zIndex: 50,
          backgroundColor: '#8b1538', borderRadius: '10px',
          padding: '12px 20px', marginBottom: '15px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 4px 15px rgba(139, 21, 56, 0.3)',
          flexWrap: 'wrap', gap: '10px',
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
              ⭐ {selections.chosen.brand_code} {selections.chosen.sales_class || selections.chosen.name}
            </span>
            {selections.good && (
              <span style={{ color: '#bbf7d0', fontSize: '11px' }}>
                | Economy: {selections.good.brand_code} {selections.good.sales_class || selections.good.name}
              </span>
            )}
            {selections.best && (
              <span style={{ color: '#fecaca', fontSize: '11px' }}>
                | Premium: {selections.best.brand_code} {selections.best.sales_class || selections.best.name}
              </span>
            )}
          </div>
          <button
            onClick={onContinueToQuote}
            style={{
              backgroundColor: 'white', color: '#8b1538', border: 'none',
              padding: '10px 25px', borderRadius: '20px',
              fontSize: '12px', fontWeight: '700', letterSpacing: '1px',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            CONTINUE TO QUOTE →
          </button>
        </div>
      )}

      {displayResults.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#888', fontSize: '13px' }}>
          No {brandFilter ? `${brandDisplay(brandFilter)} ` : ''}tires match — try “All brands”.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {displayResults.map((tire, idx) => (
            <TireCard 
              key={tire.part_number + idx} 
              tire={tire} 
              primaryWarehouse={primaryWarehouse} 
              selections={selections}
              onSelectionChange={onSelectionChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Individual Tire Card
const TireCard = ({ tire, primaryWarehouse, selections, onSelectionChange }) => {
  const isPriority = tire.brand_code === 'NEX' || tire.brand_code === 'ADV';
  const primaryQty = primaryWarehouse === 'fresno' ? tire.qty_fresno : tire.qty_santa_clarita;
  const secondaryQty = primaryWarehouse === 'fresno' ? tire.qty_santa_clarita : tire.qty_fresno;
  const hasStoreStock = tire.store_qty > 0;
  
  // Consumer price: cost × 1.5, round up to whole dollar, minus $0.01
  const consumerPrice = tire.cost > 0 ? Math.ceil(parseFloat(tire.cost) * 1.5) - 0.01 : 0;

  // Check which role this tire is assigned
  const isGood = selections.good?.part_number === tire.part_number;
  const isChosen = selections.chosen?.part_number === tire.part_number;
  const isBest = selections.best?.part_number === tire.part_number;
  const isAnySelected = isGood || isChosen || isBest;

  // Handle role toggle
  const handleRoleToggle = (role) => {
    if (consumerPrice <= 0) return;
    const tireWithPrice = { ...tire, consumer_price: consumerPrice };
    
    // If this tire already has this role, uncheck it
    if ((role === 'good' && isGood) || (role === 'chosen' && isChosen) || (role === 'best' && isBest)) {
      onSelectionChange(role, null);
    } else {
      // Clear any other role this tire currently has
      if (isGood) onSelectionChange('good', null);
      if (isChosen) onSelectionChange('chosen', null);
      if (isBest) onSelectionChange('best', null);
      // Assign the new role
      onSelectionChange(role, tireWithPrice);
    }
  };

  // Highlight border if selected
  const selectedBorder = isChosen ? '3px solid #8b1538' : (isGood ? '3px solid #27ae60' : (isBest ? '3px solid #dc2626' : null));

  return (
    <div style={{
      border: selectedBorder || (hasStoreStock ? '2px solid #27ae60' : (isPriority ? '2px solid #9b59b6' : '1px solid #e0e0e0')),
      borderRadius: '10px',
      padding: '15px',
      backgroundColor: isChosen ? '#fdf2f4' : (isGood ? '#f0fdf4' : (isBest ? '#fef2f2' : (hasStoreStock ? '#f0fff4' : (isPriority ? '#faf5ff' : 'white')))),
      position: 'relative',
      transition: 'all 0.2s ease',
    }}>
      {/* Badges */}
      <div style={{ position: 'absolute', top: '-8px', left: '15px', display: 'flex', gap: '5px' }}>
        {hasStoreStock && (
          <span style={{
            backgroundColor: '#27ae60',
            color: 'white',
            padding: '2px 10px',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '1px',
          }}>
            🏪 IN STORE
          </span>
        )}
        {isPriority && (
          <span style={{
            backgroundColor: tire.brand_code === 'NEX' ? '#9b59b6' : '#e67e22',
            color: 'white',
            padding: '2px 10px',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '1px',
          }}>
            {tire.brand_code === 'NEX' ? '⭐ NEXEN' : '💰 ADVANTA'}
          </span>
        )}
        {tire.oe_rating_unverified && (
          <span style={{
            backgroundColor: '#d97706',
            color: 'white',
            padding: '2px 10px',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '1px',
          }}>
            ⚠️ VERIFY RATINGS
          </span>
        )}
        {/* Selection role badge */}
        {isChosen && (
          <span style={{ backgroundColor: '#8b1538', color: 'white', padding: '2px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', letterSpacing: '1px' }}>
            ⭐ BEST VALUE
          </span>
        )}
        {isGood && (
          <span style={{ backgroundColor: '#27ae60', color: 'white', padding: '2px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', letterSpacing: '1px' }}>
            ECONOMY
          </span>
        )}
        {isBest && (
          <span style={{ backgroundColor: '#dc2626', color: 'white', padding: '2px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', letterSpacing: '1px' }}>
            PREMIUM
          </span>
        )}
      </div>

      {/* Main Info Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginTop: hasStoreStock || isPriority || isAnySelected ? '5px' : '0' }}>
        {/* Left: Name & Details */}
        <div style={{ flex: '1', minWidth: '200px' }}>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: '700', color: '#333' }}>
            {tire.sales_class || tire.name}
          </h4>
          <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
            {tire.name}
          </p>
          <div style={{ display: 'flex', gap: '15px', marginTop: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: '#888' }}>
              <strong>Speed:</strong> {tire.speed_rating || '-'}
            </span>
            <span style={{ fontSize: '11px', color: '#888' }}>
              <strong>Load:</strong> {tire.load_rating || '-'}
            </span>
            <span style={{ fontSize: '11px', color: '#888' }}>
              <strong>Range:</strong> {tire.load_range || 'SL'}
            </span>
            {tire.warranty && (
              <span style={{ fontSize: '11px', color: '#888' }}>
                <strong>Warranty:</strong> {parseInt(tire.warranty).toLocaleString()} mi
              </span>
            )}
          </div>
          {/* Feature Badges */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            {tire.snowflake && <Badge label="❄️ 3PMSF" color="#3498db" />}
            {tire.run_flat && <Badge label="🛞 Run Flat" color="#e74c3c" />}
            {tire.ev_compatible && <Badge label="⚡ EV" color="#27ae60" />}
          </div>
        </div>

        {/* Right: Pricing & Inventory */}
        <div style={{ textAlign: 'right', minWidth: '150px' }}>
          {consumerPrice > 0 ? (
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#9b59b6' }}>
              ${consumerPrice.toFixed(2)}
            </div>
          ) : (
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#888' }}>
              Call for Price
            </div>
          )}
          {tire.fet > 0 && (
            <div style={{ fontSize: '10px', color: '#888' }}>
              + ${parseFloat(tire.fet).toFixed(2)} FET
            </div>
          )}

          {/* Inventory */}
          <div style={{ marginTop: '10px', fontSize: '11px' }}>
            {hasStoreStock && (
              <div style={{
                color: '#27ae60',
                fontWeight: '700',
                marginBottom: '4px',
              }}>
                Store: {tire.store_qty} 🏪
              </div>
            )}
            <div style={{
              color: primaryQty > 0 ? '#27ae60' : '#e74c3c',
              fontWeight: '600',
            }}>
              {primaryWarehouse === 'fresno' ? 'Fresno' : 'Santa Clarita'}: {parseInt(primaryQty) || 0}
              {primaryQty > 0 && ' ✓'}
            </div>
            <div style={{ color: '#888' }}>
              {primaryWarehouse === 'fresno' ? 'Santa Clarita' : 'Fresno'}: {parseInt(secondaryQty) || 0}
            </div>
            {Array.isArray(tire.neighbor_stock) && tire.neighbor_stock.length > 0 && (
              <div style={{ color: '#9b59b6', fontWeight: '600', marginTop: '4px' }}>
                Nearby: {tire.neighbor_stock.map(n => `${n.store_name} (${parseInt(n.qty) || 0})`).join(', ')} 🏪
              </div>
            )}
          </div>

          {/* Role Selection Checkboxes */}
          {consumerPrice > 0 && (
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleRoleToggle('good')}
                style={{
                  padding: '5px 10px', borderRadius: '15px', fontSize: '10px', fontWeight: '700',
                  letterSpacing: '0.5px', cursor: 'pointer', transition: 'all 0.2s ease',
                  border: isGood ? '2px solid #27ae60' : '2px solid #d1d5db',
                  backgroundColor: isGood ? '#dcfce7' : 'white',
                  color: isGood ? '#16a34a' : '#666',
                }}
              >
                {isGood ? '✓ ' : ''}Economy
              </button>
              <button
                onClick={() => handleRoleToggle('chosen')}
                style={{
                  padding: '5px 10px', borderRadius: '15px', fontSize: '10px', fontWeight: '700',
                  letterSpacing: '0.5px', cursor: 'pointer', transition: 'all 0.2s ease',
                  border: isChosen ? '2px solid #8b1538' : '2px solid #d1d5db',
                  backgroundColor: isChosen ? '#fde8ed' : 'white',
                  color: isChosen ? '#8b1538' : '#666',
                }}
              >
                {isChosen ? '⭐ ' : ''}Best Value
              </button>
              <button
                onClick={() => handleRoleToggle('best')}
                style={{
                  padding: '5px 10px', borderRadius: '15px', fontSize: '10px', fontWeight: '700',
                  letterSpacing: '0.5px', cursor: 'pointer', transition: 'all 0.2s ease',
                  border: isBest ? '2px solid #dc2626' : '2px solid #d1d5db',
                  backgroundColor: isBest ? '#fef2f2' : 'white',
                  color: isBest ? '#dc2626' : '#666',
                }}
              >
                {isBest ? '✓ ' : ''}Premium
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Part Number & Source */}
      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee', fontSize: '10px', color: '#aaa', display: 'flex', justifyContent: 'space-between' }}>
        <span>Part #: {tire.part_number}</span>
        <span>{tire.tire_type} | {tire.source === 'store_only' ? 'Store Only' : tire.source === 'both' ? 'Store + Distributor' : 'Distributor'}</span>
      </div>
    </div>
  );
};

const Badge = ({ label, color }) => (
  <span style={{
    backgroundColor: color,
    color: 'white',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '9px',
    fontWeight: '600',
  }}>
    {label}
  </span>
);

// Simplified tire card for staggered mode — single "Chosen" button only, no Good/Best
const StaggeredTireCard = ({ tire, primaryWarehouse, isSelected, consumerPrice, onSelect, axleLabel }) => {
  const isPriority = tire.brand_code === 'NEX' || tire.brand_code === 'ADV';
  const primaryQty = primaryWarehouse === 'fresno' ? tire.qty_fresno : tire.qty_santa_clarita;
  const secondaryQty = primaryWarehouse === 'fresno' ? tire.qty_santa_clarita : tire.qty_fresno;
  const hasStoreStock = tire.store_qty > 0;

  return (
    <div style={{
      border: isSelected ? '3px solid #8b1538' : (hasStoreStock ? '2px solid #27ae60' : (isPriority ? '2px solid #9b59b6' : '1px solid #e0e0e0')),
      borderRadius: '10px',
      padding: '15px',
      backgroundColor: isSelected ? '#fdf2f4' : (hasStoreStock ? '#f0fff4' : (isPriority ? '#faf5ff' : 'white')),
      position: 'relative',
      transition: 'all 0.2s ease',
    }}>
      {/* Badges */}
      <div style={{ position: 'absolute', top: '-8px', left: '15px', display: 'flex', gap: '5px' }}>
        {hasStoreStock && (
          <span style={{
            backgroundColor: '#27ae60', color: 'white', padding: '2px 10px',
            borderRadius: '10px', fontSize: '10px', fontWeight: '700', letterSpacing: '1px',
          }}>
            🏪 IN STORE
          </span>
        )}
        {isPriority && (
          <span style={{
            backgroundColor: tire.brand_code === 'NEX' ? '#9b59b6' : '#e67e22',
            color: 'white', padding: '2px 10px', borderRadius: '10px',
            fontSize: '10px', fontWeight: '700', letterSpacing: '1px',
          }}>
            {tire.brand_code === 'NEX' ? '⭐ NEXEN' : '💰 ADVANTA'}
          </span>
        )}
        {tire.oe_rating_unverified && (
          <span style={{
            backgroundColor: '#d97706',
            color: 'white',
            padding: '2px 10px',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '1px',
          }}>
            ⚠️ VERIFY RATINGS
          </span>
        )}
        {isSelected && (
          <span style={{ backgroundColor: '#8b1538', color: 'white', padding: '2px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', letterSpacing: '1px' }}>
            ⭐ {axleLabel} BEST VALUE
          </span>
        )}
      </div>

      {/* Main Info Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginTop: (hasStoreStock || isPriority || isSelected) ? '5px' : '0' }}>
        {/* Left: Name & Details */}
        <div style={{ flex: '1', minWidth: '200px' }}>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: '700', color: '#333' }}>
            {tire.sales_class || tire.name}
          </h4>
          <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
            {tire.name}
          </p>
          <div style={{ display: 'flex', gap: '15px', marginTop: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: '#888' }}>
              <strong>Speed:</strong> {tire.speed_rating || '-'}
            </span>
            <span style={{ fontSize: '11px', color: '#888' }}>
              <strong>Load:</strong> {tire.load_rating || '-'}
            </span>
            <span style={{ fontSize: '11px', color: '#888' }}>
              <strong>Range:</strong> {tire.load_range || 'SL'}
            </span>
            {tire.warranty && (
              <span style={{ fontSize: '11px', color: '#888' }}>
                <strong>Warranty:</strong> {parseInt(tire.warranty).toLocaleString()} mi
              </span>
            )}
          </div>
          {/* Feature Badges */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            {tire.snowflake && <Badge label="❄️ 3PMSF" color="#3498db" />}
            {tire.run_flat && <Badge label="🛞 Run Flat" color="#e74c3c" />}
            {tire.ev_compatible && <Badge label="⚡ EV" color="#27ae60" />}
          </div>
        </div>

        {/* Right: Pricing & Inventory */}
        <div style={{ textAlign: 'right', minWidth: '150px' }}>
          {consumerPrice > 0 ? (
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#9b59b6' }}>
              ${consumerPrice.toFixed(2)}
            </div>
          ) : (
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#888' }}>
              Call for Price
            </div>
          )}
          {tire.fet > 0 && (
            <div style={{ fontSize: '10px', color: '#888' }}>
              + ${parseFloat(tire.fet).toFixed(2)} FET
            </div>
          )}

          {/* Inventory */}
          <div style={{ marginTop: '10px', fontSize: '11px' }}>
            {hasStoreStock && (
              <div style={{ color: '#27ae60', fontWeight: '700', marginBottom: '4px' }}>
                Store: {tire.store_qty} 🏪
              </div>
            )}
            <div style={{ color: primaryQty > 0 ? '#27ae60' : '#e74c3c', fontWeight: '600' }}>
              {primaryWarehouse === 'fresno' ? 'Fresno' : 'Santa Clarita'}: {parseInt(primaryQty) || 0}
              {primaryQty > 0 && ' ✓'}
            </div>
            <div style={{ color: '#888' }}>
              {primaryWarehouse === 'fresno' ? 'Santa Clarita' : 'Fresno'}: {parseInt(secondaryQty) || 0}
            </div>
            {Array.isArray(tire.neighbor_stock) && tire.neighbor_stock.length > 0 && (
              <div style={{ color: '#9b59b6', fontWeight: '600', marginTop: '4px' }}>
                Nearby: {tire.neighbor_stock.map(n => `${n.store_name} (${parseInt(n.qty) || 0})`).join(', ')} 🏪
              </div>
            )}
          </div>

          {/* Single Chosen Button */}
          {consumerPrice > 0 && (
            <div style={{ marginTop: '10px' }}>
              <button
                onClick={onSelect}
                style={{
                  padding: '6px 16px', borderRadius: '15px', fontSize: '11px', fontWeight: '700',
                  letterSpacing: '0.5px', cursor: 'pointer', transition: 'all 0.2s ease',
                  border: isSelected ? '2px solid #8b1538' : '2px solid #d1d5db',
                  backgroundColor: isSelected ? '#fde8ed' : 'white',
                  color: isSelected ? '#8b1538' : '#666',
                }}
              >
                {isSelected ? '⭐ Best Value' : 'Select'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Part Number & Source */}
      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee', fontSize: '10px', color: '#aaa', display: 'flex', justifyContent: 'space-between' }}>
        <span>Part #: {tire.part_number}</span>
        <span>{tire.tire_type} | {tire.source === 'store_only' ? 'Store Only' : tire.source === 'both' ? 'Store + Distributor' : 'Distributor'}</span>
      </div>
    </div>
  );
};

export default function TireFinder() {
  // Store & Qty selection - re-quote store takes priority, then localStorage
  const [selectedStore, setSelectedStore] = useState(() => {
    if (typeof window !== 'undefined') {
      // Check for re-quote store override first (only if pending flag set)
      try {
        const pending = sessionStorage.getItem('jl_requote_pending');
        if (pending) {
          const rqData = sessionStorage.getItem('jl_requote_data');
          if (rqData) {
            const parsed = JSON.parse(rqData);
            if (parsed.store_id) return parsed.store_id.toString();
          }
        }
      } catch (e) { /* fall through */ }
      // Greet handoff: default store to the greet's store (changeable, not locked)
      try {
        const gh = sessionStorage.getItem('jl_greet_handoff');
        if (gh) {
          const parsed = JSON.parse(gh);
          if (parsed.store_id) return parsed.store_id.toString();
        }
      } catch (e) { /* fall through */ }
      return localStorage.getItem('jl_tire_store') || '609';
    }
    return '609';
  });
  const [qtyNeeded, setQtyNeeded] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const pending = sessionStorage.getItem('jl_requote_pending');
        if (pending) {
          const rqData = sessionStorage.getItem('jl_requote_data');
          if (rqData) {
            const parsed = JSON.parse(rqData);
            if (parsed.quantity) return parsed.quantity;
          }
        }
      } catch (e) { /* fall through */ }
    }
    return 4;
  });

  // Save store to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jl_tire_store', selectedStore);
    }
  }, [selectedStore]);

  // Vehicle lookup state
  const [years, setYears] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [submodels, setSubmodels] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedSubmodel, setSelectedSubmodel] = useState('');

  // Tire size lookup state - dynamic from inventory
  const [tireTypeOptions, setTireTypeOptions] = useState([]);
  const [widthOptions, setWidthOptions] = useState(FALLBACK_WIDTHS);
  const [aspectOptions, setAspectOptions] = useState(FALLBACK_ASPECTS);
  const [rimOptions, setRimOptions] = useState(FALLBACK_RIMS);
  const [selectedTireType, setSelectedTireType] = useState('');
  const [selectedWidth, setSelectedWidth] = useState('');
  const [selectedAspect, setSelectedAspect] = useState('');
  const [selectedRim, setSelectedRim] = useState('');

  // ===== STAGGERED FITMENT STATE =====
  const [isStaggeredMode, setIsStaggeredMode] = useState(false);
  
  // Rear axle tire size dropdowns (mirror front axle state)
  const [rearTireType, setRearTireType] = useState('');
  const [rearWidth, setRearWidth] = useState('');
  const [rearAspect, setRearAspect] = useState('');
  const [rearRim, setRearRim] = useState('');
  
  // Rear axle dropdown options (fetched independently)
  const [rearWidthOptions, setRearWidthOptions] = useState(FALLBACK_WIDTHS);
  const [rearAspectOptions, setRearAspectOptions] = useState(FALLBACK_ASPECTS);
  const [rearRimOptions, setRearRimOptions] = useState(FALLBACK_RIMS);

  // Staggered inventory results & selection
  const [rearInventoryResults, setRearInventoryResults] = useState(null);
  const [rearInventoryLoading, setRearInventoryLoading] = useState(false);
  const [frontSelection, setFrontSelection] = useState(null);
  const [rearSelection, setRearSelection] = useState(null);
  const [frontExpanded, setFrontExpanded] = useState(true);

  // Part number search
  const [partNumber, setPartNumber] = useState('');

  // Customer Vehicle Lookup result (plate or VIN). The CustomerVehicleLookup
  // component owns the input/loading/error state internally; it surfaces the
  // result here via onLookupSuccess so the page can use it for handleContinueToQuote
  // (sessionStorage writes) and the TireSpecsResults vehicle label.
  const [plateLookupResult, setPlateLookupResult] = useState(null);

  // Results
  const [tireSpecs, setTireSpecs] = useState(null); // Now an array of specs
  const [inventoryResults, setInventoryResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [error, setError] = useState(null);

  // Tire selection state: Good / Chosen / Best
  const [selections, setSelections] = useState({ good: null, chosen: null, best: null });

  // Re-Quote mode: data carried forward from a previous quote
  const [reQuoteData, setReQuoteData] = useState(null);
  // Greet handoff (greet → tire quote). Holds the seed plate/state for the
  // lookup component and the greet's customer object so it carries through to
  // QuoteBuilder even when the plate decode returns no customer (new kiosk
  // customer not yet in Turbo). greet_short_code rides along for the quote
  // link. Read SYNCHRONOUSLY here (not in a useEffect) so the value is present
  // on the first render — CustomerVehicleLookup seeds its plate field from
  // initialPlate in a one-time useState initializer, so a value that only
  // arrives after mount would be missed.
  const [greetHandoff] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const gh = sessionStorage.getItem('jl_greet_handoff');
      if (gh) return JSON.parse(gh);
    } catch (e) {
      console.error('Failed to parse greet handoff:', e);
    }
    return null;
  });

  const handleSelectionChange = (role, tire) => {
    setSelections(prev => ({ ...prev, [role]: tire }));
  };

  // Reset selections when inventory results change
  useEffect(() => {
    if (!inventoryResults) {
      setSelections({ good: null, chosen: null, best: null });
    }
  }, [inventoryResults]);

  // Handle selecting a specific tire size from multiple options
  const handleSelectTireSize = (spec) => {
    // Set to single-item array so it shows the detail view
    setTireSpecs([spec]);
    // Automatically search inventory for this size, passing OE spec for safety filtering
    searchInventory(spec.tire_size, spec);
  };

  // Check for re-quote data on mount
  useEffect(() => {
    const pending = sessionStorage.getItem('jl_requote_pending');
    const saved = sessionStorage.getItem('jl_requote_data');
    
    if (saved && pending) {
      // Real re-quote navigation — consume the flag
      sessionStorage.removeItem('jl_requote_pending');
      try {
        const data = JSON.parse(saved);
        setReQuoteData(data);
        // Lock store to match original quote
        if (data.store_id) {
          setSelectedStore(data.store_id.toString());
        }
        // Pre-set quantity
        if (data.quantity) {
          setQtyNeeded(data.quantity);
        }
        // Parse tire size from vehicle OE specs or original quote tire size
        const tireSize = data.vehicle?.oe_tire_size || data.tire_size || null;
        if (tireSize) {
          // Parse formats like "285/45R21", "LT275/65R20", "P225/60R18"
          const sizeMatch = tireSize.match(/(\d{3})\/?(\d{2,3})R(\d{2})/i);
          if (sizeMatch) {
            setSelectedWidth(sizeMatch[1]);
            setSelectedAspect(sizeMatch[2]);
            setSelectedRim(sizeMatch[3]);
            // Auto-search after a brief delay to let state settle
            setTimeout(() => {
              const parsedSize = `${sizeMatch[1]}/${sizeMatch[2]}R${sizeMatch[3]}`;
              searchInventory(parsedSize);
            }, 300);
          }
        }
      } catch (e) {
        console.error('Failed to parse re-quote data:', e);
        sessionStorage.removeItem('jl_requote_data');
      }
    } else if (saved && !pending) {
      // Stale re-quote data from a previous session — clear it
      sessionStorage.removeItem('jl_requote_data');
    }
  }, []);

  const cancelReQuote = () => {
    sessionStorage.removeItem('jl_requote_data');
    sessionStorage.removeItem('jl_requote_pending');
    setReQuoteData(null);
  };

  // Consume the handoff key once mounted so it can't re-fire if the CSA
  // navigates back to TireFinder later (greetHandoff state already holds it).
  useEffect(() => {
    if (greetHandoff) {
      try { sessionStorage.removeItem('jl_greet_handoff'); } catch (e) { /* ignore */ }
    }
  }, []);

  // ── Customer Vehicle Lookup callbacks ─────────────────────────────────────
  // The CustomerVehicleLookup component handles all input, network, and error
  // state internally. These callbacks let it surface its result so the rest of
  // the page (handleContinueToQuote, TireSpecsResults vehicle label) can use it.

  // Called after a successful plate or VIN lookup. The component has already
  // fetched tire specs for the resolved Y/M/M; we just store both for reuse.
  const handleLookupSuccess = (result, specs) => {
    setPlateLookupResult(result);
    setTireSpecs(specs);
    setInventoryResults(null);
    // Clear YMM selections — user is now in lookup mode
    setSelectedYear('');
    setSelectedMake('');
    setSelectedModel('');
    setSelectedSubmodel('');
  };

  // Called when exactly one tire spec was found for the resolved Y/M/M.
  // Auto-search inventory just like the old inline handler did.
  const handleLookupSingleSpec = (spec) => {
    searchInventory(spec.tire_size, spec);
  };

  // Called when the user clicks CLEAR inside the lookup card.
  const handleLookupClear = () => {
    setPlateLookupResult(null);
    setTireSpecs(null);
    setInventoryResults(null);
  };


  // Resolve which customer object to carry into QuoteBuilder. The greet's
  // customer wins over the plate-lookup result so a new kiosk customer (one
  // not yet in Turbo, where the plate decode returns vehicle-only) keeps the
  // name/phone/email they typed at the kiosk. We still fold in plate/state
  // from whichever source has them so QuoteBuilder's plate field populates.
  const resolveQuoteCustomer = () => {
    // A plate/VIN that only DECODED (PartsTech/NHTSA, or any public lookup)
    // still carries a customer object, but it holds no identity — handing it
    // off makes QuoteBuilder announce "Customer found!" over blank fields.
    const lookup = hasCustomerIdentity(plateLookupResult?.customer)
      ? plateLookupResult.customer
      : null;
    const greet = greetHandoff?.customer || null;
    if (!greet && !lookup) return null;
    if (!greet) return lookup;
    // Greet-first merge: prefer greet identity fields, backfill from lookup.
    return {
      first_name:    greet.first_name    || lookup?.first_name    || '',
      last_name:     greet.last_name     || lookup?.last_name     || '',
      full_name:     greet.full_name     || lookup?.full_name     || '',
      phone:         greet.phone         || lookup?.phone         || '',
      phone_raw:     greet.phone_raw     || lookup?.phone_raw     || '',
      email:         greet.email         || lookup?.email         || '',
      license_plate: greet.license_plate || lookup?.license_plate || greetHandoff?.plate || '',
      license_state: greet.license_state || lookup?.license_state || greetHandoff?.state || 'CA',
      vin:           greet.vin           || lookup?.vin           || null,
      data_source:   greet.data_source   || lookup?.data_source   || 'greet',
    };
  };

  // Handle continue to quote - save chosen tire + alternatives to sessionStorage
  const handleContinueToQuote = () => {
    // ===== STAGGERED MODE =====
    if (isStaggeredMode) {
      if (!frontSelection || !rearSelection) return;
      
      // Save front tire as primary
      sessionStorage.setItem('jl_quote_tire', JSON.stringify(frontSelection));
      // Save rear tire
      sessionStorage.setItem('jl_quote_tire_rear', JSON.stringify(rearSelection));
      // Save staggered flag
      sessionStorage.setItem('jl_quote_staggered', 'true');
      // Save qty
      sessionStorage.setItem('jl_quote_qty', qtyNeeded.toString());
      
      // No alt tires for staggered
      sessionStorage.removeItem('jl_quote_alt_good');
      sessionStorage.removeItem('jl_quote_alt_best');
      
      // Vehicle data (same logic as standard)
      if (selectedYear && selectedMake && selectedModel) {
        const selectedSpec = tireSpecs && tireSpecs.length > 0 ? tireSpecs[0] : null;
        const vehicleData = {
          year: parseInt(selectedYear),
          make: selectedMake,
          model: selectedModel,
          submodel: (selectedSubmodel && selectedSubmodel !== 'UNKNOWN') ? selectedSubmodel : null,
          display: `${selectedYear} ${selectedMake} ${selectedModel}${(selectedSubmodel && selectedSubmodel !== 'UNKNOWN') ? ' ' + selectedSubmodel : ''}`,
          oe_tire_size: selectedSpec?.tire_size || null,
          oe_load_rating: selectedSpec?.load_index || null,
          oe_speed_rating: selectedSpec?.speed_index || null,
        };
        sessionStorage.setItem('jl_quote_vehicle', JSON.stringify(vehicleData));
      } else if (plateLookupResult?.vehicle) {
        const selectedSpec = tireSpecs && tireSpecs.length > 0 ? tireSpecs[0] : null;
        const v = plateLookupResult.vehicle;
        const vehicleData = {
          year: v.year,
          make: v.motor_make || v.make,
          model: v.motor_model || v.model,
          submodel: null,
          display: v.display,
          oe_tire_size: selectedSpec?.tire_size || null,
          oe_load_rating: selectedSpec?.load_index || null,
          oe_speed_rating: selectedSpec?.speed_index || null,
        };
        sessionStorage.setItem('jl_quote_vehicle', JSON.stringify(vehicleData));
      } else {
        sessionStorage.removeItem('jl_quote_vehicle');
      }
      
      const quoteCustomer = resolveQuoteCustomer();
      if (quoteCustomer) {
        sessionStorage.setItem('jl_quote_customer', JSON.stringify(quoteCustomer));
      } else {
        sessionStorage.removeItem('jl_quote_customer');
      }
      // Greet link → QuoteBuilder stamps it onto the generated quote (Phase 2)
      if (greetHandoff?.greet_short_code) {
        sessionStorage.setItem('jl_quote_greet_link', JSON.stringify({
          short_code: greetHandoff.greet_short_code,
          store_id: greetHandoff.store_id ?? null,
        }));
      } else {
        sessionStorage.removeItem('jl_quote_greet_link');
      }
      
      window.location.hash = '#/quote/build';
      return;
    }
    
    // ===== STANDARD MODE =====
    if (!selections.chosen) return;

    // Save chosen tire as the primary (same key as before for backward compatibility)
    sessionStorage.setItem('jl_quote_tire', JSON.stringify(selections.chosen));
    sessionStorage.setItem('jl_quote_qty', qtyNeeded.toString());

    // Clean up staggered keys (in case they were set previously)
    sessionStorage.removeItem('jl_quote_tire_rear');
    sessionStorage.removeItem('jl_quote_staggered');

    // Save alt tires if selected
    if (selections.good) {
      sessionStorage.setItem('jl_quote_alt_good', JSON.stringify(selections.good));
    } else {
      sessionStorage.removeItem('jl_quote_alt_good');
    }
    if (selections.best) {
      sessionStorage.setItem('jl_quote_alt_best', JSON.stringify(selections.best));
    } else {
      sessionStorage.removeItem('jl_quote_alt_best');
    }
    
    // Save vehicle data if available from YMM search
    if (selectedYear && selectedMake && selectedModel) {
      const selectedSpec = tireSpecs && tireSpecs.length > 0 ? tireSpecs[0] : null;
      
      const vehicleData = {
        year: parseInt(selectedYear),
        make: selectedMake,
        model: selectedModel,
        submodel: (selectedSubmodel && selectedSubmodel !== 'UNKNOWN') ? selectedSubmodel : null,
        display: `${selectedYear} ${selectedMake} ${selectedModel}${(selectedSubmodel && selectedSubmodel !== 'UNKNOWN') ? ' ' + selectedSubmodel : ''}`,
        oe_tire_size: selectedSpec?.tire_size || null,
        oe_load_rating: selectedSpec?.load_index || null,
        oe_speed_rating: selectedSpec?.speed_index || null,
      };
      sessionStorage.setItem('jl_quote_vehicle', JSON.stringify(vehicleData));
    } else if (plateLookupResult?.vehicle) {
      // Save vehicle from plate lookup — use MOTOR names if available for consistency
      const selectedSpec = tireSpecs && tireSpecs.length > 0 ? tireSpecs[0] : null;
      const v = plateLookupResult.vehicle;
      const vehicleData = {
        year: v.year,
        make: v.motor_make || v.make,
        model: v.motor_model || v.model,
        submodel: null,
        display: v.display,
        oe_tire_size: selectedSpec?.tire_size || null,
        oe_load_rating: selectedSpec?.load_index || null,
        oe_speed_rating: selectedSpec?.speed_index || null,
      };
      sessionStorage.setItem('jl_quote_vehicle', JSON.stringify(vehicleData));
    } else if (reQuoteData?.vehicle) {
      // Carry forward vehicle from original quote if no new YMM search
      sessionStorage.setItem('jl_quote_vehicle', JSON.stringify(reQuoteData.vehicle));
    } else {
      sessionStorage.removeItem('jl_quote_vehicle');
    }
    
    // jl_requote_data stays in sessionStorage — QuoteBuilder will read it for customer/treads/linkage
    
    // Save customer data (greet handoff wins over plate lookup so new kiosk
    // customers keep their name; QuoteBuilder will pick this up)
    const quoteCustomer = resolveQuoteCustomer();
    if (quoteCustomer) {
      sessionStorage.setItem('jl_quote_customer', JSON.stringify(quoteCustomer));
    } else {
      sessionStorage.removeItem('jl_quote_customer');
    }
    // Greet link → QuoteBuilder stamps it onto the generated quote (Phase 2)
    if (greetHandoff?.greet_short_code) {
      sessionStorage.setItem('jl_quote_greet_link', JSON.stringify({
        short_code: greetHandoff.greet_short_code,
        store_id: greetHandoff.store_id ?? null,
      }));
    } else {
      sessionStorage.removeItem('jl_quote_greet_link');
    }
    
    // Navigate to quote builder
    window.location.hash = '#/quote/build';
  };

  // Fetch years on mount
  useEffect(() => {
    fetch(`${API_BASE}/vehicle-years?key=${API_KEY}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setYears(data.data);
        else setError('Failed to load years');
      })
      .catch(() => setError('Failed to connect to server'));
  }, []);

  // Fetch tire size options from inventory (with fallback)
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedTireType) params.append('tire_type', selectedTireType);
        if (selectedWidth) params.append('width', selectedWidth);
        if (selectedAspect) params.append('aspect', selectedAspect);
        
        const response = await fetch(`${API_BASE}/tire-inventory-options?${params}`);
        const data = await response.json();
        
        if (data.success) {
          if (!selectedTireType && !selectedWidth && !selectedAspect) {
            setTireTypeOptions(data.options.tire_types || []);
          }
          if (data.options.widths?.length > 0) setWidthOptions(data.options.widths.map(String));
          if (data.options.aspects?.length > 0) setAspectOptions(data.options.aspects.map(String));
          if (data.options.rims?.length > 0) setRimOptions(data.options.rims.map(String));
        }
      } catch (e) {
        console.error('Failed to fetch options, using fallbacks:', e);
        // Keep using fallback options
      }
    };
    
    fetchOptions();
  }, [selectedTireType, selectedWidth, selectedAspect]);

  // Fetch rear axle dropdown options (mirrors front axle logic)
  useEffect(() => {
    if (!isStaggeredMode) return;
    
    const fetchRearOptions = async () => {
      try {
        const params = new URLSearchParams();
        if (rearTireType) params.append('tire_type', rearTireType);
        if (rearWidth) params.append('width', rearWidth);
        if (rearAspect) params.append('aspect', rearAspect);
        
        const response = await fetch(`${API_BASE}/tire-inventory-options?${params}`);
        const data = await response.json();
        
        if (data.success) {
          if (data.options.widths?.length > 0) setRearWidthOptions(data.options.widths.map(String));
          if (data.options.aspects?.length > 0) setRearAspectOptions(data.options.aspects.map(String));
          if (data.options.rims?.length > 0) setRearRimOptions(data.options.rims.map(String));
        }
      } catch (e) {
        console.error('Failed to fetch rear options:', e);
      }
    };
    
    fetchRearOptions();
  }, [isStaggeredMode, rearTireType, rearWidth, rearAspect]);

  // Fetch makes when year changes
  useEffect(() => {
    if (!selectedYear) { setMakes([]); return; }
    fetch(`${API_BASE}/vehicle-makes?year=${selectedYear}&key=${API_KEY}`)
      .then(res => res.json())
      .then(data => { if (data.success) setMakes(data.data); })
      .catch(() => {});
  }, [selectedYear]);

  // Fetch models when make changes
  useEffect(() => {
    if (!selectedYear || !selectedMake) { setModels([]); return; }
    fetch(`${API_BASE}/vehicle-models?year=${selectedYear}&make=${encodeURIComponent(selectedMake)}&key=${API_KEY}`)
      .then(res => res.json())
      .then(data => { if (data.success) setModels(data.data); })
      .catch(() => {});
  }, [selectedYear, selectedMake]);

  // Fetch submodels when model changes
  useEffect(() => {
    if (!selectedYear || !selectedMake || !selectedModel) { setSubmodels([]); return; }
    fetch(`${API_BASE}/vehicle-submodels?year=${selectedYear}&make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(selectedModel)}&key=${API_KEY}`)
      .then(res => res.json())
      .then(data => { if (data.success) setSubmodels(data.data); })
      .catch(() => {});
  }, [selectedYear, selectedMake, selectedModel]);

  // Handlers
  const handleYearChange = (year) => {
    setSelectedYear(year);
    setSelectedMake('');
    setSelectedModel('');
    setSelectedSubmodel('');
    setTireSpecs(null);
    setInventoryResults(null);
  };

  const handleMakeChange = (make) => {
    setSelectedMake(make);
    setSelectedModel('');
    setSelectedSubmodel('');
    setTireSpecs(null);
    setInventoryResults(null);
  };

  const handleModelChange = (model) => {
    setSelectedModel(model);
    setSelectedSubmodel('');
    setTireSpecs(null);
    setInventoryResults(null);
  };

  const handleTireTypeChange = (type) => {
    setSelectedTireType(type);
    setSelectedWidth('');
    setSelectedAspect('');
    setSelectedRim('');
    setInventoryResults(null);
  };

  const handleWidthChange = (width) => {
    setSelectedWidth(width);
    setSelectedAspect('');
    setSelectedRim('');
    setInventoryResults(null);
  };

  const handleAspectChange = (aspect) => {
    setSelectedAspect(aspect);
    setSelectedRim('');
    setInventoryResults(null);
  };

  // ===== STAGGERED: Rear axle dropdown handlers =====
  const handleRearTireTypeChange = (type) => {
    setRearTireType(type);
    setRearWidth('');
    setRearAspect('');
    setRearRim('');
  };

  const handleRearWidthChange = (width) => {
    setRearWidth(width);
    setRearAspect('');
    setRearRim('');
  };

  const handleRearAspectChange = (aspect) => {
    setRearAspect(aspect);
    setRearRim('');
  };

  // Reset staggered state when toggling off
  const handleStaggeredToggle = () => {
    setIsStaggeredMode(prev => {
      if (prev) {
        // Turning OFF — clear rear state
        setRearTireType('');
        setRearWidth('');
        setRearAspect('');
        setRearRim('');
        setRearWidthOptions(FALLBACK_WIDTHS);
        setRearAspectOptions(FALLBACK_ASPECTS);
        setRearRimOptions(FALLBACK_RIMS);
        setRearInventoryResults(null);
        setRearInventoryLoading(false);
        setFrontSelection(null);
        setRearSelection(null);
        setFrontExpanded(true);
      }
      return !prev;
    });
  };

  // Search inventory by tire size.
  // Pass `spec` (from vehicle-tires response) when vehicle context is known —
  // this enables hard OE load index / speed rating filtering in the Edge Function.
  // Omit spec for size-only or part# searches where no vehicle context exists.
  const searchInventory = async (tireSize, spec = null) => {
    setInventoryLoading(true);
    setError(null);
    setInventoryResults(null);
    
    try {
      const compressedSize = tireSize.replace(/[^0-9]/g, '');

      // Build OE filter params when vehicle spec is known and load index is specified.
      // MOTOR uses "0" for load index when unspecified — skip filtering in that case.
      const loadIndex = spec?.load_index ? parseInt(spec.load_index, 10) : 0;
      const speedRating = spec?.speed_index || null;
      const hasOeContext = loadIndex > 0 && !!speedRating;
      
      const response = await fetch(`${API_BASE}/tire-inventory-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tire_size: compressedSize,
          store_id: parseInt(selectedStore),
          tire_type: selectedTireType || undefined,
          qty_needed: qtyNeeded,
          limit: 100,
          ...(hasOeContext && {
            min_load_index: loadIndex,
            min_speed_rating: speedRating,
          }),
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setInventoryResults(data.results);
        if (data.results.length === 0) {
          setError(`No tires found with ${qtyNeeded}+ in stock for size ${tireSize}`);
        }
      } else {
        setError(data.error || 'Failed to search inventory');
      }
    } catch (e) {
      setError('Failed to search inventory');
    }
    
    setInventoryLoading(false);
  };

  // Search rear inventory (staggered mode)
  const searchRearInventory = async (tireSize) => {
    setRearInventoryLoading(true);
    setRearInventoryResults(null);
    
    try {
      const compressedSize = tireSize.replace(/[^0-9]/g, '');
      
      const response = await fetch(`${API_BASE}/tire-inventory-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tire_size: compressedSize,
          store_id: parseInt(selectedStore),
          tire_type: rearTireType || undefined,
          qty_needed: qtyNeeded,
          limit: 100,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRearInventoryResults(data.results);
        if (data.results.length === 0) {
          setError(`No rear tires found with ${qtyNeeded}+ in stock for size ${tireSize}`);
        }
      } else {
        setError(data.error || 'Failed to search rear inventory');
      }
    } catch (e) {
      setError('Failed to search rear inventory');
    }
    
    setRearInventoryLoading(false);
  };

  // Staggered: handle front tire selection
  const handleFrontSelection = (tire) => {
    const consumerPrice = tire.cost > 0 ? Math.ceil(parseFloat(tire.cost) * 1.5) - 0.01 : 0;
    const tireWithPrice = { ...tire, consumer_price: consumerPrice };
    
    // If clicking the same tire, deselect it
    if (frontSelection?.part_number === tire.part_number) {
      setFrontSelection(null);
      setFrontExpanded(true);
      setRearInventoryResults(null);
      setRearSelection(null);
      return;
    }
    
    setFrontSelection(tireWithPrice);
    setFrontExpanded(false);
    
    // Auto-search rear inventory
    const rearSize = `${rearWidth}/${rearAspect}R${rearRim}`;
    searchRearInventory(rearSize);
  };

  // Staggered: handle rear tire selection
  const handleRearSelection = (tire) => {
    const consumerPrice = tire.cost > 0 ? Math.ceil(parseFloat(tire.cost) * 1.5) - 0.01 : 0;
    const tireWithPrice = { ...tire, consumer_price: consumerPrice };
    
    // If clicking the same tire, deselect it
    if (rearSelection?.part_number === tire.part_number) {
      setRearSelection(null);
      return;
    }
    
    setRearSelection(tireWithPrice);
  };

  // Staggered: expand front results to change selection
  const handleExpandFront = () => {
    setFrontExpanded(true);
    setRearInventoryResults(null);
    setRearSelection(null);
  };

  // Search by part number
  const searchByPartNumber = async () => {
    if (!partNumber.trim()) return;
    
    setInventoryLoading(true);
    setError(null);
    setInventoryResults(null);
    setTireSpecs(null);
    
    try {
      const response = await fetch(`${API_BASE}/tire-inventory-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          part_number: partNumber.trim(),
          store_id: parseInt(selectedStore),
          qty_needed: qtyNeeded,
          limit: 50,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setInventoryResults(data.results);
        if (data.results.length === 0) {
          setError('No tires found matching that part number');
        }
      } else {
        setError(data.error || 'Part number not found');
      }
    } catch (e) {
      setError('Failed to search by part number');
    }
    
    setInventoryLoading(false);
  };

  const handleSearch = async () => {
    // Clear previous results
    setError(null);
    
    // Determine what to search based on what's filled in
    if (selectedYear && selectedMake && selectedModel && selectedSubmodel) {
      // YMM Search
      setLoading(true);
      setTireSpecs(null);
      setInventoryResults(null);
      
      try {
        // UNKNOWN submodel: call vehicle-tires without submodel (Mode 2 — returns all
        // unique sizes across all trims for this Y/M/M). The CSA will see a size
        // selector if multiple options exist, or go straight to inventory if only one.
        const isUnknownSubmodel = selectedSubmodel === 'UNKNOWN';
        const url = isUnknownSubmodel
          ? `${API_BASE}/vehicle-tires?year=${selectedYear}&make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(selectedModel)}&key=${API_KEY}`
          : `${API_BASE}/vehicle-tires?year=${selectedYear}&make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(selectedModel)}&submodel=${encodeURIComponent(selectedSubmodel)}&key=${API_KEY}`;

        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          // Store ALL tire specs (could be multiple)
          setTireSpecs(data.data);
        } else {
          setError('No tire specs found for this vehicle');
        }
      } catch (e) {
        setError('Failed to load tire specs');
      }
      setLoading(false);
      
    } else if (selectedWidth && selectedAspect && selectedRim) {
      // Tire Size Search
      const tireSize = `${selectedWidth}/${selectedAspect}R${selectedRim}`;
      console.log('Searching for tire size:', tireSize);
      
      if (isStaggeredMode) {
        // Staggered: search front size only, reset staggered selections
        setFrontSelection(null);
        setRearSelection(null);
        setFrontExpanded(true);
        setRearInventoryResults(null);
      }
      
      await searchInventory(tireSize);
      
    } else if (partNumber.trim()) {
      // Part Number Search
      await searchByPartNumber();
    }
  };

  const canSearch = 
    (selectedYear && selectedMake && selectedModel && selectedSubmodel) ||
    (!isStaggeredMode && selectedWidth && selectedAspect && selectedRim) ||
    (isStaggeredMode && selectedWidth && selectedAspect && selectedRim && rearWidth && rearAspect && rearRim) ||
    partNumber.trim();

  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navbar
        currentPage="tirefinder"
        selectedStore={selectedStore}
        onStoreChange={setSelectedStore}
      />

      {/* Re-Quote Banner */}
      {reQuoteData && (
        <div style={{
          backgroundColor: '#eff6ff',
          borderBottom: '2px solid #3b82f6',
          padding: '12px 20px',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '1px',
              }}>
                RE-QUOTE
              </span>
              <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: '500' }}>
                <strong>{reQuoteData.from_quote_number}</strong> for <strong>{reQuoteData.customer?.full_name || 'Customer'}</strong>
                {reQuoteData.vehicle?.display ? ` · ${reQuoteData.vehicle.display}` : ''}
                {' — select new tires below'}
              </span>
            </div>
            <button
              onClick={cancelReQuote}
              style={{
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Hero Banner with road/sky background */}
      <div style={{
        background: 'linear-gradient(180deg, #a8d4e6 0%, #d4e4e8 40%, #e8ebe8 60%, #9ca3af 100%)',
        padding: '60px 20px',
        position: 'relative',
      }}>
      </div>

      {/* Tire Finder Section - overlapping the hero */}
      <div style={{ maxWidth: '1000px', margin: '-40px auto 40px', padding: '0 20px', position: 'relative', zIndex: 10 }}>
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
            LET'S GET YOU FITTED!
          </h1>
          <p style={{
            color: '#666',
            fontSize: '13px',
            textAlign: 'center',
            marginBottom: '35px',
            letterSpacing: '4px',
            fontWeight: '600',
          }}>
            TIRE FINDER
          </p>

          {/* Customer Vehicle Lookup — extracted to shared component.
              The component owns input state, error display, result display,
              and reads localStorage.jl_staff_auth to gate PII display. */}
          <CustomerVehicleLookup
            onLookupSuccess={handleLookupSuccess}
            onClear={handleLookupClear}
            onSingleSpecResolved={handleLookupSingleSpec}
            tireSpecsCount={tireSpecs ? tireSpecs.length : 0}
            storeId={selectedStore}
            initialPlate={greetHandoff?.plate || ''}
            initialState={greetHandoff?.state || 'CA'}
          />


          {/* Three Column Layout */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', flexWrap: 'wrap' }}>
            
            {/* BY VEHICLE Column */}
            <div style={{ flex: '1', minWidth: '180px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{
                  color: '#9b59b6',
                  fontSize: '11px',
                  fontWeight: '700',
                  letterSpacing: '1px',
                  whiteSpace: 'nowrap',
                }}>
                  BY VEHICLE
                </span>
                <div style={{
                  flex: 1,
                  height: '1px',
                  backgroundColor: '#9b59b6',
                  marginLeft: '8px',
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '-3px',
                    width: '7px',
                    height: '7px',
                    backgroundColor: '#9b59b6',
                    borderRadius: '50%',
                  }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SelectDropdown value={selectedYear} onChange={handleYearChange} options={years} placeholder="YEAR" />
                <SelectDropdown value={selectedMake} onChange={handleMakeChange} options={makes} placeholder="MAKE" disabled={!selectedYear} />
                <SelectDropdown value={selectedModel} onChange={handleModelChange} options={models} placeholder="MODEL" disabled={!selectedMake} />
                <SelectDropdown 
                  value={selectedSubmodel} 
                  onChange={setSelectedSubmodel} 
                  options={[
                    { value: 'UNKNOWN', label: 'UNKNOWN / NOT LISTED' },
                    ...submodels.map(s => ({ value: s.submodel, label: s.submodel }))
                  ]} 
                  placeholder="STYLE" 
                  disabled={!selectedModel} 
                />
              </div>
            </div>

            {/* Center - Car Image + QTY + Part Number */}
            <div style={{ 
              flex: '1.3', 
              minWidth: '220px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 0',
            }}>
              {/* OR divider */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                width: '100%',
                marginBottom: '15px',
              }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
                <span style={{ 
                  padding: '0 15px', 
                  color: '#999', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  letterSpacing: '2px',
                }}>
                  OR
                </span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
              </div>

              {/* Car Image - top-down view like Nexen */}
              <img 
                src="/images/Vehicle-image.png"
                alt="Vehicle"
                style={{ 
                  width: '100%', 
                  maxWidth: '280px',
                  opacity: 0.9,
                }}
              />

              {/* QTY and Part Number - side by side under the car */}
              <div style={{ 
                display: 'flex', 
                gap: '15px', 
                marginTop: '20px',
                width: '100%',
                maxWidth: '320px',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}>
                {/* QTY Selector */}
                <div style={{ flex: '1', minWidth: '100px' }}>
                  <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', letterSpacing: '1px', display: 'block', marginBottom: '4px', textAlign: 'center' }}>
                    QTY NEEDED
                  </label>
                  <select
                    value={qtyNeeded}
                    onChange={(e) => setQtyNeeded(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 15px',
                      border: '2px solid #9b59b6',
                      borderRadius: '25px',
                      backgroundColor: 'white',
                      color: '#333',
                      fontSize: '13px',
                      fontWeight: '600',
                      textAlign: 'center',
                      cursor: 'pointer',
                      outline: 'none',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239b59b6' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 15px center',
                    }}
                  >
                    {QTY_OPTIONS.map(qty => (
                      <option key={qty} value={qty}>{qty}</option>
                    ))}
                  </select>
                </div>

                {/* Part Number */}
                <div style={{ flex: '1.5', minWidth: '140px' }}>
                  <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', letterSpacing: '1px', display: 'block', marginBottom: '4px', textAlign: 'center' }}>
                    PART NUMBER
                  </label>
                  <input
                    type="text"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value.toUpperCase())}
                    placeholder="e.g., 15007NXK"
                    style={{
                      width: '100%',
                      padding: '10px 15px',
                      border: '2px solid #9b59b6',
                      borderRadius: '25px',
                      backgroundColor: 'white',
                      color: '#333',
                      fontSize: '12px',
                      textAlign: 'center',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && partNumber.trim() && searchByPartNumber()}
                  />
                </div>
              </div>

              {/* Custom Quote Button */}
              <div style={{ marginTop: '15px', width: '100%', maxWidth: '320px', textAlign: 'center' }}>
                <button
                  onClick={() => { window.location.hash = '#/quote/build?mode=custom'; }}
                  style={{
                    background: 'none',
                    border: '2px dashed #9b59b6',
                    borderRadius: '25px',
                    padding: '10px 20px',
                    color: '#9b59b6',
                    fontSize: '11px',
                    fontWeight: '700',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f3e8ff'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  ✏️ CUSTOM QUOTE
                </button>
                <p style={{ fontSize: '9px', color: '#999', marginTop: '5px', letterSpacing: '0.5px' }}>
                  Tire not in inventory? Enter details manually.
                </p>
              </div>

              {loading && (
                <p style={{ color: '#9b59b6', marginTop: '10px', fontSize: '13px' }}>Loading...</p>
              )}
            </div>

            {/* BY TIRE SIZE Column */}
            <div style={{ flex: '1', minWidth: '180px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{
                  flex: 1,
                  height: '1px',
                  backgroundColor: '#9b59b6',
                  marginRight: '8px',
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '-3px',
                    width: '7px',
                    height: '7px',
                    backgroundColor: '#9b59b6',
                    borderRadius: '50%',
                  }} />
                </div>
                <span style={{
                  color: '#9b59b6',
                  fontSize: '11px',
                  fontWeight: '700',
                  letterSpacing: '1px',
                  whiteSpace: 'nowrap',
                }}>
                  BY TIRE SIZE
                </span>
              </div>

              {/* Staggered Fitment Toggle */}
              <div 
                onClick={handleStaggeredToggle}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: isStaggeredMode ? '#f3e8ff' : 'transparent',
                  border: isStaggeredMode ? '1px solid #9b59b6' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '3px',
                  border: `2px solid ${isStaggeredMode ? '#9b59b6' : '#ccc'}`,
                  backgroundColor: isStaggeredMode ? '#9b59b6' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}>
                  {isStaggeredMode && (
                    <span style={{ color: 'white', fontSize: '11px', fontWeight: '700' }}>✓</span>
                  )}
                </div>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  color: isStaggeredMode ? '#9b59b6' : '#888',
                  letterSpacing: '0.5px',
                }}>
                  ⚡ STAGGERED (DIFFERENT FRONT/REAR)
                </span>
              </div>

              {/* Front axle label - only shown in staggered mode */}
              {isStaggeredMode && (
                <div style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  color: '#9b59b6',
                  letterSpacing: '1px',
                  marginBottom: '6px',
                  textAlign: 'center',
                }}>
                  ▲ FRONT AXLE
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SelectDropdown 
                  value={selectedTireType} 
                  onChange={handleTireTypeChange} 
                  options={tireTypeOptions.length > 0 ? tireTypeOptions.map(t => ({ value: t, label: t.replace('PASSENGER/CUV/SUV', 'PASSENGER') })) : [
                    { value: 'PASSENGER/CUV/SUV', label: 'PASSENGER' },
                    { value: 'LIGHT TRUCK', label: 'LIGHT TRUCK' },
                    { value: 'TRAILER', label: 'TRAILER' },
                  ]} 
                  placeholder="TIRE TYPE" 
                />
                <SelectDropdown 
                  value={selectedWidth} 
                  onChange={handleWidthChange} 
                  options={widthOptions} 
                  placeholder="WIDTH" 
                />
                <SelectDropdown 
                  value={selectedAspect} 
                  onChange={handleAspectChange} 
                  options={aspectOptions} 
                  placeholder="ASPECT RATIO" 
                  disabled={!selectedWidth}
                />
                <SelectDropdown 
                  value={selectedRim} 
                  onChange={setSelectedRim} 
                  options={rimOptions} 
                  placeholder="RIM SIZE" 
                  disabled={!selectedAspect}
                />
              </div>

              {/* Size Preview */}
              {selectedWidth && selectedAspect && selectedRim && (
                <p style={{ textAlign: 'center', marginTop: '10px', color: '#9b59b6', fontWeight: '700', fontSize: '14px' }}>
                  {selectedWidth}/{selectedAspect}R{selectedRim}
                </p>
              )}

              {/* ===== REAR AXLE DROPDOWNS (Staggered Mode Only) ===== */}
              {isStaggeredMode && (
                <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '2px dashed #9b59b6' }}>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: '#9b59b6',
                    letterSpacing: '1px',
                    marginBottom: '10px',
                    textAlign: 'center',
                  }}>
                    ▼ REAR AXLE
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <SelectDropdown 
                      value={rearTireType} 
                      onChange={handleRearTireTypeChange} 
                      options={tireTypeOptions.length > 0 ? tireTypeOptions.map(t => ({ value: t, label: t.replace('PASSENGER/CUV/SUV', 'PASSENGER') })) : [
                        { value: 'PASSENGER/CUV/SUV', label: 'PASSENGER' },
                        { value: 'LIGHT TRUCK', label: 'LIGHT TRUCK' },
                        { value: 'TRAILER', label: 'TRAILER' },
                      ]} 
                      placeholder="TIRE TYPE" 
                    />
                    <SelectDropdown 
                      value={rearWidth} 
                      onChange={handleRearWidthChange} 
                      options={rearWidthOptions} 
                      placeholder="WIDTH" 
                    />
                    <SelectDropdown 
                      value={rearAspect} 
                      onChange={handleRearAspectChange} 
                      options={rearAspectOptions} 
                      placeholder="ASPECT RATIO" 
                      disabled={!rearWidth}
                    />
                    <SelectDropdown 
                      value={rearRim} 
                      onChange={setRearRim} 
                      options={rearRimOptions} 
                      placeholder="RIM SIZE" 
                      disabled={!rearAspect}
                    />
                  </div>

                  {/* Rear Size Preview */}
                  {rearWidth && rearAspect && rearRim && (
                    <p style={{ textAlign: 'center', marginTop: '10px', color: '#9b59b6', fontWeight: '700', fontSize: '14px' }}>
                      {rearWidth}/{rearAspect}R{rearRim}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search Button */}
          <div style={{ textAlign: 'center', marginTop: '25px' }}>
            <button
              onClick={handleSearch}
              disabled={!canSearch}
              style={{
                backgroundColor: canSearch ? '#9b59b6' : '#ccc',
                color: 'white',
                border: 'none',
                padding: '14px 50px',
                borderRadius: '25px',
                fontSize: '13px',
                fontWeight: '700',
                letterSpacing: '3px',
                cursor: canSearch ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                boxShadow: canSearch ? '0 4px 15px rgba(155, 89, 182, 0.3)' : 'none',
              }}
            >
              SEARCH
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <p style={{ color: '#e74c3c', textAlign: 'center', marginTop: '15px', fontSize: '13px' }}>
              {error}
            </p>
          )}

          {/* YMM Results - Tire Specs */}
          {tireSpecs && (
            <TireSpecsResults 
              specs={tireSpecs} 
              vehicle={plateLookupResult ? plateLookupResult.vehicle.display : `${selectedYear} ${selectedMake} ${selectedModel} ${selectedSubmodel}`}
              onSearchInventory={searchInventory}
              onSelectSize={handleSelectTireSize}
            />
          )}

          {/* Inventory Results */}
          {!isStaggeredMode ? (
            // ===== STANDARD MODE: existing behavior =====
            <InventoryResults 
              results={inventoryResults} 
              storeId={selectedStore}
              loading={inventoryLoading}
              qtyNeeded={qtyNeeded}
              selections={selections}
              onSelectionChange={handleSelectionChange}
              onContinueToQuote={handleContinueToQuote}
            />
          ) : (
            // ===== STAGGERED MODE: sequential front → rear flow =====
            <>
              {/* Staggered Continue Bar - shows when both tires are selected */}
              {frontSelection && rearSelection && (
                <div style={{
                  position: 'sticky', top: '0', zIndex: 50,
                  backgroundColor: '#8b1538', borderRadius: '10px',
                  padding: '12px 20px', marginTop: '20px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  boxShadow: '0 4px 15px rgba(139, 21, 56, 0.3)',
                  flexWrap: 'wrap', gap: '10px',
                }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
                      ▲ Front: {frontSelection.brand_code} {frontSelection.sales_class || frontSelection.name} — ${frontSelection.consumer_price?.toFixed(2)}
                    </span>
                    <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: '600' }}>
                      ▼ Rear: {rearSelection.brand_code} {rearSelection.sales_class || rearSelection.name} — ${rearSelection.consumer_price?.toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={handleContinueToQuote}
                    style={{
                      backgroundColor: 'white', color: '#8b1538', border: 'none',
                      padding: '10px 25px', borderRadius: '20px',
                      fontSize: '12px', fontWeight: '700', letterSpacing: '1px',
                      cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    CONTINUE TO QUOTE →
                  </button>
                </div>
              )}

              {/* FRONT AXLE: Collapsed summary when tire is selected and not expanded */}
              {frontSelection && !frontExpanded && (
                <div 
                  onClick={handleExpandFront}
                  style={{
                    backgroundColor: '#f0fdf4',
                    border: '2px solid #22c55e',
                    borderRadius: '10px',
                    padding: '15px 20px',
                    marginTop: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#dcfce7'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f0fdf4'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#16a34a', letterSpacing: '1px', marginBottom: '4px' }}>
                        ✓ FRONT AXLE SELECTED
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#333' }}>
                        {frontSelection.brand_code} {frontSelection.sales_class || frontSelection.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                        {frontSelection.tire_size_formatted || `${selectedWidth}/${selectedAspect}R${selectedRim}`} • ${frontSelection.consumer_price?.toFixed(2)}/tire • Part# {frontSelection.part_number}
                      </div>
                    </div>
                    <span style={{
                      color: '#9b59b6',
                      fontSize: '11px',
                      fontWeight: '600',
                      border: '1px solid #9b59b6',
                      padding: '4px 12px',
                      borderRadius: '12px',
                    }}>
                      CHANGE
                    </span>
                  </div>
                </div>
              )}

              {/* FRONT AXLE: Full inventory results (shown when expanded or no selection yet) */}
              {inventoryResults && inventoryResults.length > 0 && (frontExpanded || !frontSelection) && (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '10px',
                  padding: '25px',
                  marginTop: '20px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}>
                  <h3 style={{
                    color: '#9b59b6',
                    fontSize: '16px',
                    fontWeight: '700',
                    textAlign: 'center',
                    marginBottom: '5px',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                  }}>
                    ▲ Front Axle — {selectedWidth}/{selectedAspect}R{selectedRim} ({inventoryResults.length})
                  </h3>
                  <p style={{ textAlign: 'center', color: '#9b59b6', fontSize: '11px', marginBottom: '20px', fontStyle: 'italic' }}>
                    Select a tire for the front axle
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {inventoryResults.map((tire, idx) => {
                      const store = STORES.find(s => s.id === parseInt(selectedStore));
                      const primaryWarehouse = store?.warehouse || 'fresno';
                      const isFrontSelected = frontSelection?.part_number === tire.part_number;
                      const consumerPrice = tire.cost > 0 ? Math.ceil(parseFloat(tire.cost) * 1.5) - 0.01 : 0;
                      
                      return (
                        <StaggeredTireCard
                          key={tire.part_number + idx}
                          tire={tire}
                          primaryWarehouse={primaryWarehouse}
                          isSelected={isFrontSelected}
                          consumerPrice={consumerPrice}
                          onSelect={() => handleFrontSelection(tire)}
                          axleLabel="FRONT"
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Front loading state */}
              {inventoryLoading && isStaggeredMode && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9b59b6' }}>
                  <p style={{ fontSize: '14px' }}>🔍 Searching front axle inventory...</p>
                </div>
              )}

              {/* REAR AXLE: Results (shown after front is selected) */}
              {rearInventoryLoading && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9b59b6' }}>
                  <p style={{ fontSize: '14px' }}>🔍 Searching rear axle inventory...</p>
                </div>
              )}

              {rearInventoryResults && rearInventoryResults.length > 0 && !frontExpanded && (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '10px',
                  padding: '25px',
                  marginTop: '20px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}>
                  <h3 style={{
                    color: '#9b59b6',
                    fontSize: '16px',
                    fontWeight: '700',
                    textAlign: 'center',
                    marginBottom: '5px',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                  }}>
                    ▼ Rear Axle — {rearWidth}/{rearAspect}R{rearRim} ({rearInventoryResults.length})
                  </h3>
                  <p style={{ textAlign: 'center', color: '#9b59b6', fontSize: '11px', marginBottom: '20px', fontStyle: 'italic' }}>
                    Select a tire for the rear axle
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {rearInventoryResults.map((tire, idx) => {
                      const store = STORES.find(s => s.id === parseInt(selectedStore));
                      const primaryWarehouse = store?.warehouse || 'fresno';
                      const isRearSelected = rearSelection?.part_number === tire.part_number;
                      const consumerPrice = tire.cost > 0 ? Math.ceil(parseFloat(tire.cost) * 1.5) - 0.01 : 0;
                      
                      return (
                        <StaggeredTireCard
                          key={tire.part_number + idx}
                          tire={tire}
                          primaryWarehouse={primaryWarehouse}
                          isSelected={isRearSelected}
                          consumerPrice={consumerPrice}
                          onSelect={() => handleRearSelection(tire)}
                          axleLabel="REAR"
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No rear results message */}
              {rearInventoryResults && rearInventoryResults.length === 0 && !rearInventoryLoading && (
                <div style={{
                  backgroundColor: '#fff7ed',
                  border: '1px solid #f97316',
                  borderRadius: '10px',
                  padding: '20px',
                  marginTop: '20px',
                  textAlign: 'center',
                }}>
                  <p style={{ color: '#c2410c', fontSize: '13px', fontWeight: '600' }}>
                    No rear tires found with {qtyNeeded}+ in stock for size {rearWidth}/{rearAspect}R{rearRim}
                  </p>
                </div>
              )}
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
