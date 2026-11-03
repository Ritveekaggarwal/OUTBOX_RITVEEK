import { RefObject, useEffect } from 'react';

/** Calls `onOutside` on pointer-down outside the element or on Escape. */
export function useClickOutside(ref: RefObject<HTMLElement>, onOutside: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const handlePointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onOutside();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOutside();
    };
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [ref, onOutside, enabled]);
}
