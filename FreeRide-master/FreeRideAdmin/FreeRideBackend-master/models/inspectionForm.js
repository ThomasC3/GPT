import { mongodb } from '../services';

const { Schema } = mongodb;

export const { ObjectId } = Schema;

const inspectionTypes = {
  values: ['check-in', 'check-out'],
  message: 'Value must be either of \'check-in\' or \'check-out\''
};

const InspectionFormSchema = Schema({
  inspectionType: {
    type: String,
    enum: inspectionTypes,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  questionList: {
    type: [ObjectId],
    ref: 'Question',
    default: []
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
  collection: 'InspectionForms',
  strict: 'throw'
});

class InspectionForm {
  static async getInspectionForms(filterParams = {}) {
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
      filterParams.inspectionType !== undefined && inspectionTypes.values.includes(filterParams.inspectionType)
    ) {
      findQuery.inspectionType = filterParams.inspectionType;
    }

    if (findQuery.name) { findQuery.name = new RegExp(findQuery.name, 'i'); }

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


  static async getInspectionForm(params) {
    try {
      return await this.findOne(params).populate({ path: 'questionList', model: 'Question' });
    } catch (err) {
      throw err;
    }
  }

  static async createInspectionForm(body) {
    try {
      delete body.isDeleted;
      delete body.createdTimestamp;

      const inspectionForm = await this.create(body);
      return await inspectionForm.populate({ path: 'questionList', model: 'Question' });
    } catch (err) {
      throw err;
    }
  }

  static async updateInspectionForm(id, body) {
    try {
      delete body.inspectionType;

      return await this.findByIdAndUpdate(id, body, { new: true }).populate({ path: 'questionList', model: 'Question' });
    } catch (err) {
      throw err;
    }
  }
}

InspectionFormSchema.loadClass(InspectionForm);

InspectionFormSchema.set('toObject', { virtuals: true });
InspectionFormSchema.set('toJSON', {
  getters: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

InspectionFormSchema.index({ name: 1 }, { background: true });

export default mongodb.model('InspectionForm', InspectionFormSchema);
