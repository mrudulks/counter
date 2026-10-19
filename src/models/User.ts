import { Schema, model, Types, InferSchemaType, HydratedDocument } from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLES = ['superadmin', 'admin', 'staff', 'kitchen'] as const;
export type Role = (typeof ROLES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    // Every role except superadmin belongs to exactly one restaurant
    restaurant: { type: Types.ObjectId, ref: 'Restaurant', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export type UserAttrs = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserAttrs> & {
  comparePassword(candidate: string): Promise<boolean>;
};

export const User = model('User', userSchema);
