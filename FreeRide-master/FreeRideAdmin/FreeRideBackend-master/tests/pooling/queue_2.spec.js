/* eslint-disable no-undef */
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import io from 'socket.io-client';
import request from 'supertest-promised';
import moment from 'moment';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import { createScenarioRiders, createRequest } from '../utils/rider';
import {
  driverCancel, createDriverLogin, getQueue, pickUp, getActions
} from '../utils/driver';
import {
  Rides, Routes, Settings, Drivers
} from '../../models';
import { emptyAllCollections, emptyCollectionList } from '../utils/helper';
import { createScenarioLocation, listScenarioPoints } from '../utils/location';
import { createWebsockets } from '../utils/websockets';

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
let rider3;

const points = listScenarioPoints('Brooklyn');

const keyLoc = {
  // Driver 1
  d1a: [...points[0]],
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

const diffInMinutes = (start, end) => moment(end).diff(moment(start), 'minutes', true);

describe('Queue #2 with pooling', () => {
  before(async () => {
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await createScenarioLocation('Brooklyn');

    const driverInfo = {
      email: 'some@mail.com',
      locations: [location._id],
      currentLocation: {
        coordinates: keyLoc.d1a,
        type: 'Point'
      }
    };

    driver = await createDriverLogin(
      driverInfo, app, request, domain, io.connect(`http://localhost:${port}`, ioOptions)
    );

    const riderSockets = createWebsockets(3);
    ([
      rider1, rider2, rider3
    ] = await createScenarioRiders(3, { app, request, domain }, [
      { firstName: 'Rider', riderSocket: riderSockets[0] },
      { firstName: 'Rider', riderSocket: riderSockets[1] },
      { firstName: 'Rider', riderSocket: riderSockets[2] }
    ]));
  });

  beforeEach(async () => {
    await emptyCollectionList(['Requests', 'Rides', 'Routes']);
    await Drivers.updateOne({}, { $set: { driverRideList: [] } });
  });

  describe('Driver queue', () => {
    it('Should have 2 rides with 1st as 202 and 2nd as 201', async () => {
      // Create ride 1
      await createRequest(
        rider1.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();

      // Cancel ride 1
      const ride1 = await Rides.findOne({ rider: rider1.rider._id });
      await driverCancel(driver.driverToken, ride1._id, app, request, domain);

      // Create ride 2
      await createRequest(
        rider2.riderToken, keyLoc.req2p, keyLoc.req2d, location, app, request, domain
      );
      await driverSearcher.search();

      // Create ride 3
      await createRequest(
        rider3.riderToken, keyLoc.req3p, keyLoc.req3d, location, app, request, domain
      );
      await driverSearcher.search();

      await Routes.countDocuments().then(data => expect(data).to.equal(2));
      const route = await Routes.findOne({ active: true });

      const queue = await getQueue(driver.driverToken, app, request, domain);
      const actions = await getActions(driver.driverToken, app, request, domain);
      queue.forEach((item) => {
        expect(item.current).to.equal(String(route.activeRideId) === String(item.id));
      });

      expect(queue).to.have.lengthOf(2);
      expect([queue[0].status, queue[0].rider.name]).to.eql([202, 'Rider 2']);
      expect([queue[1].status, queue[1].rider.name]).to.eql([201, 'Rider 3']);

      expect([actions[0].stopType, actions[0].rider.name]).to.eql(['pickup', 'Rider 2']); // Current action
      expect([actions[1].stopType, actions[1].rider.name]).to.eql(['pickup', 'Rider 3']); // Next pickup
      expect([actions[2].stopType, actions[2].rider.name]).to.eql(['dropoff', 'Rider 2']);
      expect([actions[3].stopType, actions[3].rider.name]).to.eql(['dropoff', 'Rider 3']);

      const ride2 = await Rides.findOne({ rider: rider2.rider._id });
      const ride3 = await Rides.findOne({ rider: rider3.rider._id });

      expect(driver.driver.currentLatitude).to.eql(ride2.driverInitialLatitude);
      expect(driver.driver.currentLongitude).to.eql(ride2.driverInitialLongitude);
      expect(driver.driver.currentLatitude).to.eql(ride3.driverInitialLatitude);
      expect(driver.driver.currentLongitude).to.eql(ride3.driverInitialLongitude);

      // Pickup of ride 2
      expect(ride2.initialEta - ride2.createdTimestamp.getTime() / 1000)
        .to.be.above(1.5 * 60).to.be.below(2 * 60);
      // Pickup of ride 3
      expect(ride3.initialEta - ride2.initialEta)
        .to.be.above(3 * 60).to.be.below(3.5 * 60);
      // Dropoff of ride 2
      expect(ride2.initialDropoffEta - ride3.initialEta)
        .to.be.above(6 * 60).to.be.below(6.5 * 60);
      // Dropoff of ride 3
      expect(ride3.initialDropoffEta - ride2.initialDropoffEta)
        .to.be.above(4 * 60).to.be.below(4.5 * 60);

      // Update of ETA for ride 2
      expect(ride2.eta).to.be.above(ride2.initialEta);
      expect(ride2.dropoffEta).to.be.above(ride2.initialDropoffEta);

      // No update of ETA for ride 3
      expect(Math.floor(ride3.eta)).to.be.equal(Math.floor(ride3.initialEta));
      expect(Math.floor(ride3.dropoffEta)).to.be.equal(Math.floor(ride3.initialDropoffEta));
    });
    it('Should move 2nd ride to 202 after 1st is cancelled and 3rd to 201 after pickup of 2nd', async () => {
      // Create ride 1
      await createRequest(
        rider1.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();

      // Create ride 2
      await createRequest(
        rider2.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();

      // Create ride 3
      await createRequest(
        rider3.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();

      const route1 = await Routes.findOne({ active: true });
      const queue1 = await getQueue(driver.driverToken, app, request, domain);
      const actions1 = await getActions(driver.driverToken, app, request, domain);
      queue1.forEach((item) => {
        expect(item.current).to.equal(String(route1.activeRideId) === String(item.id));
      });

      expect(queue1).to.have.lengthOf(3);
      expect([queue1[0].status, queue1[0].rider.name]).to.eql([202, 'Rider 1']);
      expect([queue1[1].status, queue1[1].rider.name]).to.eql([201, 'Rider 2']);
      expect([queue1[2].status, queue1[2].rider.name]).to.eql([200, 'Rider 3']);

      expect([actions1[0].stopType, actions1[0].rider.name]).to.eql(['pickup', 'Rider 1']); // Current action
      expect([actions1[1].stopType, actions1[1].rider.name, diffInMinutes(actions1[0].eta, actions1[1].eta)]).to.eql(['pickup', 'Rider 2', 2]); // Next pickup
      expect([actions1[2].stopType, actions1[2].rider.name]).to.eql(['pickup', 'Rider 3']);
      expect([actions1[3].stopType, actions1[3].rider.name]).to.eql(['dropoff', 'Rider 1']);
      expect([actions1[4].stopType, actions1[4].rider.name, diffInMinutes(actions1[3].eta, actions1[4].eta)]).to.eql(['dropoff', 'Rider 2', 2]);
      expect([actions1[5].stopType, actions1[5].rider.name, diffInMinutes(actions1[4].eta, actions1[5].eta)]).to.eql(['dropoff', 'Rider 3', 2]);

      // Cancel ride 1
      const ride1 = await Rides.findOne({ rider: rider1.rider._id });
      await driverCancel(driver.driverToken, ride1._id, app, request, domain);

      const route2 = await Routes.findOne({ active: true });
      const actions2 = await getActions(driver.driverToken, app, request, domain);
      const queue2 = await getQueue(driver.driverToken, app, request, domain);
      queue2.forEach((item) => {
        expect(item.current).to.equal(String(route2.activeRideId) === String(item.id));
      });

      expect(queue2).to.have.lengthOf(2);
      expect([queue2[0].status, queue2[0].rider.name]).to.eql([202, 'Rider 2']);
      expect([queue2[1].status, queue2[1].rider.name]).to.eql([201, 'Rider 3']);

      expect([actions2[0].stopType, actions2[0].rider.name]).to.eql(['pickup', 'Rider 2']); // Current action
      expect([actions2[1].stopType, actions2[1].rider.name, diffInMinutes(actions2[0].eta, actions2[1].eta)]).to.eql(['pickup', 'Rider 3', 2]); // Next pickup
      expect([actions2[2].stopType, actions2[2].rider.name]).to.eql(['dropoff', 'Rider 2']);
      expect([actions2[3].stopType, actions2[3].rider.name, diffInMinutes(actions2[2].eta, actions2[3].eta)]).to.eql(['dropoff', 'Rider 3', 2]);

      // Pickup ride 2
      const ride2 = await Rides.findOne({ rider: rider2.rider._id });
      await pickUp(driver.driverToken, ride2._id, app, request, domain);

      const route3 = await Routes.findOne({ active: true });
      const queue3 = await getQueue(driver.driverToken, app, request, domain);
      const actions3 = await getActions(driver.driverToken, app, request, domain);
      queue3.forEach((item) => {
        expect(item.current).to.equal(String(route3.activeRideId) === String(item.id));
      });

      expect(queue3).to.have.lengthOf(2);
      expect([queue3[0].status, queue3[0].rider.name]).to.eql([300, 'Rider 2']);
      expect([queue3[1].status, queue3[1].rider.name]).to.eql([202, 'Rider 3']);

      expect([actions3[0].stopType, actions3[0].rider.name]).to.eql(['pickup', 'Rider 3']); // Current action
      expect([actions3[1].stopType, actions3[1].rider.name]).to.eql(['dropoff', 'Rider 2']);
      expect([actions3[2].stopType, actions3[2].rider.name, diffInMinutes(actions3[1].eta, actions3[2].eta)]).to.eql(['dropoff', 'Rider 3', 2]);
    });
  });
});
