import moment from 'moment-timezone';
import { DATE_FORMAT_SHORT } from '../../../utils/time';
import { adminErrorCatchHandler } from '..';
import { Advertisers, Campaigns, MediaItems } from '../../../models';
import { validator } from '../../../utils';
import { commonAttributeObj } from '../../../utils/transformations';
import { dumpAdvertiserForAdmin, dumpCampaignForAdmin } from '../../../utils/dump';
import { mongodb } from '../../../services';

const { Types } = mongodb;

const ADVERTISER_ALLOWED_ATTRIBUTES = ['name', 'clientId', 'campaigns'];
const CAMPAIGN_ALLOWED_ATTRIBUTES = [
  'name', 'advertiserId', 'campaignStart', 'campaignEnd',
  'isEnabled', 'locations', 'featuredMedia', 'mediaList'
];

const PAGINATION_CONFIGURATION = {
  pagination: validator.rules.object().keys({
    pageSize: validator.rules.number(),
    current: validator.rules.number(),
    total: validator.rules.number()
  }).optional()
};

const SORT_CONFIGURATION = {
  sort: validator.rules.object().keys({
    key: validator.rules.string(),
    order: validator.rules.number()
  }).optional()
};

const getAdvertisers = async (req, res) => {
  try {
    const {
      filters, pagination
    } = validator.validate(
      validator.rules.object().keys({
        filters: validator.rules.object().keys({
          name: validator.rules.string().allow(''),
          clientId: validator.rules.string().allow('')
        }).optional(),
        ...PAGINATION_CONFIGURATION
      }),
      req.query
    );

    const findQuery = { isDeleted: false };
    if (filters) {
      if (filters.name) findQuery.name = new RegExp(filters.name, 'i');
      if (filters.clientId) findQuery.clientId = new RegExp(filters.clientId, 'i');
    }

    const sort = { name: 1 };

    const { items, total } = await Advertisers.getAdvertisers(findQuery, { pagination, sort, populate: 'campaigns' });
    res.status(200).json({ items: items.map(dumpAdvertiserForAdmin), total });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getAdvertiser = async (req, res) => {
  try {
    const {
      id
    } = validator.validate(
      validator.rules.object().keys({
        id: validator.rules.string().required()
      }),
      req.params
    );

    const advertiser = await Advertisers.getAdvertiser({ _id: id });

    res.status(200).json(dumpAdvertiserForAdmin(advertiser));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const createAdvertiser = async (req, res) => {
  const {
    body: advertiserFormData
  } = req;
  const {
    id: createdBy
  } = req.user;

  try {
    const advertiserData = commonAttributeObj(
      ADVERTISER_ALLOWED_ATTRIBUTES, advertiserFormData
    );

    const addedAdvertiser = await Advertisers.createAdvertiser({ ...advertiserData, createdBy });

    res.status(200).json(dumpAdvertiserForAdmin(addedAdvertiser));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const updateAdvertiser = async (req, res) => {
  try {
    const {
      params: { id: advertiserId },
      body: advertiserFormData
    } = req;

    const advertiserUpdateData = commonAttributeObj(
      ADVERTISER_ALLOWED_ATTRIBUTES, advertiserFormData
    );

    const oldCampaigns = await Campaigns.getAdvertiserCampaigns(advertiserId);
    const oldCampaignIds = oldCampaigns.map(camp => String(camp._id));
    const { campaigns: newCampaignIds } = advertiserFormData;
    const campaignsToRemove = oldCampaignIds.filter(
      campaignId => !newCampaignIds.includes(campaignId)
    );
    const campaignsToAdd = newCampaignIds.filter(
      campaignId => !oldCampaignIds.includes(campaignId)
    );

    await Campaigns.assignAdvertiserToCampaigns(campaignsToAdd, advertiserId);
    await Campaigns.removeAdvertiserFromCampaigns(campaignsToRemove, advertiserId);

    const newCampaigns = await Campaigns.getAdvertiserCampaigns(advertiserId);

    const updatedAdvertiser = await Advertisers.updateAdvertiserById(advertiserId, {
      ...advertiserUpdateData,
      campaigns: newCampaigns.map(camp => camp._id)
    });

    res.status(200).json(dumpAdvertiserForAdmin(updatedAdvertiser));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const deleteAdvertiser = async (req, res) => {
  try {
    const {
      id: advertiserId
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

    await Advertisers.deleteAdvertiser(advertiserId, deletedInformation);
    await Campaigns.deleteAdvertiserCampaigns(advertiserId, deletedInformation);
    await MediaItems.deleteAdvertiserMedia(advertiserId, deletedInformation);

    res.status(200).json();
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getCampaigns = async (req, res) => {
  try {
    const {
      filters, pagination, sort: sortBy
    } = validator.validate(
      validator.rules.object().keys({
        filters: validator.rules.object().keys({
          name: validator.rules.string().allow(''),
          advertiserId: validator.rules.string().allow(''),
          location: validator.rules.string().allow(''),
          isRunning: validator.rules.boolean().allow(''),
          isEnabled: validator.rules.boolean().allow(''),
          availableForAdvertiserId: validator.rules.string().allow('')
        }).optional(),
        ...PAGINATION_CONFIGURATION,
        ...SORT_CONFIGURATION
      }),
      req.query
    );

    const findQuery = { isDeleted: false };
    if (filters) {
      if (filters.name) findQuery.name = new RegExp(filters.name, 'i');
      if (filters.advertiserId) findQuery.advertiserId = new Types.ObjectId(filters.advertiserId);
      if (filters.location) findQuery.locations = new Types.ObjectId(filters.location);
      if ([true, false].includes(filters.isEnabled)) findQuery.isEnabled = filters.isEnabled;
      if ([true, false].includes(filters.isRunning)) {
        const now = moment.tz(new Date(), 'America/New_York').format();
        if (filters.isRunning) {
          findQuery.campaignStart = { $lt: now };
          findQuery.campaignEnd = { $gte: now };
          findQuery.isEnabled = true;
        } else {
          findQuery.$or = [
            { isEnabled: false },
            { campaignStart: { $gte: now } },
            { campaignEnd: { $lt: now } },
            { campaignStart: { $exists: false } }
          ];
        }
      }
      if (filters.availableForAdvertiserId) {
        findQuery.advertiserId = {
          $in: [new Types.ObjectId(filters.availableForAdvertiserId), null]
        };
      }
    }

    const sort = sortBy ? {
      [sortBy.key ? sortBy.key : '_id']: sortBy.order ? parseInt(sortBy.order, 10) : -1
    } : {};

    const { items, total } = await Campaigns.getCampaigns(
      findQuery, { pagination, sort }
    );

    const advertiserIds = items.map(camp => camp.advertiserId).filter(advertiser => !!advertiser);
    const { items: advertisers } = await Advertisers.getAdvertisers(
      { _id: { $in: advertiserIds } }
    );

    res.status(200).json({
      items: items.map(dumpCampaignForAdmin),
      total,
      advertisers
    });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getCampaign = async (req, res) => {
  try {
    const {
      id
    } = validator.validate(
      validator.rules.object().keys({
        id: validator.rules.string().required()
      }),
      req.params
    );

    const campaign = await Campaigns.getCampaign({ _id: id });

    res.status(200).json(dumpCampaignForAdmin(campaign));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const createCampaign = async (req, res) => {
  const {
    body: campaignFormData
  } = req;
  const {
    id: createdBy
  } = req.user;

  try {
    const campaignData = commonAttributeObj(CAMPAIGN_ALLOWED_ATTRIBUTES, campaignFormData);
    campaignData.campaignStart = campaignData.campaignStart
      ? moment(campaignData.campaignStart, DATE_FORMAT_SHORT).startOf('day') : null;
    campaignData.campaignEnd = campaignData.campaignEnd
      ? moment(campaignData.campaignEnd, DATE_FORMAT_SHORT).endOf('day') : null;

    const addedCampaign = await Campaigns.createCampaign({ ...campaignData, createdBy });

    if (addedCampaign.advertiserId) {
      const campaigns = await Campaigns.getAdvertiserCampaigns(addedCampaign.advertiserId);
      await Advertisers.updateAdvertiserById(addedCampaign.advertiserId, {
        campaigns: campaigns.map(camp => camp._id)
      });
    }

    res.status(200).json(dumpCampaignForAdmin(addedCampaign));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const updateCampaign = async (req, res) => {
  try {
    const {
      params: { id: campaignId },
      body: campaignFormData
    } = req;

    const campaignUpdateData = commonAttributeObj(
      CAMPAIGN_ALLOWED_ATTRIBUTES, campaignFormData
    );
    campaignUpdateData.campaignStart = campaignUpdateData.campaignStart
      ? moment(campaignUpdateData.campaignStart, DATE_FORMAT_SHORT).startOf('day') : null;
    campaignUpdateData.campaignEnd = campaignUpdateData.campaignEnd
      ? moment(campaignUpdateData.campaignEnd, DATE_FORMAT_SHORT).endOf('day') : null;

    const oldCampaign = await Campaigns.getCampaign({ _id: campaignId });
    const updatedCampaign = await Campaigns.updateCampaignById(campaignId, campaignUpdateData);

    if (`${oldCampaign.advertiserId}` !== `${updatedCampaign.advertiserId}`) {
      if (oldCampaign.advertiserId) {
        const campaignList1 = await Campaigns.getAdvertiserCampaigns(oldCampaign.advertiserId);
        await Advertisers.updateAdvertiserById(oldCampaign.advertiserId, {
          campaigns: campaignList1.map(camp => camp._id)
        });
      }
      if (updatedCampaign.advertiserId) {
        const campaignList2 = await Campaigns.getAdvertiserCampaigns(updatedCampaign.advertiserId);
        await Advertisers.updateAdvertiserById(updatedCampaign.advertiserId, {
          campaigns: campaignList2.map(camp => camp._id)
        });
      }
    }
    res.status(200).json(dumpCampaignForAdmin(updatedCampaign));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const deleteCampaign = async (req, res) => {
  try {
    const {
      id: campaignId
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

    const deletedCampaign = await Campaigns.deleteCampaign(campaignId, deletedInformation);
    if (deletedCampaign.advertiserId) {
      const campaigns = await Campaigns.getAdvertiserCampaigns(deletedCampaign.advertiserId);
      await Advertisers.updateAdvertiserById(deletedCampaign.advertiserId, {
        campaigns: campaigns.map(camp => camp._id)
      });
    }

    res.status(200).json();
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

export default {
  getAdvertisers,
  getAdvertiser,
  createAdvertiser,
  updateAdvertiser,
  deleteAdvertiser,
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign
};
