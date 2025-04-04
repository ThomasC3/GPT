/* eslint-disable no-undef */
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../server';
import driverSearcher from '../services/driverSearch';
import { port, domain } from '../config';
import { createScenarioRiders, createFsRequest } from './utils/rider';
import {
  createDriverLogin, getQueue, pickUp, getActions
} from './utils/driver';
import {
  Rides, Settings, Drivers, FixedStops
} from '../models';
import { emptyAllCollections, emptyCollectionList } from './utils/helper';
import { createScenarioLocation, listScenarioPoints } from './utils/location';
import { createWebsockets } from './utils/websockets';

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
let fs;

const points = listScenarioPoints('Brooklyn');

describe('Fixed-stop queue without pooling', () => {
  before(async () => {
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await createScenarioLocation('Brooklyn', { poolingEnabled: false, fixedStopEnabled: true });

    const fixedStopData = {
      status: 1,
      businessName: 'Coca-cola',
      address: 'Here',
      location: location._id
    };

    fs = await Promise.all(points.slice(1).map(
      p => FixedStops.createFixedStop(
        {
          name: 'FS', lng: p[0], lat: p[1], ...fixedStopData
        }
      )
    ));

    const driverInfo = {
      email: 'some@mail.com',
      locations: [location._id],
      currentLocation: {
        coordinates: points[0],
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
    it('Should have only 1st ride at 202 and 2nd at 200', async () => {
      // Create ride 1
      await createFsRequest(
        rider1.riderToken, fs[0].id, fs[1].id, location, app, request, domain
      );
      await driverSearcher.search();

      // Create ride 2
      await createFsRequest(
        rider2.riderToken, fs[2].id, fs[3].id, location, app, request, domain
      );
      await driverSearcher.search();

      const queue = await getQueue(driver.driverToken, app, request, domain);
      const actions = await getActions(driver.driverToken, app, request, domain);

      expect(queue).to.have.lengthOf(2);
      expect([queue[0].status, queue[0].rider.name]).to.eql([202, 'Rider 1']);
      expect([queue[1].status, queue[1].rider.name]).to.eql([200, 'Rider 2']);

      expect([actions[0].stopType, actions[0].rider.name]).to.eql(['pickup', 'Rider 1']); // Current action
      expect([actions[1].stopType, actions[1].rider.name]).to.eql(['dropoff', 'Rider 1']);
      expect([actions[2].stopType, actions[2].rider.name]).to.eql(['pickup', 'Rider 2']); // Next pickup after 2 actions
      expect([actions[3].stopType, actions[3].rider.name]).to.eql(['dropoff', 'Rider 2']);
    });
    it('Should move 2nd ride to 201 if 1st is picked up and dropoff is at different stop', async () => {
      // Create ride 1
      await createFsRequest(
        rider1.riderToken, fs[0].id, fs[1].id, location, app, request, domain
      );
      await driverSearcher.search();

      // Create ride 2
      await createFsRequest(
        rider2.riderToken, fs[3].id, fs[4].id, location, app, request, domain
      );
      await driverSearcher.search();

      const queue1 = await getQueue(driver.driverToken, app, request, domain);
      const actions1 = await getActions(driver.driverToken, app, request, domain);

      expect(queue1).to.have.lengthOf(2);
      expect([queue1[0].status, queue1[0].rider.name]).to.eql([202, 'Rider 1']);
      expect([queue1[1].status, queue1[1].rider.name]).to.eql([200, 'Rider 2']);

      expect([actions1[0].stopType, actions1[0].rider.name]).to.eql(['pickup', 'Rider 1']); // Current action
      expect([actions1[1].stopType, actions1[1].rider.name]).to.eql(['dropoff', 'Rider 1']);
      expect([actions1[2].stopType, actions1[2].rider.name]).to.eql(['pickup', 'Rider 2']); // Next pickup is after a 2 actions (1 different stop for the pickup)
      expect([actions1[3].stopType, actions1[3].rider.name]).to.eql(['dropoff', 'Rider 2']);

      // Pickup ride 1
      const ride1 = await Rides.findOne({ rider: rider1.rider._id });
      await pickUp(driver.driverToken, ride1._id, app, request, domain);

      const actions2 = await getActions(driver.driverToken, app, request, domain);
      const queue2 = await getQueue(driver.driverToken, app, request, domain);

      expect(queue2).to.have.lengthOf(2);
      expect([queue2[0].status, queue2[0].rider.name]).to.eql([300, 'Rider 1']);
      expect([queue2[1].status, queue2[1].rider.name]).to.eql([201, 'Rider 2']);

      expect([actions2[0].stopType, actions2[0].rider.name]).to.eql(['dropoff', 'Rider 1']); // Current action
      expect([actions2[1].stopType, actions2[1].rider.name]).to.eql(['pickup', 'Rider 2']); // Next pickup at different fs as dropoff
      expect([actions2[2].stopType, actions2[2].rider.name]).to.eql(['dropoff', 'Rider 2']);
    });
    it('Should move 2nd ride to 202 if 1st is picked up and dropoff is at same stop', async () => {
      // Create ride 1
      await createFsRequest(
        rider1.riderToken, fs[0].id, fs[1].id, location, app, request, domain
      );
      await driverSearcher.search();

      // Create ride 2
      await createFsRequest(
        rider2.riderToken, fs[1].id, fs[2].id, location, app, request, domain
      );
      await driverSearcher.search();

      const queue1 = await getQueue(driver.driverToken, app, request, domain);
      const actions1 = await getActions(driver.driverToken, app, request, domain);

      expect(queue1).to.have.lengthOf(2);
      expect([queue1[0].status, queue1[0].rider.name]).to.eql([202, 'Rider 1']);
      expect([queue1[1].status, queue1[1].rider.name]).to.eql([201, 'Rider 2']);

      expect([actions1[0].stopType, actions1[0].rider.name]).to.eql(['pickup', 'Rider 1']); // Current action
      expect([actions1[1].stopType, actions1[1].rider.name]).to.eql(['dropoff', 'Rider 1']);
      expect([actions1[2].stopType, actions1[2].rider.name]).to.eql(['pickup', 'Rider 2']); // Next pickup is after a 2 actions (1 different stop for the pickup)
      expect([actions1[3].stopType, actions1[3].rider.name]).to.eql(['dropoff', 'Rider 2']);

      // Pickup ride 1
      const ride1 = await Rides.findOne({ rider: rider1.rider._id });
      await pickUp(driver.driverToken, ride1._id, app, request, domain);

      const actions2 = await getActions(driver.driverToken, app, request, domain);
      const queue2 = await getQueue(driver.driverToken, app, request, domain);

      expect(queue2).to.have.lengthOf(2);
      expect([queue2[0].status, queue2[0].rider.name]).to.eql([300, 'Rider 1']);
      expect([queue2[1].status, queue2[1].rider.name]).to.eql([202, 'Rider 2']);

      expect([actions2[0].stopType, actions2[0].rider.name]).to.eql(['dropoff', 'Rider 1']); // Current action
      expect([actions2[1].stopType, actions2[1].rider.name]).to.eql(['pickup', 'Rider 2']); // Next pickup at same fs as dropoff
      expect([actions2[2].stopType, actions2[2].rider.name]).to.eql(['dropoff', 'Rider 2']);
    });
  });
});
