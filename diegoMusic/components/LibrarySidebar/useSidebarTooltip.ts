import { useCallback, useRef, useState } from 'react';
import type { View } from 'react-native';

export interface SidebarTooltipState {
  title: string;
  subtitle?: string;
  /** Vertical centre of the hovered item, relative to the sidebar. */
  top: number;
}

/**
 * Tooltip for the collapsed sidebar. It is positioned from the hovered item's
 * window coordinates so it can render outside the scrolling list without being clipped.
 */
export function useSidebarTooltip() {
  const containerRef = useRef<View>(null);
  const hoveredRef = useRef<View | null>(null);
  const [tooltip, setTooltip] = useState<SidebarTooltipState | null>(null);

  const show = useCallback((target: View | null, title: string, subtitle?: string) => {
    const container = containerRef.current;
    if (!target || !container) return;
    hoveredRef.current = target;

    target.measureInWindow((_x, y, _width, height) => {
      container.measureInWindow((_cx, containerY) => {
        // Ignore measurements that resolve after the pointer already left.
        if (hoveredRef.current !== target) return;
        setTooltip({ title, subtitle, top: y - containerY + height / 2 });
      });
    });
  }, []);

  const hide = useCallback(() => {
    hoveredRef.current = null;
    setTooltip(null);
  }, []);

  return { containerRef, tooltip, show, hide };
}
