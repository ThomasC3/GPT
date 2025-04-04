import { mongodb } from '../services';
import { ApplicationError } from '../errors';

const { Schema } = mongodb;

export const { ObjectId } = Schema.Types;

const AdvertiserSchema = Schema({
  name: {
    type: String,
    required: true
  },
  clientId: {
    type: String
  },
  campaigns: [{
    type: ObjectId,
    ref: 'Campaign'
  }],
  createdTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  createdBy: {
    type: String
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedTimestamp: {
    type: Date
  },
  deletedBy: {
    type: String
  }
},
{
  versionKey: false,
  collection: 'Advertisers'
});

class Advertiser {
  static async uniqueClientIdCheck(body, _id) {
    const withId = _id ? { _id: { $ne: _id } } : {};

    const advertiser = await this.getAdvertiser({
      ...withId,
      clientId: body.clientId,
      isDeleted: false
    });

    if (advertiser) {
      throw new ApplicationError(`Advertiser with client ID ${advertiser.clientId} already exists`, 409);
    }
  }

  static async getAdvertiser(body, configuration) {
    const { populate = '' } = configuration || {};
    return this.findOne(body).populate(populate);
  }

  static async getAdvertisers(body, configuration) {
    const { pagination, sort, populate = '' } = configuration || {};
    const match = { ...body, isDeleted: false };
    const skip = pagination?.pageSize * (pagination?.current - 1) || 0;
    const limit = pagination?.pageSize || 0;

    const advertisers = this
      .find(match)
      .sort(sort)
      .collation({ locale: 'en_US', numericOrdering: true })
      .skip(skip)
      .limit(limit)
      .populate(populate);

    const allAdvertisers = this.find(match);

    const [
      items = [], total = 0
    ] = await Promise.all([advertisers, this.countDocuments(allAdvertisers)]);

    return { items, total };
  }

  static async createAdvertiser(body) {
    await this.uniqueClientIdCheck(body);
    return this.create(body);
  }

  static async updateAdvertiserById(_id, body, configuration) {
    const { populate = '' } = configuration || {};
    await this.uniqueClientIdCheck(body, _id);
    return this.findOneAndUpdate(
      { _id },
      { $set: body },
      { upsert: false, new: true }
    ).populate(populate);
  }

  static async deleteAdvertiser(_id, additionalParams) {
    const { deletedBy = null, deletedTimestamp = Date.now } = additionalParams;
    return this.findOneAndUpdate(
      { _id },
      { isDeleted: true, deletedBy, deletedTimestamp },
      { upsert: false, new: true }
    );
  }
}

AdvertiserSchema.set('toJSON', {
  getters: true,
  transform: (doc, ret) => {
    const formatted = { ...ret };
    formatted.id = formatted._id;
    delete formatted._id;
    return formatted;
  }
});

AdvertiserSchema.index({ isDeleted: 1, name: 1 }, { background: true });
AdvertiserSchema.index({ isDeleted: 1, clientId: 1 }, { background: true });
AdvertiserSchema.loadClass(Advertiser);

export default mongodb.model('Advertiser', AdvertiserSchema);
