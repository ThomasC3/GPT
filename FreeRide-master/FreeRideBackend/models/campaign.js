import moment from 'moment-timezone';
import { mongodb } from '../services';
import { mapNonIntervalDateSearch } from '../utils/transformations';

const { Schema } = mongodb;

export const { ObjectId } = Schema.Types;

const CampaignSchema = Schema({
  name: {
    type: String
  },
  advertiserId: {
    type: ObjectId,
    ref: 'Advertiser'
  },
  mediaList: [{
    type: ObjectId,
    ref: 'MediaItem'
  }],
  featuredMedia: {
    type: ObjectId,
    ref: 'MediaItem',
    default: null
  },
  campaignStart: {
    type: Date
  },
  campaignEnd: {
    type: Date
  },
  locations: [{
    type: ObjectId,
    ref: 'Location'
  }],
  isEnabled: {
    type: Boolean,
    default: true
  },
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
  collection: 'Campaigns'
});

class Campaign {
  static async getCampaign(body, configuration) {
    const { populate = '' } = configuration || {};
    return this.findOne(body).populate(populate);
  }

  static async getCampaigns(body, configuration) {
    const { pagination, sort, populate = '' } = configuration || {};
    const match = { ...body, isDeleted: false };
    const skip = pagination?.pageSize * (pagination?.current - 1) || 0;
    const limit = pagination?.pageSize || 0;

    const campaigns = this
      .find(match)
      .sort(sort)
      .collation({ locale: 'en_US', numericOrdering: true })
      .skip(skip)
      .limit(limit)
      .populate(populate);

    const allCampaigns = this.find(match);

    const [
      items = [], total = 0
    ] = await Promise.all([campaigns, this.countDocuments(allCampaigns)]);

    return { items, total };
  }

  static async createCampaign(body) {
    return this.create(body);
  }

  static async updateCampaignById(_id, body, populate = '') {
    return this.findOneAndUpdate(
      { _id },
      { $set: body },
      { upsert: false, new: true }
    ).populate(populate);
  }

  static async getAdvertiserCampaigns(advertiserId) {
    return this.find({ isDeleted: false, advertiserId });
  }

  static async assignAdvertiserToCampaigns(campaignIds, advertiserId) {
    return this.updateMany(
      { isDeleted: false, _id: { $in: campaignIds }, advertiserId: null },
      { $set: { advertiserId } },
      { upsert: false, new: true }
    );
  }

  static async removeAdvertiserFromCampaigns(campaignIds, advertiserId) {
    return this.updateMany(
      { isDeleted: false, _id: { $in: campaignIds }, advertiserId },
      { $set: { advertiserId: null, mediaList: [], featuredMedia: null } },
      { upsert: false, new: true }
    );
  }

  static async pullMediaItem(mediaItemId) {
    const pullFromMediaList = this.updateMany(
      { isDeleted: false, mediaList: mediaItemId },
      { $pull: { mediaList: mediaItemId } },
      { upsert: false, new: true }
    );
    const pullFromFeaturedMedia = this.updateMany(
      { isDeleted: false, featuredMedia: mediaItemId },
      { $set: { featuredMedia: null } },
      { upsert: false, new: true }
    );
    return Promise.all([pullFromMediaList, pullFromFeaturedMedia]);
  }

  static async deleteCampaign(_id, additionalParams) {
    const { deletedBy = null, deletedTimestamp = Date.now } = additionalParams;
    return this.findOneAndUpdate(
      { _id },
      { isDeleted: true, deletedBy, deletedTimestamp },
      { upsert: false, new: true }
    );
  }

  static async deleteAdvertiserCampaigns(advertiserId, additionalParams) {
    const { deletedBy = null, deletedTimestamp = Date.now } = additionalParams;
    return this.updateMany(
      { isDeleted: false, advertiserId },
      { $set: { isDeleted: true, deletedBy, deletedTimestamp } },
      { upsert: false, new: true }
    );
  }

  static async getLocationActiveCampaigns(locationId, configuration = {}) {
    const { timezone = 'UTC' } = configuration;
    const curentDate = moment();
    const dateQuery = mapNonIntervalDateSearch(curentDate, timezone);
    const { $lt, $gte } = dateQuery;
    const runningQuery = {
      locations: locationId,
      isEnabled: true,
      campaignStart: { $lt },
      campaignEnd: { $gte }
    };
    const { items: activeCampaigns } = await this.getCampaigns(runningQuery, configuration);
    return activeCampaigns;
  }
}

CampaignSchema.set('toJSON', {
  getters: true,
  transform: (doc, ret) => {
    const formatted = { ...ret };
    formatted.id = formatted._id;
    delete formatted._id;
    return formatted;
  }
});

CampaignSchema.index({ isDeleted: 1, name: 1 }, { background: true });
CampaignSchema.index({ isDeleted: 1, advertiser: 1 }, { background: true });
CampaignSchema.index({ isDeleted: 1, locations: 1 }, { background: true });
CampaignSchema.index({ isDeleted: 1, campaignStart: 1, campaignEnd: 1 }, { background: true });
CampaignSchema.index({ isDeleted: 1, isEnabled: 1 }, { background: true });
CampaignSchema.loadClass(Campaign);

export default mongodb.model('Campaign', CampaignSchema);
