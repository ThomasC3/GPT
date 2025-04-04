/* eslint-disable no-await-in-loop */
import io from 'socket.io-client';
import request from 'supertest-promised';
import chai from 'chai';
import jsonSchema from 'chai-json-schema';
import app from '../../server';
import { port, domain } from '../../config';
import driverSearcher from '../../services/driverSearch';
import { createRequest, createRiderLogin, rideContext } from '../utils/rider';
import { createDriverLogin, driverEndpoint } from '../utils/driver';
import {
  Locations, Rides, Drivers, Settings
} from '../../models';
import { emptyAllCollections, emptyCollectionList } from '../utils/helper';
import { rideContextForRiderSchema } from '../utils/schemas';

chai.use(jsonSchema);
const { expect } = chai;

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let driver;
let rider1;
let rider2;
let location;

const keyLoc = {
  A: [40.6810937, -73.9078617, 'Address A'],
  B: [40.6851291, -73.9148140, 'Address B'],
  C: [40.689105, -73.921333, 'Address C']
};

describe('Rider /rides/:id/status', () => {
  before(async () => {
    await emptyAllCollections();

    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      isActive: true,
      poolingEnabled: true,
      serviceArea: [
        { longitude: -73.978573, latitude: 40.721239 },
        { longitude: -73.882936, latitude: 40.698337 },
        { longitude: -73.918642, latitude: 40.629585 },
        { longitude: -73.978573, latitude: 40.660845 },
        { longitude: -73.978573, latitude: 40.721239 }
      ]
    });

    driver = await createDriverLogin(
      {
        currentLocation: {
          coordinates: [keyLoc.A[1], keyLoc.A[0]],
          type: 'Point'
        },
        isOnline: true,
        isAvailable: true,
        locations: [location._id]
      },
      app, request, domain, io.connect(`http://localhost:${port}`, ioOptions)
    );

    rider1 = await createRiderLogin(
      { location: location._id, email: 'rider1@mail.com' },
      app, request, domain, io.connect(`http://localhost:${port}`, ioOptions)
    );
    rider2 = await createRiderLogin(
      { location: location._id, email: 'rider2@mail.com' },
      app, request, domain, io.connect(`http://localhost:${port}`, ioOptions)
    );
  });

  describe('Pooling tag', () => {
    beforeEach(async () => {
      await emptyCollectionList(['Requests', 'Rides', 'Routes']);

      await Drivers.syncIndexes();
      await Locations.syncIndexes();
    });

    it('Should not have pooling tag true or any stops before dropoff in a single ride', async () => {
      await createRequest(rider1.riderToken, keyLoc.A, keyLoc.C, location, app, request, domain);
      await driverSearcher.search();

      const ride1 = await Rides.findOne({ rider: rider1.rider._id });
      const context = await rideContext(ride1, rider1.riderToken, app, request, domain);
      expect(context).to.be.jsonSchema(rideContextForRiderSchema);
      const {
        pooling: poolingTag1,
        stops: stops1
      } = context;

      const { body: actions } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain);

      expect(actions.length).to.equal(2);
      expect(
        actions.map(action => [action.stopType, action.id])
      ).to.eql(
        [
          ['pickup', `${ride1._id}`],
          ['dropoff', `${ride1._id}`]
        ]
      );

      expect(poolingTag1).to.equal(false);
      expect(stops1).to.equal(0);
    });

    it('Should have pooling tag true in a pooled ride and one stop before dropoff for each ride', async () => {
      await createRequest(rider1.riderToken, keyLoc.A, keyLoc.C, location, app, request, domain);
      await driverSearcher.search();
      await createRequest(rider2.riderToken, keyLoc.B, keyLoc.C, location, app, request, domain);
      await driverSearcher.search();

      const ride1 = await Rides.findOne({ rider: rider1.rider._id });
      const context1 = await rideContext(ride1, rider1.riderToken, app, request, domain);
      expect(context1).to.be.jsonSchema(rideContextForRiderSchema);
      const {
        pooling: poolingTag1,
        stops: stops1
      } = context1;

      const ride2 = await Rides.findOne({ rider: rider2.rider._id });
      const context2 = await rideContext(ride2, rider2.riderToken, app, request, domain);
      expect(context2).to.be.jsonSchema(rideContextForRiderSchema);
      const {
        pooling: poolingTag2,
        stops: stops2
      } = context2;

      const { body: actions } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain);

      expect(actions.length).to.equal(4);
      expect(
        actions.map(action => [action.stopType, action.id])
      ).to.eql(
        [
          ['pickup', `${ride1._id}`],
          ['pickup', `${ride2._id}`],
          ['dropoff', `${ride1._id}`],
          ['dropoff', `${ride2._id}`]
        ]
      );

      expect([poolingTag1, poolingTag2]).to.eql([true, true]);
      expect([stops1, stops2]).to.eql([0, 1]);
    });

    it('Should not have pooling tag true or stops before dropoff in a non-pooled ride', async () => {
      await createRequest(rider1.riderToken, keyLoc.A, keyLoc.B, location, app, request, domain);
      await driverSearcher.search();
      await createRequest(rider2.riderToken, keyLoc.B, keyLoc.C, location, app, request, domain);
      await driverSearcher.search();

      const ride1 = await Rides.findOne({ rider: rider1.rider._id });
      const context1 = await rideContext(ride1, rider1.riderToken, app, request, domain);
      expect(context1).to.be.jsonSchema(rideContextForRiderSchema);
      const {
        pooling: poolingTag1,
        stops: stops1
      } = context1;

      const ride2 = await Rides.findOne({ rider: rider2.rider._id });
      const context2 = await rideContext(ride2, rider2.riderToken, app, request, domain);
      expect(context2).to.be.jsonSchema(rideContextForRiderSchema);
      const {
        pooling: poolingTag2,
        stops: stops2
      } = context2;

      const { body: actions } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain);

      expect(actions.length).to.equal(4);
      expect(
        actions.map(action => [action.stopType, action.id])
      ).to.eql(
        [
          ['pickup', `${ride1._id}`],
          ['dropoff', `${ride1._id}`],
          ['pickup', `${ride2._id}`],
          ['dropoff', `${ride2._id}`]
        ]
      );

      expect([poolingTag1, poolingTag2]).to.eql([false, false]);
      expect([stops1, stops2]).to.eql([0, 2]);
    });
  });
});
