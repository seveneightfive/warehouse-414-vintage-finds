import { useEffect, useRef, useState, CSSProperties } from "react";

export const useParallax = (speed: number = 0.3) => {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const rafId = useRef<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const scrolled = -rect.top * speed;
        setOffset(scrolled);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [speed]);

  const style: CSSProperties = {
    transform: `translateY(${offset}px) scale(1.2)`,
    willChange: "transform",
  };

  return { ref, style };
};
