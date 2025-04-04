/* eslint-disable no-undef */
import moment from 'moment-timezone';
import sinon from 'sinon';
import { expect } from 'chai';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import logger from '../../logger';
import {
  Riders, Drivers, Locations, Requests, Rides, Routes, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

import {
  createRequest,
  riderCancel
} from '../utils/rider';

import {
  pickUp,
  dropOff,
  driverCancel,
  noShowCancel,
  driverArrived,
  driverMoved,
  hailRide,
  createDriverLogin,
  getActions
} from '../utils/driver';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let driverSocket;
let rider1Socket;
let rider2Socket;
let sandbox;
let driver;
let driverToken;
let rider1;
let rider2;
let rider1Token;
let rider2Token;
let location;
let ride1;
let ride2;

const keyLoc = {
  // Driver 1
  d1a: [40.194478, -8.404691, 'Leroy Merlin'],
  d1b: [40.198857, -8.40275, 'Via lusitania'],
  d1c: [40.202714, -8.404019, 'Moinho velho'],
  // Request 1
  req1p: [40.19689, -8.402655, 'Minipreco'],
  req1d: [40.2041, -8.404072, 'McDonalds'],
  // Request 2
  req2p: [40.19689, -8.402655, 'Minipreco'],
  req2d: [40.2041, -8.404072, 'McDonalds'],
  // Request 3
  req3p: [40.19689, -8.402655, 'Minipreco'],
  req3d: [40.2006767, -8.4050056, 'SuperCor'],
  // Request 4
  req4p: [40.197, -8.4027, 'Minipreco'],
  req4d: [40.2006767, -8.4050056, 'SuperCor']
};

describe('Flow with pooling', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    // Coimbra-B (SE)
    // Entrada das acacias (SD)
    // Retiro do mondego (ID)
    // Hotel D. Luis (IE)
    location = await Locations.createLocation({
      name: 'Location',
      poolingEnabled: true,
      isUsingServiceTimes: false,
      isActive: true,
      fleetEnabled: true,
      serviceArea: [
        {
          latitude: 40.2246842,
          longitude: -8.4420742
        },
        {
          latitude: 40.2238472,
          longitude: -8.3978139
        },
        {
          latitude: 40.1860998,
          longitude: -8.3972703
        },
        {
          latitude: 40.189714,
          longitude: -8.430009
        },
        {
          latitude: 40.2246842,
          longitude: -8.4420742
        }
      ]
    });

    const driverInfo = {
      // Leroy Merlin
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      },
      locations: [location._id]
    };

    ({ driver, driverSocket, driverToken } = await createDriverLogin(
      driverInfo, app, request, domain, driverSocket
    ));

    rider1 = await new Riders({
      email: 'rider1@mail.com',
      firstName: 'Rider',
      lastName: '1',
      password: 'Password1',
      location: location._id,
      dob: '2000-12-11'
    }).save();


    rider2 = await new Riders({
      email: 'rider2@mail.com',
      firstName: 'Rider',
      lastName: '2',
      password: 'Password2',
      location: location._id,
      dob: '2000-12-11'
    }).save();

    const rider1SessionResponse = await request(app)
      .post('/v1/login')
      .set('host', domain.rider)
      .set('X-Mobile-Os', 'Android')
      .set('X-App-Version', '1.0.0')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ email: 'rider1@mail.com', password: 'Password1' })
      .expect(200)
      .end()
      .get('body');

    const rider2SessionResponse = await request(app)
      .post('/v1/login')
      .set('host', domain.rider)
      .set('X-Mobile-Os', 'Android')
      .set('X-App-Version', '1.0.0')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ email: 'rider2@mail.com', password: 'Password2' })
      .expect(200)
      .end()
      .get('body');


    rider1Token = rider1SessionResponse.accessToken;
    rider2Token = rider2SessionResponse.accessToken;

    rider1Socket
      .emit('authenticate', { token: rider1Token })
      .on('authenticated', () => {
        logger.debug('RIDER1 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });

    rider2Socket
      .emit('authenticate', { token: rider2Token })
      .on('authenticated', () => {
        logger.debug('RIDER2 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });
  });

  beforeEach(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    await Drivers.updateOne({ _id: driver._id }, { $set: { driverRideList: [] } });

    driverSocket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();

    await Drivers.syncIndexes();
    await Locations.syncIndexes();

    await Riders.updateRider(rider1._id, { lastCancelTimestamp: null });
    await Riders.updateRider(rider2._id, { lastCancelTimestamp: null });
  });

  describe('Flow with pooling', () => {
    it('Should assign driver 1 to request 1 and 2 and pickup', async () => {
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 3
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.driver), String(driver._id));

      await pickUp(driverToken, ride1, app, request, domain);

      await createRequest(
        rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      ride2 = await Rides.findOne({ rider: rider2 });
      sinon.assert.match(String(ride2.driver), String(driver._id));

      ride1 = await Rides.findOne({ rider: rider1 });
      return sinon.assert.match(ride1.status, 300);
    });

    it('Should assign driver 1 to request 1 and 2 and dropoff', async () => {
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 3
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.driver), String(driver._id));

      await pickUp(driverToken, ride1, app, request, domain);
      await dropOff(driverToken, ride1, app, request, domain);

      await createRequest(
        rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      ride2 = await Rides.findOne({ rider: rider2 });
      sinon.assert.match(String(ride2.driver), String(driver._id));

      ride1 = await Rides.findOne({ rider: rider1 });
      return sinon.assert.match(ride1.status, 700);
    });

    it('Should assign driver 1 to request 1 and 2 and driver-cancel', async () => {
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 3
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.driver), String(driver._id));

      await createRequest(
        rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      ride2 = await Rides.findOne({ rider: rider2 });
      sinon.assert.match(String(ride2.driver), String(driver._id));

      await driverCancel(driverToken, ride1._id, app, request, domain);

      ride1 = await Rides.findOne({ rider: rider1 });
      return sinon.assert.match(ride1.status, 205);
    });
    it('Should assign driver 1 to request 1 and 2 and no-show-cancel', async () => {
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 3
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.driver), String(driver._id));

      await createRequest(
        rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      ride2 = await Rides.findOne({ rider: rider2 });
      sinon.assert.match(String(ride2.driver), String(driver._id));

      await driverMoved(driverSocket, keyLoc.req1p[0], keyLoc.req1p[1]);
      await driverArrived(driverToken, ride1, app, request, domain);

      const driverArrivedTimestamp = moment(ride1.driverArrivedTimestamp).subtract(3, 'm').toDate();
      await Rides.updateRide(ride1._id, { driverArrivedTimestamp });

      await noShowCancel(driverToken, { ride: ride1 }, app, request, domain);

      ride1 = await Rides.findOne({ rider: rider1 });
      return sinon.assert.match(ride1.status, 206);
    });
    it('Should assign driver 1 to request 1 and 2 and rider-cancel', async () => {
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 3
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.driver), String(driver._id));

      await createRequest(
        rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      ride2 = await Rides.findOne({ rider: rider2 });
      sinon.assert.match(String(ride2.driver), String(driver._id));

      await riderCancel(driverSocket, rider1Socket, ride1);

      ride1 = await Rides.findOne({ rider: rider1 });
      return sinon.assert.match(ride1.status, 207);
    });
    it('Should only have ride 1 with driver arrived', async () => {
      await createRequest(
        rider1Token, keyLoc.req3p, keyLoc.req3d, location, app, request, domain, false, 3
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.driver), String(driver._id));

      await createRequest(
        rider2Token, keyLoc.req4p, keyLoc.req4d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      ride2 = await Rides.findOne({ rider: rider2 });
      sinon.assert.match(String(ride2.driver), String(driver._id));

      await driverMoved(driverSocket, keyLoc.req3p[0], keyLoc.req3p[1]);
      await driverArrived(driverToken, ride1, app, request, domain);

      const actions = await getActions(driverToken, app, request, domain);
      expect([actions[0].stopType, actions[0].rider.name]).to.eql(['pickup', 'Rider 1']); // Current action
      expect([actions[1].stopType, actions[1].rider.name]).to.eql(['pickup', 'Rider 2']); // Next pickup

      ride1 = await Rides.findOne({ rider: rider1 });
      ride2 = await Rides.findOne({ rider: rider2 });
      return sinon.assert.match([ride1.status, ride2.status], [203, 201]);
    });

    it('Should have ride 2 with driver arrived after ride 1 dropped off', async () => {
      await createRequest(
        rider1Token, keyLoc.req3p, keyLoc.req3d, location, app, request, domain, false, 3
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.driver), String(driver._id));

      await createRequest(
        rider2Token, keyLoc.req4p, keyLoc.req4d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      ride2 = await Rides.findOne({ rider: rider2 });
      sinon.assert.match(String(ride2.driver), String(driver._id));

      await driverMoved(driverSocket, keyLoc.req3p[0], keyLoc.req3p[1]);
      await driverArrived(driverToken, ride1, app, request, domain);

      const actions1 = await getActions(driverToken, app, request, domain);
      expect([actions1[0].stopType, actions1[0].rider.name]).to.eql(['pickup', 'Rider 1']); // Current action
      expect([actions1[1].stopType, actions1[1].rider.name]).to.eql(['pickup', 'Rider 2']); // Next pickup

      ride1 = await Rides.findOne({ rider: rider1 });
      ride2 = await Rides.findOne({ rider: rider2 });
      sinon.assert.match([ride1.status, ride2.status], [203, 201]);

      await pickUp(driverToken, ride1, app, request, domain);
      const actions2 = await getActions(driverToken, app, request, domain);
      expect([actions2[0].stopType, actions2[0].rider.name]).to.eql(['pickup', 'Rider 2']); // Current action

      ride1 = await Rides.findOne({ rider: rider1 });
      ride2 = await Rides.findOne({ rider: rider2 });
      sinon.assert.match([ride1.status, ride2.status], [300, 202]);

      await dropOff(driverToken, ride1, app, request, domain);
      ride1 = await Rides.findOne({ rider: rider1 });
      ride2 = await Rides.findOne({ rider: rider2 });
      sinon.assert.match([ride1.status, ride2.status], [700, 202]);

      await driverMoved(driverSocket, keyLoc.req4p[0], keyLoc.req4p[1]);
      await driverArrived(driverToken, ride2, app, request, domain);

      ride1 = await Rides.findOne({ rider: rider1 });
      ride2 = await Rides.findOne({ rider: rider2 });
      return sinon.assert.match([ride1.status, ride2.status], [700, 203]);
    });
    it('Should have pickup and dropoff coordinates in hailed ride', async () => {
      driver = await Drivers.findOneAndUpdate({ _id: driver._id }, {
        $set: {
          'currentLocation.coordinates': [keyLoc.d1a[1], keyLoc.d1a[0]]
        }
      });
      const result = await hailRide(driverToken, location, app, request, domain);

      // Pickup should be the same as initial driver location
      let hailedRide = await Rides.findOne({ _id: result.id });
      sinon.assert.match(
        [hailedRide.hailedPickupLatitude, hailedRide.hailedPickupLongitude],
        keyLoc.d1a.slice(0, 2)
      );

      // On creation, hailed ride should have pickup zone detected
      expect(hailedRide.pickupZone).to.have.property('name');
      expect(hailedRide.pickupZone).to.have.property('id');
      expect(hailedRide.pickupZone.name).to.equal('Default');
      expect(hailedRide.pickupZone).to.not.have.property('dropoffZone');

      // Dropoff should be the same as second driver location
      driver = await Drivers.findOneAndUpdate({ _id: driver._id }, {
        $set: {
          'currentLocation.coordinates': [keyLoc.d1b[1], keyLoc.d1b[0]]
        }
      });
      await dropOff(driverToken, hailedRide, app, request, domain);
      hailedRide = await Rides.findOne({ _id: result.id });
      sinon.assert.match(
        [hailedRide.hailedDropoffLatitude, hailedRide.hailedDropoffLongitude],
        keyLoc.d1b.slice(0, 2)
      );

      // After dropoff, hailed ride should have pickup zone detected
      expect(hailedRide.dropoffZone).to.have.property('name');
      expect(hailedRide.dropoffZone).to.have.property('id');
      expect(hailedRide.dropoffZone.name).to.equal('Default');
    });
  });
});
