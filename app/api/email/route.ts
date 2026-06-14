import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

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

    console.log('========================================');
    console.log('QR ACCESS EMAIL REQUEST');
    console.log('Recipient: Joseph.negri2014@gmail.com');
    console.log('Subject:', subject);
    console.log('========================================');

    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    ) {
      console.error('SMTP environment variables missing');

      return NextResponse.json(
        {
          ok: false,
          error:
            'Missing SMTP_HOST, SMTP_USER, or SMTP_PASS environment variables'
        },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    console.log('Verifying SMTP connection...');

    await transporter.verify();

    console.log('SMTP verified successfully');

    const info = await transporter.sendMail({
      from:
        process.env.EMAIL_FROM ??
        `"QR Access Kiosk" <${process.env.SMTP_USER}>`,
      to: 'Joseph.negri2014@gmail.com',
      subject,
      text
    });

    console.log('Email sent successfully');
    console.log('Message ID:', info.messageId);

    return NextResponse.json({
      ok: true,
      messageId: info.messageId,
      recipient: 'Joseph.negri2014@gmail.com'
    });
  } catch (error) {
    console.error('========================================');
    console.error('EMAIL FAILURE');
    console.error(error);
    console.error('========================================');

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown email error'
      },
      { status: 500 }
    );
  }
}
