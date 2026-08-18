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
export declare function sendPasswordReset(data: {
    to: string;
    name?: string;
    resetUrl: string;
}): Promise<boolean>;
export declare function sendAdminNotification(data: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
}): Promise<void>;
//# sourceMappingURL=mailer.d.ts.map