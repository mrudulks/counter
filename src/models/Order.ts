import { Schema, model, Types } from 'mongoose';

export const ORDER_STATUSES = ['open', 'completed', 'cancelled'] as const;
export const ITEM_STATUSES = ['pending', 'preparing', 'ready', 'served', 'cancelled'] as const;
export const PAYMENT_METHODS = ['cash', 'card', 'upi'] as const;

const orderItemSchema = new Schema({
  menuItem: { type: Types.ObjectId, ref: 'MenuItem', required: true },
  // Snapshot name/price so later menu edits don't rewrite history
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  notes: { type: String, default: '' },
  status: { type: String, enum: ITEM_STATUSES, default: 'pending' },
});

const orderSchema = new Schema(
  {
    restaurant: { type: Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    orderNumber: { type: Number, required: true },
    table: { type: Types.ObjectId, ref: 'Table', default: null },
    type: { type: String, enum: ['dine-in', 'takeaway'], default: 'dine-in' },
    items: { type: [orderItemSchema], default: [] },
    status: { type: String, enum: ORDER_STATUSES, default: 'open' },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: [...PAYMENT_METHODS, null], default: null },
    notes: { type: String, default: '' },
    createdBy: { type: Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

orderSchema.index({ restaurant: 1, orderNumber: 1 }, { unique: true });

export const Order = model('Order', orderSchema);
