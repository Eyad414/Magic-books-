import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  /**
   * Google's stable subject id. Present when the account was created by, or
   * later linked to, "continue with Google".
   */
  googleId?: string;
  role: 'user' | 'admin';
  avatar?: string;
  phone?: string;
  location?: string;
  lastLoginAt?: Date;
  /** How many times this account has signed in. "Last seen" alone cannot tell
   *  a customer who keeps coming back from one who logged in once. */
  loginCount?: number;
  /** The last twenty sign-ins. A count says how often someone comes back; the
   *  times say when — evenings, weekends, right after a post went out. */
  loginHistory?: Date[];
  /** Last authenticated request from this account — what "online now" reads.
   *  Written at most once a minute, so browsing costs one small write, not one
   *  per request. */
  lastSeenAt?: Date;
  /** Timestamps of free cover previews this account generated. Each one costs
   *  real Gemini credit, so the quota counts the entries made since the user's
   *  most recent PAID order (see coverPreviewController). Trimmed to the last
   *  50 so the document can't grow without bound. */
  coverPreviews?: Date[];
  /** SHA-256 of the password-reset token, never the token itself — a leaked
   *  database dump would otherwise hand over working reset links. The plain
   *  token exists only in the email we send. */
  resetTokenHash?: string;
  resetTokenExpires?: Date;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Required for accounts that sign in with a password. An account created
    // through Google has none, and must not be given a guessable placeholder.
    passwordHash: {
      type: String,
      required: function (this: any) { return !this.googleId; },
      select: false,
    },
    // sparse: only accounts that actually used Google occupy the index, so the
    // uniqueness applies to real ids and not to a field full of nulls.
    googleId: { type: String, index: { unique: true, sparse: true } },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    avatar: { type: String },
    phone: { type: String, trim: true },
    location: { type: String, trim: true },
    lastLoginAt: { type: Date },
    loginCount: { type: Number, default: 0 },
    loginHistory: { type: [Date], default: undefined },
    lastSeenAt: { type: Date },
    coverPreviews: { type: [Date], default: undefined },
    // `select: false`, like passwordHash: these must never ride along in a user
    // object that gets serialised into an API response.
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export default mongoose.model<IUser>('User', UserSchema);
