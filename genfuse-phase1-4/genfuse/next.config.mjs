import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Signed URLs for private family photos in Supabase Storage
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/**' },
    ],
  },
};

export default withNextIntl(nextConfig);
