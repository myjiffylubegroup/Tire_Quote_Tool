// =============================================================================
// promoLabel — turn a GROW promo description into something a staff card can
// show at a glance.
//
// GROW descriptions are written for the back office, not a board. Real live
// examples:
//
//   "SDM - $50 OFF Brake Service Eroc Email"
//   "SDM - 10% OFF Tires eRoc Offer"
//   "SDM-PMAX- Free Install Tire Replacement"
//   "JLI - $15 OFF SSOC National PS/Social"
//   "LOC - $28 OFF Any SSOC Glendora High"
//
// The leading token is the CHANNEL that bought the promo (SDM = the marketing
// agency, JLI = Jiffy Lube International, LOC = local, COOP = co-op funded).
// It matters to whoever reconciles the spend and is noise to an advisor with a
// customer in front of them, so it is stripped. The trailing channel notes
// ("Eroc Email", "DD", "MW", "Social") are the same kind of noise but are not
// reliably delimited, so they are left alone rather than guessed at — being
// slightly long beats silently cutting off the word "Brake".
//
// Shared by TodaysGreets and GreetsBoard. The equivalent for PCJL lives in
// staff read the same chip on both surfaces and it must say the same thing.
// =============================================================================

/** Channel prefixes GROW puts in front of promo descriptions. */
const CHANNEL_PREFIX = /^\s*(SDM|JLI|LOC|COOP|NTL|BPS|PMAX|PSM|EROC)\b[\s-]*/i

const MAX_LABEL = 26

/**
 * Short, uppercase label for a promo description.
 *
 * Returns 'COUPON' for a missing description rather than an empty string, so a
 * pill never renders as a bare tag icon with nothing after it.
 */
export function promoShortLabel(description) {
  if (!description) return 'COUPON'

  let s = String(description).trim()

  // Strip one or more stacked channel prefixes: "SDM-PMAX- Free Install" has
  // two, and removing only the first leaves a stray "PMAX-" on the card.
  let prev
  do {
    prev = s
    s = s.replace(CHANNEL_PREFIX, '')
  } while (s !== prev && s.length > 0)

  s = s.replace(/\s+/g, ' ').trim().toUpperCase()
  if (!s) return 'COUPON'

  if (s.length <= MAX_LABEL) return s
  // Cut on a word boundary where possible — "$50 OFF BRAKE SERV…" reads worse
  // than "$50 OFF BRAKE…", and a truncated word invites a misread.
  const cut = s.slice(0, MAX_LABEL)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > MAX_LABEL * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…'
}
