'use client';

import { motion, useReducedMotion } from 'framer-motion';

export function FuseMark({
  size = 40,
  animate = false,
  className = '',
}: {
  size?: number;
  animate?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const shouldAnimate = animate && !reduce;

  return (
    <motion.img
      src="/icon-512x512.png"
      alt="GENFUSE Logo"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      initial={shouldAnimate ? { scale: 0.75, opacity: 0, rotate: -6 } : false}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      whileHover={{ scale: 1.08, rotate: 2 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className={`shrink-0 rounded-xl bg-white object-contain shadow-sm ${className}`}
    />
  );
}
