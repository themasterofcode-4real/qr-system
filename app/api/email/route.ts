import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const subject = `[QR SYSTEM] ACCESS ${body.result} - ${body.name}`;

    const text = `
Timestamp: ${body.timestamp}
Name: ${body.name}
ID: ${body.userId}
Role: ${body.role}
Department: ${body.department}
Destination: ${body.destination}
Result: ${body.result}
Reason: ${body.reason ?? 'N/A'}
`;

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: 'RESEND_API_KEY not configured'
        },
        { status: 500 }
      );
    }

    const result = await resend.emails.send({
      from: 'QR Access Kiosk <onboarding@resend.dev>',
      to: ['Joseph.negri2014@gmail.com'],
      subject,
      text
    });

    console.log('Resend result:', result);

    return NextResponse.json({
      ok: true,
      result
    });
  } catch (error) {
    console.error('EMAIL ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : String(error)
      },
      { status: 500 }
    );
  }
}
