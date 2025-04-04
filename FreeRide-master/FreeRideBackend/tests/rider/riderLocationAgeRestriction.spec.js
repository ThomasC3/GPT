import request from 'supertest-promised';
import io from 'socket.io-client';
import moment from 'moment-timezone';
import sinon from 'sinon';
import { emptyAllCollections } from '../utils/helper';
import app from '../../server';
import { TI18N } from '../utils/i18nHelper';
import { port, domain } from '../../config';
import {
  Locations, Settings, Riders, Requests
} from '../../models';
import { createRequest, createRiderLogin, riderEndpoint } from '../utils/rider';


const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let location;
let rider;
let riderSocket;
let sandbox;

const keyLoc = {
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};
const riderAgeRequirement = 60;

describe('Rider location age restriction', () => {
  before(async () => {
    sandbox = sinon.createSandbox();
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

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

    rider = await createRiderLogin({
      firstName: 'Rider FN',
      lastName: 'Rider LN',
      location: location._id,
      dob: moment().subtract(40, 'year').format('YYYY-MM-DD'),
      email: 'rider1@mail.com',
      password: 'Password1'
    }, app, request, domain, riderSocket);
  });

  beforeEach(async () => {
    sandbox.restore();
    rider.riderSocket.removeAllListeners();
    await Locations.syncIndexes();
    await Riders.syncIndexes();
    await Requests.deleteMany();
  });

  describe('Get Locations Api', () => {
    it('should show rider meets age requirement if no age restriction on location', async () => {
      const response = await riderEndpoint(
        `/v1/locations?longitude=${keyLoc.req1p[1]}&latitude=${keyLoc.req1p[0]}`,
        'get', rider.riderToken, app, request, domain
      );

      sinon.assert.match(response.body[0].riderAgeRequirement, null);
      sinon.assert.match(response.body[0].meetsAgeRequirement, true);
    });
    it('should show rider does not meet age req if rider is below set age req', async () => {
      location = await Locations.findOneAndUpdate(
        { _id: location._id },
        { $set: { riderAgeRequirement } },
        { new: true, upsert: false }
      );
      const response = await riderEndpoint(
        `/v1/locations?longitude=${keyLoc.req1p[1]}&latitude=${keyLoc.req1p[0]}`,
        'get', rider.riderToken, app, request, domain
      );
      sinon.assert.match(response.body[0].riderAgeRequirement, riderAgeRequirement);
      sinon.assert.match(response.body[0].meetsAgeRequirement, false);
    });
    it('should show rider meets age req if rider\'s age is upto req age', async () => {
      rider.rider = await Riders.findOneAndUpdate(
        { _id: rider.rider._id },
        { $set: { dob: moment().subtract(riderAgeRequirement, 'year').format('YYYY-MM-DD') } },
        { new: true, upsert: false }
      );
      const response = await riderEndpoint(
        `/v1/locations?longitude=${keyLoc.req1p[1]}&latitude=${keyLoc.req1p[0]}`,
        'get', rider.riderToken, app, request, domain
      );
      sinon.assert.match(response.body[0].meetsAgeRequirement, true);
    });
    it('should show rider meets age req if rider is above req age', async () => {
      rider.rider = await Riders.findOneAndUpdate(
        { _id: rider.rider._id },
        { $set: { dob: moment().subtract(riderAgeRequirement + 2, 'year').format('YYYY-MM-DD') } },
        { new: true, upsert: false }
      );
      const response = await riderEndpoint(
        `/v1/locations?longitude=${keyLoc.req1p[1]}&latitude=${keyLoc.req1p[0]}`,
        'get', rider.riderToken, app, request, domain
      );

      sinon.assert.match(response.body[0].riderAgeRequirement, riderAgeRequirement);
      sinon.assert.match(response.body[0].meetsAgeRequirement, true);
    });
  });

  describe('Get single locations api', () => {
    it('should show rider meets age req if rider is above req age', async () => {
      const response = await riderEndpoint(
        `/v1/locations/${location._id}`,
        'get', rider.riderToken, app, request, domain
      );
      sinon.assert.match(response.body.riderAgeRequirement, riderAgeRequirement);
      sinon.assert.match(response.body.meetsAgeRequirement, true);
    });
    it('should show rider does not meet age req if age is below req age', async () => {
      rider.rider = await Riders.findOneAndUpdate(
        { _id: rider.rider._id },
        { $set: { dob: moment().subtract(riderAgeRequirement - 2, 'year').format('YYYY-MM-DD') } },
        { new: true, upsert: false }
      );
      const response = await riderEndpoint(
        `/v1/locations/${location._id}`,
        'get', rider.riderToken, app, request, domain
      );
      sinon.assert.match(response.body.meetsAgeRequirement, false);
    });
  });

  describe('Request Ride', () => {
    it('should throw error if rider does not meet age req', async () => {
      const response = await createRequest(rider.riderToken, keyLoc.req1p, keyLoc.req1d,
        location._id,
        app, request, domain, false, 1, 400);
      sinon.assert.match(response.code, 400);
      sinon.assert.match(response.message, TI18N.en.request.riderAgeRequirement);
    });
    it('should request ride successfully if rider meets age req', async () => {
      rider.rider = await Riders.findOneAndUpdate(
        { _id: rider.rider._id },
        { $set: { dob: moment().subtract(riderAgeRequirement, 'year').format('YYYY-MM-DD') } },
        { new: true, upsert: false }
      );
      await createRequest(rider.riderToken, keyLoc.req1p, keyLoc.req1d,
        location._id,
        app, request, domain, false, 1);

      const requests = await Requests.find();
      sinon.assert.match(requests.length, 1);
    });
  });
});
