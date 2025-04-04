import { Advertisers, MediaItems, Campaigns } from '../../../models';
import { adminErrorCatchHandler } from '..';
import { validator } from '../../../utils';
import { s3 } from '../../../services';
import { aws as awsConfig } from '../../../config';
import { unique } from '../../../utils/array';
import { dumpAdvertiserForAdmin, dumpMediaItemForAdmin } from '../../../utils/dump';
import { commonAttributeObj } from '../../../utils/transformations';
import { ApplicationError } from '../../../errors';

const MEDIA_ALLOWED_ATTRIBUTES = [
  'filename', 'filetype', 'sourceUrl', 'sizeInKB',
  'purpose', 'visualInfo', 'advertisement'
];

const PAGINATION_CONFIGURATION = {
  pagination: validator.rules.object().keys({
    pageSize: validator.rules.number(),
    current: validator.rules.number(),
    total: validator.rules.number()
  }).optional()
};

const upload = async (req, res) => {
  try {
    const {
      image,
      filename,
      filetype,
      sizeInKB,
      visualInfo: { width, height, ratio }
    } = validator.validate(
      validator.rules.object().keys({
        mediaId: validator.rules.string().required(),
        image: validator.rules.string().required(),
        filename: validator.rules.string().required(),
        filetype: validator.rules.string().required(),
        sizeInKB: validator.rules.number().required(),
        visualInfo: validator.rules.object().keys({
          width: validator.rules.number().required(),
          height: validator.rules.number().required(),
          ratio: validator.rules.string().required()
        })
      }),
      req.body
    );

    const {
      id: mediaId
    } = validator.validate(
      validator.rules.object().keys({
        id: validator.rules.string().required()
      }),
      req.params
    );

    const {
      id: uploadedBy
    } = req.user;

    const media = await MediaItems.findById(mediaId);

    if (!media) {
      throw new ApplicationError(`Media with id ${mediaId} not found`, 404);
    }

    const type = image.split(';')[0].split('/')[1];
    const fileName = `Media_${media._id.toString()}_${+(new Date())}.${type}`;
    const bucketName = awsConfig.s3.images_bucket_name;

    const uploadedImage = await s3.uploadImage(image, type, fileName, bucketName);
    const sourceUrl = uploadedImage.Location;

    const imageInfo = {
      filename,
      filetype,
      sourceUrl,
      sizeInKB,
      visualInfo: { width, height, ratio },
      uploadedBy,
      uploadedTimestamp: Date.now()
    };
    const updatedMedia = await MediaItems.updateMediaItemById(mediaId, imageInfo);

    res.status(200).json(dumpMediaItemForAdmin(updatedMedia));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};


const getMediaList = async (req, res) => {
  try {
    const {
      filters, pagination
    } = validator.validate(
      validator.rules.object().keys({
        filters: validator.rules.object().keys({
          filename: validator.rules.string().allow(''),
          advertiserId: validator.rules.string().allow(''),
          advertisementId: validator.rules.string().allow(''),
          purpose: validator.rules.string().allow('')
        }).optional(),
        ...PAGINATION_CONFIGURATION
      }),
      req.query
    );

    const findQuery = { isDeleted: false };
    if (filters) {
      if (filters.purpose) findQuery.purpose = filters.purpose;
      if (filters.filename) findQuery.filename = new RegExp(filters.filename, 'i');
      if (filters.advertiserId) findQuery['advertisement.advertiserId'] = filters.advertiserId;
      if (filters.advertisementId) findQuery['advertisement.advertisementId'] = new RegExp(filters.advertisementId, 'i');
    }

    const sort = { filename: 1 };

    const {
      items: mediaItems, total
    } = await MediaItems.getMediaItems(findQuery, { pagination, sort });

    const advertiserIds = unique(
      mediaItems.map(media => media.advertisement?.advertiserId)
        .filter(advertiser => !!advertiser)
    );
    const {
      items: advertisers
    } = await Advertisers.getAdvertisers({ _id: { $in: advertiserIds } });

    res.status(200).json({
      items: mediaItems.map(dumpMediaItemForAdmin),
      advertisers: advertisers.map(dumpAdvertiserForAdmin),
      total
    });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getMedia = async (req, res) => {
  try {
    const {
      id
    } = validator.validate(
      validator.rules.object().keys({
        id: validator.rules.string().required()
      }),
      req.params
    );

    const media = await MediaItems.getMediaItem({ _id: id });

    res.status(200).json(dumpMediaItemForAdmin(media));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const createMedia = async (req, res) => {
  const {
    body: mediaFormData
  } = req;
  const {
    id: createdBy
  } = req.user;

  try {
    const mediaData = commonAttributeObj(
      MEDIA_ALLOWED_ATTRIBUTES, mediaFormData
    );

    const addedMedia = await MediaItems.createMediaItem({ ...mediaData, createdBy });

    res.status(200).json(dumpMediaItemForAdmin(addedMedia));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const updateMedia = async (req, res) => {
  try {
    const {
      params: { id: mediaItemId },
      body: mediaFormData
    } = req;

    const mediaUpdateData = commonAttributeObj(
      MEDIA_ALLOWED_ATTRIBUTES, mediaFormData
    );

    const oldMedia = await MediaItems.getMediaItem({ _id: mediaItemId });
    const updatedMedia = await MediaItems.updateMediaItemById(mediaItemId, mediaUpdateData);

    if (oldMedia.purpose === 'ADVERTISEMENT') {
      const { advertiserId: oldAdvertiserId } = oldMedia.advertisement;
      const { advertiserId: newAdvertiserId } = updatedMedia.advertisement;
      if (`${oldAdvertiserId}` !== `${newAdvertiserId}` && oldAdvertiserId) {
        await Campaigns.pullMediaItem(mediaItemId);
      }
    }

    res.status(200).json(dumpMediaItemForAdmin(updatedMedia));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const deleteMedia = async (req, res) => {
  try {
    const {
      id: mediaItemId
    } = validator.validate(
      validator.rules.object().keys({
        id: validator.rules.string().required()
      }),
      req.params
    );
    const {
      id: deletedBy
    } = req.user;

    const deletedTimestamp = Date.now();
    const deletedInformation = { deletedTimestamp, deletedBy };

    await MediaItems.deleteMediaItem(mediaItemId, deletedInformation);
    await Campaigns.pullMediaItem(mediaItemId);

    res.status(200).json();
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

export default {
  upload,
  getMediaList,
  getMedia,
  createMedia,
  updateMedia,
  deleteMedia
};
