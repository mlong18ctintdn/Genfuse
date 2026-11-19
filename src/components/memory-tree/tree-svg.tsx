'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { isSealed, type MemoryItem } from './types';

const GOLDEN = 2.399963; // golden angle: leaves spiral outward, so early memories sit at the heart of the canopy
const SLOTS = 80;
const CX = 300;
const CY = 205;

function leafPosition(i: number) {
  const wrap = Math.floor(i / SLOTS);
  const k = i % SLOTS;
  const r = Math.sqrt((k + 0.5) / SLOTS) * (wrap ? 0.9 : 1);
  const a = k * GOLDEN + wrap * 0.7;
  return { x: CX + 232 * r * Math.cos(a), y: CY + 150 * r * Math.sin(a), rot: ((i * 53) % 100) - 50 };
}

const FILL = { grandparent: 'fill-gran', parent: 'fill-par', child: 'fill-kid' } as const;
const PETAL = { grandparent: 'fill-gran/60', parent: 'fill-par/50', child: 'fill-kid/55' } as const;

const LEAF = 'M0 -15 C 11 -10 11 9 0 15 C -11 9 -11 -10 0 -15 Z';

/**
 * The tree grows with the family: the canopy gets fuller as leaves are added,
 * every fifth leaf blooms, and each leaf is coloured by the generation of its author.
 */
export function TreeSvg({ items, onSelect }: { items: MemoryItem[]; onSelect: (id: string) => void }) {
  const t = useTranslations();
  const reduce = useReducedMotion();

  const foliage = Math.min(16, 4 + Math.floor(items.length * 0.8));

  return (
    <svg viewBox="0 0 600 570" className="h-auto w-full" role="group" aria-label={t('memoryTree.title')}>
      {/* ground */}
      <ellipse cx="300" cy="548" rx="210" ry="16" className="fill-accent" />

      {/* canopy glow: more blobs as the tree grows */}
      {Array.from({ length: foliage }, (_, i) => {
        const a = i * GOLDEN;
        const r = 0.35 + (i % 4) * 0.18;
        return (
          <circle
            key={i}
            cx={CX + 215 * r * Math.cos(a)}
            cy={CY + 135 * r * Math.sin(a)}
            r={52 + (i % 3) * 12}
            className="fill-success/10"
          />
        );
      })}

      {/* branches + trunk */}
      <g className="stroke-primary/70" fill="none" strokeLinecap="round" strokeWidth="8">
        <path d="M300 340 C 262 305 205 285 150 232" />
        <path d="M300 330 C 340 295 398 275 455 228" />
        <path d="M300 310 C 295 265 300 222 300 150" />
        <path d="M288 368 C 240 356 190 350 118 300" />
        <path d="M316 368 C 365 356 420 350 488 300" />
      </g>
      <path
        d="M286 548 C 290 480 278 440 268 392 C 262 350 284 312 300 270 C 316 312 340 350 332 392 C 322 440 312 480 316 548 Z"
        className="fill-primary/80"
      />

      {items.map((m, i) => {
        const { x, y, rot } = leafPosition(i);
        const sealed = isSealed(m);
        const bloom = i % 5 === 4 && !sealed;
        const label = `${m.title}, ${m.authorName}`;
        return (
          <g
            key={m.id}
            transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot})`}
            role="button"
            tabIndex={0}
            aria-label={label}
            onClick={() => onSelect(m.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(m.id);
              }
            }}
            className="group cursor-pointer outline-none"
          >
            <title>{label}</title>
            <motion.g
              initial={reduce ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14, delay: reduce ? 0 : Math.min(i * 0.035, 1.4) }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
              <circle r="22" className="fill-transparent stroke-transparent group-focus-visible:stroke-ring" strokeWidth="3" />
              {bloom &&
                [0, 72, 144, 216, 288].map((deg) => (
                  <circle
                    key={deg}
                    cx={Math.cos((deg * Math.PI) / 180) * 12}
                    cy={Math.sin((deg * Math.PI) / 180) * 12}
                    r="8"
                    className={PETAL[m.authorRole]}
                  />
                ))}
              <path
                d={LEAF}
                className={sealed ? 'fill-muted-foreground/40 stroke-muted-foreground' : FILL[m.authorRole]}
                strokeWidth={sealed ? 1.5 : 0}
                strokeDasharray={sealed ? '3 2' : undefined}
              />
              {bloom && <circle r="5" className="fill-card" />}
              {sealed && <rect x="-4" y="-2" width="8" height="7" rx="1.5" className="fill-foreground/70" />}
            </motion.g>
          </g>
        );
      })}
    </svg>
  );
}
