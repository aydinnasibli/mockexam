import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPurchase extends Document {
  userId: string;
  examId: string;
  lsOrderId: string;       // LemonSqueezy order ID
  lsOrderItemId?: string;
  amountCents: number;
  currency: string;
  status: 'COMPLETED' | 'FAILED';
  createdAt: Date;
}

const PurchaseSchema = new Schema<IPurchase>(
  {
    userId: { type: String, required: true, index: true },
    examId: { type: String, required: true },
    lsOrderId: { type: String, required: true, unique: true },
    lsOrderItemId: { type: String },
    amountCents: { type: Number, required: true },
    currency: { type: String, required: true, default: 'AZN' },
    status: {
      type: String,
      enum: ['COMPLETED', 'FAILED'],
      required: true,
      default: 'COMPLETED',
    },
  },
  { timestamps: true }
);

// One purchase per user per exam
PurchaseSchema.index({ userId: 1, examId: 1 }, { unique: true });
// Optimise the common query: findOne({ userId, examId, status })
PurchaseSchema.index({ userId: 1, examId: 1, status: 1 });

const Purchase: Model<IPurchase> =
  (mongoose.models.Purchase as Model<IPurchase>) ||
  mongoose.model<IPurchase>('Purchase', PurchaseSchema);

export default Purchase;
