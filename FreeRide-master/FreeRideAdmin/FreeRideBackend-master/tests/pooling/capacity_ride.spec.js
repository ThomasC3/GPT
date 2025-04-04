import { expect } from 'chai';
import request from 'supertest-promised';
import mongodb from '../../services/mongodb';
import app from '../../server';
import { domain } from '../../config';
import {
  Settings, Rides, Routes, Drivers, Requests
} from '../../models';
import { createScenarioLocation, listScenarioPoints } from '../utils/location';
import { createScenarioRiders, createRequest } from '../utils/rider';
import { createScenarioDrivers } from '../utils/driver';
import { createWebsockets } from '../utils/websockets';
import driverSearcher from '../../services/driverSearch';

let location;
let points;
let driver;
let riders;

describe('Pooling Capacity - Ride match limit', () => {
  before(async () => {
    await mongodb.connection.dropDatabase();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
    location = await createScenarioLocation('Long Island');
    points = listScenarioPoints('Long Island');
    const riderSockets = createWebsockets(3).map(ws => ({ riderSocket: ws }));
    const [driverSocket] = createWebsockets(1);
    riders = await createScenarioRiders(6, { app, request, domain }, riderSockets);
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
  beforeEach(async () => {
    await Drivers.updateMany({}, { $set: { driverRideList: [] } });
    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();
    await Promise.all(riders.slice(1).map(
      rider => createRequest(
        rider.riderToken, points[0].slice().reverse(), points[1].slice().reverse(), location,
        app, request, domain
      )
    ));
    await driverSearcher.search();
  });
  it('should not match with driver with inconsistent route - 10 actions in route and 4 rides in driverRideList', async () => {
    const driverBefore = await Drivers.findOne({ _id: driver.driver._id });
    expect(driverBefore.driverRideList.length).to.equal(5);

    const driverAfter = await Drivers.findOneAndUpdate(
      { _id: driver.driver._id },
      { $pop: { driverRideList: 1 } },
      { new: true }
    );
    expect(driverAfter.driverRideList.length).to.equal(4);

    const route = await Routes.findOne({ driver: driver.driver._id, active: true });
    expect(route.stops.length).to.equal(15);
    expect(route.stops.filter(stop => stop.status === 'waiting').length).to.equal(10);

    const firstRiderRequests = await Requests.find({ rider: riders[0].rider._id });
    expect(firstRiderRequests.length).to.equal(0);

    await createRequest(
      riders[0].riderToken, points[0].slice().reverse(), points[1].slice().reverse(), location,
      app, request, domain
    );
    const rideRequestBefore = await Requests.findOne({ rider: riders[0].rider._id });
    expect(rideRequestBefore.status).to.equal(100);
    expect(rideRequestBefore.searchRetries).to.equal(0);

    await driverSearcher.search();
    const rideRequestAfter = await Requests.findOne({ rider: riders[0].rider._id });
    expect(rideRequestAfter.status).to.equal(100);
    expect(rideRequestAfter.searchRetries).to.equal(1);
  });
});
