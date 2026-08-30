// Sends the admin a notification when someone submits the contact form.
// Uses Resend's HTTPS API (https://api.resend.com) instead of SMTP, because
// most hosts (incl. Render) block outbound SMTP ports — so Gmail/SMTP times out.
// Needs RESEND_API_KEY. Sender defaults to Resend's shared onboarding domain,
// which can send to the address you registered with Resend (our admin inbox).

/**
 * Send a customer their password-reset link.
 *
 * Unlike the contact form, this goes to a CUSTOMER's address, and that matters:
 * Resend's shared `onboarding@resend.dev` sender may only deliver to the
 * address the Resend account was registered with. Until a real domain is
 * verified in Resend and RESEND_FROM points at it, every reset mail to a
 * customer is rejected — so this reports whether it actually sent, and the
 * caller logs a loud warning. The HTTP response stays deliberately vague
 * either way (see forgotPassword) so nobody can probe which emails exist.
 */
export async function sendPasswordReset(data: {
  to: string;
  name?: string;
  resetUrl: string;
}): Promise<boolean> {
  const from = process.env.RESEND_FROM || 'Magic Fanoos <onboarding@resend.dev>';
  const replyTo = process.env.CONTACT_TO || 'eyadat720@gmail.com';
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey === 'your_resend_api_key') {
    console.warn('⚠️ Resend not configured — password reset link NOT emailed.');
    console.log(`[Mailer] reset link for ${data.to}: ${data.resetUrl}`);
    return false;
  }

  const greeting = data.name ? `مرحباً ${data.name}` : 'مرحباً';
  const text = `${greeting},

وصلنا طلب لإعادة تعيين كلمة المرور لحسابك في الفانوس السحري.

افتح هذا الرابط لاختيار كلمة مرور جديدة (صالح لمدة ساعة واحدة):
${data.resetUrl}

إذا لم تطلب ذلك، تجاهل هذه الرسالة — كلمة مرورك لم تتغير.`;

  const html = `
    <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 24px; max-width: 560px; margin: 0 auto; background-color: #fafafa; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #6d28d9; margin-top: 0;">🔑 إعادة تعيين كلمة المرور</h2>
      <p style="color: #333; line-height: 1.7;">${greeting}، وصلنا طلب لإعادة تعيين كلمة المرور لحسابك في <strong>الفانوس السحري</strong>.</p>
      <p style="text-align: center; margin: 28px 0;">
        <a href="${data.resetUrl}" style="background-color: #6d28d9; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; display: inline-block; font-weight: bold;">اختيار كلمة مرور جديدة</a>
      </p>
      <p style="color: #666; font-size: 13px;">الرابط صالح لمدة ساعة واحدة. إذا لم تطلب ذلك، تجاهل هذه الرسالة — كلمة مرورك لم تتغير.</p>
      <p style="font-size: 11px; color: #999; margin-top: 24px; border-top: 1px solid #eee; padding-top: 10px;">الفانوس السحري · magicfanoos.com</p>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      // hello@ is a sending address with no mailbox behind it — the `send` MX
      // only carries bounces. Without this, a customer who simply hits Reply
      // is writing into nothing and hears back never.
      body: JSON.stringify({ from, to: [data.to], reply_to: replyTo, subject: 'إعادة تعيين كلمة المرور — الفانوس السحري', text, html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Resend API ${res.status}: ${body.slice(0, 300)}`);
    }
    console.log(`[Mailer] password reset sent to ${data.to}`);
    return true;
  } catch (error) {
    console.error('❌ Resend Error: password reset email failed:', error);
    return false;
  }
}

export async function sendAdminNotification(data: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}): Promise<{ sent: boolean; reason?: string }> {
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
    return { sent: false, reason: 'not-configured' };
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
    return { sent: true };
  } catch (error: any) {
    console.error('❌ Resend Error: Failed to send contact message email:', error);
    // Still not thrown — a customer who wrote to us must always be told their
    // message was received, because it WAS. But the outcome is returned now
    // instead of swallowed, so the shop can see that nobody was alerted.
    return { sent: false, reason: error?.message || 'error' };
  }
}

/**
 * Tell a customer the shop wrote to them.
 *
 * The message itself lives in their account; this is the nudge that gets them
 * to go and read it, and it deliberately does NOT repeat the whole message —
 * email is not the private channel, the account is.
 *
 * Same shared-sender limit as the password reset: until magicfanoos.com is
 * verified in Resend and RESEND_FROM points at it, Resend rejects anything
 * addressed to someone other than the account owner. The caller is told which
 * happened so the dashboard can say so rather than implying an email went out.
 */
export async function sendCustomerMessageEmail(data: {
  to: string;
  name?: string;
  preview: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const from = process.env.RESEND_FROM || 'Magic Fanoos <onboarding@resend.dev>';
  const replyTo = process.env.CONTACT_TO || 'eyadat720@gmail.com';
  const apiKey = process.env.RESEND_API_KEY;
  const url = `${process.env.FRONTEND_URL || 'https://magicfanoos.com'}/dashboard`;

  if (!apiKey || apiKey === 'your_resend_api_key') {
    return { sent: false, reason: 'not-configured' };
  }

  const greeting = data.name ? `مرحباً ${data.name}` : 'مرحباً';
  // A short taste of the message, not the message. Enough to know it matters.
  const preview = data.preview.length > 140 ? `${data.preview.slice(0, 140)}…` : data.preview;
  const text = `${greeting},

في رسالة جديدة إلك من الفانوس السحري:

"${preview}"

افتح حسابك لتقرأها وترد عليها:
${url}`;

  const html = `
    <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 24px; max-width: 560px; margin: 0 auto; background-color: #fafafa; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #6d28d9; margin-top: 0;">✉️ رسالة جديدة إلك</h2>
      <p style="color: #333; line-height: 1.7;">${greeting}، في رسالة جديدة إلك من <strong>الفانوس السحري</strong>:</p>
      <blockquote style="margin: 18px 0; padding: 12px 16px; background: #fff; border-right: 4px solid #6d28d9; color: #444; line-height: 1.7;">${preview}</blockquote>
      <p style="text-align: center; margin: 28px 0;">
        <a href="${url}" style="background-color: #6d28d9; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; display: inline-block; font-weight: bold;">افتح حسابك واقرأ الرسالة</a>
      </p>
      <p style="font-size: 11px; color: #999; margin-top: 24px; border-top: 1px solid #eee; padding-top: 10px;">الفانوس السحري · magicfanoos.com</p>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      // Same reason as the reset mail: this one invites a reply by its nature.
      body: JSON.stringify({ from, to: [data.to], reply_to: replyTo, subject: 'رسالة جديدة من الفانوس السحري', text, html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      // The shared sender refuses any recipient but the account owner. That is
      // a configuration fact, not a bug, and the dashboard should say so.
      const shared = !process.env.RESEND_FROM && /testing|verify a domain|own email/i.test(body);
      console.warn(`[Mailer] customer message email failed (${res.status}): ${body.slice(0, 200)}`);
      return { sent: false, reason: shared ? 'shared-sender' : `resend-${res.status}` };
    }
    console.log(`[Mailer] message notification sent to ${data.to}`);
    return { sent: true };
  } catch (error: any) {
    console.error('❌ Resend Error: message notification failed:', error?.message || error);
    return { sent: false, reason: 'network' };
  }
}
