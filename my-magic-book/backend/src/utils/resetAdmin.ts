import User from '../models/User';

// One-shot admin password reset, triggered by an env var so the account owner can
// regain access when they forget the password (there is no email-based reset flow).
//
// Usage (on the host, e.g. Render → Environment):
//   RESET_ADMIN_PASSWORD = <the new password you choose>
//   RESET_ADMIN_EMAIL    = <optional; defaults to eyadat720@gmail.com>
//
// On the next boot this resets that account's password and ensures it has the
// admin role, then logs a reminder to REMOVE the env var. It is secure because
// only someone with dashboard access to the server's environment can set it —
// the new password is typed straight into the host and never leaves it.
export async function maybeResetAdmin(): Promise<void> {
  const newPassword = process.env.RESET_ADMIN_PASSWORD;
  if (!newPassword) return; // no-op unless explicitly requested

  const email = (process.env.RESET_ADMIN_EMAIL || 'eyadat720@gmail.com').trim();
  try {
    let user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      user = await User.create({ name: 'Admin', email, passwordHash: newPassword, role: 'admin' });
      console.log(`🔑 [AdminReset] Created new admin account: ${email}`);
    } else {
      user.passwordHash = newPassword; // pre-save hook re-hashes it
      user.role = 'admin';
      await user.save();
      console.log(`🔑 [AdminReset] Password reset + admin role ensured for: ${email}`);
    }
    console.log('🔑 [AdminReset] SUCCESS — now REMOVE the RESET_ADMIN_PASSWORD env var so this stops running.');
  } catch (err) {
    console.error('🔑 [AdminReset] FAILED:', (err as Error).message);
  }
}
