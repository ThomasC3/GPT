import { crypto } from '../utils';
import { mongodb } from '../services';

const { Schema } = mongodb;

const { generateHash } = crypto;
export const { ObjectId } = Schema;

const driverRideSchema = new Schema({
  rideId: {
    type: ObjectId,
    ref: 'Ride',
    required: true
  },
  passengers: {
    type: Number,
    required: true
  },
  isADA: {
    type: Boolean,
    default: false,
    required: true
  },
  dropoffLatitude: {
    type: Number
  },
  dropoffLongitude: {
    type: Number
  },
  _id: false
});

const pointSchema = new Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true
  },
  coordinates: {
    type: [Number],
    required: true
  }
});

const driverZoneSchema = new Schema({
  id: {
    type: ObjectId,
    ref: 'Zone',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  _id: false
});

const vehicleTypeSchema = Schema({
  id: {
    type: ObjectId,
    ref: 'VehicleType',
    required: true
  },
  type: {
    type: String,
    required: true
  },
  profile: {
    type: String
  },
  fallbackProfile: {
    type: String
  }
}, {
  _id: false,
  versionKey: false
});

const driverVehicleSchema = new Schema({
  vehicleId: {
    type: ObjectId,
    ref: 'Vehicle',
    required: true
  },
  vehicleName: {
    type: String,
    required: true
  },
  licensePlate: {
    type: String
  },
  vehicleType: {
    type: vehicleTypeSchema
  },
  publicId: {
    type: String,
    required: true
  },
  passengerCapacity: {
    type: Number,
    required: true
  },
  adaCapacity: {
    type: Number,
    required: true
  },
  isADAOnly: {
    type: Boolean
  },
  service: {
    id: {
      type: ObjectId,
      ref: 'Service',
      required: true
    },
    key: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    }
  },
  matchingRule: {
    id: {
      type: ObjectId,
      ref: 'MatchingRule'
    },
    key: {
      type: String
    },
    title: {
      type: String
    }
  },
  zones: {
    type: [driverZoneSchema],
    default: []
  },
  jobs: [{
    type: ObjectId,
    ref: 'Job'
  }],
  _id: false
});

const profilePictureSchema = new Schema({
  imageUrl: {
    type: String,
    required: true
  },
  _id: false
});

export const userType = 'driver';

