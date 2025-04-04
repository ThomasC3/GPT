import uniqueValidator from 'mongoose-unique-validator';
import { mongodb } from '../services';

const { Schema } = mongodb;

const VehicleTypeSchema = Schema({
  type: {
    type: String,
    required: true,
    unique: true
  },
  passengerCapacity: {
    type: Number,
    required: true
  },
  adaCapacity: {
    type: Number,
    default: 0
  },
  profile: {
    type: String
  },
  fallbackProfile: {
    type: String
  },
  checkInForm: {
    type: Schema.Types.ObjectId,
    ref: 'InspectionForm'
  },
  checkOutForm: {
    type: Schema.Types.ObjectId,
    ref: 'InspectionForm'
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  versionKey: false,
  collection: 'VehicleTypes',
  strict: 'throw'
});

class VehicleType {
  static async getVehicleType(query) {
    try {
      const vehicleType = await this.findOne(query);
      return vehicleType;
    } catch (error) {
      throw error;
    }
  }

  static async getVehicleTypes(filterQuery = {}) {
    const findQuery = {};
    Object.keys(filterQuery).forEach((key) => {
      if (filterQuery[key]) {
        findQuery[key] = filterQuery[key];
      }
    });
    if (filterQuery.isDeleted !== undefined) findQuery.isDeleted = filterQuery.isDeleted;
    if (filterQuery.type) { findQuery.type = new RegExp(filterQuery.type, 'i'); }
    try {
      const vehicleTypes = await this.find(findQuery);
      return vehicleTypes;
    } catch (error) {
      throw error;
    }
  }

  static async createVehicleType(body) {
    try {
      const vehicleType = await this.create(body);
      return vehicleType;
    } catch (error) {
      throw error;
    }
  }

  static async updateVehicleType(id, body) {
    try {
      const vehicleType = await this.findByIdAndUpdate(id, body, { new: true });
      return vehicleType;
    } catch (error) {
      throw error;
    }
  }
}

VehicleTypeSchema.plugin(uniqueValidator);
VehicleTypeSchema.index({ publicId: 1 }, { background: true });

VehicleTypeSchema.loadClass(VehicleType);

VehicleTypeSchema.set('toJSON', {
  getters: true,
  transform: (_doc, ret) => {
    const result = ret;
    result.id = result._id.toHexString();
    delete result._id;
    // eslint-disable-next-line no-underscore-dangle
    delete result.__v;
    return result;
  }
});

export default mongodb.model('VehicleType', VehicleTypeSchema);
