import mongoose, { Document, Model, Schema } from 'mongoose';

export type RegistrationStatus = 'REGISTERED';
export type PaymentStatus = 'NOT_REQUIRED' | 'PENDING' | 'COMPLETED' | 'FAILED';

export interface IRegistration {
  competitionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: RegistrationStatus;
  paymentStatus: PaymentStatus;
  registeredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRegistrationDocument extends IRegistration, Document {
  id: string;
}

const registrationSchema = new Schema<IRegistrationDocument>(
  {
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: [true, 'Competition ID is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['REGISTERED'],
      default: 'REGISTERED',
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['NOT_REQUIRED', 'PENDING', 'COMPLETED', 'FAILED'],
      default: 'NOT_REQUIRED',
      required: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as mongoose.Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as mongoose.Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Mandatory unique compound index to prevent duplicate registrations at the database level
registrationSchema.index({ competitionId: 1, userId: 1 }, { unique: true });

export const Registration: Model<IRegistrationDocument> =
  mongoose.models.Registration ||
  mongoose.model<IRegistrationDocument>('Registration', registrationSchema);
