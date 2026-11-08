import { useEffect, useState } from 'react';

/**
 * Keeps an element mounted while it animates out. `shown` flips one frame after
 * mounting so CSS transitions run from the initial (hidden) styles.
 */
export function usePresence(visible: boolean, exitDuration: number) {
  const [mounted, setMounted] = useState(visible);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setShown(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setShown(false);
    const timer = setTimeout(() => setMounted(false), exitDuration);
    return () => clearTimeout(timer);
  }, [visible, exitDuration]);

  return { mounted, shown };
}
