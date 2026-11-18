'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * The GENFUSE mark: three generations as three overlapping circles.
 * With `animate`, the circles drift together once on load (the one orchestrated moment on the landing page).
 */
export function FuseMark({ size = 40, animate = false }: { size?: number; animate?: boolean }) {
  const reduce = useReducedMotion();
  const move = animate && !reduce;
  const spring = { type: 'spring' as const, stiffness: 60, damping: 14, delay: 0.25 };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="GENFUSE"
      className="shrink-0 [&_circle]:mix-blend-multiply"
    >
      <motion.circle
        r="19"
        className="fill-gran"
        initial={move ? { cx: 12, cy: 18 } : false}
        animate={{ cx: 24, cy: 26 }}
        transition={spring}
      />
      <motion.circle
        r="19"
        className="fill-par"
        initial={move ? { cx: 52, cy: 18 } : false}
        animate={{ cx: 40, cy: 26 }}
        transition={spring}
      />
      <motion.circle
        r="19"
        className="fill-kid"
        initial={move ? { cx: 32, cy: 58 } : false}
        animate={{ cx: 32, cy: 40 }}
        transition={spring}
      />
    </svg>
  );
}
