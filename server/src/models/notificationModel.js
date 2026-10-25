import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: [
        'MATCH',
        'REQUEST',
        'REQUEST_ACCEPTED',
        'REQUEST_DECLINED',
        'MESSAGE',
        'SESSION_SCHEDULED',
        'SESSION_COMPLETED',
        'REVIEW_RECEIVED',
        'CIRCLE_INVITE',
        'CIRCLE_JOIN_REQUEST',
        'CIRCLE_REQUEST_ACCEPTED',
        'CIRCLE_ANNOUNCEMENT',
        'CIRCLE_SESSION_SCHEDULED',
        'CIRCLE_ROADMAP_UPDATE',
        'GOAL_REMINDER',
        'PLATFORM_ANNOUNCEMENT',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      default: '',
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
