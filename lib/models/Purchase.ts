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
    // No field-level `index: true`: `{userId}` is a prefix of the unique
    // compound index below, which already answers it. See the note there.
    userId: { type: String, required: true },
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

// One purchase per user per exam. Its `{userId}` prefix also answers every
// per-user lookup, which is why no standalone userId index is declared.
PurchaseSchema.index({ userId: 1, examId: 1 }, { unique: true });

/*
 * Kept deliberately, even though `{userId, examId}` is already unique.
 *
 * Adding `status` makes both entitlement reads COVERED queries — answered from
 * the index alone, with no document fetch:
 *   hasExamAccess:  findOne({userId, examId, status:'COMPLETED'}, {_id:1})
 *   ownedExamIds:   find({userId, status:'COMPLETED'}, {examId:1})
 * hasExamAccess runs on every protected page and server action in the app, so
 * this is the one index here that earns its write cost.
 *
 * NOTE: Mongoose never drops removed indexes. The now-deleted standalone
 * userId index survives on existing deployments until dropped by hand:
 *   db.purchases.dropIndex('userId_1')
 */
PurchaseSchema.index({ userId: 1, examId: 1, status: 1 });

const Purchase: Model<IPurchase> =
  (mongoose.models.Purchase as Model<IPurchase>) ||
  mongoose.model<IPurchase>('Purchase', PurchaseSchema);

export default Purchase;
