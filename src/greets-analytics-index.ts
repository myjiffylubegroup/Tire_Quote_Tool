// =============================================================================
// GREETS ANALYTICS - Edge Function v1
// =============================================================================
// Aggregates kiosk activity, performance-vs-actual, and customer satisfaction
// metrics for the Greets Reports page (tires.myjiffylube.ai/#/reports/greets).
//
// Reads from:
//   - v_greets_for_staff       (kiosk-side data — owned by tire-side)
//   - greet_invoice_matches    (Turbo-side view — joins greets to invoices)
//
// All metrics computed in TypeScript from raw rows rather than in SQL so the
// logic is auditable in one place and easy to evolve (denominators, outlier
// rules, etc.). A single store-day might have ~50 greets at peak, and even
// "last 90 days × all 8 stores" is well under 50k rows — totally fine to
// pull and aggregate in-memory.
//
// Auth: staff JWT (X-Staff-Token). Gated by the same authorization the
// soft-delete-greets and staff-profile functions use — the caller's title
// must be in TITLES_CAN_VIEW. For now this matches the delete allowlist;
// if access ever needs to diverge, split into a separate set.
//
// Cross-store rollup: callers may pass store_id = 'all' to aggregate across
// all 8 stores. Only authorized for multi-store titles (Multi-Center,
// Operations, Controller/CFO, President, MC Master Tech Evaluator). Other
// authorized titles see their own store only and 'all' is rejected.
// =============================================================================
// Endpoint: POST /functions/v1/greets-analytics
// Headers:
//   Authorization: Bearer <SUPABASE_ANON_KEY>   (gateway)
//   X-Staff-Token: <staff-jwt>                  (function-level auth)
// Body:
//   {
//     "store_id":  609 | 'all',     // required
//     "date_from": "2026-05-01",    // optional — defaults to month-to-date
//     "date_to":   "2026-05-30"     // optional — defaults to today (Pacific)
//   }
// Response (success): see PAYLOAD SHAPE near end of file.
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireStaffAuth, corsHeaders } from '../_shared/staff-auth.ts'

// Titles authorized to view greets analytics. Mirrors the delete allowlist.
const TITLES_CAN_VIEW = new Set<string>([
  'Service Center Manager',
  'Multi-Center Manager',
  'Operations Manager',
  'Controller/CFO',
  'President',
  'Fleet Compliance Manager',
  'MC Master Tech Evaluator',
  'Office',
])

// Subset that may run the "all stores" rollup. Single-store titles can only
// see their own store's data.
const TITLES_CAN_SEE_ALL_STORES = new Set<string>([
  'Multi-Center Manager',
  'Operations Manager',
  'Controller/CFO',
  'President',
  'MC Master Tech Evaluator',
])

// Bay duration outlier filter — drop work-orders that ran absurdly long
// (timer never stopped) or impossibly short (data entry artifact). The
// outlier count is surfaced in the response so the UI can show "N outliers
// excluded" alongside the average.
const BAY_MINUTES_MIN = 2
const BAY_MINUTES_MAX = 180

// Engine prep GROW codes (must match the QuoteLookup constant for consistency)
const ENGINE_PREP_GROW_CODES = new Set([
  'GREETTM3', 'GREETTM8', 'GREETTM13', 'GREETTM14', 'GREETTM15',
])

// NPS minimum sample size before we show a score. Below this we show
// "Not enough responses yet" — a small number is misleading.
const NPS_MIN_N = 5

const isValidDateString = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

// Month-to-date in Pacific time: YYYY-MM-01.
function pacificMonthStart(): string {
  const today = pacificToday()
  return today.slice(0, 8) + '01'
}

function pacificToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

