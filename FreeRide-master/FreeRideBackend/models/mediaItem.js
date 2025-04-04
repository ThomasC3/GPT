import { mongodb } from '../services';
import { ApplicationError } from '../errors';

const { Schema } = mongodb;

export const { ObjectId } = Schema.Types;

export const PURPOSE_SOURCES = {
  ADVERTISEMENT: 'ADVERTISEMENT'
};

const purposeOptions = {
  values: Object.values(PURPOSE_SOURCES),
  message: `Value must be either of '${Object.values(PURPOSE_SOURCES).join('\', \'')}'`
};

const MediaItemSchema = Schema({
  filename: {
    type: String
  },
  filetype: {
    type: String
  },
  sourceUrl: {
    type: String
  },
  sizeInKB: {
    type: Number
  },
  visualInfo: {
    width: {
      type: Number
    },
    height: {
      type: Number
    },
    ratio: {
      type: String
    }
  },
  purpose: {
    type: String,
    enum: purposeOptions
  },
  advertisement: {
    advertiserId: {
      type: ObjectId,
      ref: 'Advertiser'
    },
    advertisementId: {
      type: String
    },
    url: {
      type: String
    },
    ageRestriction: {
      type: Number,
      default: null
    }
  },
  createdTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  createdBy: {
    type: String
  },
  uploadedTimestamp: {
    type: Date
  },
  uploadedBy: {
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
  collection: 'MediaItems'
});

class MediaItem {
  static async uniqueAdvertisementIdCheck(body, _id) {
    const mediaItem = await this.getMediaItem({
      _id: { $ne: _id },
      'advertisement.advertisementId': body.advertisement.advertisementId,
      isDeleted: false
    });

    if (mediaItem) {
      throw new ApplicationError(`Media with advertisement ID ${mediaItem.advertisement.advertisementId} already exists`, 409);
    }
  }

  static async getMediaItem(body) {
    return this.findOne(body);
  }

  static async getMediaItems(body, configuration) {
    const { pagination, sort, populate = '' } = configuration || {};
    const match = { ...body, isDeleted: false };
    const skip = pagination?.pageSize * (pagination?.current - 1) || 0;
    const limit = pagination?.pageSize || 0;

    const mediaItems = this
      .find(match)
      .sort(sort)
      .collation({ locale: 'en_US', numericOrdering: true })
      .skip(skip)
      .limit(limit)
      .populate(populate);

    const allMediaItems = this.find(match);

    const [
      items = [], total = 0
    ] = await Promise.all([mediaItems, this.countDocuments(allMediaItems)]);

    return { items, total };
  }

  static async createMediaItem(body) {
    const { purpose } = body;
    if (purpose === PURPOSE_SOURCES.ADVERTISEMENT) {
      await this.uniqueAdvertisementIdCheck(body);
    }
    return this.create(body);
  }

  static async updateMediaItemById(_id, body, populate = '') {
    const { purpose } = body;
    if (purpose === PURPOSE_SOURCES.ADVERTISEMENT) {
      await this.uniqueAdvertisementIdCheck(body, _id);
    }
    return this.findOneAndUpdate(
      { _id }, { $set: body }, { upsert: false, new: true }
    ).populate(populate);
  }

  static async deleteMediaItem(_id, additionalParams) {
    const { deletedBy = null, deletedTimestamp = Date.now } = additionalParams;
    return this.findOneAndUpdate(
      { _id },
      { isDeleted: true, deletedBy, deletedTimestamp },
      { upsert: false, new: true }
    );
  }

  static async deleteAdvertiserMedia(advertiserId, additionalParams) {
    const { deletedBy = null, deletedTimestamp = Date.now } = additionalParams;
    return this.updateMany(
      { 'advertisement.advertiserId': advertiserId },
      { $set: { isDeleted: true, deletedBy, deletedTimestamp } },
      { upsert: false, new: true }
    );
  }
}

MediaItemSchema.index({ isDeleted: 1, filename: 1 }, { background: true });
MediaItemSchema.index({ isDeleted: 1, 'advertisement.advertisementId': 1 }, { background: true });
MediaItemSchema.index({ isDeleted: 1, 'advertisement.advertiserId': 1 }, { background: true });
MediaItemSchema.loadClass(MediaItem);

export default mongodb.model('MediaItem', MediaItemSchema);
