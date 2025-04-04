/* eslint-disable no-unused-expressions */
import { expect } from 'chai';
import { Types } from 'mongoose';
import request from 'supertest-promised';
import moment from 'moment';
import app from '../../server';
import { Advertisers, Campaigns, MediaItems } from '../../models';
import { domain } from '../../config';
import { DATE_FORMAT_SHORT } from '../../utils/time';
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
let advertiser4;

let campaign1;
let campaign2;
let campaign3;
let campaign4;

let media1;

describe('Digital Ads management', () => {
  before(async () => {
    await emptyAllCollections();
    ({ adminToken } = await createAdminLogin());
  });
  describe('Advertiser CRUD', () => {
    before(async () => {
      await emptyCollection('Advertisers');
      advertiser1 = await Advertisers.createAdvertiser(ADVERTISER_INFO(1));
      await Advertisers.createAdvertiser(ADVERTISER_INFO(2));
      advertiser3 = await Advertisers.createAdvertiser(ADVERTISER_INFO(3));
      advertiser4 = await Advertisers.createAdvertiser({ ...ADVERTISER_INFO(4), isDeleted: true });
    });
    beforeEach(async () => {
      await Advertisers.updateAdvertiserById(advertiser3._id, { isDeleted: false });
    });
    it('GET /v1/digital-ads/advertisers - should list advertisers', async () => {
      const { body: advertisers } = await adminEndpoint(
        '/v1/digital-ads/advertisers', 'get',
        adminToken, app, request, domain
      );

      expect(advertisers.items).to.have.lengthOf.at.least(3);
      expect(advertisers.total).to.be.at.least(3);

      const nonDeletedAdvertiser = advertisers.items
        .find(adv => adv.id === String(advertiser1._id));
      expect(nonDeletedAdvertiser.name).to.equal('Advertiser #1');

      const deletedAdvertiser = advertisers.items.find(adv => adv.id === String(advertiser4._id));
      expect(deletedAdvertiser).to.be.undefined;
    });
    it('GET /v1/digital-ads/advertisers/:id - should get advertiser', async () => {
      const { body: advertiser } = await adminEndpoint(
        `/v1/digital-ads/advertisers/${advertiser1._id}`, 'get',
        adminToken, app, request, domain
      );

      expect(advertiser.id).to.equal(`${advertiser1._id}`);
      expect(advertiser.name).to.equal('Advertiser #1');
      expect(advertiser.clientId).to.include('CLIENT_ID_1');
      expect(advertiser.campaigns).to.be.an('array').that.is.empty;
    });
    it('POST /v1/digital-ads/advertisers - should create an advertiser and return formatted info', async () => {
      const { body: createdAdvertiser } = await adminEndpoint(
        '/v1/digital-ads/advertisers', 'post',
        adminToken, app, request, domain, ADVERTISER_INFO(5)
      );
      expect(createdAdvertiser.id).to.be.a('string').that.is.not.empty;
      expect(createdAdvertiser.name).to.equal('Advertiser #5');
      expect(createdAdvertiser.clientId).to.include('CLIENT_ID_5');
      expect(createdAdvertiser.campaigns).to.be.an('array').that.is.empty;

      const advertiserObject = await Advertisers.getAdvertiser({ _id: createdAdvertiser.id });
      expect(advertiserObject._id).to.be.an.instanceOf(Types.ObjectId);
      expect(advertiserObject.createdTimestamp).to.be.an.instanceOf(Date);
      expect(advertiserObject.createdBy).to.include('auth0|');
      expect(advertiserObject.isDeleted).to.equal(false);
      expect(advertiserObject.deletedTimestamp).to.be.undefined;
      expect(advertiserObject.deletedBy).to.be.undefined;
    });
    it('PUT /v1/digital-ads/advertisers - should not update an advertiser with already exiting client ID', async () => {
      const { body: error } = await adminEndpoint(
        `/v1/digital-ads/advertisers/${advertiser1._id}`, 'put',
        adminToken, app, request, domain, ADVERTISER_INFO(2)
      );

      expect(error.code).to.equal(409);
      expect(error.message).to.equal('Advertiser with client ID CLIENT_ID_2 already exists');
    });
    it('DELETE /v1/digital-ads/advertisers/:id - should delete advertiser', async () => {
      await adminEndpoint(
        `/v1/digital-ads/advertisers/${advertiser3._id}`, 'delete',
        adminToken, app, request, domain
      );

      const deletedAdvertiserObject = await Advertisers.getAdvertiser({ _id: advertiser3._id });

      expect(deletedAdvertiserObject._id).to.be.an.instanceOf(Types.ObjectId);
      expect(deletedAdvertiserObject.createdTimestamp).to.be.an.instanceOf(Date);
      expect(deletedAdvertiserObject.createdBy).to.be.undefined;
      expect(deletedAdvertiserObject.isDeleted).to.equal(true);
      expect(deletedAdvertiserObject.deletedTimestamp).to.be.an.instanceOf(Date);
      expect(deletedAdvertiserObject.deletedBy).to.include('auth0|');
    });
  });
  describe('Advertiser update and delete implications', () => {
    before(async () => {
      await emptyCollection('Advertisers');
      await emptyCollection('Campaigns');
      await emptyCollection('MediaItems');
      advertiser1 = await Advertisers.createAdvertiser(ADVERTISER_INFO(1));
      media1 = await MediaItems.createMediaItem({
        ...MEDIA_INFO(1),
        advertisement: { ...MEDIA_INFO(1).advertisement, advertiserId: advertiser1._id }
      });
      campaign1 = await Campaigns.createCampaign(
        {
          ...CAMPAIGN_INFO(1),
          advertiserId: advertiser1._id,
          mediaList: [media1._id],
          featuredMedia: media1._id
        }
      );
      campaign2 = await Campaigns.createCampaign(CAMPAIGN_INFO(2));
    });
    beforeEach(async () => {
      await Advertisers.updateAdvertiserById(
        advertiser1._id,
        { isDeleted: false, campaigns: [campaign1._id] }
      );
      await Campaigns.updateCampaignById(
        campaign1._id,
        { isDeleted: false, mediaList: [media1._id], featuredMedia: media1._id }
      );
      await Campaigns.updateCampaignById(campaign2._id, { advertiserId: null });
    });
    it('should delete advertiser and associated campaigns and media', async () => {
      await adminEndpoint(
        `/v1/digital-ads/advertisers/${advertiser1._id}`, 'delete',
        adminToken, app, request, domain
      );

      const deletedAdvertiserObject = await Advertisers.getAdvertiser({ _id: advertiser1._id });
      expect(deletedAdvertiserObject.isDeleted).to.equal(true);
      expect(deletedAdvertiserObject.deletedTimestamp).to.be.an.instanceOf(Date);
      expect(deletedAdvertiserObject.deletedBy).to.include('auth0|');

      const deletedCampaignObject = await Campaigns.getCampaign({ _id: campaign1._id });
      expect(deletedCampaignObject.isDeleted).to.equal(true);
      expect(deletedCampaignObject.deletedTimestamp).to.be.an.instanceOf(Date);
      expect(deletedCampaignObject.deletedBy).to.include('auth0|');

      const deletedMediaItemObject = await MediaItems.getMediaItem({ _id: media1._id });
      expect(deletedMediaItemObject.isDeleted).to.equal(true);
      expect(deletedMediaItemObject.deletedTimestamp).to.be.an.instanceOf(Date);
      expect(deletedMediaItemObject.deletedBy).to.include('auth0|');
    });
    it('should add a campaign to an advertiser and assign advertiser to the campaign', async () => {
      const {
        campaigns: campaignsBefore
      } = await Advertisers.getAdvertiser({ _id: advertiser1._id });
      expect(campaignsBefore).to.be.lengthOf(1);
      expect(`${campaignsBefore[0]}`).to.equal(`${campaign1._id}`);

      await adminEndpoint(
        `/v1/digital-ads/advertisers/${advertiser1._id}`, 'put',
        adminToken, app, request, domain, { campaigns: [campaign1._id, campaign2._id] }
      );

      const {
        campaigns: campaignsAfter
      } = await Advertisers.getAdvertiser({ _id: advertiser1._id });
      expect(campaignsAfter).to.be.lengthOf(2);
      expect(campaignsAfter.map(camp => `${camp}`).sort()).to.eql([
        `${campaign1._id}`, `${campaign2._id}`
      ]);
    });
    it('should remove a campaign from an advertiser and remove advertiser and media from the campaign', async () => {
      const {
        campaigns: campaignsBefore
      } = await Advertisers.getAdvertiser({ _id: advertiser1._id });
      expect(campaignsBefore).to.be.lengthOf(1);
      expect(`${campaignsBefore[0]}`).to.equal(`${campaign1._id}`);

      const campaign1Before = await Campaigns.getCampaign({ _id: campaign1._id });
      expect(campaign1Before.mediaList).to.be.an('array').lengthOf(1);
      expect(`${campaign1Before.mediaList[0]}`).to.equal(`${media1._id}`);
      expect(`${campaign1Before.featuredMedia}`).to.equal(`${media1._id}`);

      await adminEndpoint(
        `/v1/digital-ads/advertisers/${advertiser1._id}`, 'put',
        adminToken, app, request, domain, { campaigns: [] }
      );

      const {
        campaigns: campaignsAfter
      } = await Advertisers.getAdvertiser({ _id: advertiser1._id });
      expect(campaignsAfter).to.be.lengthOf(0);

      const campaign1After = await Campaigns.getCampaign({ _id: campaign1._id });
      expect(campaign1After.advertiserId).to.be.null;
      expect(campaign1After.mediaList).to.be.an('array').that.is.empty;
      expect(campaign1After.featuredMedia).to.be.null;
    });
  });
  describe('Campaign CRUD', () => {
    before(async () => {
      await emptyCollection('Campaigns');
      await emptyCollection('Advertisers');
      advertiser1 = await Advertisers.createAdvertiser(ADVERTISER_INFO(1));
      advertiser2 = await Advertisers.createAdvertiser(ADVERTISER_INFO(2));
      advertiser3 = await Advertisers.createAdvertiser(ADVERTISER_INFO(3));

      campaign1 = await Campaigns.createCampaign(
        { ...CAMPAIGN_INFO(1), advertiserId: advertiser1._id }
      );
      campaign2 = await Campaigns.createCampaign(
        { ...CAMPAIGN_INFO(2), advertiserId: advertiser2._id }
      );
      campaign3 = await Campaigns.createCampaign({ ...CAMPAIGN_INFO(3), isEnabled: false });
      campaign4 = await Campaigns.createCampaign({ ...CAMPAIGN_INFO(4), isDeleted: true });
    });
    beforeEach(async () => {
      await Campaigns.updateCampaignById(campaign3._id, { isDeleted: false });
    });
    it('GET /v1/digital-ads/campaigns - should list campaigns', async () => {
      const { body: campaigns } = await adminEndpoint(
        '/v1/digital-ads/campaigns', 'get',
        adminToken, app, request, domain
      );

      expect(campaigns.items).to.have.lengthOf.at.least(3);
      expect(campaigns.total).to.be.at.least(3);

      const nonDeletedCampaign = campaigns.items
        .find(camp => camp.id === String(campaign1._id));
      expect(nonDeletedCampaign.name).to.equal('Campaign #1');

      const runningCampaigns = campaigns.items.filter(camp => camp.isRunning);
      const nonRunningCampaign = runningCampaigns.find(camp => camp.id === String(campaign3._id));
      expect(nonRunningCampaign).to.be.undefined;

      const deletedCampaign = campaigns.items.find(camp => camp.id === String(campaign4._id));
      expect(deletedCampaign).to.be.undefined;
    });
    it('GET /v1/digital-ads/campaigns - should list campaigns filtered by advertiser id', async () => {
      const params = { 'filters[advertiserId]': String(advertiser2._id) };
      const { body: campaigns } = await adminEndpoint(
        `/v1/digital-ads/campaigns?${new URLSearchParams(params).toString()}`, 'get',
        adminToken, app, request, domain
      );

      expect(campaigns.items).to.have.lengthOf(1);
      expect(campaigns.total).to.equal(1);

      const nonAdvertiserCampaign = campaigns.items
        .find(camp => camp.advertiserId === String(advertiser1._id));
      expect(nonAdvertiserCampaign).to.be.undefined;

      const emptyAdvertiserCampaign = campaigns.items
        .find(camp => !camp.advertiserId);
      expect(emptyAdvertiserCampaign).to.be.undefined;

      const advertiserCampaign = campaigns.items
        .find(camp => camp.advertiserId === String(advertiser2._id));
      expect(advertiserCampaign.advertiserId).to.equal(String(advertiser2._id));
    });
    it('GET /v1/digital-ads/campaigns/:id - should get campaign', async () => {
      const { body: campaign } = await adminEndpoint(
        `/v1/digital-ads/campaigns/${campaign1._id}`, 'get',
        adminToken, app, request, domain
      );

      expect(campaign.id).to.equal(`${campaign1._id}`);
      expect(campaign.name).to.equal('Campaign #1');
      expect(`${campaign.advertiserId}`).to.equal(`${advertiser1._id}`);
      expect(campaign.mediaList).to.be.an('array').that.is.empty;
      expect(campaign.featuredMedia).to.be.null;
      expect(campaign.campaignStart).to.equal(yesterday.format(DATE_FORMAT_SHORT));
      expect(campaign.campaignEnd).to.equal(tomorrow.format(DATE_FORMAT_SHORT));
      expect(campaign.locations).to.be.an('array').that.is.empty;
      expect(campaign.isEnabled).to.be.true;
      expect(campaign.isRunning).to.be.true;
    });
    it('POST /v1/digital-ads/campaigns - should create a campaign and return formatted info', async () => {
      const campaign5Info = CAMPAIGN_INFO(5);
      const { body: createdCampaign } = await adminEndpoint(
        '/v1/digital-ads/campaigns', 'post',
        adminToken, app, request, domain, {
          ...campaign5Info,
          campaignStart: campaign5Info.campaignStart.format(DATE_FORMAT_SHORT),
          campaignEnd: campaign5Info.campaignEnd.format(DATE_FORMAT_SHORT),
          advertiserId: advertiser3._id
        }
      );

      expect(createdCampaign.id).to.be.a('string').that.is.not.empty;
      expect(createdCampaign.name).to.equal('Campaign #5');
      expect(`${createdCampaign.advertiserId}`).to.equal(`${advertiser3._id}`);
      expect(createdCampaign.mediaList).to.be.an('array').that.is.empty;
      expect(createdCampaign.featuredMedia).to.be.null;
      expect(createdCampaign.campaignStart).to.equal(yesterday.format(DATE_FORMAT_SHORT));
      expect(createdCampaign.campaignEnd).to.equal(tomorrow.format(DATE_FORMAT_SHORT));
      expect(createdCampaign.locations).to.be.an('array').that.is.empty;
      expect(createdCampaign.isEnabled).to.be.true;
      expect(createdCampaign.isRunning).to.be.true;

      const campaignObject = await Campaigns.getCampaign({ _id: createdCampaign.id });
      expect(campaignObject._id).to.be.an.instanceOf(Types.ObjectId);
      expect(campaignObject.createdTimestamp).to.be.an.instanceOf(Date);
      expect(campaignObject.createdBy).to.include('auth0|');
      expect(campaignObject.isDeleted).to.equal(false);
      expect(campaignObject.deletedTimestamp).to.be.undefined;
      expect(campaignObject.deletedBy).to.be.undefined;
    });
    it('PUT /v1/digital-ads/campaigns - should update a campaign', async () => {
      await adminEndpoint(
        `/v1/digital-ads/campaigns/${campaign2._id}`, 'put',
        adminToken, app, request, domain, { name: 'Campaign #6' }
      );

      const campaign2Object = await Campaigns.getCampaign({ _id: campaign2._id });
      expect(campaign2Object.name).to.equal('Campaign #6');
    });
    it('DELETE /v1/digital-ads/campaigns/:id - should delete campaign', async () => {
      await adminEndpoint(
        `/v1/digital-ads/campaigns/${campaign3._id}`, 'delete',
        adminToken, app, request, domain
      );

      const deletedCampaignObject = await Campaigns.getCampaign({ _id: campaign3._id });

      expect(deletedCampaignObject._id).to.be.an.instanceOf(Types.ObjectId);
      expect(deletedCampaignObject.createdTimestamp).to.be.an.instanceOf(Date);
      expect(deletedCampaignObject.createdBy).to.be.undefined;
      expect(deletedCampaignObject.isDeleted).to.equal(true);
      expect(deletedCampaignObject.deletedTimestamp).to.be.an.instanceOf(Date);
      expect(deletedCampaignObject.deletedBy).to.include('auth0|');
    });
  });
  describe('Campaign update and delete implications', () => {
    before(async () => {
      await emptyCollection('Campaigns');
      await emptyCollection('Advertisers');
      advertiser1 = await Advertisers.createAdvertiser(ADVERTISER_INFO(1));
      advertiser2 = await Advertisers.createAdvertiser(ADVERTISER_INFO(2));

      campaign1 = await Campaigns.createCampaign(CAMPAIGN_INFO(1));
      campaign2 = await Campaigns.createCampaign(
        { ...CAMPAIGN_INFO(2), advertiserId: advertiser1._id }
      );
      campaign3 = await Campaigns.createCampaign(
        { ...CAMPAIGN_INFO(3), advertiserId: advertiser1._id }
      );
    });
    beforeEach(async () => {
      await Advertisers.updateAdvertiserById(
        advertiser1._id,
        { campaigns: [campaign2._id, campaign3._id] }
      );
      await Advertisers.updateAdvertiserById(
        advertiser2._id,
        { campaigns: [] }
      );
      await Campaigns.updateCampaignById(campaign1._id, { advertiserId: null });
      await Campaigns.updateCampaignById(campaign2._id, { advertiserId: advertiser1._id });
      await Campaigns.updateCampaignById(campaign3._id, { isDeleted: false });
    });
    it('should update a campaign to have an advertiser and add it to the advertiser\'s campaigns', async () => {
      const {
        campaigns: campaignsBefore
      } = await Advertisers.getAdvertiser({ _id: advertiser1._id });
      expect(campaignsBefore).to.be.lengthOf(2);
      expect(`${campaignsBefore[0]}`).to.equal(`${campaign2._id}`);
      expect(`${campaignsBefore[1]}`).to.equal(`${campaign3._id}`);

      await adminEndpoint(
        `/v1/digital-ads/campaigns/${campaign1._id}`, 'put',
        adminToken, app, request, domain, { advertiserId: advertiser1._id }
      );

      const {
        campaigns: campaignsAfter
      } = await Advertisers.getAdvertiser({ _id: advertiser1._id });
      expect(campaignsAfter).to.be.lengthOf(3);
      expect(campaignsAfter.map(camp => `${camp}`).sort()).to.eql([
        `${campaign1._id}`, `${campaign2._id}`, `${campaign3._id}`
      ]);
    });
    it('should switch a campaign\'s advertiser and change both advertiser\'s campaigns', async () => {
      const {
        campaigns: campaignsBeforeAdv1
      } = await Advertisers.getAdvertiser({ _id: advertiser1._id });
      expect(campaignsBeforeAdv1).to.be.lengthOf(2);
      expect(`${campaignsBeforeAdv1[0]}`).to.equal(`${campaign2._id}`);
      expect(`${campaignsBeforeAdv1[1]}`).to.equal(`${campaign3._id}`);
      const {
        campaigns: campaignsBeforeAdv2
      } = await Advertisers.getAdvertiser({ _id: advertiser2._id });
      expect(campaignsBeforeAdv2).to.be.an('array').that.is.empty;

      await adminEndpoint(
        `/v1/digital-ads/campaigns/${campaign2._id}`, 'put',
        adminToken, app, request, domain, { advertiserId: advertiser2._id }
      );

      const {
        campaigns: campaignsAfterAdv1
      } = await Advertisers.getAdvertiser({ _id: advertiser1._id });
      expect(campaignsAfterAdv1).to.be.lengthOf(1);
      expect(`${campaignsAfterAdv1[0]}`).to.equal(`${campaign3._id}`);
      const {
        campaigns: campaignsAfterAdv2
      } = await Advertisers.getAdvertiser({ _id: advertiser2._id });
      expect(campaignsAfterAdv2).to.be.lengthOf(1);
      expect(`${campaignsAfterAdv2[0]}`).to.equal(`${campaign2._id}`);
    });
    it('should delete campaign and remove it from advertiser', async () => {
      const {
        campaigns: campaignsBefore
      } = await Advertisers.getAdvertiser({ _id: advertiser1._id });
      expect(campaignsBefore).to.be.lengthOf(2);
      expect(`${campaignsBefore[0]}`).to.equal(`${campaign2._id}`);
      expect(`${campaignsBefore[1]}`).to.equal(`${campaign3._id}`);

      await adminEndpoint(
        `/v1/digital-ads/campaigns/${campaign3._id}`, 'delete',
        adminToken, app, request, domain
      );

      const {
        campaigns: campaignsAfter
      } = await Advertisers.getAdvertiser({ _id: advertiser1._id });

      expect(campaignsAfter).to.be.lengthOf(1);
      expect(`${campaignsAfter[0]}`).to.equal(`${campaign2._id}`);
    });
  });
});
