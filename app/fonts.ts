import { Anton, Inter } from 'next/font/google';

export const primary = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
});

export const secondary = Inter({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
