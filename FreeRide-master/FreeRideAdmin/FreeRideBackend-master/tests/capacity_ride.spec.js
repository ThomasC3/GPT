import sinon from 'sinon';
import request from 'supertest-promised';
import app from '../server';
import driverSearcher from '../services/driverSearch';
import { domain } from '../config';
import {
  Rides, Settings
} from '../models';
import mongodb from '../services/mongodb';
import { createScenarioLocation, listScenarioPoints } from './utils/location';
import { createWebsockets } from './utils/websockets';
import { createScenarioRiders, createRequest } from './utils/rider';
import { createScenarioDrivers } from './utils/driver';

let location;
let points;
let riders;
let driver;

describe('Non-pooling Capacity - Ride match limit', () => {
  before(async () => {
    await mongodb.connection.dropDatabase();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
    location = await createScenarioLocation('Long Island', { poolingEnabled: false });
    points = listScenarioPoints('Long Island');
    const riderSockets = createWebsockets(3).map(ws => ({ riderSocket: ws }));
    const [driverSocket] = createWebsockets(1);
    riders = await createScenarioRiders(3, { app, request, domain }, riderSockets);
    ([driver] = await createScenarioDrivers(
      1, { app, request, domain }, [{
        currentLocation: {
          coordinates: points[0],
          type: 'Point'
        },
        locations: [location._id],
        driverSocket
      }]
    ));
  });

  it('Should not assign driver 1 after 2 requests assigned', async () => {
    await createRequest(
      riders[0].riderToken, points[0].slice().reverse(), points[1].slice().reverse(),
      location, app, request, domain, false, 1
    );
    await driverSearcher.search();

    const ride1 = await Rides.findOne({ rider: riders[0].rider._id });
    sinon.assert.match(String(ride1.driver), String(driver.driver._id));

    await createRequest(
      riders[1].riderToken, points[0].slice().reverse(), points[1].slice().reverse(),
      location, app, request, domain, false, 1
    );
    await driverSearcher.search();

    const ride2 = await Rides.findOne({ rider: riders[1].rider._id });
    sinon.assert.match(String(ride2.driver), String(driver.driver._id));

    await createRequest(
      riders[2].riderToken, points[0].slice().reverse(), points[1].slice().reverse(),
      location, app, request, domain, false, 1
    );
    await driverSearcher.search();

    const ride3 = await Rides.findOne({ rider: riders[2].rider._id });
    return sinon.assert.match(ride3, null);
  });
});
