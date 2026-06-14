import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
export const metadata: Metadata = { title: 'QR Access Kiosk', description: 'Browser-based access kiosk for Vercel.' };
export default function RootLayout({children}:{children:ReactNode}){return <html lang="en"><body>{children}</body></html>}
