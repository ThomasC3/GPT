import uniqueValidator from 'mongoose-unique-validator';
import { mongodb } from '../services';

const { Schema } = mongodb;

const MatchingRuleSchema = Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  }
}, {
  versionKey: false,
  collection: 'MatchingRules',
  strict: 'throw'
});

class MatchingRule {
  static async getMatchingRules(findQuery) {
    const matchingRules = await this.find(findQuery);
    return matchingRules;
  }

  static async getMatchingRuleById(id) {
    const matchingRule = await this.findOne({ _id: id });
    return matchingRule;
  }
}

MatchingRuleSchema.plugin(uniqueValidator);
MatchingRuleSchema.index({ key: 1 }, { background: true });

MatchingRuleSchema.loadClass(MatchingRule);

MatchingRuleSchema.set('toJSON', {
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

export default mongodb.model('MatchingRule', MatchingRuleSchema);
