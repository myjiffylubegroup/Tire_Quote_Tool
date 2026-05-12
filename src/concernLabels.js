// =============================================================================
// concernLabels.js
// =============================================================================
// Enum → human-readable label maps for the Greets tab on Quote Lookup.
//
// Source of truth for label translation in the React UI. The kiosk
// (greets.myjiffylube.ai) defines these codes in its own concerns.ts;
// they're duplicated here so the staff tool doesn't need a runtime
// dependency on the kiosk repo.
//
// If the kiosk adds new concern chip IDs or oil tiers, mirror them here.
// =============================================================================

// -----------------------------------------------------------------------------
// Concern chip IDs (Screen 8 — what the customer flagged as a problem)
// -----------------------------------------------------------------------------
// Grouped by category for reference; flattened into a single id→label map
// because the staff display shows them as a single chip list.
// -----------------------------------------------------------------------------

export const CONCERN_LABELS = {
  // Sounds
  engine_knocking:      'Engine knocking',
  squealing_brakes:     'Squealing brakes',
  grinding_brakes:      'Grinding brakes',
  clicking_turning:     'Clicking when turning',
  rattling_underneath:  'Rattling underneath',
  whining_noise:        'Whining noise',

  // Warning lights
  check_engine_light:   'Check engine light',
  oil_light:            'Oil light',
  tpms_light:           'TPMS light',
  battery_light:        'Battery light',
  abs_light:            'ABS light',
  other_warning_light:  'Other warning light',

  // Steering / handling
  pulls_to_side:        'Pulls to one side',
  wheel_vibration:      'Wheel vibration',
  hard_to_steer:        'Hard to steer',
  wheel_off_center:     'Steering wheel off-center',

  // Performance
  hesitating:           'Hesitating',
  hard_to_start:        'Hard to start',
  stalls:               'Stalls',
  rough_idle:           'Rough idle',
  loss_of_power:        'Loss of power',

  // Smells / leaks
  burning_smell:        'Burning smell',
  coolant_smell:        'Coolant smell',
  gas_smell:            'Gas smell',
  oil_spot:             'Oil spot under car',
  exhaust_smoke:        'Exhaust smoke',

  // Fluids / quick items
  low_oil:              'Low oil',
  wipers_streaking:     'Wipers streaking',
  headlight_out:        'Headlight out',
  ac_not_cold:          'A/C not cold',
};

/**
 * Translate a concern chip ID into a human-readable label.
 * Falls back to a title-cased version of the raw ID if the code isn't known,
 * so a kiosk-side schema addition doesn't render as a blank chip on the
 * staff side before this file is updated.
 */
