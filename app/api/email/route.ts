import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: 'RESEND_API_KEY not configured'
        },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const body = await req.json();

    const granted = body.result === 'GRANTED';

    const prettyDestination = String(body.destination || '')
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

    const timestamp = new Date(
      body.timestamp || Date.now()
    ).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short'
    });

    const subject = granted
      ? `✅ ACCESS GRANTED - ${body.name}`
      : `❌ ACCESS DENIED - ${body.name}`;

    const text = `
QR ACCESS KIOSK

ACCESS ${granted ? 'GRANTED' : 'DENIED'}

Name: ${body.name}
ID Number: ${body.userId}
Role: ${body.role}
Department: ${body.department}
Destination: ${prettyDestination}
Time: ${timestamp}
Result: ${body.result}
Reason: ${body.reason ?? 'N/A'}
`;

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body style="
  margin:0;
  padding:20px;
  background:#f3f4f6;
  font-family:Arial, Helvetica, sans-serif;
">

<div style="
  max-width:700px;
  margin:auto;
  background:white;
  border-radius:18px;
  overflow:hidden;
  box-shadow:0 4px 20px rgba(0,0,0,.12);
">

  <div style="
    background:${granted ? '#16a34a' : '#dc2626'};
    color:white;
    text-align:center;
    padding:35px;
  ">

    <div style="font-size:64px;">
      ${granted ? '✅' : '❌'}
    </div>

    <h1 style="
      margin:10px 0 0;
      font-size:34px;
      font-weight:700;
    ">
      ACCESS ${granted ? 'GRANTED' : 'DENIED'}
    </h1>

  </div>

  <div style="padding:30px;">

    <h2 style="
      margin-top:0;
      color:#111827;
      font-size:28px;
    ">
      ${body.name}
    </h2>

    <table style="
      width:100%;
      border-collapse:collapse;
      font-size:16px;
    ">

      <tr>
        <td style="padding:10px;font-weight:bold;">ID Number</td>
        <td style="padding:10px;">${body.userId}</td>
      </tr>

      <tr>
        <td style="padding:10px;font-weight:bold;">Role</td>
        <td style="padding:10px;">${body.role}</td>
      </tr>

      <tr>
        <td style="padding:10px;font-weight:bold;">Department</td>
        <td style="padding:10px;">${body.department}</td>
      </tr>

      <tr>
        <td style="padding:10px;font-weight:bold;">Destination</td>
        <td style="padding:10px;">${prettyDestination}</td>
      </tr>

      <tr>
        <td style="padding:10px;font-weight:bold;">Time</td>
        <td style="padding:10px;">${timestamp}</td>
      </tr>

      <tr>
        <td style="padding:10px;font-weight:bold;">Result</td>
        <td style="
          padding:10px;
          font-weight:bold;
          color:${granted ? '#16a34a' : '#dc2626'};
        ">
          ${body.result}
        </td>
      </tr>

      ${
        !granted
          ? `
      <tr>
        <td style="padding:10px;font-weight:bold;">Reason</td>
        <td style="padding:10px;">
          ${body.reason ?? 'No reason supplied'}
        </td>
      </tr>
      `
          : ''
      }

    </table>

    <hr style="
      margin:30px 0;
      border:none;
      border-top:1px solid #e5e7eb;
    ">

    <div style="
      text-align:center;
      color:#6b7280;
      font-size:14px;
    ">
      QR Access Kiosk<br>
      Automated Security Notification
    </div>

  </div>

</div>

</body>
</html>
`;

    const result = await resend.emails.send({
      from: 'QR Access Kiosk <onboarding@resend.dev>',
      to: ['joseph.negri2014@gmail.com'],
      subject,
      text,
      html
    });

    console.log('================================');
    console.log('EMAIL SENT');
    console.log(JSON.stringify(result, null, 2));
    console.log('================================');

    if ((result as any)?.error) {
      return NextResponse.json(
        {
          ok: false,
          resendError: (result as any).error
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      result
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