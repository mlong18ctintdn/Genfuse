import type { Config } from 'tailwindcss';

const c = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: c('background'),
        foreground: c('foreground'),
        card: { DEFAULT: c('card'), foreground: c('card-foreground') },
        muted: { DEFAULT: c('muted'), foreground: c('muted-foreground') },
        accent: { DEFAULT: c('accent'), foreground: c('accent-foreground') },
        primary: { DEFAULT: c('primary'), foreground: c('primary-foreground') },
        destructive: { DEFAULT: c('destructive'), foreground: c('destructive-foreground') },
        border: c('border'),
        input: c('input'),
        ring: c('ring'),
        success: c('success'),
        // One colour per generation: used by the Memory Tree, chips and cards.
        gran: { DEFAULT: c('gran'), ink: c('gran-ink') },
        par: { DEFAULT: c('par'), ink: c('par-ink') },
        kid: { DEFAULT: c('kid'), ink: c('kid-ink') },
      },
      fontFamily: {
        sans: [
          'var(--font-body)',
          'system-ui',
          '"PingFang SC"',
          '"Noto Sans SC"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require('tailwindcss-animate')],
};

export default config;
