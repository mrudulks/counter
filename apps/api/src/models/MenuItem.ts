import { Schema, model, Types } from 'mongoose';

const menuItemSchema = new Schema(
  {
    restaurant: { type: Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    isVeg: { type: Boolean, default: true },
    image: { type: String, default: '' },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const MenuItem = model('MenuItem', menuItemSchema);
