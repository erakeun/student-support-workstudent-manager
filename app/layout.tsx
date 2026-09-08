import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: '한양대학교 ERICA 학생지원팀 근로관리',
  description: '학생지원팀 근로장학생 통합 시간표, 담당업무 및 근태 관리 포털',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <Script src={`${process.env.BASE_PATH || ''}/runtime-config.js`} strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
