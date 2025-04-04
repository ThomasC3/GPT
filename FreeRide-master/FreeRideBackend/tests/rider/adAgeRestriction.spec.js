import moment from 'moment-timezone';
import chai from 'chai';
import jsonSchema from 'chai-json-schema';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import {
  Riders, Drivers, Locations,
  MediaItems, Settings
} from '../../models';
import { emptyAllCollections, emptyCollectionList } from '../utils/helper';

import { createRiderLogin, riderEndpoint } from '../utils/rider';
import { createDriverLogin } from '../utils/driver';
import { createAdvertiser, createMediaItem, createCampaign } from '../utils/digitalAds';
import { dumpMediaItemForRiderSchema } from '../utils/schemas';

chai.use(jsonSchema);
const { expect } = chai;

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let driver;
let driverSocket;
let rider;
let riderSocket;
let location;
let mediaItem;

const keyLoc = {
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

describe('Ad age restriction', () => {
  before(async () => {
    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      isUsingServiceTimes: false,
      isActive: true,
      serviceArea: [
        { longitude: -73.978573, latitude: 40.721239 },
        { longitude: -73.882936, latitude: 40.698337 },
        { longitude: -73.918642, latitude: 40.629585 },
        { longitude: -73.978573, latitude: 40.660845 },
        { longitude: -73.978573, latitude: 40.721239 }
      ],
      serviceHours: []
    });

    const advertiser = await createAdvertiser();
    mediaItem = await createMediaItem({
      sourceUrl: 'https://example.com/a.jpg',
      advertisement: {
        advertiserId: advertiser._id,
        url: 'https://www.ridecircuit.com',
        ageRestriction: 21
      }
    });
    await createCampaign({
      locations: [location._id],
      mediaList: [mediaItem._id]
    });

    driver = await createDriverLogin({
      currentLocation: {
        coordinates: [keyLoc.req1p[1], keyLoc.req1p[0]],
        type: 'Point'
      },
      locations: [location._id]
    }, app, request, domain, driverSocket);

    rider = await createRiderLogin({
      dob: '2000-12-11'
    }, app, request, domain, riderSocket);
  });

  beforeEach(async () => {
    await emptyCollectionList(['Requests', 'Rides', 'Routes']);

    await Drivers.updateOne({ _id: driver.driver._id }, { $set: { driverRideList: [] } });

    rider.rider = await Riders.findOneAndUpdate(
      { _id: rider.rider._id },
      // Fix for leap year
      { $set: { dob: moment().subtract(21, 'years').subtract(1, 'day').format('YYYY-MM-DD') } },
      { new: true, upsert: false }
    );

    await MediaItems.findOneAndUpdate(
      { _id: mediaItem._id },
      { $set: { 'advertisement.ageRestriction': 21 } },
      { new: true, upsert: false }
    );
  });

  describe('Show locations with ad age restrictions', () => {
    it('Should not show ads in location list', async () => {
      const { body: locations } = await riderEndpoint(
        `/v1/locations?longitude=${keyLoc.req1p[1]}&latitude=${keyLoc.req1p[0]}`,
        'get', rider.riderToken, app, request, domain
      );
      expect(locations).to.be.lengthOf(1);
      expect(locations[0].id).to.equal(String(location._id));
      expect(locations[0].advertisement).to.eql({});
    });
    it('Should not show ads in single location', async () => {
      const { body: { id: locationId, advertisement } } = await riderEndpoint(
        `/v1/locations/${location._id}`,
        'get', rider.riderToken, app, request, domain
      );
      expect(locationId).to.equal(String(location._id));
      expect(advertisement).to.eql({});
    });
    it('Should show ad for specified location if rider is 21', async () => {
      const { body: { mediaList } } = await riderEndpoint(
        `/v1/media?location=${location._id}`,
        'get', rider.riderToken, app, request, domain
      );

      expect(mediaList).to.be.lengthOf(1);
      expect(mediaList[0]).to.be.jsonSchema(dumpMediaItemForRiderSchema);
      expect(mediaList[0].url).to.equal('https://www.ridecircuit.com');
    });
    it('Should show ad for single location if no age restriction', async () => {
      rider.rider = await Riders.findOneAndUpdate(
        { _id: rider.rider._id },
        { $set: { dob: moment().subtract(18, 'years').format('YYYY-MM-DD') } },
        { new: true, upsert: false }
      );

      await MediaItems.findOneAndUpdate(
        { _id: mediaItem._id },
        { $set: { 'advertisement.ageRestriction': null } },
        { new: true, upsert: false }
      );

      const { body: { mediaList } } = await riderEndpoint(
        `/v1/media?location=${location._id}`,
        'get', rider.riderToken, app, request, domain
      );

      expect(mediaList).to.be.lengthOf(1);
      expect(mediaList[0]).to.be.jsonSchema(dumpMediaItemForRiderSchema);
      expect(mediaList[0].url).to.equal('https://www.ridecircuit.com');
    });
    it('Should not show ad for single location if rider is 18', async () => {
      rider.rider = await Riders.findOneAndUpdate(
        { _id: rider.rider._id },
        { $set: { dob: moment().subtract(18, 'years').format('YYYY-MM-DD') } },
        { new: true, upsert: false }
      );

      const { body: { mediaList } } = await riderEndpoint(
        `/v1/media?location=${location._id}`,
        'get', rider.riderToken, app, request, domain
      );

      expect(mediaList).to.be.lengthOf(0);
    });
  });
});
