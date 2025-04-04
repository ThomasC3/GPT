import { mongodb } from '../services';

const { Schema } = mongodb;

const TimeSlotSchema = Schema({
  day: {
    type: String,
    enum: [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday'
    ],
    required: true
  },
  openTime: {
    type: String,
    required: true
  },
  closeTime: {
    type: String,
    required: true
  },
  closed: {
    type: Boolean,
    default: false
  }
}, { _id: false, strict: 'throw' });

export default TimeSlotSchema;
