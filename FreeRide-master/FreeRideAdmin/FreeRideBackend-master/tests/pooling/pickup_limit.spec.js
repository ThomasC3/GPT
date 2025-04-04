import { expect } from 'chai';
import request from 'supertest-promised';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { domain } from '../../config';
import {
  Drivers, Rides, Routes, Settings
} from '../../models';
import { emptyAllCollections, emptyCollectionList } from '../utils/helper';
import { createRequest, createScenarioRiders } from '../utils/rider';
import { pickUp, createScenarioDrivers } from '../utils/driver';
import { createScenarioLocation } from '../utils/location';
import { createWebsockets } from '../utils/websockets';
import { fixAndUpdateEtas } from '../../utils/ride';

let driver1Socket;
let driver1Token;
let rider1Socket;
let rider2Socket;
let rider3Socket;
let rider4Socket;
let driver1;
let rider1;
let rider2;
let rider3;
let rider4;
let rider1Token;
let rider2Token;
let rider3Token;
let rider4Token;
let ride1;
let ride2;
let ride3;
let ride4;
let location;

const keyLoc = {
  a: [32.762951, -117.130236, 'A'],
  b: [32.758361, -117.130236, 'B'],
  c: [32.755502, -117.130236, 'C'],
  d: [32.752633, -117.130248, 'D'],
  e: [32.748964, -117.130180, 'E'],
  f: [32.744129, -117.130113, 'F'],
  g: [32.739482, -117.129375, 'G']
};