const DriverSchema = Schema({
  dob: {
    type: String
  },
  email: {
    type: String,
    required: true,
    validate: {
      // eslint-disable-next-line no-control-regex
      validator: value => /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i.test(value)
    }
  },
  password: {
    type: String,
    set: value => generateHash(value),
    get: value => value
  },
  firstName: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    default: ''
  },
  lastName: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  profilePicture: {
    type: profilePictureSchema
  },
  locations: {
    type: [ObjectId],
    ref: 'Location',
    default: []
  },
  phone: {
    type: String
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  zip: {
    type: String,
    default: '10001'
  },
  isTemporaryPassword: {
    type: Boolean,
    default: true
  },
  emailCode: {
    type: Number,
    default: null
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  currentLocation: {
    type: pointSchema
  },
  socketIds: {
    type: [String],
    default: []
  },
  isADA: {
    type: Boolean,
    default: false
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  driverRideList: {
    type: [driverRideSchema],
    default: []
  },
  vehicle: {
    type: driverVehicleSchema,
    default: null
  },
  isAvailable: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    default: null
  },
  loggedOutTimestamp: {
    type: Date,
    default: null
  },
  activeLocation: {
    type: ObjectId,
    ref: 'Location',
    default: null
  },
  lastActiveLocation: {
    type: ObjectId,
    ref: 'Location',
    default: null
  },
  // Data query helpers
  employeeId: {
    type: String,
    default: ''
  }
},
{
  versionKey: false,
  collection: 'Drivers',
  strict: 'throw'
});

DriverSchema.virtual('userType').get(() => userType);

DriverSchema
  .virtual('currentLatitude')
  .get(function () {
    return this.currentLocation?.coordinates[1];
  });

DriverSchema
  .virtual('currentLongitude')
  .get(function () {
    return this.currentLocation?.coordinates[0];
  });

class Driver {
  static async getDrivers(filterParams = {}) {
    const serviceKeys = ['skip', 'limit', 'sort', 'order', 'isOnline', 'isAvailable'];

    const findQuery = {};
    const skip = filterParams.skip || 0;
    const limit = filterParams.limit || 30;
    const sortOrder = filterParams.order ? parseInt(filterParams.order, 10) : 1;
    const sort = {
      [filterParams.sort ? filterParams.sort : 'firstName']: sortOrder
    };

    Object.keys(filterParams).forEach((key) => {
      if (!serviceKeys.includes(key)
          && filterParams[key]
          && filterParams[key].length !== 0
      ) {
        findQuery[key] = filterParams[key];
      }
    });

    if (filterParams.isDeleted !== undefined && filterParams.isDeleted !== '') {
      findQuery.isDeleted = filterParams.isDeleted;
    }
    if (filterParams.isOnline !== undefined && filterParams.isOnline !== '') {
      findQuery.isOnline = filterParams.isOnline;
    }
    if (filterParams.isAvailable !== undefined && filterParams.isAvailable !== '') {
      findQuery.isAvailable = filterParams.isAvailable;
    }

    if (findQuery.firstName) { findQuery.firstName = new RegExp(findQuery.firstName, 'i'); }
    if (findQuery.lastName) { findQuery.lastName = new RegExp(findQuery.lastName, 'i'); }
    if (findQuery.locations) {
      findQuery.locations = {
        $in: findQuery.locations.map(i => new mongodb.Types.ObjectId(i))
      };
    }

    let query = this.find(findQuery).sort(sort);

    if (skip) {
      query = query.skip(skip);
    }
    if (limit) {
      query = query.limit(limit);
    }

    try {
      const [items = [], total = 0] = await Promise.all([
        query,
        this.countDocuments(findQuery)
      ]);

      return {
        total, items, skip, limit
      };
    } catch (err) {
      throw err;
    }
  }


  static async getDriver(params, populate) {
    try {
      const driver = await this.findOne(params)
        .collation({ locale: 'en_US', strength: 1 })
        .populate(populate);
      return driver;
    } catch (err) {
      throw err;
    }
  }

  static async createDriver(_body) {
    const body = _body;
    try {
      if (body.locations) {
        body.locations = body.locations.map(locationId => new mongodb.Types.ObjectId(locationId));
      }

      if (body.email) {
        body.email = body.email.toLowerCase();
      }
      if (!body.displayName) {
        body.displayName = `${body.firstName} ${body.lastName}`;
      }
      if (body.employeeId) { body.employeeId = body.employeeId.toUpperCase(); }

      const driver = await this.create(body);
      return driver;
    } catch (err) {
      throw err;
    }
  }

  static async updateDriver(id, _body) {
    const body = _body;
    try {
      if (body.locations) {
        body.locations = body.locations.map(locationId => new mongodb.Types.ObjectId(locationId));
      }

      if (body.email) {
        body.email = body.email.toLowerCase();
      }

      if (body.employeeId) { body.employeeId = body.employeeId.toUpperCase(); }

      const driver = await this.findByIdAndUpdate(id, body, { new: true });
      return driver;
    } catch (err) {
      throw err;
    }
  }

  static getUserType() {
    return userType;
  }

  static async saveSocket(userId, socketId) {
    try {
      return this.updateOne({
        _id: userId
      },
      {
        $addToSet: {
          socketIds: socketId
        }
      });
    } catch (err) {
      throw err;
    }
  }

  static async deleteSocket(userId, socketId) {
    try {
      let socketIds = [];

      if (Array.isArray(socketId)) {
        socketIds = socketId;
      } else {
        socketIds = [socketId];
      }

      return await this.updateOne({
        _id: userId
      }, {
        $pullAll: {
          socketIds
        }
      });
    } catch (err) {
      throw err;
    }
  }
}

DriverSchema.loadClass(Driver);

DriverSchema.set('toObject', { virtuals: true });
DriverSchema.set('toJSON', {
  getters: true,
  transform: (doc, _ret) => {
    const ret = _ret;
    ret.id = ret._id;
    delete ret._id;
    delete ret.password;
    return ret;
  }
});

DriverSchema.index({ currentLocation: '2dsphere' });
DriverSchema.index({ email: 1 }, { unique: true, collation: { locale: 'en_US', strength: 1 }, background: true });
DriverSchema.index({ isOnline: 1, locations: 1 }, { background: true });
DriverSchema.index({ isOnline: 1, activeLocation: 1, isDeleted: 1 }, { background: true });

export default mongodb.model('Driver', DriverSchema);
