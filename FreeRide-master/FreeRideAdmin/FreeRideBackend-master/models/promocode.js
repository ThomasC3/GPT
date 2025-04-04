import { mongodb } from '../services';
import { generatePromocodeString } from '../utils/random';
import { DuplicatePromocodeError } from '../errors';
import { Locations } from '.';
import { transformations } from '../utils';
import { validatePromocodeObject } from '../utils/check';

const { Schema, Types } = mongodb;
export const { ObjectId } = Schema;

const promocodeTypes = {
  values: ['percentage', 'value', 'full'],
  message: 'Type must be either \'percentage\', \'value\' or \'full\''
};

const PromocodeSchema = Schema({
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true
  },
  location: {
    type: ObjectId,
    ref: 'Location'
  },
  type: {
    type: String,
    enum: promocodeTypes,
    required: true
  },
  value: {
    type: Number,
    default: null
  },
  usageLimit: {
    type: Number,
    default: null
  },
  expiryDate: {
    type: Date,
    default: null
  },
  isEnabled: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  versionKey: false,
  collection: 'Promocodes',
  strict: 'throw'
});

class Promocode {
  /**
   * Search Promocodes
   * @param {Object} filterParams filter params object
   * @returns {Promise} promise, which will be resolved when rides found
   */
  static async getPromocodes(filterParams = {}) {
    let locationTimezone = null;
    const serviceKeys = ['skip', 'limit', 'sort', 'order'];
    const findQuery = {};
    const skip = parseInt(filterParams.skip, 10) || 0;
    const limit = parseInt(filterParams.limit, 10) || 30;
    const sort = {
      [filterParams.sort ? filterParams.sort : 'createdTimestamp']: filterParams.order ? parseInt(filterParams.order, 10) : -1
    };

    Object.keys(filterParams).forEach((key) => {
      if (!serviceKeys.includes(key) && filterParams[key]) {
        findQuery[key] = filterParams[key];
      }
    });

    if (findQuery.location) {
      const location = await Locations.getLocation(findQuery.location);
      if (location) {
        locationTimezone = location.timezone;
      }
    }

    if (findQuery.createdTimestamp) {
      if (findQuery.createdTimestamp.start && findQuery.createdTimestamp.end) {
        findQuery.createdTimestamp = transformations.mapDateSearch(
          findQuery.createdTimestamp, locationTimezone
        );
      } else {
        delete findQuery.createdTimestamp;
      }
    }
    if (findQuery.status) findQuery.status = { $in: findQuery.status };
    if (findQuery.location) findQuery.location = new Types.ObjectId(findQuery.location);
    if (filterParams.isDeleted !== undefined) findQuery.isDeleted = filterParams.isDeleted;

    let query = this.find(findQuery).sort(sort);
    if (skip) query = query.skip(skip);
    if (limit) query = query.limit(limit);

    const [items = [], total = 0] = await Promise.all([
      query,
      this.countDocuments(findQuery)
    ]);

    return {
      total, items, skip, limit
    };
  }

  static async getPromocode(params) {
    const promocode = await this.findOne(params);
    return promocode.toJSON();
  }

  static async createPromocode(bodyParams) {
    let body = bodyParams;
    let code = null;
    if (!body.code) {
      do {
        body.code = generatePromocodeString();
        code = await this.findByCode(body.code);
      } while (code);
    }

    const isDuplicate = await this.exists(body.code, bodyParams.location);
    if (isDuplicate) { throw new DuplicatePromocodeError(); }

    body = validatePromocodeObject(body);

    return this.create(body);
  }

  /**
   * Check if promocode exists
   * @param {String} code Promocode code
   * @param {locationId} locationId Location ID where this promocode should belong to
   * @returns {Promise} promise, which will be resolved when promocode found
   */
  static async exists(code, locationId) {
    return this.findOne({
      code,
      location: locationId,
      isDeleted: false
    });
  }

  static async findByCode(promocodeString) {
    return this.findOne({ code: promocodeString, isDeleted: false });
  }

  static async deletePromocode(id) {
    return this.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
  }

  static async updatePromocode(id, bodyInfo) {
    const body = validatePromocodeObject(bodyInfo);
    return this.findByIdAndUpdate(id, body, { runValidators: true });
  }
}

PromocodeSchema.loadClass(Promocode);

PromocodeSchema.set('toJSON', {
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

export default mongodb.model('Promocode', PromocodeSchema);
