import moment from 'moment-timezone';
import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
// eslint-disable-next-line no-unused-vars
import typeEmail from 'mongoose-type-email';

import { mongodb } from '../services';
import {
  crypto, fb, transformations
} from '../utils';
import { convertDate } from '../utils/time';
import Organizations from './Organizations';

const { Schema } = mongodb;
const { generateHash } = crypto;
const { parseGender } = fb;


export const userType = 'rider';

export const getOrganizationIdFromEmail = (email) => {
  if (!email) return null;

  const domain = email.split('@')[1]?.toLowerCase();
  return Organizations[domain] || null;
};

const subscriptionsSchema = Schema({
  receipt: {
    type: Boolean,
    default: true,
    required: true
  }
}, {
  _id: false,
  versionKey: false
});

const RiderSchema = Schema({
  email: {
    type: mongoose.SchemaTypes.Email,
    unique: true,
    required: true
  },
  password: {
    type: String,
    set: value => generateHash(value),
    get: value => value,
    default: null
  },
  lastCancelTimestamp: {
    type: Date
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    default: 'unspecified'
  },
  dob: {
    type: String,
    default: null
  },
  facebook: {
    type: String,
    default: null
  },
  google: {
    type: String,
    default: null
  },
  apple: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    default: null
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  zip: {
    type: String,
    default: ''
  },
  location: {
    type: Schema.Types.ObjectId,
    ref: 'Location'
  },
  phoneCode: {
    type: Number,
    default: null
  },
  emailCode: {
    type: Number,
    default: null
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationDeadline: {
    type: Date
  },
  lastSeen: {
    type: Date
  },
  tempEmail: {
    type: String
  },
  isExistingUser: {
    type: Boolean,
    default: true
  },
  socketIds: {
    type: [String],
    default: []
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  strikeCount: {
    type: Number,
    default: 0
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isLegacyUser: {
    type: Boolean,
    default: false
  },
  legacyId: {
    type: String,
    default: null
  },
  subscriptions: {
    type: subscriptionsSchema,
    default: {}
  },
  stripeCustomerId: {
    type: String,
    default: null
  },
  promocode: {
    type: Schema.Types.ObjectId,
    ref: 'Promocode'
  },
  createdTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  locale: {
    type: String,
    default: 'en'
  },
  organization: {
    type: String,
    default: null
  }
}, {
  versionKey: false,
  collection: 'Riders',
  strict: 'throw'
});

class Rider {
  static async getRiders(filterParams = {}) {
    const serviceKeys = ['skip', 'limit', 'sort', 'order'];

    const findQuery = {};
    const skip = filterParams.skip || 0;
    const limit = filterParams.limit || 30;
    const sort = {
      [filterParams.sort ? filterParams.sort : 'createdTimestamp']:
        filterParams.order ? parseInt(filterParams.order, 10) : -1
    };

    Object.keys(filterParams).forEach((key) => {
      if (!serviceKeys.includes(key)) {
        if (filterParams[key] && filterParams[key]) {
          findQuery[key] = filterParams[key];
        }
      }
    });

    if (filterParams.isDeleted !== undefined) findQuery.isDeleted = filterParams.isDeleted;
    if (findQuery.firstName) findQuery.firstName = new RegExp(`^${findQuery.firstName}`, 'i');
    if (findQuery.lastName) findQuery.lastName = new RegExp(`^${findQuery.lastName}`, 'i');

    let query = this.find(findQuery).sort(sort);
    if (skip) query = query.skip(skip);
    if (limit) query = query.limit(limit);

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

  static async getRider(_params) {
    const params = _params;
    return this.findOne(params).collation({ locale: 'en_US', strength: 1 });
  }

  static async createRider(_body) {
    const body = _body;
    if (body.email) {
      body.email = body.email.toLowerCase();
      body.organization = getOrganizationIdFromEmail(body.email);
    }

    return this.create(body);
  }

  static async updateRider(id, _body) {
    const body = _body;
    if (body.email) { delete body.email; }

    return this.findByIdAndUpdate(id, body, { runValidators: true, new: true });
  }

  static async getRidersCursor(filterParams, locationTimezone) {
    const findQuery = { ...filterParams, isDeleted: false };
    if (findQuery.createdTimestamp) {
      if (findQuery.createdTimestamp.start && findQuery.createdTimestamp.end) {
        findQuery.createdTimestamp = transformations.mapDateSearch(
          findQuery.createdTimestamp, locationTimezone
        );
      } else {
        delete findQuery.createdTimestamp;
      }
    }

    if (findQuery.isEmailVerified === '') {
      delete findQuery.isEmailVerified;
    }

    delete findQuery.location;
    const query = this.find(findQuery)
      .populate({
        path: 'location',
        select: 'name timezone'
      });

    return query.cursor();
  }

  static async upsertSocialUser(profile, provider) {
    if (!profile) {
      throw new Error('Profile is required');
    }

    const query = {
      $or: [
        { [provider]: profile.id },
        { email: profile.email }
      ]
    };

    const rider = await this.findOne(query).collation({ locale: 'en_US', strength: 1 });

    if (!rider) {
      const riderData = {
        email: profile.email,
        firstName: profile.firstName || profile.given_name,
        lastName: profile.lastName || profile.family_name,
        [provider]: profile.id,
        isEmailVerified: true,
        isExistingUser: false,
        organization: getOrganizationIdFromEmail(profile.email)
      };

      if (provider === 'facebook') {
        riderData.dob = convertDate(profile.birthday);
        riderData.gender = parseGender(profile.gender);
        riderData.zip = profile.location?.location?.zip || null;
      }

      return this.createRider(riderData);
    }

    rider.set({
      [provider]: profile.id,
      isEmailVerified: true
    });

    if (provider === 'facebook') {
      rider.set({
        gender: parseGender(profile.gender),
        dob: rider.dob || convertDate(profile.birthday),
        zip: rider.zip || profile.location?.location?.zip
      });
    }

    await rider.save();
    return rider;
  }

  static async upsertFbUser(profile) {
    return this.upsertSocialUser(profile, 'facebook');
  }

  static async upsertGoogleUser(profile) {
    return this.upsertSocialUser(profile, 'google');
  }

  static async upsertAppleUser(profile) {
    return this.upsertSocialUser(profile, 'apple');
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

  coolDownTimestamp() {
    if (this.lastCancelTimestamp) {
      const coolDownLimit = 3;
      return moment(this.lastCancelTimestamp).utc().add(coolDownLimit, 'minutes');
    }

    return undefined;
  }

  isUnderCoolDown(now = null) {
    if (this.lastCancelTimestamp) {
      const timestampNow = now ? moment(now).utc() : moment().utc();
      return timestampNow.isBefore(this.coolDownTimestamp());
    }

    return false;
  }

  isPastEmailVerificationDeadline() {
    return !this.isEmailVerified && moment().isAfter(this.emailVerificationDeadline);
  }
}

RiderSchema.plugin(uniqueValidator);
RiderSchema.index(
  { facebook: 1 },
  { collation: { locale: 'en_US', strength: 1 }, background: true }
);
RiderSchema.index(
  { google: 1 },
  { collation: { locale: 'en_US', strength: 1 }, background: true }
);
RiderSchema.index(
  { apple: 1 },
  { collation: { locale: 'en_US', strength: 1 }, background: true }
);
RiderSchema.index(
  { email: 1, isDeleted: 1 },
  { collation: { locale: 'en_US', strength: 1 }, background: true }
);
RiderSchema.index({ isDeleted: 1, createdTimestamp: 1 }, { background: true });

RiderSchema.virtual('userType').get(() => userType);

RiderSchema.loadClass(Rider);

RiderSchema.set('toJSON', {
  getters: true,
  transform: (_doc, ret) => {
    const result = ret;

    result.id = result._id.toHexString();
    delete result._id;
    // eslint-disable-next-line no-underscore-dangle
    delete result.__v;

    delete result.password;

    return result;
  }
});

export default mongodb.model('Rider', RiderSchema);
