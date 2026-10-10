'use client';

import { useEffect, useRef } from 'react';

/** Native modal semantics provide focus containment and return focus on close. */
export function Dialog({ children, labelledBy, onDismiss }: { children: React.ReactNode; labelledBy: string; onDismiss: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} aria-labelledby={labelledBy} className="review-dialog" onCancel={event => { event.preventDefault(); onDismiss(); }}>{children}</dialog>;
}
