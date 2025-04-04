import { mongodb } from '../services';
import { ApplicationError } from '../errors';

const { Schema } = mongodb;

const versionRegexSchema = /^\d+(\.\d+){0,2}$/;

Object.freeze(versionRegexSchema);

const driverLimitSortTypes = {
  values: ['closest', 'idle'],
  message: 'Value must be either of \'closest\', \'idle\''
};

const SettingsSchema = Schema({
  rideriOS: {
    type: String,
    validate: {
      validator(v) {
        return versionRegexSchema.test(v);
      },
      message: _props => 'iOS rider app version must follow "Major.Minor.Patch" version format'
    }
  },
  riderAndroid: {
    type: String,
    validate: {
      validator(v) {
        return versionRegexSchema.test(v);
      },
      message: _props => 'Android rider app version must follow "Major.Minor.Patch" version format'
    }
  },
  driveriOS: {
    type: String
  },
  blockNumberPatterns: {
    type: String
  },
  blacklistedEmailDomains: {
    type: String
  },
  driverLimitSort: {
    type: String,
    enum: driverLimitSortTypes
  },
  initialDriverLimit: {
    type: Number
  },
  skipDistanceTSP: {
    type: Boolean
  },
  finalDriverLimit: {
    type: Number
  },
  smsDisabled: {
    type: Boolean
  },
  isDynamicRideSearch: {
    type: Boolean
  },
  hideFlux: {
    type: Boolean
  },
  hideTripAlternativeSurvey: {
    type: Boolean
  }
}, {
  versionKey: false,
  collection: 'Settings',
  strict: 'throw'
});

class Settings {
  static async getSettings() {
    return this.findOne();
  }

  static async updateSettings(body) {
    return this.findOneAndUpdate({}, body, { runValidators: true, new: true }).catch((err) => {
      if (err.name === 'ValidationError') {
        throw new ApplicationError(Object.keys(err.errors).map(el => err.errors[el].message).join(', '), 400);
      }

      throw err;
    });
  }

  static async createSettings(body) {
    if (await this.getSettings()) {
      throw new Error('Only one settings configuration is allowed!');
    }
    return this.create(body).catch((err) => {
      if (err.name === 'ValidationError') {
        throw new ApplicationError(Object.keys(err.errors).map(el => err.errors[el].message).join(', '), 400);
      }

      throw err;
    });
  }
}

SettingsSchema.loadClass(Settings);
SettingsSchema.set('toJSON', { getters: true });

export default mongodb.model('Setting', SettingsSchema);