export const concernLabel = (id) => {
  if (!id) return '';
  if (CONCERN_LABELS[id]) return CONCERN_LABELS[id];
  // Fallback: snake_case → Title Case
  return String(id)
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

// -----------------------------------------------------------------------------
// Time pressure (Screen 4)
// -----------------------------------------------------------------------------

export const TIME_PRESSURE_LABELS = {
  hurry:   'In a hurry',
  normal:  'Has some time',
  no_rush: 'No rush',
};

export const timePressureLabel = (code) =>
  TIME_PRESSURE_LABELS[code] || code || '';

// -----------------------------------------------------------------------------
// Service classification (Screen 5)
// -----------------------------------------------------------------------------

export const SERVICE_CLASSIFICATION_LABELS = {
  express: 'Express service',
  full:    'Full inspection',
};

export const serviceClassificationLabel = (code) =>
  SERVICE_CLASSIFICATION_LABELS[code] || code || '';

// -----------------------------------------------------------------------------
// Promote-up reason (why express was bumped to full)
// -----------------------------------------------------------------------------
// Used to render the promote-up callout: "Customer mentioned X. We promised
// we'd take extra time today to look these over properly."
// -----------------------------------------------------------------------------

export const PROMOTED_REASON_LABELS = {
  concern_chip_selected:           'Customer flagged concerns from the list',
  concern_text_provided:           'Customer described concerns in their own words',
  customer_chose_full_on_screen_5: 'Customer chose full inspection',
};

export const promotedReasonLabel = (code) =>
  PROMOTED_REASON_LABELS[code] || code || '';

// -----------------------------------------------------------------------------
// Oil tier (Screen 6)
// -----------------------------------------------------------------------------

export const OIL_TIER_LABELS = {
  blend:     'Gold Synthetic Blend',
  synthetic: 'Platinum Synthetic',
  european:  'European Synthetic',
  diesel:    'Diesel Synthetic',
};

export const oilTierLabel = (code) =>
  OIL_TIER_LABELS[code] || code || '';

// -----------------------------------------------------------------------------
// TM package (Screen 6)
// -----------------------------------------------------------------------------
// NULL / missing = no add-on selected.
// -----------------------------------------------------------------------------

export const TM_PACKAGE_LABELS = {
  high_mileage: 'High Mileage Treatment',
  max_protect:  'Max Protect Package',
  vip:          'VIP Treatment',
};

export const tmPackageLabel = (code) => {
  if (!code) return 'No add-on';
  return TM_PACKAGE_LABELS[code] || code;
};

// Approximate add-on prices for inline display (the customer-facing amounts
// shown on the kiosk Screen 6). Kept here for staff display only — the
// authoritative price is in estimated_subtotal.
export const TM_PACKAGE_ADDON_PRICE = {
  high_mileage: 30,
  max_protect:  50,
  vip:          70,
};

// -----------------------------------------------------------------------------
// Tire rotation choice (Screen 7)
// -----------------------------------------------------------------------------

export const TIRE_ROTATION_LABELS = {
  yes:      'Yes, rotate them',
  no:       'No thanks',
  not_sure: 'Not sure — discuss inside',
};

export const tireRotationLabel = (code) =>
  TIRE_ROTATION_LABELS[code] || code || '';

// -----------------------------------------------------------------------------
// Concerns level (Screen 8 entry point)
// -----------------------------------------------------------------------------

export const CONCERNS_LEVEL_LABELS = {
  none:      'No concerns',
  one_thing: 'One concern',
  multiple:  'Multiple concerns',
};

export const concernsLevelLabel = (code) =>
  CONCERNS_LEVEL_LABELS[code] || code || '';

// -----------------------------------------------------------------------------
// CAW follow-up items (Screen 9)
// -----------------------------------------------------------------------------

export const FOLLOW_UP_ITEM_LABELS = {
  engine_air: 'Engine Air Filter',
  cabin_air:  'Cabin Air Filter',
  wipers:     'Wiper Blades',
};

export const followUpItemLabel = (id) =>
  FOLLOW_UP_ITEM_LABELS[id] || id || '';

// -----------------------------------------------------------------------------
// CAW follow-up response (Screen 9 outcome)
// -----------------------------------------------------------------------------

export const FOLLOW_UP_RESPONSE_LABELS = {
  accepted:    'Accepted CAW upsell',
  declined:    'Declined CAW upsell',
  not_offered: 'No eligible items',
};

export const followUpResponseLabel = (code) =>
  FOLLOW_UP_RESPONSE_LABELS[code] || code || '';

// -----------------------------------------------------------------------------
// Wait preference (Screen 10)
// -----------------------------------------------------------------------------

export const WAIT_PREFERENCE_LABELS = {
  lobby:    'Waiting room',
  in_car:   'In their car',
  drop_off: 'Drop off',
};

export const waitPreferenceLabel = (code) =>
  WAIT_PREFERENCE_LABELS[code] || code || '';

// -----------------------------------------------------------------------------
// Vehicle data source (where the kiosk got vehicle info)
// -----------------------------------------------------------------------------
// Mostly an internal/debug field, but useful for the staff to know whether
// they're working from a Turbo lookup vs a manual entry.
// -----------------------------------------------------------------------------

export const VEHICLE_DATA_SOURCE_LABELS = {
  'lookup-turbo':     'Looked up from Turbo',
  'lookup-partstech': 'Looked up from PartsTech',
  'lookup-nhtsa':     'Looked up from NHTSA',
  'manual':           'Entered manually',
};

export const vehicleDataSourceLabel = (code) =>
  VEHICLE_DATA_SOURCE_LABELS[code] || code || '';
