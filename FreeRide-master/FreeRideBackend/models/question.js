import { mongodb } from '../services';

const { Schema } = mongodb;

export const { ObjectId } = Schema;

const responseTypes = {
  values: ['string', 'number', 'boolean'],
  message: 'Value must be either of \'string\', \'number\', \'boolean\''
};

const QuestionSchema = Schema({
  questionKey: {
    type: String,
    unique: true,
    required: true,
    validate: {
      // eslint-disable-next-line no-control-regex
      validator: value => /^[a-z0-9-_.]+$/i.test(value)
    }
  },
  questionString: {
    type: String,
    required: true
  },
  responseType: {
    type: String,
    enum: responseTypes,
    required: true
  },
  optional: {
    type: Boolean,
    default: false
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
},
{
  versionKey: false,
  collection: 'Questions',
  strict: 'throw'
});

class Question {
  static async getQuestions(filterParams = {}) {
    const serviceKeys = ['skip', 'limit', 'sort', 'order'];

    const findQuery = {};
    const skip = filterParams.skip || 0;
    const limit = filterParams.limit || 30;
    const sortOrder = filterParams.order ? parseInt(filterParams.order, 10) : -1;
    const sort = {
      [filterParams.sort ? filterParams.sort : 'createdTimestamp']: sortOrder
    };

    Object.keys(filterParams).forEach((key) => {
      if (!serviceKeys.includes(key)
          && filterParams[key]
          && filterParams[key].length !== 0
      ) {
        findQuery[key] = filterParams[key];
      }
    });

    if (filterParams.isDeleted !== undefined) {
      findQuery.isDeleted = filterParams.isDeleted;
    }

    if (
      filterParams.responseType !== undefined && responseTypes.values.includes(filterParams.responseType)
    ) {
      findQuery.responseType = filterParams.responseType;
    }

    if (findQuery.questionKey) { findQuery.questionKey = new RegExp(findQuery.questionKey, 'i'); }
    if (findQuery.questionString) { findQuery.questionString = new RegExp(findQuery.questionString, 'i'); }

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


  static async getQuestion(params) {
    if (params.questionKey) {
      params.questionKey = params.questionKey.toLowerCase();
    }

    try {
      const question = await this.findOne(params);
      return question;
    } catch (err) {
      throw err;
    }
  }

  static async createQuestion(body) {
    try {
      if (body.questionKey) {
        body.questionKey = body.questionKey.toLowerCase();
      }
      delete body.isDeleted;
      delete body.createdTimestamp;

      const question = await this.create(body);
      return question;
    } catch (err) {
      throw err;
    }
  }

  static async updateQuestion(id, body) {
    try {
      delete body.questionKey;
      delete body.responseType;

      const question = await this.findByIdAndUpdate(id, body, { new: true });
      return question;
    } catch (err) {
      throw err;
    }
  }
}

QuestionSchema.loadClass(Question);

QuestionSchema.set('toObject', { virtuals: true });
QuestionSchema.set('toJSON', {
  getters: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

QuestionSchema.index({ questionKey: 1 }, { background: true });

export default mongodb.model('Question', QuestionSchema);
