import nodemailer from 'nodemailer';

export async function sendAdminNotification(data: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}): Promise<void> {
  const adminEmail = 'eyadat720@gmail.com';
  
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  console.log(`[Mailer] Preparing to send message from ${data.email} to ${adminEmail}`);

  // Safe fallback if SMTP settings are placeholders
  if (!user || user === 'your_email@gmail.com' || !pass || pass === 'your_app_password') {
    console.warn('⚠️ Nodemailer: SMTP is not configured in .env. Logging message content directly:');
    console.log(`--------------------------------------------------`);
    console.log(`From: ${data.name} <${data.email}>`);
    console.log(`Phone: ${data.phone || 'N/A'}`);
    console.log(`Subject: ${data.subject}`);
    console.log(`Message: ${data.message}`);
    console.log(`--------------------------------------------------`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports like 587
      auth: {
        user,
        pass,
      },
    });

    const mailOptions = {
      from: `"${data.name}" <${user}>`,
      replyTo: data.email,
      to: adminEmail,
      subject: `[Magic Fanoos Contact] ${data.subject}`,
      text: `لقد استلمت رسالة جديدة من نموذج الاتصال بموقع فوانيس السحرية:
      
الاسم: ${data.name}
البريد الإلكتروني: ${data.email}
الهاتف: ${data.phone || 'غير متوفر'}
الموضوع: ${data.subject}

محتوى الرسالة:
${data.message}`,
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 600px; margin: 0 auto; background-color: #fafafa;">
          <h2 style="color: #6d28d9; border-bottom: 2px solid #6d28d9; padding-bottom: 10px; margin-top: 0;">🔮 رسالة جديدة من نموذج الاتصال</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #444; width: 120px;">الاسم:</td>
              <td style="padding: 8px 0; color: #666;">${data.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #444;">البريد الإلكتروني:</td>
              <td style="padding: 8px 0; color: #666;"><a href="mailto:${data.email}">${data.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #444;">الهاتف:</td>
              <td style="padding: 8px 0; color: #666;">${data.phone || 'غير متوفر'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #444;">الموضوع:</td>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">${data.subject}</td>
            </tr>
          </table>
          
          <div style="background-color: #fff; padding: 15px; border-right: 4px solid #6d28d9; border-radius: 4px; color: #333; line-height: 1.6; white-space: pre-wrap;">
${data.message}
          </div>
          
          <p style="font-size: 11px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
            تم إرسال هذه الرسالة تلقائياً من نظام إدارة موقع فوانيس السحرية.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Mailer] Message successfully sent to ${adminEmail}`);
  } catch (error) {
    console.error('❌ Nodemailer Error: Failed to send contact message email:', error);
    // Keep it silent/logged so that the API user still gets a 201 response.
  }
}
