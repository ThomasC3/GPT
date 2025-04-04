import { expect } from 'chai';
import moment from 'moment-timezone';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import { createRequest, createRiderLogin, rideEta } from '../utils/rider';
import { pickUp, createDriverLogin } from '../utils/driver';
import {
  Drivers, Rides, Settings
} from '../../models';
import { emptyAllCollections, emptyCollectionList } from '../utils/helper';
import { createScenarioLocation, listScenarioPoints } from '../utils/location';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let driver;
let driverToken;
let driverSocket;
let rider1Socket;
let rider2Socket;
let rider1;
let rider2;
let rider1Token;
let rider2Token;
let location;

const points = listScenarioPoints('Brooklyn');

const keyLoc = {
  // Driver 1
  d1a: [...points[0].reverse(), 'address'],
  // Request 1
  req1p: [...points[1].reverse(), 'address'],
  req1d: [...points[4].reverse(), 'address'],
  // Request 2
  req2p: [...points[2].reverse(), 'address'],
  req2d: [...points[4], 'address'],
  // Request 3
  req3p: [...points[3].reverse(), 'address'],
  req3d: [...points[4], 'address']
};

describe('Rider ride context', () => {
  before(async () => {
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);

    location = await createScenarioLocation('Brooklyn', { poolingEnabled: false });

    const driverData = await createDriverLogin({
      locations: [location._id],
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      }
    }, app, request, domain, driverSocket);

    ({ driver, driverToken } = driverData);

    const rider1Data = await createRiderLogin({
      email: 'rider1@mail.com',
      password: 'Password1',
      location: location._id
    }, app, request, domain, rider1Socket);

    ({ rider: rider1, riderToken: rider1Token } = rider1Data);

    const rider2Data = await createRiderLogin({
      email: 'rider2@mail.com',
      password: 'Password2',
      location: location._id
    }, app, request, domain, rider2Socket);

    ({ rider: rider2, riderToken: rider2Token } = rider2Data);
  });

  beforeEach(async () => {
    await Drivers.updateOne({ _id: driver._id }, { $set: { driverRideList: [] } });
    await emptyCollectionList(['Requests', 'Rides', 'Routes']);
  });

  describe('Rider ride context ETA non-pooling', () => {
    it('Should have eta of 3 mins between each action', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();
      let ride1 = await Rides.findOne({ rider: rider1._id });

      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();
      let ride2 = await Rides.findOne({ rider: rider2._id });

      const eta1 = await rideEta(ride1, rider1Token, app, request, domain);
      const eta2 = await rideEta(ride2, rider2Token, app, request, domain);

      ride1 = await Rides.findOne({ rider: rider1._id });
      ride2 = await Rides.findOne({ rider: rider2._id });

      expect(eta1).to.equal(3);
      expect(eta2).to.equal(7);
      expect(!!ride1.eta).to.equal(true);
      expect(!!ride2.eta).to.equal(true);
      expect(!!ride1.dropoffEta).to.equal(true);
      expect(!!ride2.dropoffEta).to.equal(true);

      expect(moment.utc(ride1.dropoffEta * 1000).diff(moment.utc(ride1.eta * 1000), 'minutes')).to.equal(2);
      expect(moment.utc(ride2.eta * 1000).diff(moment.utc(ride1.dropoffEta * 1000), 'minutes')).to.equal(2);
      expect(moment.utc(ride2.dropoffEta * 1000).diff(moment.utc(ride2.eta * 1000), 'minutes')).to.equal(2);


      await pickUp(driverToken, ride1, app, request, domain);

      ride1 = await Rides.findOne({ rider: rider1._id });
      ride2 = await Rides.findOne({ rider: rider2._id });

      expect(moment.utc(ride1.dropoffEta * 1000).diff(moment.utc(ride1.eta * 1000), 'minutes')).to.equal(2);
      expect(moment.utc(ride2.eta * 1000).diff(moment.utc(ride1.dropoffEta * 1000), 'minutes')).to.equal(2);
      expect(moment.utc(ride2.dropoffEta * 1000).diff(moment.utc(ride2.eta * 1000), 'minutes')).to.equal(2);
    });
  });
});
