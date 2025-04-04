import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import io from 'socket.io-client';
import request from 'supertest-promised';
import moment from 'moment';
import app from '../server';
import driverSearcher from '../services/driverSearch';
import { port, domain } from '../config';
import { createScenarioRiders, createRequest } from './utils/rider';
import {
  driverCancel, createDriverLogin, getQueue, pickUp
} from './utils/driver';
import { Rides, Settings, Drivers } from '../models';
import { emptyAllCollections, emptyCollectionList } from './utils/helper';
import { createScenarioLocation, listScenarioPoints } from './utils/location';
import { createWebsockets } from './utils/websockets';
import { dateDifference } from '../utils/time';

chai.use(chaiAsPromised);
const { expect } = chai;

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let location;
let driver;
let rider1;
let rider2;

const points = listScenarioPoints('Brooklyn');

const keyLoc = {
  // Driver 1
  d1a: [...points[0].reverse(), 'address'],
  // Request 1
  req1p: [...points[1].reverse(), 'address'],
  req1d: [...points[4].reverse(), 'address'],
  // Request 2
  req2p: [...points[2].reverse(), 'address'],
  req2d: [...points[4], 'address']
};

describe('Queue #2 without pooling', () => {
  before(async () => {
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await createScenarioLocation('Brooklyn', { poolingEnabled: false });

    const driverInfo = {
      email: 'some@mail.com',
      locations: [location._id],
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      }
    };

    driver = await createDriverLogin(
      driverInfo, app, request, domain, io.connect(`http://localhost:${port}`, ioOptions)
    );

    const riderSockets = createWebsockets(2);
    ([
      rider1, rider2
    ] = await createScenarioRiders(2, { app, request, domain }, [
      { firstName: 'Rider', riderSocket: riderSockets[0] },
      { firstName: 'Rider', riderSocket: riderSockets[1] }
    ]));
  });

  beforeEach(async () => {
    await emptyCollectionList(['Requests', 'Rides']);
    await Drivers.updateOne({}, { $set: { driverRideList: [] } });
  });

  describe('Driver queue', () => {
    it('Should have 1 ride', async () => {
      await createRequest(
        rider1.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();

      const ride1 = await Rides.findOne({ rider: rider1.rider._id });
      await driverCancel(driver.driverToken, ride1._id, app, request, domain);

      await createRequest(
        rider2.riderToken, keyLoc.req2p, keyLoc.req2d, location, app, request, domain
      );
      await driverSearcher.search();

      const queue = await getQueue(driver.driverToken, app, request, domain);

      expect(queue).to.have.lengthOf(1);
      expect([queue[0].status, queue[0].rider.name]).to.eql([202, 'Rider 2']);
    });
    it('Should have 2 rides with first as 202', async () => {
      await createRequest(
        rider1.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();

      await createRequest(
        rider2.riderToken, keyLoc.req2p, keyLoc.req2d, location, app, request, domain
      );
      await driverSearcher.search();

      const queue = await getQueue(driver.driverToken, app, request, domain);

      expect(queue).to.have.lengthOf(2);
      expect([queue[0].status, queue[0].rider.name]).to.eql([202, 'Rider 1']);
      expect([queue[1].status, queue[1].rider.name]).to.eql([200, 'Rider 2']);
    });
    it('Should move second ride of 3 to 202 after first is cancelled', async () => {
      await createRequest(
        rider1.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();
      const ride1 = await Rides.findOne({ rider: rider1.rider._id });
      expect(Math.round(dateDifference(
        moment(ride1.createdTimestamp),
        moment.utc(ride1.eta * 1000),
        'minutes'
      ) + 0.1)).to.equal(2);
      expect(Math.round(dateDifference(
        moment.utc(ride1.eta * 1000),
        moment.utc(ride1.dropoffEta * 1000),
        'minutes'
      ) + 0.1)).to.equal(2);

      await createRequest(
        rider2.riderToken, keyLoc.req2p, keyLoc.req2d, location, app, request, domain
      );
      await driverSearcher.search();
      const ride2 = await Rides.findOne({ rider: rider2.rider._id });
      expect(Math.round(dateDifference(
        moment.utc(ride1.dropoffEta * 1000),
        moment.utc(ride2.eta * 1000),
        'minutes'
      ) + 0.1)).to.equal(2);
      expect(Math.round(dateDifference(
        moment.utc(ride2.createdTimestamp),
        moment.utc(ride2.eta * 1000),
        'minutes'
      ) + 0.1)).to.equal(6);
      expect(Math.round(dateDifference(
        moment.utc(ride2.eta * 1000),
        moment.utc(ride2.dropoffEta * 1000),
        'minutes'
      ) + 0.1)).to.equal(2);

      // Two ride queue
      const queue = await getQueue(driver.driverToken, app, request, domain);
      expect(queue).to.have.lengthOf(2);
      expect([queue[0].status, queue[0].rider.name]).to.eql([202, 'Rider 1']);
      expect([queue[1].status, queue[1].rider.name]).to.eql([200, 'Rider 2']);

      await driverCancel(driver.driverToken, ride1._id, app, request, domain);

      // One ride queue after ride cancellation
      const queue1 = await getQueue(driver.driverToken, app, request, domain);
      expect(queue1).to.have.lengthOf(1);
      expect([queue1[0].status, queue1[0].rider.name]).to.eql([202, 'Rider 2']);

      await createRequest(
        rider1.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();

      // Two ride queue after new ride requested
      const queue2 = await getQueue(driver.driverToken, app, request, domain);
      expect(queue2).to.have.lengthOf(2);
      expect([queue2[0].status, queue2[0].rider.name]).to.eql([202, 'Rider 2']);
      expect([queue2[1].status, queue2[1].rider.name]).to.eql([200, 'Rider 1']);

      // After pickup second ride becomes next in queue
      await pickUp(driver.driverToken, ride2._id, app, request, domain);
      const queue3 = await getQueue(driver.driverToken, app, request, domain);
      expect(queue3).to.have.lengthOf(2);
      expect([queue3[0].status, queue3[0].rider.name]).to.eql([300, 'Rider 2']);
      expect([queue3[1].status, queue3[1].rider.name]).to.eql([201, 'Rider 1']);
    });
  });
});
