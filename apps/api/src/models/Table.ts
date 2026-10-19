import { Schema, model, Types } from 'mongoose';

export const TABLE_STATUSES = ['available', 'occupied', 'reserved'] as const;

const tableSchema = new Schema(
  {
    restaurant: { type: Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    seats: { type: Number, default: 4, min: 1 },
    status: { type: String, enum: TABLE_STATUSES, default: 'available' },
  },
  { timestamps: true },
);

tableSchema.index({ restaurant: 1, name: 1 }, { unique: true });

export const Table = model('Table', tableSchema);
