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