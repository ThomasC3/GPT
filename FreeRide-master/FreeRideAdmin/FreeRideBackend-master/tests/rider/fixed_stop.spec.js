import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import logger from '../../logger';
import { riderEndpoint } from '../utils/rider';
import {
  Riders, Locations, FixedStops,
  FixedStopStatus, Settings, Drivers
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let rider1Socket;
let sandbox;
let rider1Token;
let location;

const keyLoc = {
  fs8: { lat: 40.6810937, lng: -73.9078617 },
  fs4: { lat: 40.6851291, lng: -73.9148140 },
  fs6: { lat: 40.6883182, lng: -73.9203072 },
  fs7: { lat: 40.6915723, lng: -73.9258862 },
  fs3: { lat: 40.6944357, lng: -73.9307785 },
  fs2: { lat: 40.6964530, lng: -73.9346409 },
  fs5: { lat: 40.6987957, lng: -73.9385891 },
  fs1: { lat: 40.7003574, lng: -73.9414215 }
};

describe('Fixed stop search for Rider', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();

    location = await Locations.createLocation({
      name: 'Location',
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      riderPickupDirections: true,
      serviceArea: [
        {
          longitude: -73.978573,
          latitude: 40.721239
        },
        {
          longitude: -73.882936,
          latitude: 40.698337
        },
        {
          longitude: -73.918642,
          latitude: 40.629585
        },
        {
          longitude: -73.978573,
          latitude: 40.660845
        },
        {
          longitude: -73.978573,
          latitude: 40.721239
        }
      ]
    });

    const fixedStopData = {
      businessName: 'Coca-cola',
      address: 'Here',
      location: location._id
    };

    const promises = [];
    let key;
    for (let i = 0; i < Object.keys(keyLoc).length; i += 1) {
      key = Object.keys(keyLoc)[i];
      promises.push(FixedStops.createFixedStop(
        {
          status: FixedStopStatus.enabled,
          name: key,
          ...keyLoc[key],
          ...fixedStopData
        }
      ));
    }
    await Promise.all(promises);
    await FixedStops.createFixedStop(
      {
        status: FixedStopStatus.disabled,
        name: 'fs9',
        ...keyLoc.fs1,
        ...fixedStopData
      }
    );

    await new Riders({
      email: 'rider1@mail.com',
      firstName: 'Rider FN',
      lastName: 'Rider LN',
      password: 'Password1',
      location: location._id,
      dob: '2000-12-11'
    }).save();

    const rider1SessionResponse = await request(app)
      .post('/v1/login')
      .set('host', domain.rider)
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ email: 'rider1@mail.com', password: 'Password1' })
      .expect(200)
      .end()
      .get('body');

    rider1Token = rider1SessionResponse.accessToken;

    rider1Socket
      .emit('authenticate', { token: rider1Token })
      .on('authenticated', () => {
        logger.debug('RIDER authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });

    await Settings.createSettings({ riderAndroid: '1.0.0' });
  });

  after(async () => { });

  before(async () => {
    sandbox.restore();
    await FixedStops.syncIndexes();
    await Drivers.syncIndexes();
    await Locations.syncIndexes();
  });

  describe('Fixed stops', () => {
    it('Should have rider pickup directions on', async () => {
      const queryParams = { latitude: keyLoc.fs1.lat, longitude: keyLoc.fs1.lng };
      const queryString = new URLSearchParams(queryParams).toString();
      const { body: [locationInfo] } = await riderEndpoint(
        `/v1/locations?${queryString}`,
        'GET',
        rider1Token, app, request, domain
      );
      return sinon.assert.match(locationInfo.riderPickupDirections, true);
    });
    it('Should sort by closest', async () => {
      const queryParams = {
        latitude: keyLoc.fs8.lat,
        longitude: keyLoc.fs8.lng,
        locationId: String(location._id)
      };

      const queryStringShort = new URLSearchParams(queryParams).toString();

      const { body: singleFixedStop } = await riderEndpoint(
        `/v1/fixed-stops?${queryStringShort}`,
        'GET',
        rider1Token, app, request, domain
      );

      sinon.assert.match(singleFixedStop[0].name, 'fs8');
      sinon.assert.match(singleFixedStop[0].latitude, keyLoc.fs8.lat);
      sinon.assert.match(singleFixedStop[0].longitude, keyLoc.fs8.lng);
      sinon.assert.match(singleFixedStop[0].lat, undefined);
      sinon.assert.match(singleFixedStop[0].lng, undefined);
      sinon.assert.match(singleFixedStop.length, 1);


      queryParams.fixedStopNumber = 3;

      const queryString = new URLSearchParams(queryParams).toString();


      const { body: fixedStops } = await riderEndpoint(
        `/v1/fixed-stops?${queryString}`,
        'GET',
        rider1Token, app, request, domain
      );

      sinon.assert.match(fixedStops[0].name, 'fs8');
      sinon.assert.match(fixedStops[0].latitude, keyLoc.fs8.lat);
      sinon.assert.match(fixedStops[0].longitude, keyLoc.fs8.lng);
      sinon.assert.match(fixedStops[0].lat, undefined);
      sinon.assert.match(fixedStops[0].lng, undefined);
      sinon.assert.match(fixedStops[1].name, 'fs4');
      sinon.assert.match(fixedStops[2].name, 'fs6');
      return sinon.assert.match(fixedStops.length, 3);
    });
    it('Should sort by closest except already chosen fixed stop', async () => {
      const excludeFs = await FixedStops.findOne({ name: 'fs4' });
      const queryParams = {
        latitude: keyLoc.fs8.lat,
        longitude: keyLoc.fs8.lng,
        locationId: String(location._id),
        fixedStops: String(excludeFs._id),
        fixedStopNumber: 3
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const { body: fixedStops } = await riderEndpoint(
        `/v1/fixed-stops?${queryString}`,
        'GET',
        rider1Token, app, request, domain
      );

      sinon.assert.match(fixedStops[0].name, 'fs8');
      sinon.assert.match(fixedStops[1].name, 'fs6');
      sinon.assert.match(fixedStops[2].name, 'fs7');
      return sinon.assert.match(fixedStops.length, 3);
    });
    it('Should sort by closest except already chosen fixed stops', async () => {
      const excludeFss = await FixedStops.find({ name: { $in: ['fs4', 'fs7'] } });
      const queryParams = {
        latitude: keyLoc.fs8.lat,
        longitude: keyLoc.fs8.lng,
        locationId: String(location._id),
        fixedStops: excludeFss.map(item => String(item._id)).join(','),
        fixedStopNumber: 3
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const { body: fixedStops } = await riderEndpoint(
        `/v1/fixed-stops?${queryString}`,
        'GET',
        rider1Token, app, request, domain
      );

      sinon.assert.match(fixedStops[0].name, 'fs8');
      sinon.assert.match(fixedStops[1].name, 'fs6');
      sinon.assert.match(fixedStops[2].name, 'fs3');
      return sinon.assert.match(fixedStops.length, 3);
    });
    it('Should sort by closest even if only 2 available', async () => {
      const excludeFss = await FixedStops.find({ name: { $in: ['fs2', 'fs3', 'fs4', 'fs6', 'fs7', 'fs8'] } });
      const queryParams = {
        latitude: keyLoc.fs8.lat,
        longitude: keyLoc.fs8.lng,
        locationId: String(location._id),
        fixedStops: excludeFss.map(item => String(item._id)).join(','),
        fixedStopNumber: 3
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const { body: fixedStops } = await riderEndpoint(
        `/v1/fixed-stops?${queryString}`,
        'GET',
        rider1Token, app, request, domain
      );

      sinon.assert.match(fixedStops[0].name, 'fs5');
      sinon.assert.match(fixedStops[1].name, 'fs1');
      return sinon.assert.match(fixedStops.length, 2);
    });
  });
});
