// useNarrow.js — true on phone-width screens (Jiffy Pitstop's WebView, a CSA's phone).
// For layouts inline styles can't express with a media query.
import { useEffect, useState } from 'react';

const QUERY = '(max-width: 600px)';

export default function useNarrow() {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return narrow;
}
