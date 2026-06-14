import { NextResponse } from 'next/server';
import { USERS } from '@/lib/kiosk';
export const runtime = 'nodejs';
export async function GET(){return NextResponse.json({ email:Boolean(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS&&process.env.EMAIL_TO), database:Object.keys(USERS).length===4, server:true });}
