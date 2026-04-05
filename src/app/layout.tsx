import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '별빛 사주 | Starlight Saju',
  description: '네 생일에 우주가 살짝 남겨둔 이야기 | AI-powered Korean Saju fortune-telling',
  icons: { icon: '/favicon.svg' },
  manifest: '/manifest.json',
  openGraph: {
    title: '별빛 사주 | Starlight Saju',
    description: '네 생일에 우주가 살짝 남겨둔 이야기 | AI-powered Korean Saju fortune-telling',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0A0E2A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="별빛 사주" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;800&family=Gamja+Flower&family=Gowun+Dodum&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
