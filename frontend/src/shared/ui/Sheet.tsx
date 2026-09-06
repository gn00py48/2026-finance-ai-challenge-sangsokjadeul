import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

export function Sheet({ title, children, close, busy = false, variant = 'sheet', action }: { title: string; children: ReactNode; close: () => void; busy?: boolean; variant?: 'sheet' | 'chat'; action?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.showModal();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={`modal-sheet modal-sheet--${variant}`} aria-labelledby={id} onCancel={e => { e.preventDefault(); if (!busy) close(); }}>
    <div className="sheet-handle" />
    <div className="row sheet-header">{variant === 'chat' && <button className="back" type="button" aria-label="대화 닫기" onClick={close}>←</button>}<h2 id={id}>{title}</h2>{action}{variant !== 'chat' && <button className="close" type="button" aria-label="닫기" disabled={busy} onClick={close}>✕</button>}</div>
    {children}
  </dialog>;
}
