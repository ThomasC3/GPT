import { mongodb } from '../services';

const { Schema } = mongodb;

const userType = {
  values: ['DRIVER', 'RIDER'],
  message: 'Value must be either of \'DRIVER\', \'RIDER\''
};
const env = {
  values: ['release', 'debug'],
  message: 'Value must be either of \'release\', \'debug\''
};
const platform = {
  values: ['android', 'ios'],
  message: 'Value must be either of \'android\', \'ios\''
};

export const { ObjectId } = Schema;

const SnsArnSchema = Schema({
  endpointArn: {
    type: String,
    required: true
  },
  deviceToken: {
    type: String,
    required: true
  },
  userId: {
    type: ObjectId,
    required: true
  },
  userType: {
    type: String,
    enum: userType,
    required: true
  },
  env: {
    type: String,
    enum: env,
    required: true
  },
  platform: {
    type: String,
    enum: platform,
    required: true
  }
}, {
  versionKey: false,
  collection: 'SnsArns',
  strict: 'throw'
});

SnsArnSchema.index({ userId: 1, userType: 1 }, { background: true });
SnsArnSchema.index({ deviceToken: 1 }, { background: true });

SnsArnSchema.set('toJSON', { getters: true });

export default mongodb.model('SnsArn', SnsArnSchema);
