import { mongodb } from '../services';

const { Schema } = mongodb;

const senderType = {
  values: ['DRIVER', 'RIDER'],
  message: 'Value must be either of \'DRIVER\', \'RIDER\''
};

export const { ObjectId } = Schema;

const MessageSchema = Schema({
  createdTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  message: {
    type: String
  },
  owner: {
    type: ObjectId,
    ref: 'Rider',
    required: true
  },
  ride: {
    type: ObjectId,
    ref: 'Ride'
  },
  sender: {
    type: String,
    enum: senderType,
    required: true
  }
}, {
  versionKey: false,
  collection: 'Messages',
  strict: 'throw'
});

class Message {
  static async createByRider(body) {
    try {
      const newMessage = await this.create({
        ...body,
        sender: 'RIDER'
      });
      return newMessage;
    } catch (err) {
      throw err;
    }
  }
}

MessageSchema.loadClass(Message);

MessageSchema.set('toJSON', { getters: true });

export default mongodb.model('Message', MessageSchema);
