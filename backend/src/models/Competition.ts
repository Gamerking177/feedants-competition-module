import mongoose, { Document, Model, Schema } from 'mongoose';

export type CompetitionStatus =
  | 'DRAFT'
  | 'UPCOMING'
  | 'REGISTRATION_OPEN'
  | 'REGISTRATION_CLOSED'
  | 'SUBMISSION_OPEN'
  | 'SUBMISSION_CLOSED'
  | 'RESULT_PUBLISHED'
  | 'COMPLETED';

export const COMPETITION_STATUSES: CompetitionStatus[] = [
  'DRAFT',
  'UPCOMING',
  'REGISTRATION_OPEN',
  'REGISTRATION_CLOSED',
  'SUBMISSION_OPEN',
  'SUBMISSION_CLOSED',
  'RESULT_PUBLISHED',
  'COMPLETED',
];

export interface IJudge {
  name: string;
  designation?: string;
  organization?: string;
  avatarUrl?: string;
  videoUrl?: string;
}

export interface IReward {
  position: number;
  title: string;
  amount?: number;
  description?: string;
}

export interface IPreviousWinner {
  name: string;
  position: number;
  year?: number;
  imageUrl?: string;
}

export interface IJudgingParameter {
  name: string;
  description?: string;
  weight?: number;
}

export interface IRule {
  order: number;
  title?: string;
  description: string;
}

export interface ICompetition {
  title: string;
  slug: string;
  category: string;
  type: string;
  description: string;
  language: string;
  prizePool: number;
  entryFee: number;
  maxParticipants: number;
  registeredCount: number;
  certificateAvailable: boolean;
  registrationStart: Date;
  registrationEnd: Date;
  submissionStart: Date;
  submissionEnd: Date;
  resultDate?: Date;
  judge?: IJudge;
  rewards: IReward[];
  previousWinners: IPreviousWinner[];
  judgingParameters: IJudgingParameter[];
  rules: IRule[];
  status: CompetitionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICompetitionDocument extends ICompetition, Document {
  id: string;
}

const judgeSchema = new Schema<IJudge>(
  {
    name: { type: String, required: [true, 'Judge name is required'], trim: true },
    designation: { type: String, trim: true },
    organization: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    videoUrl: { type: String, trim: true },
  },
  { _id: false }
);

const rewardSchema = new Schema<IReward>(
  {
    position: { type: Number, required: [true, 'Reward position is required'], min: 1 },
    title: { type: String, required: [true, 'Reward title is required'], trim: true },
    amount: { type: Number, min: [0, 'Reward amount cannot be negative'] },
    description: { type: String, trim: true },
  },
  { _id: false }
);

const previousWinnerSchema = new Schema<IPreviousWinner>(
  {
    name: { type: String, required: [true, 'Winner name is required'], trim: true },
    position: { type: Number, required: [true, 'Winner position is required'], min: 1 },
    year: { type: Number, min: 2000 },
    imageUrl: { type: String, trim: true },
  },
  { _id: false }
);

const judgingParameterSchema = new Schema<IJudgingParameter>(
  {
    name: { type: String, required: [true, 'Judging parameter name is required'], trim: true },
    description: { type: String, trim: true },
    weight: { type: Number, min: [0, 'Weight cannot be negative'] },
  },
  { _id: false }
);

const ruleSchema = new Schema<IRule>(
  {
    order: { type: Number, required: [true, 'Rule order is required'], min: 1 },
    title: { type: String, trim: true },
    description: { type: String, required: [true, 'Rule description is required'], trim: true },
  },
  { _id: false }
);

const competitionSchema = new Schema<ICompetitionDocument>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Type is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    language: {
      type: String,
      default: 'English',
      trim: true,
    },
    prizePool: {
      type: Number,
      required: [true, 'Prize pool is required'],
      min: [0, 'Prize pool cannot be negative'],
    },
    entryFee: {
      type: Number,
      required: [true, 'Entry fee is required'],
      min: [0, 'Entry fee cannot be negative'],
      default: 0,
    },
    maxParticipants: {
      type: Number,
      required: [true, 'Max participants is required'],
      min: [1, 'Max participants must be at least 1'],
    },
    registeredCount: {
      type: Number,
      required: [true, 'Registered count is required'],
      min: [0, 'Registered count cannot be negative'],
      default: 0,
    },
    certificateAvailable: {
      type: Boolean,
      default: false,
    },
    registrationStart: {
      type: Date,
      required: [true, 'Registration start date is required'],
      index: true,
    },
    registrationEnd: {
      type: Date,
      required: [true, 'Registration end date is required'],
      index: true,
    },
    submissionStart: {
      type: Date,
      required: [true, 'Submission start date is required'],
      index: true,
    },
    submissionEnd: {
      type: Date,
      required: [true, 'Submission end date is required'],
    },
    resultDate: {
      type: Date,
      index: true,
    },
    judge: {
      type: judgeSchema,
    },
    rewards: {
      type: [rewardSchema],
      default: [],
    },
    previousWinners: {
      type: [previousWinnerSchema],
      default: [],
    },
    judgingParameters: {
      type: [judgingParameterSchema],
      default: [],
    },
    rules: {
      type: [ruleSchema],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: COMPETITION_STATUSES,
        message: '{VALUE} is not a valid competition status',
      },
      default: 'DRAFT',
      index: true,
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

// Compound index for category & status queries
competitionSchema.index({ status: 1, category: 1 });

// Business validation rules before save
competitionSchema.pre('validate', function (next) {
  // 1. Capacity validation
  if (
    typeof this.registeredCount === 'number' &&
    typeof this.maxParticipants === 'number' &&
    this.registeredCount > this.maxParticipants
  ) {
    this.invalidate('registeredCount', 'registeredCount cannot exceed maxParticipants');
  }

  // 2. Date chronological order validation
  if (this.registrationStart && this.registrationEnd) {
    if (this.registrationEnd.getTime() <= this.registrationStart.getTime()) {
      this.invalidate('registrationEnd', 'registrationEnd must be after registrationStart');
    }
  }

  if (this.registrationEnd && this.submissionStart) {
    if (this.submissionStart.getTime() < this.registrationEnd.getTime()) {
      this.invalidate('submissionStart', 'submissionStart must be on or after registrationEnd');
    }
  }

  if (this.submissionStart && this.submissionEnd) {
    if (this.submissionEnd.getTime() <= this.submissionStart.getTime()) {
      this.invalidate('submissionEnd', 'submissionEnd must be after submissionStart');
    }
  }

  if (this.submissionEnd && this.resultDate) {
    if (this.resultDate.getTime() < this.submissionEnd.getTime()) {
      this.invalidate('resultDate', 'resultDate must be on or after submissionEnd');
    }
  }

  next();
});

export const Competition: Model<ICompetitionDocument> =
  mongoose.models.Competition ||
  mongoose.model<ICompetitionDocument>('Competition', competitionSchema);
