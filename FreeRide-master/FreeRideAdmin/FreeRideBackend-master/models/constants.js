import uniqueValidator from 'mongoose-unique-validator';
import { mongodb } from '../services';

const { Schema } = mongodb;

const ConstantSchema = new Schema({
  topic: {
    type: String,
    required: true
  },
  key: {
    type: String,
    required: true,
    unique: true
  },
  values: {
    type: [String],
    default: []
  }
}, {
  collection: 'Constants',
  versionKey: false,
  strict: 'throw'
});

class Constant {
  static async getConstant(query) {
    try {
      const constant = await this.findOne(query);
      return constant;
    } catch (error) {
      throw error;
    }
  }
}

ConstantSchema.plugin(uniqueValidator);
ConstantSchema.index({ key: 1 }, { background: true });

ConstantSchema.loadClass(Constant);

ConstantSchema.set('toJSON', {
  getters: true,
  transform: (_doc, ret) => {
    const result = ret;
    result.id = result._id.toHexString();
    delete result._id;
    return result;
  }
});

export default mongodb.model('Constant', ConstantSchema);
