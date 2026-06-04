/**
 * Hook para ocultar header al hacer scroll hacia arriba y atenuar la nav al bajar el scroll
 * (fondo ~5% violeta, iconos/texto ~20%; tab activo un poco más legible).
 * En la parte superior el header siempre visible; cerca del final la nav a plena opacidad.
 * Usado por App.js para AppHeader y AppNav.
 */
import { useState, useEffect, useRef } from "react";

const SCROLL_THRESHOLD_PX = 8;
const EDGE_THRESHOLD_PX = 24;

export function useScrollToHide() {
  const [headerVisible, setHeaderVisible] = useState(true);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const mounted = useRef(true);
  const rafId = useRef(null);

  useEffect(() => {
    mounted.current = true;
    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      rafId.current = requestAnimationFrame(() => {
        if (!mounted.current) {
          ticking.current = false;
          return;
        }
        const scrollY = window.scrollY ?? document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const nearTop = scrollY < EDGE_THRESHOLD_PX;
        const nearBottom = maxScroll <= EDGE_THRESHOLD_PX || scrollY >= maxScroll - EDGE_THRESHOLD_PX;
        const delta = scrollY - lastScrollY.current;
        lastScrollY.current = scrollY;

        setHeaderVisible((prev) => {
          if (nearTop) return true;
          if (Math.abs(delta) < SCROLL_THRESHOLD_PX) return prev;
          return delta >= 0; // show when scrolling down, hide when scrolling up
        });
        setNavVisible((prev) => {
          if (nearBottom) return true;
          if (Math.abs(delta) < SCROLL_THRESHOLD_PX) return prev;
          return delta <= 0; // show when scrolling up, hide when scrolling down
        });
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      mounted.current = false;
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return { headerVisible, navVisible };
}
