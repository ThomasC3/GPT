import chai from 'chai';
import moment from 'moment';
import request from 'supertest-promised';
import jsonSchema from 'chai-json-schema';
import app from '../../server';
import { domain } from '../../config';
import {
  Settings, MediaItems, Campaigns
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { createScenarioLocation, listScenarioPoints } from '../utils/location';
import { createScenarioRiders, riderEndpoint } from '../utils/rider';
import { dumpMediaItemForRiderSchema } from '../utils/schemas';
import { createScenarioAdvertisers, createScenarioMediaItems, createScenarioCampaigns } from '../utils/digitalAds';

chai.use(jsonSchema);
const { expect } = chai;

const dayBeforeYesterday = moment().subtract(2, 'day').startOf('day');
const yesterday = moment().subtract(1, 'day').startOf('day');

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

let rider;
let location;
let campaign1;
let campaign2;
let campaign4;
let campaign5;
let campaign6;

const points = listScenarioPoints('San Diego');

describe('Digital ads - Rider', () => {
  before(async () => {
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await createScenarioLocation('San Diego', { timezone: 'UTC' });
    ([rider] = await createScenarioRiders(1, { app, request, domain }));
    const [advertiser] = await createScenarioAdvertisers(1);

    const [
      media1, media2, media3, media4, media5, media6, media7,
      media8, media9, media10, media11, media12
    ] = await createScenarioMediaItems(12, [
      // ----- Campaign #1 - with age restriction -----
      // ----- Campaign #6 - repeat featured Ads and media list -----
      // Media #1 - Excluded due to age restriction
      { advertisement: { advertiserId: advertiser._id, ageRestriction: 10 } },
      // Media #2
      { advertisement: { advertiserId: advertiser._id, ageRestriction: 60 } },
      // Media #3
      { advertisement: { advertiserId: advertiser._id, ageRestriction: null } },

      // ----- Campaign #2 - disabled -----
      // Media #4 - Should be excluded due to campaign being disabled
      { advertisement: { advertiserId: advertiser._id } },

      // ----- Campaign #3 - not running -----
      // Media #5 - Should be excluded due to campaign not running
      { advertisement: { advertiserId: advertiser._id } },

      // ----- Campaign #4 - more featured Ads -----
      // Media #6
      { advertisement: { advertiserId: advertiser._id } },
      // Media #7
      { advertisement: { advertiserId: advertiser._id } },

      // ----- Campaign #5 - no featured Ads -----
      // Media #8
      { advertisement: { advertiserId: advertiser._id } },
      // Media #9
      { advertisement: { advertiserId: advertiser._id } },
      // Media #10
      { advertisement: { advertiserId: advertiser._id } },
      // Media #11 - Should be excluded due to empty url
      { advertisement: { advertiserId: advertiser._id, url: '' } },
      // Media #12 - Should be excluded due to empty sourceUrl
      { sourceUrl: '', advertisement: { advertiserId: advertiser._id } }
    ]);

    // Media #13 - Should be excluded due to missing url
    const media13Info = {
      ...MEDIA_INFO(13),
      advertisement: {
        ...MEDIA_INFO(13).advertisement,
        advertiserId: advertiser._id
      }
    };
    delete media13Info.sourceUrl;
    const media13 = await MediaItems.createMediaItem(media13Info);

    // Media #14 - Should be excluded due to missing sourceUrl
    const media14Info = {
      ...MEDIA_INFO(14),
      advertisement: {
        ...MEDIA_INFO(14).advertisement,
        advertiserId: advertiser._id
      }
    };
    delete media14Info.advertisement.url;
    const media14 = await MediaItems.createMediaItem(media14Info);

    ([campaign1, campaign2, , campaign4, campaign5, campaign6] = await createScenarioCampaigns(6, [
      // ----- Campaign #1 - with age restriction -----
      {
        locations: [location._id],
        advertiserId: advertiser._id,
        featuredMedia: media1._id,
        mediaList: [media1._id, media2._id, media3._id]
      },
      // ----- Campaign #2 - disabled -----
      {
        locations: [location._id],
        advertiserId: advertiser._id,
        featuredMedia: media4._id,
        mediaList: [media4._id],
        isEnabled: false
      },
      // ----- Campaign #3 - not running -----
      {
        locations: [location._id],
        advertiserId: advertiser._id,
        featuredMedia: media5._id,
        mediaList: [media5._id],
        campaignStart: dayBeforeYesterday,
        campaignEnd: yesterday
      },
      // ----- Campaign #4 - more featured Ads -----
      {
        locations: [location._id],
        advertiserId: advertiser._id,
        featuredMedia: media6._id,
        mediaList: [media6._id, media7._id]
      },
      // ----- Campaign #5 - no featured Ads -----
      {
        locations: [location._id],
        advertiserId: advertiser._id,
        featuredMedia: null,
        mediaList: [
          media8._id, media9._id, media10._id,
          media11._id, media12._id, media13._id,
          media14._id
        ]
      },
      // ----- Campaign #6 - repeat featured Ads and media list -----
      {
        locations: [location._id],
        advertiserId: advertiser._id,
        featuredMedia: media1._id,
        mediaList: [media1._id, media2._id, media3._id],
        isEnabled: false
      }
    ]));
  });
  beforeEach(async () => {
    await Campaigns.updateMany({}, { $set: { isEnabled: true } });
    await Campaigns.updateMany(
      { _id: { $in: [campaign2._id, campaign6._id] } },
      { $set: { isEnabled: false } }
    );
  });

  describe('Digital ads filtering and sequencing for Rider', () => {
    it('Should show ad list in correct order and format', async () => {
      // Featured Ads: [1 (1), 6 (4)]
      // Ads: [3 (1), 7 (4), 8 (5), 9 (5), 10 (5)]

      const [latitude, longitude] = points[0];
      const { body: [{ id: locationId }] } = await riderEndpoint(
        `/v1/locations?longitude=${longitude}&latitude=${latitude}`,
        'get', rider.riderToken, app, request, domain
      );

      const { body: { advertisement } } = await riderEndpoint(
        `/v1/locations/${locationId}`,
        'get', rider.riderToken, app, request, domain
      );

      expect(advertisement).to.eql({});

      const { body: { mediaList } } = await riderEndpoint(
        `/v1/media?location=${locationId}`,
        'get', rider.riderToken, app, request, domain
      );

      const expectedFeaturedMediaList = ['Advertisement #1', 'Advertisement #6'];
      const expectedFeaturedMediaCampaigns = [`${campaign1._id}`, `${campaign4._id}`];
      const expectedMediaList = [
        'Advertisement #3', 'Advertisement #7', 'Advertisement #8',
        'Advertisement #9', 'Advertisement #10'
      ];
      const expectedMediaCampaigns = [`${campaign1._id}`, `${campaign4._id}`, `${campaign5._id}`];

      expect(mediaList).to.be.an('array').that.has.lengthOf(6);
      expect(mediaList[0]).to.be.jsonSchema(dumpMediaItemForRiderSchema);
      expect(mediaList[0].advertisementId).to.be.oneOf(expectedFeaturedMediaList);
      expect(mediaList[0].campaignId).to.be.oneOf(expectedFeaturedMediaCampaigns);
      expect(mediaList[0].featured).to.equal(true);
      // eslint-disable-next-line no-unused-expressions
      expect(mediaList[0].advertiserId).to.not.be.empty;
      // eslint-disable-next-line no-unused-expressions
      expect(mediaList[0].campaignId).to.not.be.empty;
      expect(mediaList[1].advertisementId).to.be.oneOf(expectedFeaturedMediaList);
      expect(mediaList[1].campaignId).to.be.oneOf(expectedFeaturedMediaCampaigns);
      expect(mediaList[1].featured).to.equal(true);
      expect(mediaList[2].advertisementId).to.be.oneOf(expectedMediaList);
      expect(mediaList[2].featured).to.equal(false);
      // eslint-disable-next-line no-unused-expressions
      expect(mediaList[2].advertiserId).to.not.be.empty;
      // eslint-disable-next-line no-unused-expressions
      expect(mediaList[2].campaignId).to.not.be.empty;
      expect(mediaList[3].advertisementId).to.be.oneOf(expectedMediaList);
      expect(mediaList[3].campaignId).to.be.oneOf(expectedMediaCampaigns);
      expect(mediaList[4].advertisementId).to.be.oneOf(expectedMediaList);
      expect(mediaList[4].campaignId).to.be.oneOf(expectedMediaCampaigns);
      expect(mediaList[5].advertisementId).to.be.oneOf(expectedMediaList);
      expect(mediaList[5].campaignId).to.be.oneOf(expectedMediaCampaigns);
    });
    it('Should not show ad list with repeated featured ads or media', async () => {
      // Featured Ads: [1 (1), 6 (4), 1 (6)]
      // Ads: [3 (1), 7 (4), 3 (6)]

      await Campaigns.updateCampaignById(campaign5._id, { isEnabled: false });
      await Campaigns.updateCampaignById(campaign6._id, { isEnabled: true });

      const [latitude, longitude] = points[0];
      const { body: [{ id: locationId }] } = await riderEndpoint(
        `/v1/locations?longitude=${longitude}&latitude=${latitude}`,
        'get', rider.riderToken, app, request, domain
      );

      const { body: { advertisement } } = await riderEndpoint(
        `/v1/locations/${locationId}`,
        'get', rider.riderToken, app, request, domain
      );

      expect(advertisement).to.eql({});

      const { body: { mediaList } } = await riderEndpoint(
        `/v1/media?location=${locationId}`,
        'get', rider.riderToken, app, request, domain
      );

      const expectedFeaturedMediaList = ['Advertisement #1', 'Advertisement #6'];
      const expectedFeaturedMediaCampaigns = [`${campaign1._id}`, `${campaign4._id}`, `${campaign6._id}`];
      const expectedMediaList = ['Advertisement #3', 'Advertisement #7'];
      const expectedMediaCampaigns = [`${campaign1._id}`, `${campaign4._id}`, `${campaign6._id}`];

      expect(mediaList).to.be.an('array').that.has.lengthOf(4);
      expect(mediaList[0]).to.be.jsonSchema(dumpMediaItemForRiderSchema);
      expect(mediaList[0].advertisementId).to.be.oneOf(expectedFeaturedMediaList);
      expect(mediaList[0].campaignId).to.be.oneOf(expectedFeaturedMediaCampaigns);
      expect(mediaList[0].featured).to.equal(true);
      // eslint-disable-next-line no-unused-expressions
      expect(mediaList[0].advertiserId).to.not.be.empty;
      // eslint-disable-next-line no-unused-expressions
      expect(mediaList[0].campaignId).to.not.be.empty;
      expect(mediaList[1].advertisementId).to.be.oneOf(expectedFeaturedMediaList);
      expect(mediaList[1].campaignId).to.be.oneOf(expectedFeaturedMediaCampaigns);
      expect(mediaList[1].featured).to.equal(true);
      expect(mediaList[2].advertisementId).to.be.oneOf(expectedMediaList);
      expect(mediaList[2].campaignId).to.be.oneOf(expectedMediaCampaigns);
      expect(mediaList[2].featured).to.equal(false);
      // eslint-disable-next-line no-unused-expressions
      expect(mediaList[2].advertiserId).to.not.be.empty;
      // eslint-disable-next-line no-unused-expressions
      expect(mediaList[2].campaignId).to.not.be.empty;
      expect(mediaList[3].advertisementId).to.be.oneOf(expectedMediaList);
      expect(mediaList[3].campaignId).to.be.oneOf(expectedMediaCampaigns);
    });
    it('Should show empty media list and advertisement if no campaigns are active', async () => {
      await Campaigns.updateMany({}, { $set: { isEnabled: false } });

      const [latitude, longitude] = points[0];
      const { body: [{ id: locationId }] } = await riderEndpoint(
        `/v1/locations?longitude=${longitude}&latitude=${latitude}`,
        'get', rider.riderToken, app, request, domain
      );

      const { body: { advertisement } } = await riderEndpoint(
        `/v1/locations/${locationId}`,
        'get', rider.riderToken, app, request, domain
      );

      expect(advertisement).to.eql({});

      const { body: { mediaList } } = await riderEndpoint(
        `/v1/media?location=${locationId}`,
        'get', rider.riderToken, app, request, domain
      );
      // eslint-disable-next-line no-unused-expressions
      expect(mediaList).to.be.an('array').that.is.empty;
    });
  });
});
