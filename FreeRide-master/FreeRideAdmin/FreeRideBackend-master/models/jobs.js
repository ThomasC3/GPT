import { mongodb } from '../services';
import { ApplicationError } from '../errors';

const { Schema } = mongodb;

export const { ObjectId } = Schema.Types;

const JobSchema = Schema({
  location: {
    type: ObjectId,
    ref: 'Location'
  },
  code: {
    type: String,
    required: true
  },
  locationCode: {
    type: String
  },
  clientCode: {
    type: String,
    required: true
  },
  typeCode: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
},
{
  versionKey: false,
  collection: 'Jobs'
});

class Job {
  static async uniqueCodeCheck(body, _id) {
    const job = await this.getJob({ _id: { $ne: _id }, code: body.code, isDeleted: false });

    if (job) {
      throw new ApplicationError(`Job with code ${job.code} already exists`, 409);
    }
  }

  static async getJob(body, populate = '') {
    return this.findOne(body).populate(populate);
  }

  static async getJobs(body) {
    return this.find({ ...body, isDeleted: false }).limit(0);
  }

  static async createJob(body) {
    await this.uniqueCodeCheck(body);
    return this.create(body);
  }

  static async updateJobById(_id, body, populate = '') {
    await this.uniqueCodeCheck(body, _id);
    return this.findOneAndUpdate(
      { _id }, { $set: body }, { upsert: false, new: true }
    ).populate(populate);
  }

  static async deleteJob(_id) {
    return this.findOneAndUpdate({ _id }, { isDeleted: true }, { upsert: false, new: true });
  }
}

JobSchema.index({ isDeleted: 1, code: 1 }, { background: true });
JobSchema.index({ isDeleted: 1, location: 1 }, { background: true });
JobSchema.loadClass(Job);

export default mongodb.model('Job', JobSchema);
