import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

export function Sheet({ title, children, close, busy = false }: { title: string; children: ReactNode; close: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.showModal();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="modal-sheet" aria-labelledby={id} onCancel={e => { e.preventDefault(); if (!busy) close(); }}>
    <div className="sheet-handle" />
    <div className="row"><h2 id={id}>{title}</h2><button className="close" type="button" aria-label="닫기" disabled={busy} onClick={close}>✕</button></div>
    {children}
  </dialog>;
}
