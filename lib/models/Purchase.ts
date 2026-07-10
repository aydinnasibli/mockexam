import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPurchase extends Document {
  userId: string;
  examId: string;
  transactionId: string;
  amountCents: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  attemptCount: number;
  orderHistory: string[];
  createdAt: Date;
}

const PurchaseSchema = new Schema<IPurchase>(
  {
    userId: { type: String, required: true, index: true },
    examId: { type: String, required: true },
    transactionId: { type: String, required: true },
    amountCents: { type: Number, required: true },
    currency: { type: String, required: true, default: 'AZN' },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
      required: true,
      default: 'COMPLETED',
    },
    attemptCount: { type: Number, required: true, default: 0 },
    orderHistory: { type: [String], default: [] },
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
