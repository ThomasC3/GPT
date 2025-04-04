import { crypto, StringUtils } from '../utils';
import { mongodb } from '../services';
import { AdminRoles } from '.';

const { generateHash } = crypto;
const { Schema } = mongodb;

export const { ObjectId } = Schema;

export const userType = 'admin';

const AdminSchema = Schema({
  dob: {
    type: String
  },
  email: {
    type: String,
    unique: true,
    required: true,
    validate: {
      // eslint-disable-next-line no-control-regex
      validator: value => /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/.test(value)
    }
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
  locations: {
    type: [ObjectId],
    ref: 'Location',
    default: []
  },
  phone: {
    type: String
  },
  role: {
    type: Number,
    min: AdminRoles.Developer,
    max: AdminRoles.DataViewer,
    default: AdminRoles.Supervisor
  },
  zip: {
    type: String
  },
  password: {
    type: String,
    set: value => generateHash(value),
    get: value => value
  },
  emailCode: {
    type: Number,
    default: null
  },
  isEmailVerified: {
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
  isAllowedReports: {
    type: Boolean,
    default: false
  }
},
{
  versionKey: false,
  collection: 'Admins',
  strict: 'throw'
});

class Admin {
  hasAccessToLocation(locationId) {
    return this.locations.map(el => el.id).includes(locationId);
  }

  static async getAdmins(filterParams = {}) {
    const serviceKeys = ['skip', 'limit', 'sort', 'order'];

    const findQuery = {};
    const skip = filterParams.skip || 0;
    const limit = filterParams.limit || 30;
    const sort = {
      [filterParams.sort ? filterParams.sort : 'firstName']: filterParams.order ? parseInt(filterParams.order, 10) : 1
    };

    Object.keys(filterParams).forEach((key) => {
      if (!serviceKeys.includes(key) && filterParams[key]) {
        findQuery[key] = filterParams[key];
      }
    });

    if (filterParams.isDeleted !== undefined) findQuery.isDeleted = filterParams.isDeleted;
    if (findQuery.firstName) findQuery.firstName = new RegExp(findQuery.firstName, 'i');
    if (findQuery.lastName) findQuery.lastName = new RegExp(findQuery.lastName, 'i');

    try {
      const admins = await this
        .aggregate([
          { $match: findQuery },
          { $sort: sort },
          {
            $group: {
              _id: null,
              items: { $push: '$$ROOT' },
              total: { $sum: 1 }
            }
          },
          { $unwind: '$items' },
          { $skip: skip },
          { $limit: limit },
          {
            $group: {
              _id: 0,
              total: {
                $first: '$total'
              },
              items: {
                $push: '$items'
              }
            }
          },
          { $project: { items: 1, total: 1, _id: 0 } }
        ]);

      return {
        total: 0, items: [], skip, limit, ...admins[0]
      };
    } catch (err) {
      throw err;
    }
  }

  static async getAdmin(params) {
    try {
      if (params.email) {
        params.email = new RegExp(`^${StringUtils.escapeRegExp(params.email)}$`, 'i');
      }

      return this.findOne(params).populate({
        path: 'locations',
        select: 'name',
        model: 'Location'
      });
    } catch (err) {
      throw err;
    }
  }

  static async createAdmin(body) {
    try {
      return this.create(body);
    } catch (err) {
      throw err;
    }
  }

  static async updateAdmin(id, body) {
    try {
      const admin = await this.findByIdAndUpdate(id, body, { runValidators: true, new: true });
      return admin;
    } catch (err) {
      throw err;
    }
  }

  static getUserType() {
    return userType;
  }
}

AdminSchema.virtual('userType').get(() => userType);

AdminSchema.set('toJSON', {
  getters: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.password;
    return ret;
  }
});

AdminSchema.loadClass(Admin);

const AdminModel = mongodb.model('Admin', AdminSchema);

export default AdminModel;
