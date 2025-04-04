import { mongodb } from '../services';

const { Schema } = mongodb;

export const { ObjectId } = Schema.Types;

const metadataSchema = Schema({
  location: {
    type: ObjectId,
    ref: 'Location'
  },
  intervals: {
    type: Object
  },
  instantaneous: {
    type: Number
  },
  timestampType: {
    type: String
  },
  measurements: {
    type: [Number]
  },
  rideIds: {
    type: [ObjectId],
    ref: 'Ride'
  }
}, {
  _id: false,
  versionKey: false
});

const timeseriesSchema = Schema({
  timestamp: {
    type: Date,
    required: true
  },
  measurement: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  metadata: {
    type: metadataSchema
  }
},
{
  versionKey: false,
  collection: 'Timeseries'
});

class Timeseries {
  static async createReading(body) {
    return this.findOneAndUpdate({
      timestamp: body.timestamp,
      type: body.type,
      'metadata.location': body.location
    }, body, { upsert: true, new: true });
  }

  static async createReadings(readingList) {
    const readings = readingList.map(reading => this.findOneAndUpdate({
      timestamp: reading.timestamp,
      type: reading.type,
      'metadata.location': reading.metadata.location
    }, reading, { upsert: true, new: true }));
    return Promise.all(readings);
  }
}

timeseriesSchema.set('toJSON', { getters: true });
timeseriesSchema.index({ timestamp: 1 }, { background: true });
timeseriesSchema.index({ 'metadata.location': 1, timestamp: 1 }, { background: true });
timeseriesSchema.index({ 'metadata.location': 1, timestamp: 1, type: 1 }, { background: true });
timeseriesSchema.loadClass(Timeseries);

export default mongodb.model('Timeseries', timeseriesSchema);
