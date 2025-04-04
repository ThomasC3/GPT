import { expect } from 'chai';
import request from 'supertest-promised';
import mongodb from '../services/mongodb';
import app from '../server';
import { domain } from '../config';
import {
  Settings, Rides, Routes, Drivers, Requests, FixedStops
} from '../models';
import { createScenarioLocation, listScenarioPoints } from './utils/location';
import { createScenarioRiders, createAnyStopRequest } from './utils/rider';
import {
  createScenarioDrivers, pickUp, dropOff, pickUpFs, dropOffFs
} from './utils/driver';
import { createWebsockets } from './utils/websockets';
import driverSearcher from '../services/driverSearch';

let location;
let points;
let riders;
let driver;
let fs1;
let fs2;
let fs3;
let fs4;

describe('Actions and fixed-stops before dropoff', () => {
  before(async () => {
    await mongodb.connection.dropDatabase();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
    location = await createScenarioLocation('Long Island', { fixedStopEnabled: true });
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

    // Create fixed-stops
    const fs1Data = { name: 'FS 1', lng: points[0][0], lat: points[0][1] };
    const fs2Data = { name: 'FS 2', lng: points[1][0], lat: points[1][1] };
    const fs3Data = { name: 'FS 3', lng: points[2][0], lat: points[2][1] };
    const fs4Data = { name: 'FS 4', lng: points[3][0], lat: points[3][1] };
    const [fixedstop1, fixedstop2, fixedstop3, fixedstop4] = await Promise.all([
      FixedStops.createFixedStop({ ...fs1Data, status: 1, location: location._id }),
      FixedStops.createFixedStop({ ...fs2Data, status: 1, location: location._id }),
      FixedStops.createFixedStop({ ...fs3Data, status: 1, location: location._id }),
      FixedStops.createFixedStop({ ...fs4Data, status: 1, location: location._id })
    ]);

    fs1 = {
      latitude: fixedstop1.latitude,
      longitude: fixedstop1.longitude,
      name: fixedstop1.name,
      address: fixedstop1.address,
      fixedStopId: fixedstop1._id
    };
    fs2 = {
      latitude: fixedstop2.latitude,
      longitude: fixedstop2.longitude,
      name: fixedstop2.name,
      address: fixedstop2.address,
      fixedStopId: fixedstop2._id
    };
    fs3 = {
      latitude: fixedstop3.latitude,
      longitude: fixedstop3.longitude,
      name: fixedstop3.name,
      address: fixedstop3.address,
      fixedStopId: fixedstop3._id
    };
    fs4 = {
      latitude: fixedstop4.latitude,
      longitude: fixedstop4.longitude,
      name: fixedstop4.name,
      address: fixedstop4.address,
      fixedStopId: fixedstop4._id
    };
  });
  beforeEach(async () => {
    await Drivers.updateMany({}, { $set: { driverRideList: [] } });
    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    await createAnyStopRequest(riders[0].riderToken, fs1, fs3, location, app, request, domain);
    await createAnyStopRequest(riders[1].riderToken, fs1, fs3, location, app, request, domain);
    await createAnyStopRequest(riders[2].riderToken, fs2, fs4, location, app, request, domain);
    await driverSearcher.search();
  });
  it('With individual pickup and dropoff actions', async () => {
    const sortedRideIds = (await Promise.all(
      riders.map(rider => Rides.findOne({ rider: rider.rider._id }))
    )).map(item => item._id);
    await pickUp(driver.driverToken, sortedRideIds[0], app, request, domain);
    await pickUp(driver.driverToken, sortedRideIds[1], app, request, domain);
    await pickUp(driver.driverToken, sortedRideIds[2], app, request, domain);
    await dropOff(driver.driverToken, sortedRideIds[1], app, request, domain);
    await dropOff(driver.driverToken, sortedRideIds[0], app, request, domain);
    await dropOff(driver.driverToken, sortedRideIds[2], app, request, domain);

    const sortedRideStops = (await Promise.all(
      riders.map(rider => Rides.findOne({ rider: rider.rider._id }))
    )).map(ride => [ride.stopsBeforeDropoff, ride.fixedStopsBeforeDropoff]);

    expect(sortedRideStops).to.eql([
      [3, 1],
      [1, 1],
      [2, 1]
    ]);
  });
  it('With bulk pickup and dropoff actions', async () => {
    await pickUpFs(driver.driverToken, fs1.fixedStopId, app, request, domain);
    await pickUpFs(driver.driverToken, fs2.fixedStopId, app, request, domain);
    await dropOffFs(driver.driverToken, fs3.fixedStopId, app, request, domain);
    await dropOffFs(driver.driverToken, fs4.fixedStopId, app, request, domain);

    const sortedRideStops = (await Promise.all(
      riders.map(rider => Rides.findOne({ rider: rider.rider._id }))
    )).map(ride => [ride.stopsBeforeDropoff, ride.fixedStopsBeforeDropoff]);

    // Stops [stopsBeforeDropoff, fixedStopsBeforeDropoff] for riders 1 and 2 may be:
    // - [3, 1] and [1, 1]
    // - [1, 1] and [3, 1]
    // - [2, 1] and [2, 1]
    // depending on pickup and dropoff order
    expect(sortedRideStops[0][0]).to.be.within(1, 3);
    expect(sortedRideStops[1][0]).to.be.within(1, 3);
    expect(sortedRideStops[0][1]).to.equal(1);
    expect(sortedRideStops[1][1]).to.equal(1);
    expect(sortedRideStops[2]).to.eql([2, 1]);
  });
});
