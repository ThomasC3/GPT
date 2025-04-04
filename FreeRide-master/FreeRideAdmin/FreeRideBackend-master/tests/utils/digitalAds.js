import moment from 'moment';
import { Advertisers, MediaItems, Campaigns } from '../../models';
import { populateParams } from './object';

const ADVERTISER_INFO = n => ({
  name: `Advertiser #${n}`,
  clientId: `CLIENT_ID_${n}`,
  campaigns: []
});

const yesterday = moment().subtract(1, 'day').startOf('day');
const tomorrow = moment().add(1, 'day').endOf('day');

const CAMPAIGN_INFO = n => ({
  name: `Campaign #${n}`,
  mediaList: [],
  campaignStart: yesterday,
  campaignEnd: tomorrow,
  isEnabled: true
});

const MEDIA_INFO = n => ({
  filename: `filename_${n}.jpeg`,
  filetype: 'jpeg',
  sourceUrl: `s3_bucket_url_${n}`,
  sizeInKB: 400,
  visualInfo: {
    width: 720,
    height: 1280,
    ratio: '16:9'
  },
  purpose: 'ADVERTISEMENT',
  advertisement: {
    advertisementId: `Advertisement #${n}`,
    url: 'ride_circuit_url'
  }
});

export const createAdvertiser = async (advertiserParams = {}) => {
  const params = populateParams(advertiserParams, ADVERTISER_INFO(0));
  return Advertisers.createAdvertiser(params);
};

export const createScenarioAdvertisers = async (number, advertiserAttributes = [{}]) => {
  const advertisers = [];
  let advertiserParams;
  for (let i = 0; i < number; i += 1) {
    advertiserParams = advertiserAttributes.length > i ? advertiserAttributes[i] : {};
    advertisers.push(
      createAdvertiser({
        ...ADVERTISER_INFO(i + 1),
        ...advertiserParams
      })
    );
  }
  return Promise.all(advertisers);
};

export const createMediaItem = async (mediaItemParams = {}) => {
  const params = populateParams(mediaItemParams, MEDIA_INFO(0));
  return MediaItems.createMediaItem(params);
};

export const createScenarioMediaItems = async (number, mediaItemAttributes = [{}]) => {
  const mediaItems = [];
  let mediaItemParams;
  for (let i = 0; i < number; i += 1) {
    mediaItemParams = mediaItemAttributes.length > i ? mediaItemAttributes[i] : {};
    mediaItems.push(
      createMediaItem({
        ...MEDIA_INFO(i + 1),
        ...mediaItemParams,
        advertisement: {
          ...MEDIA_INFO(i + 1).advertisement,
          ...mediaItemParams.advertisement
        }
      })
    );
  }
  return Promise.all(mediaItems);
};


export const createCampaign = async (campaignParams = {}) => {
  const params = populateParams(campaignParams, CAMPAIGN_INFO(0));
  return Campaigns.createCampaign(params);
};

export const createScenarioCampaigns = async (number, campaignAttributes = [{}]) => {
  const campaigns = [];
  let campaignParams;
  for (let i = 0; i < number; i += 1) {
    campaignParams = campaignAttributes.length > i ? campaignAttributes[i] : {};
    campaigns.push(
      createCampaign({
        ...CAMPAIGN_INFO(i + 1),
        ...campaignParams
      })
    );
  }
  return Promise.all(campaigns);
};


export default {
  createAdvertiser,
  createScenarioAdvertisers,
  createMediaItem,
  createScenarioMediaItems,
  createCampaign,
  createScenarioCampaigns
};
