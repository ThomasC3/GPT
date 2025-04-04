import uniqueValidator from 'mongoose-unique-validator';
import { mongodb } from '../services';

const { Schema } = mongodb;

const ServiceSchema = Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  desc: {
    type: String
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  versionKey: false,
  collection: 'Services',
  strict: 'throw'
});

class Service {
  static async getServices(findQuery) {
    const services = await this.find(findQuery);
    return services;
  }

  static async getService(findQuery) {
    const service = await this.findOne(findQuery);
    return service;
  }
}

ServiceSchema.plugin(uniqueValidator);
ServiceSchema.index({ key: 1 }, { background: true });

ServiceSchema.loadClass(Service);

ServiceSchema.set('toJSON', {
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

export default mongodb.model('Service', ServiceSchema);
