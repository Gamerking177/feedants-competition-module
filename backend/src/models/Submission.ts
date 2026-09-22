import mongoose, { Document, Model, Schema } from 'mongoose';

export type SubmissionStatus = 'SUBMITTED';

export interface ISubmission {
  competitionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  fileUrl: string;
  fileType: string;
  status: SubmissionStatus;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubmissionDocument extends ISubmission, Document {
  id: string;
}

const submissionSchema = new Schema<ISubmissionDocument>(
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
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
      trim: true,
    },
    fileType: {
      type: String,
      required: [true, 'File type is required'],
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ['SUBMITTED'],
      default: 'SUBMITTED',
      required: true,
    },
    submittedAt: {
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

// Mandatory unique compound index guaranteeing one submission per user per competition
submissionSchema.index({ competitionId: 1, userId: 1 }, { unique: true });

export const Submission: Model<ISubmissionDocument> =
  mongoose.models.Submission ||
  mongoose.model<ISubmissionDocument>('Submission', submissionSchema);