// ─── Two-step employee lookup (matches staff-profile v2 / soft-delete-greets v2)
async function resolveStaffTitle(supabase: any, employeeId: number): Promise<string | null> {
  // Step 1: direct match.
  let { data: ctUser, error: ctError } = await supabase
    .from('connecteam_users')
    .select('title')
    .eq('employee_id', employeeId)
    .eq('is_archived', false)
    .maybeSingle()

  if (ctError) console.error('connecteam_users direct lookup error:', ctError)
  if (ctUser?.title) return ctUser.title

  // Step 2: bridge fallback for legacy corporate accounts.
  const { data: bridge, error: bridgeError } = await supabase
    .from('employee_id_bridge')
    .select('connecteam_employee_id')
    .eq('legacy_employee_id', employeeId)
    .maybeSingle()

  if (bridgeError) console.error('employee_id_bridge lookup error:', bridgeError)
  if (!bridge) return null

  const { data: bridgedUser, error: bridgedError } = await supabase
    .from('connecteam_users')
    .select('title')
    .eq('employee_id', bridge.connecteam_employee_id)
    .eq('is_archived', false)
    .maybeSingle()

  if (bridgedError) console.error('connecteam_users bridged lookup error:', bridgedError)
  return bridgedUser?.title ?? null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonError('Method not allowed', 405)
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const auth = await requireStaffAuth(req)
    if (!auth.ok) return auth.response

    const employeeId = auth.claims.employee_id

    // ── Parse body ────────────────────────────────────────────────────────────
    let body: any
    try { body = await req.json() } catch { return jsonError('Invalid JSON body', 400) }

    // store_id: 'all' for cross-store rollup, or a positive integer
    const rawStoreId = body.store_id
    const isAllStores = rawStoreId === 'all' || rawStoreId === 'ALL'
    let storeIds: number[] | null = null  // null = no store filter (all stores)

    if (!isAllStores) {
      const sid = Number(rawStoreId)
      if (!Number.isInteger(sid) || sid <= 0) {
        return jsonError('store_id must be a positive integer or "all"', 400)
      }
      storeIds = [sid]
    }

    // Date range — both optional, default month-to-date in Pacific
    let dateFrom = body.date_from
    let dateTo = body.date_to
    if (dateFrom != null && dateFrom !== '' && !isValidDateString(dateFrom)) {
      return jsonError('date_from must be a valid YYYY-MM-DD string', 400)
    }
    if (dateTo != null && dateTo !== '' && !isValidDateString(dateTo)) {
      return jsonError('date_to must be a valid YYYY-MM-DD string', 400)
    }
    if (!dateFrom || dateFrom === '') dateFrom = pacificMonthStart()
    if (!dateTo   || dateTo   === '') dateTo   = pacificToday()

    // ── Authorization ─────────────────────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const title = await resolveStaffTitle(supabase, employeeId)
    if (!title || !TITLES_CAN_VIEW.has(title)) {
      return jsonError(
        `Title "${title ?? '(none)'}" is not authorized to view greets analytics`,
        403,
      )
    }
    if (isAllStores && !TITLES_CAN_SEE_ALL_STORES.has(title)) {
      return jsonError(
        `Title "${title}" can only view a single store; pass a numeric store_id`,
        403,
      )
    }

    // ── Pull data ─────────────────────────────────────────────────────────────
    // Pacific time day boundaries — matches the rest of the system.
    // TODO: hardcoded -07:00 (PDT). Off by 1 hour during PST.
    const startTs = `${dateFrom}T00:00:00-07:00`
    const endTs   = `${dateTo}T23:59:59-07:00`

    // Section 1: pull from v_greets_for_staff (the kiosk-side view).
    let greetsQuery = supabase
      .from('v_greets_for_staff')
      .select('greet_id, store_id, service_classification, oil_tier_selected, tm_package_selected, tire_rotation_choice, follow_up_response, follow_up_items_accepted, wait_preference, estimated_subtotal, grow_codes, qualifier_choice')
      .gte('created_at', startTs)
      .lte('created_at', endTs)
      .limit(50000)
    if (storeIds) greetsQuery = greetsQuery.in('store_id', storeIds)

    const { data: greets, error: greetsErr } = await greetsQuery
    if (greetsErr) {
      console.error('v_greets_for_staff query error:', greetsErr)
      return jsonError('Failed to load greets data', 500)
    }

    // Note: v_greets_for_staff doesn't expose qualifier_choice today (it's not
    // in the view's column list). Once it is, the qualifier_mix below will
    // populate — otherwise it'll be "unknown" for all rows. Flagged so the
    // future view update is a no-op for analytics.

    // Sections 2 + 3: pull from greet_invoice_matches.
    let matchesQuery = supabase
      .from('greet_invoice_matches')
      .select('greet_id, store_id, match_quality, estimated_subtotal, invoice_net_sales, invoice_total, invoice_gross_sales, invoice_promotion_total, invoice_started_at, invoice_completed_at, nps_score')
      .gte('greet_created_at', startTs)
      .lte('greet_created_at', endTs)
      .limit(50000)
    if (storeIds) matchesQuery = matchesQuery.in('store_id', storeIds)

    const { data: matches, error: matchesErr } = await matchesQuery
    if (matchesErr) {
      console.error('greet_invoice_matches query error:', matchesErr)
      return jsonError('Failed to load invoice matches', 500)
    }

    // Build a service_classification lookup for the bay-duration-by-class metric.
    // The matches view doesn't carry classification (Brain didn't include it),
    // so we look it up from the greets pull we already did.
    const classByGreetId = new Map<string, string | null>()
    for (const g of (greets || [])) {
      classByGreetId.set(g.greet_id, g.service_classification ?? null)
    }

    // ────────────────────────────────────────────────────────────────────────
    // Section 1: activity & service mix (kiosk-only)
    // ────────────────────────────────────────────────────────────────────────
    const total = (greets || []).length

    // Qualifier mix — defensive: column may not be in the view yet.
    const qualifierMix: Record<string, number> = {
      oil_change: 0, smog: 0, rideshare: 0, tires: 0, other: 0, unknown: 0,
    }
    for (const g of (greets || [])) {
      const q = g.qualifier_choice as string | null | undefined
      if (q && qualifierMix[q] !== undefined) qualifierMix[q]++
      else qualifierMix.unknown++
    }

    // Oil-change subset (denominator for most attach metrics).
    // We treat "has an oil_tier_selected" as a robust proxy for the oil-change
    // path even if qualifier_choice isn't surfaced — smog/rideshare/tires/other
    // paths don't set oil_tier_selected per the kiosk flow doc.
    const oilGreets = (greets || []).filter((g) => g.oil_tier_selected != null)
    const oilN = oilGreets.length

    // EXPRESS vs FULL among oil-change greets
    const classMix: Record<string, number> = { express: 0, full: 0, other: 0 }
    for (const g of oilGreets) {
      const c = g.service_classification
      if (c === 'express' || c === 'full') classMix[c]++
      else classMix.other++
    }

    // Avg kiosk estimate across oil-change greets that have a number on file
    const oilEstimates = oilGreets
      .map((g) => g.estimated_subtotal)
      .filter((v) => v != null && Number(v) > 0)
      .map(Number)
    const avgKioskEstimate = oilEstimates.length
      ? round2(oilEstimates.reduce((a, b) => a + b, 0) / oilEstimates.length)
      : null

    // TM attach (oil-change denominator)
    const tmByTier: Record<string, number> = {
      high_mileage: 0, max_protect: 0, vip: 0, basic_synthetic: 0, none: 0,
    }
    let tmAny = 0
    for (const g of oilGreets) {
      const t = g.tm_package_selected
      if (t && t !== 'none') tmAny++
      if (t && tmByTier[t] !== undefined) tmByTier[t]++
      else if (!t) tmByTier.none++
    }

    // Rotation attach (oil-change denominator)
    const rotationMix: Record<string, number> = { yes: 0, no: 0, not_sure: 0, other: 0 }
    for (const g of oilGreets) {
      const r = g.tire_rotation_choice
      if (r && rotationMix[r] !== undefined) rotationMix[r]++
      else rotationMix.other++
    }

    // Engine prep attach (oil-change denominator)
    let prepCount = 0
    for (const g of oilGreets) {
      const codes = Array.isArray(g.grow_codes) ? g.grow_codes : []
      if (codes.some((c: string) => ENGINE_PREP_GROW_CODES.has(c))) prepCount++
    }

    // CAW — denominator is greets where it was offered (follow_up_response not null)
    const cawOffered = (greets || []).filter((g) => g.follow_up_response != null).length
    const cawAccepted = (greets || []).filter((g) =>
      g.follow_up_response === 'accepted' ||
      (Array.isArray(g.follow_up_items_accepted) && g.follow_up_items_accepted.length > 0)
    ).length

    // Wait preference (all greets, not just oil)
    const waitMix: Record<string, number> = { lobby: 0, in_car: 0, drop_off: 0, other: 0 }
    for (const g of (greets || [])) {
      const w = g.wait_preference
      if (w && waitMix[w] !== undefined) waitMix[w]++
      else if (w) waitMix.other++
    }

    // ────────────────────────────────────────────────────────────────────────
    // Section 2: performance vs actual (greet_invoice_matches)
    // ────────────────────────────────────────────────────────────────────────
    const matchedRows = (matches || []).filter((m) => m.match_quality !== 'no_match')

    const matchBreakdown = {
      exact_vin:   (matches || []).filter((m) => m.match_quality === 'exact_vin').length,
      exact_plate: (matches || []).filter((m) => m.match_quality === 'exact_plate').length,
      no_match:    (matches || []).filter((m) => m.match_quality === 'no_match').length,
    }
    const totalForMatch = (matches || []).length

    // Estimate vs actual (pre-tax apples-to-apples and post-tax total)
    const compareRows = matchedRows.filter((m) =>
      m.estimated_subtotal != null && m.invoice_net_sales != null
    )
    const avgKioskEstimateMatched = compareRows.length
      ? round2(compareRows.reduce((a, m) => a + Number(m.estimated_subtotal), 0) / compareRows.length)
      : null
    const avgInvoiceNet = compareRows.length
      ? round2(compareRows.reduce((a, m) => a + Number(m.invoice_net_sales), 0) / compareRows.length)
      : null
    const avgInvoiceTotal = matchedRows.filter((m) => m.invoice_total != null).length
      ? round2(
          matchedRows.filter((m) => m.invoice_total != null)
                     .reduce((a, m) => a + Number(m.invoice_total), 0) /
          matchedRows.filter((m) => m.invoice_total != null).length
        )
      : null

    // Promo discount averages
    const promoRows = matchedRows.filter((m) => m.invoice_promotion_total != null)
    const avgPromoDiscount = promoRows.length
      ? round2(promoRows.reduce((a, m) => a + Number(m.invoice_promotion_total), 0) / promoRows.length)
      : null
    // Promo as % of gross — averaged per-row, not "total promo / total gross"
    // (avoids one giant ticket dominating the rate)
    const promoPctRows = matchedRows.filter((m) =>
      m.invoice_promotion_total != null &&
      m.invoice_gross_sales != null &&
      Number(m.invoice_gross_sales) > 0
    )
    const avgPromoPctOfGross = promoPctRows.length
      ? round1(
          promoPctRows.reduce((a, m) =>
            a + 100 * Number(m.invoice_promotion_total) / Number(m.invoice_gross_sales), 0
          ) / promoPctRows.length
        )
      : null

    // Bay duration by classification (outlier-filtered)
    const bayByClass: Record<string, { n: number; sum: number; outliers: number }> = {
      express: { n: 0, sum: 0, outliers: 0 },
      full:    { n: 0, sum: 0, outliers: 0 },
      unknown: { n: 0, sum: 0, outliers: 0 },
    }
    for (const m of matchedRows) {
      if (!m.invoice_started_at || !m.invoice_completed_at) continue
      const startMs = new Date(m.invoice_started_at).getTime()
      const endMs   = new Date(m.invoice_completed_at).getTime()
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue
      const minutes = (endMs - startMs) / 60000
      const cls = classByGreetId.get(m.greet_id) ?? 'unknown'
      const bucket = bayByClass[cls] ?? bayByClass.unknown
      if (minutes < BAY_MINUTES_MIN || minutes > BAY_MINUTES_MAX) {
        bucket.outliers++
      } else {
        bucket.n++
        bucket.sum += minutes
      }
    }
    const bayDurationByClass = {
      express: bucketStats(bayByClass.express),
      full:    bucketStats(bayByClass.full),
      unknown: bucketStats(bayByClass.unknown),
    }
    const totalOutliers =
      bayByClass.express.outliers + bayByClass.full.outliers + bayByClass.unknown.outliers

    // ────────────────────────────────────────────────────────────────────────
    // Section 3: NPS
    // ────────────────────────────────────────────────────────────────────────
    const npsRows = matchedRows.filter((m) => m.nps_score != null)
    const npsN = npsRows.length
    const avgNps = npsN >= NPS_MIN_N
      ? round1(npsRows.reduce((a, m) => a + Number(m.nps_score), 0) / npsN)
      : null

    const npsByClass: Record<string, { n: number; avg: number | null }> = {}
    for (const cls of ['express', 'full'] as const) {
      const sub = npsRows.filter((m) => classByGreetId.get(m.greet_id) === cls)
      npsByClass[cls] = sub.length >= NPS_MIN_N
        ? { n: sub.length, avg: round1(sub.reduce((a, m) => a + Number(m.nps_score), 0) / sub.length) }
        : { n: sub.length, avg: null }
    }

    // ────────────────────────────────────────────────────────────────────────
    // PAYLOAD SHAPE
    // ────────────────────────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        scope: {
          store_id: isAllStores ? 'all' : storeIds![0],
          date_from: dateFrom,
          date_to: dateTo,
        },
        section_1: {
          total_greets: total,
          qualifier_mix: qualifierMix,
          oil_change_greets: oilN,
          avg_kiosk_estimate: avgKioskEstimate,
          classification_mix: classMix,
          tm_attach: { any: tmAny, by_tier: tmByTier },
          rotation_attach: rotationMix,
          engine_prep_attach: prepCount,
          caw: { offered: cawOffered, accepted: cawAccepted },
          wait_preference: waitMix,
        },
        section_2: {
          match_breakdown: matchBreakdown,
          total_for_match: totalForMatch,
          avg_kiosk_estimate_matched: avgKioskEstimateMatched,
          avg_invoice_net: avgInvoiceNet,
          avg_invoice_total: avgInvoiceTotal,
          avg_promo_discount: avgPromoDiscount,
          avg_promo_pct_of_gross: avgPromoPctOfGross,
          bay_duration_by_classification: bayDurationByClass,
          outliers_excluded: totalOutliers,
        },
        section_3: {
          response_count: npsN,
          avg_nps: avgNps,
          by_classification: npsByClass,
          min_n_for_score: NPS_MIN_N,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (err) {
    console.error('Unexpected error:', err)
    return jsonError(err.message || 'Internal server error', 500)
  }
})

function jsonError(message: string, status = 400): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

function round1(n: number): number { return Math.round(n * 10) / 10 }
function round2(n: number): number { return Math.round(n * 100) / 100 }

function bucketStats(b: { n: number; sum: number }): { n: number; avg_minutes: number | null } {
  return { n: b.n, avg_minutes: b.n > 0 ? round1(b.sum / b.n) : null }
}
