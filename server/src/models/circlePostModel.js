import mongoose from 'mongoose';

const circleReplySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Reply content cannot be empty'],
      trim: true,
      maxlength: [2000, 'Reply cannot exceed 2000 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const circlePostSchema = new mongoose.Schema(
  {
    circle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Circle',
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Post title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Post content is required'],
      trim: true,
      maxlength: [5000, 'Post content cannot exceed 5000 characters'],
    },
    isAnnouncement: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    replies: [circleReplySchema],
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

circlePostSchema.index({ circle: 1, isPinned: -1, createdAt: -1 });

export const CirclePost = mongoose.model('CirclePost', circlePostSchema);
export default CirclePost;
