// =============================================================================
// GreetsMark — the GREETS product wordmark (PCJL copy)
// =============================================================================
// Kept behaviourally identical to greets/src/components/GreetsMark.tsx. This
// repo is the PCJL tire finder, which happens to host PCJL's greets staff
// surfaces (board, reports, Today's Greets); the standalone greets unit has its
// own copy. Both must render the same mark or "consistent use" is not true.
// Change one, change the other — a greets change made in only one repo silently
// reaches only one tenant.
//
// The artwork is the real logo, cut from the supplied master into three
// variants (public/greets-logo-*.png). The master had a white background; it
// was keyed out by flood-filling from the image edges, which is why the white
// chrome INSIDE the G and the white "SELF CHECK-IN" lettering survive.
//
//   stacked    — the full lockup (G / GREETS(TM) / SELF CHECK-IN pill). Already
//                carries the TM and a generic descriptor, so it needs no tagline.
//   horizontal — G + GREETS(TM) side by side, for short chrome.
//   badge      — the G alone, for small or square slots.
//
// The TM is baked into the artwork. TM is correct until a registration issues;
// never swap in (R).
//
// IMPORTANT: the mark is deliberately NOT on this app's shared login, navbar, or
// tire/mechanical screens. Those are a different product. Greets surfaces only.
// =============================================================================

export const GREETS_PURPLE = '#4a0972'
// Brighter partner for highlights and active states on light grounds. Sampled
// from the logo's lighter gradient stops, so it belongs to the same family.
export const GREETS_PURPLE_ACCENT = '#6a0fa8'

const MARK_FONT =
  "'Inter', 'TT Commons Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

const HEIGHTS = {
  horizontal: { sm: 24, md: 34, lg: 44, xl: 56 },
  stacked:    { sm: 72, md: 96, lg: 124, xl: 160 },
  badge:      { sm: 22, md: 30, lg: 44, xl: 60 },
}

const SRC = {
  horizontal: { color: '/greets-logo-horizontal.png', onDark: '/greets-logo-horizontal-white.png' },
  stacked:    { color: '/greets-logo-stacked.png',    onDark: '/greets-logo-stacked.png' },
  badge:      { color: '/greets-badge.png',           onDark: '/greets-badge.png' },
}

export function GreetsMark({ variant = 'horizontal', size = 'md', tone = 'color', tagline, href }) {
  const height = HEIGHTS[variant][size]
  const src = tone === 'onDark' ? SRC[variant].onDark : SRC[variant].color

  const img = (
    <img
      src={src}
      alt="GREETS"
      style={{ height: `${height}px`, width: 'auto', display: 'block' }}
    />
  )

  const lockup = tagline ? (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
      {img}
      <span style={{
        fontFamily: MARK_FONT,
        fontSize: `${Math.max(9, Math.round(height * 0.26))}px`,
        fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: tone === 'onDark' ? 'rgba(255,255,255,0.72)' : '#64748b',
        lineHeight: 1.2, whiteSpace: 'nowrap',
      }}>
        {tagline}
      </span>
    </span>
  ) : img

  if (!href) return lockup
  return <a href={href} style={{ textDecoration: 'none', display: 'inline-flex' }}>{lockup}</a>
}

export function TrademarkNotice({ tone = 'color' }) {
  return (
    <p style={{
      fontFamily: MARK_FONT, fontSize: '11px', lineHeight: 1.5,
      color: tone === 'onDark' ? 'rgba(255,255,255,0.6)' : '#94a3b8',
      textAlign: 'center', margin: 0,
    }}>
      GREETS{'™'} is a trademark of P.C.J.L., Inc.
    </p>
  )
}

export default GreetsMark
