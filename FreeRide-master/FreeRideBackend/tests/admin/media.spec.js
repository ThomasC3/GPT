/* eslint-disable no-unused-expressions */
import { expect } from 'chai';
import { Types } from 'mongoose';
import request from 'supertest-promised';
import moment from 'moment';
import app from '../../server';
import { Advertisers, Campaigns, MediaItems } from '../../models';
import { domain } from '../../config';
import { emptyAllCollections, emptyCollection } from '../utils/helper';
import { createAdminLogin, adminEndpoint } from '../utils/admin';

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
    url: 'ride_circuit_url',
    ageRestriction: 18
  }
});

let adminToken;

let advertiser1;
let advertiser2;
let advertiser3;

let campaign1;
let campaign2;

let media1;
let media2;
let media3;
let media4;
let media5;

describe('Media - purpose ADVERTISEMENT', () => {
  before(async () => {
    await emptyAllCollections();
    ({ adminToken } = await createAdminLogin());
  });
  describe('Media CRUD', () => {
    before(async () => {
      await emptyCollection('MediaItems');
      await emptyCollection('Advertisers');
      advertiser1 = await Advertisers.createAdvertiser(ADVERTISER_INFO(1));
      advertiser2 = await Advertisers.createAdvertiser(ADVERTISER_INFO(2));
      advertiser3 = await Advertisers.createAdvertiser(ADVERTISER_INFO(3));

      campaign1 = await Campaigns.createCampaign(
        { ...CAMPAIGN_INFO(1), advertiserId: advertiser1._id }
      );

      media1 = await MediaItems.createMediaItem({
        ...MEDIA_INFO(1),
        advertisement: { ...MEDIA_INFO(1).advertisement, advertiserId: advertiser1._id }
      });
      media2 = await MediaItems.createMediaItem({
        ...MEDIA_INFO(2),
        advertisement: { ...MEDIA_INFO(2).advertisement, advertiserId: advertiser2._id }
      });
      media3 = await MediaItems.createMediaItem(MEDIA_INFO(3));
      media4 = await MediaItems.createMediaItem({ ...MEDIA_INFO(4), isDeleted: true });

      const mediaInfo5 = MEDIA_INFO(5);
      delete mediaInfo5.purpose;
      media5 = await MediaItems.createMediaItem(mediaInfo5);
    });
    beforeEach(async () => {
      await MediaItems.updateMediaItemById(media3._id, { isDeleted: false });
    });
    it('GET /v1/media - should list advertisement media', async () => {
      const params = { 'filters[purpose]': 'ADVERTISEMENT' };
      const { body: mediaList } = await adminEndpoint(
        `/v1/media?${new URLSearchParams(params).toString()}`, 'get',
        adminToken, app, request, domain
      );

      expect(mediaList.items).to.have.lengthOf.at.least(3);
      expect(mediaList.total).to.be.at.least(3);

      const advertisementMedia = mediaList.items
        .find(camp => camp.id === String(media1._id));
      expect(advertisementMedia.filename).to.equal('filename_1.jpeg');

      const deletedMedia = mediaList.items.find(camp => camp.id === String(media4._id));
      expect(deletedMedia).to.be.undefined;

      const nonAdvertisementMedia = mediaList.items.find(camp => camp.id === String(media5._id));
      expect(nonAdvertisementMedia).to.be.undefined;
    });
    it('GET /v1/media - should list advertisement media by advertiser id', async () => {
      const params = {
        'filters[purpose]': 'ADVERTISEMENT',
        'filters[advertiserId]': String(advertiser2._id)
      };
      const { body: mediaList } = await adminEndpoint(
        `/v1/media?${new URLSearchParams(params).toString()}`, 'get',
        adminToken, app, request, domain
      );

      expect(mediaList.items).to.have.lengthOf(1);
      expect(mediaList.total).to.equal(1);
      expect(mediaList.items[0].id).to.equal(String(media2._id));
    });
    it('GET /v1/media/:id - should get media', async () => {
      const { body: media } = await adminEndpoint(
        `/v1/media/${media1._id}`, 'get',
        adminToken, app, request, domain
      );

      expect(media.id).to.be.a('string').that.is.not.empty;
      expect(media.filename).to.equal('filename_1.jpeg');
      expect(media.filetype).to.equal('jpeg');
      expect(media.sourceUrl).to.equal('s3_bucket_url_1');
      expect(media.sizeInKB).to.equal(400);
      expect(media.visualInfo.width).to.equal(720);
      expect(media.visualInfo.height).to.equal(1280);
      expect(media.visualInfo.ratio).to.equal('16:9');
      expect(`${media.advertisement.advertiserId}`).to.equal(`${advertiser1._id}`);
      expect(media.advertisement.advertisementId).to.equal('Advertisement #1');
      expect(media.advertisement.url).to.equal('ride_circuit_url');
      expect(media.advertisement.ageRestriction).to.equal(18);
    });
    it('POST /v1/media - should create a media and return formatted info', async () => {
      const mediaInfo = MEDIA_INFO(6);
      const { body: createdMedia } = await adminEndpoint(
        '/v1/media', 'post',
        adminToken, app, request, domain, {
          ...mediaInfo,
          advertisement: {
            ...mediaInfo.advertisement,
            advertiserId: advertiser3._id
          }
        }
      );

      expect(createdMedia.id).to.be.a('string').that.is.not.empty;
      expect(createdMedia.filename).to.equal('filename_6.jpeg');
      expect(createdMedia.filetype).to.equal('jpeg');
      expect(createdMedia.sourceUrl).to.equal('s3_bucket_url_6');
      expect(createdMedia.sizeInKB).to.equal(400);
      expect(createdMedia.visualInfo.width).to.equal(720);
      expect(createdMedia.visualInfo.height).to.equal(1280);
      expect(createdMedia.visualInfo.ratio).to.equal('16:9');
      expect(`${createdMedia.advertisement.advertiserId}`).to.equal(`${advertiser3._id}`);
      expect(createdMedia.advertisement.advertisementId).to.equal('Advertisement #6');
      expect(createdMedia.advertisement.url).to.equal('ride_circuit_url');
      expect(createdMedia.advertisement.ageRestriction).to.equal(18);

      const mediaItemObject = await MediaItems.getMediaItem({ _id: createdMedia.id });
      expect(mediaItemObject._id).to.be.an.instanceOf(Types.ObjectId);
      expect(mediaItemObject.createdTimestamp).to.be.an.instanceOf(Date);
      expect(mediaItemObject.createdBy).to.include('auth0|');
      expect(mediaItemObject.isDeleted).to.equal(false);
      expect(mediaItemObject.deletedTimestamp).to.be.undefined;
      expect(mediaItemObject.deletedBy).to.be.undefined;
    });
    it('PUT /v1/media - should update a media', async () => {
      await adminEndpoint(
        `/v1/media/${media2._id}`, 'put',
        adminToken, app, request, domain, { filename: 'filename_7.jpeg' }
      );

      const media2Object = await MediaItems.getMediaItem({ _id: media2._id });
      expect(media2Object.filename).to.equal('filename_7.jpeg');
      expect(`${media2Object.advertisement.advertiserId}`).to.equal(`${advertiser2._id}`);
    });
    it('DELETE /v1/media/:id - should delete media', async () => {
      await adminEndpoint(
        `/v1/media/${media3._id}`, 'delete',
        adminToken, app, request, domain
      );

      const deletedMediaObject = await MediaItems.getMediaItem({ _id: media3._id });

      expect(deletedMediaObject._id).to.be.an.instanceOf(Types.ObjectId);
      expect(deletedMediaObject.createdTimestamp).to.be.an.instanceOf(Date);
      expect(deletedMediaObject.createdBy).to.be.undefined;
      expect(deletedMediaObject.isDeleted).to.equal(true);
      expect(deletedMediaObject.deletedTimestamp).to.be.an.instanceOf(Date);
      expect(deletedMediaObject.deletedBy).to.include('auth0|');
    });
  });
  describe('Media update and delete implications', () => {
    before(async () => {
      await emptyCollection('Advertisers');
      await emptyCollection('Campaigns');
      await emptyCollection('MediaItems');

      advertiser1 = await Advertisers.createAdvertiser(ADVERTISER_INFO(1));
      advertiser2 = await Advertisers.createAdvertiser(ADVERTISER_INFO(2));

      media1 = await MediaItems.createMediaItem({
        ...MEDIA_INFO(1),
        advertisement: { ...MEDIA_INFO(1).advertisement, advertiserId: advertiser1._id }
      });

      media2 = await MediaItems.createMediaItem({
        ...MEDIA_INFO(1),
        advertisement: { ...MEDIA_INFO(2).advertisement, advertiserId: advertiser1._id }
      });

      campaign1 = await Campaigns.createCampaign(
        {
          ...CAMPAIGN_INFO(1),
          advertiserId: advertiser1._id,
          featuredMedia: media1._id,
          mediaList: [media1._id]
        }
      );

      campaign2 = await Campaigns.createCampaign(
        {
          ...CAMPAIGN_INFO(2),
          advertiserId: advertiser1._id,
          featuredMedia: media2._id,
          mediaList: [media2._id]
        }
      );
    });
    it('should switch a media\'s advertiser and remove media from campaigns', async () => {
      const campaign1Before = await Campaigns.getCampaign({ _id: campaign1._id });
      expect(`${campaign1Before.advertiserId}`).to.equal(`${advertiser1._id}`);
      expect(`${campaign1Before.featuredMedia}`).to.equal(`${media1._id}`);
      expect(campaign1Before.mediaList).to.be.lengthOf(1);
      expect(`${campaign1Before.mediaList[0]}`).to.equal(`${media1._id}`);

      await adminEndpoint(
        `/v1/media/${media1._id}`, 'put',
        adminToken, app, request, domain,
        { advertisement: { ...MEDIA_INFO(1).advertisement, advertiserId: advertiser2._id } }
      );

      const campaign1After = await Campaigns.getCampaign({ _id: campaign1._id });
      expect(`${campaign1After.advertiserId}`).to.equal(`${advertiser1._id}`);
      expect(campaign1After.featuredMedia).to.be.null;
      expect(campaign1After.mediaList).to.be.lengthOf(0);
    });
    it('should delete media and remove it from campaigns', async () => {
      const campaign2Before = await Campaigns.getCampaign({ _id: campaign2._id });
      expect(`${campaign2Before.advertiserId}`).to.equal(`${advertiser1._id}`);
      expect(`${campaign2Before.featuredMedia}`).to.equal(`${media2._id}`);
      expect(campaign2Before.mediaList).to.be.lengthOf(1);
      expect(`${campaign2Before.mediaList[0]}`).to.equal(`${media2._id}`);

      await adminEndpoint(
        `/v1/media/${media2._id}`, 'delete',
        adminToken, app, request, domain
      );

      const campaign2After = await Campaigns.getCampaign({ _id: campaign1._id });
      expect(`${campaign2After.advertiserId}`).to.equal(`${advertiser1._id}`);
      expect(campaign2After.featuredMedia).to.be.null;
      expect(campaign2After.mediaList).to.be.lengthOf(0);
    });
  });
});
