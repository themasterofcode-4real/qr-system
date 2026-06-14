import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY missing');

      return NextResponse.json(
        {
          ok: false,
          error: 'RESEND_API_KEY missing'
        },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

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

    console.log('================================');
    console.log('SENDING EMAIL');
    console.log('Subject:', subject);
    console.log('Recipient: Joseph.negri2014@gmail.com');
    console.log('================================');

    const result = await resend.emails.send({
      from: 'QR Access Kiosk <onboarding@resend.dev>',
      to: ['joseph.negri2014@gmail.com'],
      subject,
      text
    });

    console.log('================================');
    console.log('RESEND RESPONSE');
    console.log(JSON.stringify(result, null, 2));
    console.log('================================');

    return NextResponse.json({
      ok: true,
      resendResult: result
    });
  } catch (error) {
    console.error('================================');
    console.error('EMAIL ERROR');
    console.error(error);
    console.error('================================');

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
