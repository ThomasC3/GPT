import mongoose  from 'mongoose';

const { Schema } = mongoose;

const polygonSchema = Schema({
  type: {
    type: String,
    enum: ['Polygon'],
    required: true
  },
  coordinates: {
    type: [[[Number]]],
    required: true
  }
}, {
  versionKey: false
});

export default polygonSchema;
