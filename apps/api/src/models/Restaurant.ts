import { Schema, model } from 'mongoose';

const restaurantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    currency: { type: String, default: 'INR' },
    taxPercent: { type: Number, default: 5, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Restaurant = model('Restaurant', restaurantSchema);