describe('Number of stops within ride limit', () => {
  before(async () => {
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
    location = await createScenarioLocation('San Diego Extended', { etaIncreaseLimit: 20 });

    ([driver1Socket] = createWebsockets(1));
    ([{
      driver: driver1, driverSocket: driver1Socket, driverToken: driver1Token
    }] = await createScenarioDrivers(1, { app, request, domain }, [{
      currentLocation: {
        coordinates: [keyLoc.a[1], keyLoc.a[0]],
        type: 'Point'
      },
      email: 'driver1@mail.com',
      locations: [location._id],
      driverSocket: driver1Socket
    }]));

    const riderSockets = createWebsockets(4).map(ws => ({ riderSocket: ws }));
    ([
      { rider: rider1, riderToken: rider1Token, riderSocket: rider1Socket },
      { rider: rider2, riderToken: rider2Token, riderSocket: rider2Socket },
      { rider: rider3, riderToken: rider3Token, riderSocket: rider3Socket },
      { rider: rider4, riderToken: rider4Token, riderSocket: rider4Socket }
    ] = await createScenarioRiders(4, { app, request, domain }, riderSockets));
  });

  beforeEach(async () => {
    await emptyCollectionList(['Requests', 'Rides', 'Routes']);

    await Drivers.updateOne({ _id: driver1._id }, { $set: { driverRideList: [] } });

    driver1Socket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();
    rider3Socket.removeAllListeners();
    rider4Socket.removeAllListeners();
  });

  describe('Stops limit', () => {
    it('Should not have more than 2 stops within a ride', async () => {
      await createRequest(rider1Token, keyLoc.b, keyLoc.g, location, app, request, domain);
      await driverSearcher.search();
      ride1 = await Rides.findOne({ rider: rider1 });
      expect(String(ride1.driver)).to.equal(String(driver1._id));

      await createRequest(rider2Token, keyLoc.c, keyLoc.d, location, app, request, domain);
      await driverSearcher.search();
      ride2 = await Rides.findOne({ rider: rider2 });
      expect(String(ride2.driver)).to.equal(String(driver1._id));

      await createRequest(rider3Token, keyLoc.e, keyLoc.f, location, app, request, domain);
      await driverSearcher.search();
      ride3 = await Rides.findOne({ rider: rider3 });
      expect(String(ride3.driver)).to.equal(String(driver1._id));

      const threeMinAgo = new Date((new Date()).getTime() - 180000);
      await Routes.findOneAndUpdate({}, { $set: { lastUpdate: threeMinAgo } });
      await fixAndUpdateEtas(driver1._id);

      const rideDict = {};
      rideDict[String(ride1._id)] = 'Ride1';
      rideDict[String(ride2._id)] = 'Ride2';
      rideDict[String(ride3._id)] = 'Ride3';

      const route = await Routes.findOne({ driver: driver1._id, active: true });
      const rideIds = [ride1._id, ride2._id, ride3._id];
      const stopCount = [0, 0, 0];
      const counting = [false, false, false];
      let ride;
      let stop;
      for (let i = 0; i < 3; i += 1) {
        ride = String(rideIds[i]);
        for (let ii = 0; ii < route.stops.length; ii += 1) {
          stop = route.stops[ii];
          if (stop.stopType === 'pickup' && String(stop.ride) === ride) {
            counting[i] = true;
            // eslint-disable-next-line no-continue
            continue;
          }
          if (stop.stopType === 'dropoff' && String(stop.ride) === ride) {
            break;
          }

          if (counting[i]) {
            stopCount[i] += 1;
          }
        }
      }

      return expect(
        [
          stopCount[0] <= 2,
          stopCount[1] <= 2,
          stopCount[2] <= 2
        ]
      ).to.eql(
        [true, true, true]
      );
    });
    it('Should not have more than 2 stops within a ride even after a pickup', async () => {
      await createRequest(rider1Token, keyLoc.b, keyLoc.g, location, app, request, domain);
      await driverSearcher.search();
      ride1 = await Rides.findOne({ rider: rider1 });
      expect(String(ride1.driver)).to.equal(String(driver1._id));
      await pickUp(driver1Token, ride1, app, request, domain);

      await createRequest(rider2Token, keyLoc.c, keyLoc.d, location, app, request, domain);
      await driverSearcher.search();
      ride2 = await Rides.findOne({ rider: rider2 });
      expect(String(ride2.driver)).to.equal(String(driver1._id));

      await createRequest(rider3Token, keyLoc.e, keyLoc.f, location, app, request, domain);
      await driverSearcher.search();
      ride3 = await Rides.findOne({ rider: rider3 });
      expect(String(ride3.driver)).to.equal(String(driver1._id));

      const threeMinAgo = new Date((new Date()).getTime() - 180000);
      await Routes.findOneAndUpdate({}, { $set: { lastUpdate: threeMinAgo } });
      await fixAndUpdateEtas(driver1._id);

      const route = await Routes.findOne({ driver: driver1._id, active: true });
      const rideIds = [ride1._id, ride2._id, ride3._id];
      const stopCount = [0, 0, 0];
      const counting = [false, false, false];
      let ride;
      let stop;
      for (let i = 0; i < route.stops.length; i += 1) {
        stop = route.stops[i];
        for (let ii = 0; ii < 3; ii += 1) {
          ride = String(rideIds[ii]);
          if (stop.stopType === 'pickup' && String(stop.ride) === ride) {
            counting[ii] = true;
            // eslint-disable-next-line no-continue
            continue;
          } else if (stop.stopType === 'dropoff' && String(stop.ride) === ride) {
            counting[ii] = false;
          } else if (counting[ii] && (stop.stopType === 'pickup' || stop.stopType === 'dropoff')) {
            stopCount[ii] += 1;
          }
        }
      }

      return expect(
        [
          stopCount[0] <= 2,
          stopCount[1] <= 2,
          stopCount[2] <= 2
        ],
      ).to.eql(
        [true, true, true]
      );
    });
    it('Should not have more than 2 stops within a ride even after a pickup', async () => {
      await createRequest(rider1Token, keyLoc.b, keyLoc.g, location, app, request, domain);
      await driverSearcher.search();
      ride1 = await Rides.findOne({ rider: rider1 });
      expect(String(ride1.driver)).to.equal(String(driver1._id));
      await pickUp(driver1Token, ride1, app, request, domain);

      await createRequest(rider2Token, keyLoc.c, keyLoc.d, location, app, request, domain);
      await driverSearcher.search();
      ride2 = await Rides.findOne({ rider: rider2 });
      expect(String(ride2.driver)).to.equal(String(driver1._id));

      await createRequest(rider3Token, keyLoc.e, keyLoc.f, location, app, request, domain);
      await driverSearcher.search();
      ride3 = await Rides.findOne({ rider: rider3 });
      expect(String(ride3.driver)).to.equal(String(driver1._id));

      await createRequest(rider4Token, keyLoc.g, keyLoc.g, location, app, request, domain);
      await driverSearcher.search();
      ride4 = await Rides.findOne({ rider: rider4 });
      expect(String(ride4.driver)).to.equal(String(driver1._id));

      const threeMinAgo = new Date((new Date()).getTime() - 180000);
      await Routes.findOneAndUpdate({}, { $set: { lastUpdate: threeMinAgo } });
      await fixAndUpdateEtas(driver1._id);

      const route = await Routes.findOne({ driver: driver1._id, active: true });
      const rideIds = {};
      rideIds[`${ride1._id}`] = 'ride1';
      rideIds[`${ride2._id}`] = 'ride2';
      rideIds[`${ride3._id}`] = 'ride3';
      rideIds[`${ride4._id}`] = 'ride4';

      const stopCount = [0, 0, 0, 0];
      const counting = [false, false, false, false];
      let ride;
      let stop;
      for (let i = 0; i < route.stops.length; i += 1) {
        stop = route.stops[i];
        for (let ii = 0; ii < 4; ii += 1) {
          ride = Object.keys(rideIds)[ii];
          if (stop.stopType === 'pickup' && String(stop.ride) === ride) {
            counting[ii] = true;
            // eslint-disable-next-line no-continue
            continue;
          } else if (stop.stopType === 'dropoff' && String(stop.ride) === ride) {
            counting[ii] = false;
          } else if (counting[ii] && (stop.stopType === 'pickup' || stop.stopType === 'dropoff')) {
            stopCount[ii] += 1;
          }
        }
      }

      return expect(
        [
          stopCount[0],
          stopCount[1],
          stopCount[2],
          stopCount[3]
        ],
      ).to.eql(
        [2, 0, 0, 0]
      );
    });
  });
});
