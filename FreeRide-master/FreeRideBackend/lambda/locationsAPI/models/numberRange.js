import mongoose  from 'mongoose';

const { Schema } = mongoose;

const numberRangeSchema = Schema({
  min: {
    type: Number,
    default: null
  },
  max: {
    type: Number,
    default: null
  }
}, {
  _id: false,
  versionKey: false
});

export default numberRangeSchema;
