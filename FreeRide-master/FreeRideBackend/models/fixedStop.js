import { mongodb } from '../services';
import { validateFixedStop } from '../utils/check';
import { FixedStopStatus } from '.';

const { Schema } = mongodb;
export const { ObjectId } = Schema;

const pointSchema = new Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true
  },
  coordinates: {
    type: [Number], // [lng, lat]
    required: true
  }
});

const FixedStopSchema = Schema({
  name: {
    type: String,
    required: true
  },
  mapLocation: {
    type: pointSchema,
    required: true
  },
  status: {
    type: Number,
    min: FixedStopStatus.disabled,
    max: FixedStopStatus.enabled,
    required: true
  },
  businessName: {
    type: String
  },
  address: {
    type: String
  },
  location: {
    type: ObjectId,
    ref: 'Location',
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  versionKey: false,
  collection: 'FixedStops',
  strict: 'throw'
});

FixedStopSchema
  .virtual('latitude')
  .get(function () {
    return this.mapLocation.coordinates[1];
  });

FixedStopSchema
  .virtual('longitude')
  .get(function () {
    return this.mapLocation.coordinates[0];
  });

class FixedStop {
  static async createFixedStop(bodyParams) {
    const body = bodyParams;

    body.mapLocation = {
      type: 'Point',
      coordinates: [body.lng, body.lat]
    };

    delete body.lat;
    delete body.lng;

    await validateFixedStop(body);

    return this.create(body);
  }

  static async getFixedStop(params) {
    const fixedStop = await this.findOne(params);
    return fixedStop.toJSON();
  }

  static async updateFixedStop(id, bodyParams) {
    const body = bodyParams;
    body.mapLocation = {
      type: 'Point',
      coordinates: [body.lng, body.lat]
    };
    delete body.lat;
    delete body.lng;
    await validateFixedStop(body);
    return this.findByIdAndUpdate(id, body, { runValidators: true });
  }

  static async deleteFixedStop(id) {
    return this.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
  }
}

FixedStopSchema.loadClass(FixedStop);

FixedStopSchema.set('toJSON', {
  getters: true,
  transform: (_doc, ret) => {
    const result = ret;

    result.id = result._id.toString();
    delete result._id;
    // eslint-disable-next-line no-underscore-dangle
    delete result.__v;

    return result;
  }
});

FixedStopSchema.index({ mapLocation: '2dsphere' });

export default mongodb.model('FixedStops', FixedStopSchema);
