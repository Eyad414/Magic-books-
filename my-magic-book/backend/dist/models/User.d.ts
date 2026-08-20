import mongoose, { Document } from 'mongoose';
export interface IUser extends Document {
    name: string;
    email: string;
    passwordHash: string;
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
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=User.d.ts.map