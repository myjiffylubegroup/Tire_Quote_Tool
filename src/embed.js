// embed.js
// Tire Finder opened inside the Jiffy Pitstop app (a WebView on the CSA's phone).
//
// Pitstop's WebView sets sessionStorage.jl_embed = 'pitstop' before the page loads, along with
// the signed-in staff session, so the CSA isn't asked for a PIN. In that mode the site drops
// what the app already provides — the nav menu, feedback and log out — and Pitstop's own header
// has the Close button. sessionStorage, so it never leaks into a normal browser tab.

export function isEmbedded() {
  try {
    return sessionStorage.getItem('jl_embed') === 'pitstop';
  } catch {
    return false;
  }
}

// Tells Pitstop something happened (e.g. a quote was created), when running inside it.
export function notifyApp(message) {
  try {
    window.ReactNativeWebView?.postMessage(JSON.stringify(message));
  } catch {
    // Not in the app, or the bridge isn't there — nothing to tell.
  }
}
