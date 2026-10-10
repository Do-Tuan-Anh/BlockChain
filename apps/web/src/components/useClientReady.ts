'use client';

import { useEffect, useState } from 'react';

/** Keep server-rendered forms disabled until React attaches their handlers. */
export function useClientReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  return ready;
}
