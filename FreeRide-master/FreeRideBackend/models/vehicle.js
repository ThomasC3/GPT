import uniqueValidator from 'mongoose-unique-validator';
import { mongodb } from '../services';
import { typeConverter } from '../utils/string';
import { ApplicationError } from '../errors';

const { Schema } = mongodb;
const { ObjectId } = Schema.Types;

const VehicleSchema = Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  vehicleType: {
    type: ObjectId,
    ref: 'VehicleType',
    required: true
  },
  publicId: {
    type: String,
    required: true
  },
  licensePlate: {
    type: String
  },
  isADAOnly: {
    type: Boolean,
    default: false
  },
  isReady: {
    type: Boolean,
    default: true
  },
  passengerCapacity: {
    type: Number
  },
  adaCapacity: {
    type: Number
  },
  location: {
    type: ObjectId,
    ref: 'Location',
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  driverId: {
    type: ObjectId,
    ref: 'Driver',
    default: null
  },
  lastCheckIn: {
    type: Date
  },
  lastCheckOut: {
    type: Date
  },
  battery: {
    type: Number
  },
  mileage: {
    type: Number
  },
  pluggedIn: {
    type: Boolean
  },
  // Zone
  matchingRule: {
    type: String
  },
  zones: [{
    type: ObjectId,
    ref: 'Zone'
  }],
  jobs: [{
    type: ObjectId,
    ref: 'Job'
  }]
}, {
  versionKey: false,
  collection: 'Vehicles',
  strict: 'throw'
});

VehicleSchema.virtual('matchingRuleInfo', {
  ref: 'MatchingRule',
  localField: 'matchingRule',
  foreignField: 'key',
  justOne: true
});
class Vehicle {
  static async getVehicles(filterParams = {}) {
    try {
      const serviceKeys = ['sort', 'order', 'limit', 'skip', 'page', 'available'];
      const findQuery = {};
      const sortOrder = filterParams.order ? parseInt(filterParams.order, 10) : 1;
      const sort = {
        [filterParams.sort ? filterParams.sort : 'name']: sortOrder
      };
      const limit = parseInt(filterParams.limit || 30, 10);
      const page = filterParams.page || 1;
      const skip = (page - 1) * limit;

      Object.keys(filterParams).forEach((key) => {
        if (!serviceKeys.includes(key) && filterParams[key]) {
          findQuery[key] = filterParams[key];
        }
      });
      if (filterParams.isDeleted !== undefined) findQuery.isDeleted = filterParams.isDeleted;

      if (findQuery.name) { findQuery.name = new RegExp(findQuery.name, 'i'); }
      if (findQuery.publicId) { findQuery.publicId = new RegExp(findQuery.publicId, 'i'); }

      if (![undefined, ''].includes(filterParams.available)) {
        const value = typeConverter(filterParams.available, 'boolean');
        findQuery.driverId = value ? null : { $ne: null };
      }

      if (![undefined, ''].includes(filterParams.isReady)) {
        findQuery.isReady = typeConverter(filterParams.isReady, 'boolean');
      }

      const vehicles = this.find(findQuery)
        .sort(sort)
        .collation({ locale: 'en_US', numericOrdering: true })
        .skip(skip)
        .limit(limit)
        .populate('vehicleType')
        .populate('driverId')
        .populate('location', 'name');

      const allVehicles = this.find(findQuery)
        .populate('vehicleType');

      const [
        items = [], total = 0, vehicleTypesArray = []
      ] = await Promise.all([vehicles, this.countDocuments(allVehicles), allVehicles]);

      const vehicleTypesDictionary = {};
      vehicleTypesArray.forEach((vehicle) => {
        vehicleTypesDictionary[`${vehicle.vehicleType?._id}`] = {
          value: vehicle.vehicleType?._id,
          name: vehicle.vehicleType?.type
        };
      });
      const totalPages = Math.ceil(total / limit);
      return {
        items, vehicleTypes: Object.values(vehicleTypesDictionary), total, page, limit, totalPages
      };
    } catch (error) {
      throw error;
    }
  }

  static async getVehicle(query) {
    try {
      const vehicle = await this.findOne(query)
        .populate('vehicleType')
        .populate('driverId')
        .populate('location', 'name');
      if (vehicle) {
        vehicle.isCustomized = !!(vehicle.passengerCapacity || vehicle.adaCapacity);
      }
      return vehicle;
    } catch (error) {
      throw error;
    }
  }

  static async createVehicle(body) {
    try {
      const vehicleInfo = { ...body };
      delete vehicleInfo.setCustomADACapacity;
      delete vehicleInfo.setCustomPassengerCapacity;

      const dupPublicId = await this.getVehicle(
        { isDeleted: false, publicId: vehicleInfo.publicId }
      );

      if (dupPublicId) {
        throw new ApplicationError(`Vehicle with public id ${vehicleInfo.publicId} already exists`, 409);
      }

      if (vehicleInfo.licensePlate) {
        const dupLicensePlate = await this.getVehicle(
          { isDeleted: false, licensePlate: vehicleInfo.licensePlate }
        );

        if (dupLicensePlate) {
          throw new ApplicationError(`Vehicle with license plate ${vehicleInfo.licensePlate} already exists`, 409);
        }
      }

      const createdVehicle = await this.create(vehicleInfo);

      return this.getVehicle({ _id: createdVehicle._id });
    } catch (error) {
      throw error;
    }
  }

  static async updateVehicle(id, body) {
    try {
      const updatedData = { ...body };
      const unset = {};
      if (body.setCustomADACapacity !== undefined && !body.setCustomADACapacity) {
        unset.adaCapacity = '';
        delete updatedData.adaCapacity;
      }
      delete updatedData.setCustomADACapacity;

      if (body.setCustomPassengerCapacity !== undefined && !body.setCustomPassengerCapacity) {
        unset.passengerCapacity = '';
        delete updatedData.passengerCapacity;
      }
      delete updatedData.setCustomPassengerCapacity;

      const dupPublicId = await this.getVehicle({
        isDeleted: false,
        publicId: body.publicId,
        _id: { $ne: id }
      });

      if (dupPublicId) {
        throw new ApplicationError(`Vehicle with public id ${body.publicId} already exists`, 409);
      }

      if (body.licensePlate) {
        const dupLicensePlate = await this.getVehicle({
          isDeleted: false,
          licensePlate: body.licensePlate,
          _id: { $ne: id }
        });

        if (dupLicensePlate) {
          throw new ApplicationError(`Vehicle with license plate ${body.licensePlate} already exists`, 409);
        }
      }

      await this.findByIdAndUpdate(id, { $set: updatedData, $unset: unset });
      const vehicle = await this.getVehicle({ _id: id });
      return vehicle;
    } catch (error) {
      throw error;
    }
  }
}

VehicleSchema.plugin(uniqueValidator);
VehicleSchema.index({ publicId: 1 }, { background: true });
VehicleSchema.index({ driverId: 1 }, { background: true });
VehicleSchema.index({ location: 1, matchingRule: 1 }, { background: true });
VehicleSchema.index({ location: 1, zones: 1 }, { background: true });
VehicleSchema.index({ location: 1, battery: 1 }, { background: true });
VehicleSchema.index({ location: 1, mileage: 1 }, { background: true });
VehicleSchema.index({
  location: 1,
  isReady: 1,
  isDeleted: 1,
  driverId: 1
}, { background: true });

VehicleSchema.loadClass(Vehicle);

VehicleSchema.set('toJSON', {
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

export default mongodb.model('Vehicle', VehicleSchema);
