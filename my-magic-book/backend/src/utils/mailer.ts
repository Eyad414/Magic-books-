// Sends the admin a notification when someone submits the contact form.
// Uses Resend's HTTPS API (https://api.resend.com) instead of SMTP, because
// most hosts (incl. Render) block outbound SMTP ports — so Gmail/SMTP times out.
// Needs RESEND_API_KEY. Sender defaults to Resend's shared onboarding domain,
// which can send to the address you registered with Resend (our admin inbox).

export async function sendAdminNotification(data: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}): Promise<void> {
  const adminEmail = process.env.CONTACT_TO || 'eyadat720@gmail.com';
  const from = process.env.RESEND_FROM || 'Magic Fanoos <onboarding@resend.dev>';
  const apiKey = process.env.RESEND_API_KEY;

  console.log(`[Mailer] Preparing to send message from ${data.email} to ${adminEmail}`);

  // Safe fallback if Resend isn't configured yet — just log the message.
  if (!apiKey || apiKey === 'your_resend_api_key') {
    console.warn('⚠️ Resend not configured (RESEND_API_KEY missing). Logging message instead:');
    console.log('--------------------------------------------------');
    console.log(`From: ${data.name} <${data.email}>`);
    console.log(`Phone: ${data.phone || 'N/A'}`);
    console.log(`Subject: ${data.subject}`);
    console.log(`Message: ${data.message}`);
    console.log('--------------------------------------------------');
    return;
  }

  const text = `لقد استلمت رسالة جديدة من نموذج الاتصال بموقع فوانيس السحرية:

الاسم: ${data.name}
البريد الإلكتروني: ${data.email}
الهاتف: ${data.phone || 'غير متوفر'}
الموضوع: ${data.subject}

محتوى الرسالة:
${data.message}`;

  const html = `
    <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 600px; margin: 0 auto; background-color: #fafafa;">
      <h2 style="color: #6d28d9; border-bottom: 2px solid #6d28d9; padding-bottom: 10px; margin-top: 0;">🔮 رسالة جديدة من نموذج الاتصال</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 8px 0; font-weight: bold; color: #444; width: 120px;">الاسم:</td><td style="padding: 8px 0; color: #666;">${data.name}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold; color: #444;">البريد الإلكتروني:</td><td style="padding: 8px 0; color: #666;"><a href="mailto:${data.email}">${data.email}</a></td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold; color: #444;">الهاتف:</td><td style="padding: 8px 0; color: #666;">${data.phone || 'غير متوفر'}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold; color: #444;">الموضوع:</td><td style="padding: 8px 0; color: #666; font-weight: bold;">${data.subject}</td></tr>
      </table>
      <div style="background-color: #fff; padding: 15px; border-right: 4px solid #6d28d9; border-radius: 4px; color: #333; line-height: 1.6; white-space: pre-wrap;">
${data.message}
      </div>
      <p style="font-size: 11px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
        تم إرسال هذه الرسالة تلقائياً من نظام إدارة موقع فوانيس السحرية.
      </p>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [adminEmail],
        reply_to: data.email,
        subject: `[Magic Fanoos Contact] ${data.subject}`,
        text,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Resend API ${res.status}: ${body.slice(0, 300)}`);
    }
    console.log(`[Mailer] Message successfully sent to ${adminEmail} via Resend`);
  } catch (error) {
    console.error('❌ Resend Error: Failed to send contact message email:', error);
    // Stay silent/logged so the API caller still gets a success response.
  }
}
