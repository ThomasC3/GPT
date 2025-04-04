import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import driverSearcher from '../../services/driverSearch';
import { createRequest, createRiderLogin } from '../utils/rider';
import { createDriverLogin } from '../utils/driver';
import {
  Locations, Requests, Drivers, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { lambda } from '../../services';


const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

const drivers = [];
let riders;
let location;

const DRIVER_COUNT = 10;
const RIDE_COUNT = 4;

const keyLoc = [
  [32.721130, -117.168315, 'Harbor breakfast'],
  [32.719783, -117.164770, 'Social security administration'],
  [32.716744, -117.161996, 'Civic center'],
  [32.721914, -117.162818, 'California western school of law'],
  [32.719813, -117.162639, 'Ace parking'],
  [32.720157, -117.166016, 'Extraordinary desserts'],
  [32.717816, -117.162872, 'SD civic theatre'],
  [32.718926, -117.162754, 'Medico dental building'],
  [32.717788, -117.159084, 'Donut bar'],
  [32.720397, -117.163794, 'Mixon Liquor & Deli'],
  [32.719873, -117.159256, 'Domino\'s pizza']
];

let rideIdx = 1;
const createRides = async (riderArray) => {
  let pick;
  let drop;
  for (let i = 0; i < riderArray.length; i += 1) {
    pick = keyLoc[rideIdx % 11];
    drop = keyLoc[(rideIdx + 1) % 11];
    // eslint-disable-next-line no-await-in-loop
    await createRequest(
      riderArray[i].riderToken, pick, drop, location, app, request, domain, false, 1
    );
    rideIdx += 1;
  }
  await driverSearcher.search();
};

describe('Pooling tsp options', () => {
  before(async () => {
    await emptyAllCollections();

    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      isADA: true,
      isUsingServiceTimes: false,
      isActive: true,
      poolingEnabled: true,
      serviceArea: [
        { latitude: 32.726775, longitude: -117.173429 },
        { latitude: 32.727389, longitude: -117.145137 },
        { latitude: 32.706067, longitude: -117.143322 },
        { latitude: 32.708991, longitude: -117.171079 },
        { latitude: 32.726775, longitude: -117.173429 }
      ]
    });

    const driverInfo = {
      // Leroy Merlin
      currentLocation: {
        coordinates: [keyLoc[0][1], keyLoc[0][0]],
        type: 'Point'
      },
      isOnline: false,
      isAvailable: false,
      locations: [location._id]
    };

    const riderPromises = [];
    for (let i = 0; i < DRIVER_COUNT * RIDE_COUNT + 1; i += 1) {
      riderPromises.push(createRiderLogin(
        { location: location._id, email: `rider${i + 1}@mail.com` },
        app, request, domain, io.connect(`http://localhost:${port}`, ioOptions)
      ));
    }
    riders = await Promise.all(riderPromises);

    let driver;
    for (let i = 0; i < DRIVER_COUNT; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      driver = await createDriverLogin(
        {
          ...driverInfo, email: `driver${i + 1}@mail.com`, isADA: false
        },
        app, request, domain, io.connect(`http://localhost:${port}`, ioOptions)
      );
      // eslint-disable-next-line no-await-in-loop
      await Drivers.updateMany({ _id: driver.driver._id }, { isOnline: true, isAvailable: true });
      // eslint-disable-next-line no-await-in-loop
      await createRides(riders.slice(i * RIDE_COUNT, (i + 1) * RIDE_COUNT));
      // eslint-disable-next-line no-await-in-loop
      await Drivers.updateMany({ _id: driver.driver._id }, { isOnline: false, isAvailable: false });
      // eslint-disable-next-line no-await-in-loop
      driver.driver = await Drivers.findOne({ _id: driver.driver._id });
      drivers.push(driver);
    }
  });

  describe('Run with and without distance TSP and compare', () => {
    before(async () => {
      await Drivers.syncIndexes();
      await Locations.syncIndexes();

      await Drivers.updateMany({}, { isOnline: true, isAvailable: true });
    });

    it('Should take longer with distance TSP than without', async () => {
      let driver;
      for (let i = 0; i < DRIVER_COUNT; i += 1) {
        driver = drivers[i];
        sinon.assert.match(driver.driver.driverRideList.length, RIDE_COUNT);
      }

      const { riderToken } = riders[riders.length - 1];
      await createRequest(
        riderToken, keyLoc[9], keyLoc[10], location, app, request, domain, false, 1
      );
      const reqs = await Requests.find({ rider: riders[riders.length - 1].rider._id });
      sinon.assert.match(reqs.length, 1);

      // Full Pooling run (dist TSP + time TSP)
      const startGo1 = process.hrtime();
      let result = await lambda.getBestDriver(reqs[0]._id);
      const endGo1 = process.hrtime(startGo1);
      const time1 = endGo1[0] + endGo1[1] * (10 ** -9);
      if (result.body) {
        result = JSON.parse(result.body);
      }
      const driverId = result.driver;
      const stops = result.plan;
      const chosenDriver = await Drivers.getDriver({ _id: driverId });

      sinon.assert.match(!!chosenDriver, true);
      sinon.assert.match(stops.length, (RIDE_COUNT + 1) * 3);

      await Settings.updateOne(
        {},
        {
          driverLimitSort: 'closest',
          initialDriverLimit: 10,
          skipDistanceTSP: true,
          finalDriverLimit: 5
        }
      );

      // Only time TSP pooling run
      const startGo2 = process.hrtime();
      result = await lambda.getBestDriver(reqs[0]._id);
      const endGo2 = process.hrtime(startGo2);
      const time2 = endGo2[0] + endGo2[1] * (10 ** -9);
      if (result.body) {
        result = JSON.parse(result.body);
      }
      const driverId2 = result.driver;
      const stops2 = result.plan;
      const chosenDriver2 = await Drivers.getDriver({ _id: driverId2 });

      sinon.assert.match(!!chosenDriver2, true);
      sinon.assert.match(stops2.length, (RIDE_COUNT + 1) * 3);

      return sinon.assert.match(time2 < time1, true);
    });
  });
});
