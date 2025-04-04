import { expect } from 'chai';
import request from 'supertest-promised';
import app from '../../server';
import { domain } from '../../config';
import { emptyAllCollections, emptyCollectionList } from '../utils/helper';
import { createScenarioLocation, listScenarioPoints } from '../utils/location';
import { createScenarioDrivers, hailRide } from '../utils/driver';
import {
  Settings, MatchingRules, Drivers, Requests, Rides
} from '../../models';
import { createRequest, createScenarioRiders } from '../utils/rider';
import { driverSearch } from '../../services';

describe('Hail Capacity Exceeded', () => {
  let location;
  let driver1;
  let driver2;
  let rider;
  let points;

  before(async () => {
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    // Create location
    location = await createScenarioLocation();
    points = listScenarioPoints();

    // Create two drivers
    await MatchingRules.create({
      key: 'shared',
      title: 'Shared',
      description: 'Designated for all requests across all zones'
    });
    ([driver1, driver2] = await createScenarioDrivers(2, { app, request, domain }, [{
      currentLocation: {
        coordinates: points[0],
        type: 'Point'
      },
      locations: [location._id]
    }, {
      currentLocation: {
        coordinates: points[0],
        type: 'Point'
      },
      locations: [location._id]
    }]));

    // Create one rider
    ([rider] = await createScenarioRiders(1, { app, request, domain }));
  });

  describe('Ride Request after hailed rides', () => {
    beforeEach(async () => {
      await emptyCollectionList(['Requests', 'Rides', 'Routes']);

      // Clean up driver queues and reset availability
      await Drivers.updateOne(
        { _id: driver1.driver._id }, { $set: { driverRideList: [], isAvailable: true } }
      );
      await Drivers.updateOne(
        { _id: driver2.driver._id }, { $set: { driverRideList: [], isAvailable: false } }
      );

      // Assign hailed rides
      await hailRide(driver1.driverToken, location, app, request, domain, false, 2);
      await hailRide(driver1.driverToken, location, app, request, domain, false, 2);
    });
    it('Should assign ride to driver when capacity allows it', async () => {
      // Request ride with one passenger
      await createRequest(
        rider.riderToken, points[0].slice().reverse(), points[1].slice().reverse(), location,
        app, request, domain
      );
      await driverSearch.search();

      const rideRequest = await Requests.findOne({ rider: rider.rider._id });
      const ride = await Rides.findOne({ rider: rider.rider._id });

      expect(rideRequest.status).to.equal(102);
      expect(`${ride.driver}`).to.equal(`${driver1.driver._id}`);
    });

    it('Should assign ride to other driver when capacity is exceeded', async () => {
      // Exceed capacity with 6 passengers in hailed rides
      await hailRide(driver1.driverToken, location, app, request, domain, false, 2);

      // Make both drivers available
      await Drivers.updateOne({ _id: driver2.driver._id }, { $set: { isAvailable: true } });

      // Request ride with one passenger
      await createRequest(
        rider.riderToken, points[0].slice().reverse(), points[1].slice().reverse(), location,
        app, request, domain
      );
      await driverSearch.search();

      const rideRequest = await Requests.findOne({ rider: rider.rider._id });
      const ride = await Rides.findOne({ rider: rider.rider._id });

      expect(rideRequest.status).to.equal(102);
      expect(`${ride.driver}`).to.equal(`${driver2.driver._id}`);
    });

    it('Should not assign ride to driver when capacity is exceeded', async () => {
      // Exceed capacity with 6 passengers in hailed rides
      await hailRide(driver1.driverToken, location, app, request, domain, false, 2);

      // Request ride with one passenger
      await createRequest(
        rider.riderToken, points[0].slice().reverse(), points[1].slice().reverse(), location,
        app, request, domain
      );
      await driverSearch.search();

      const rideRequest = await Requests.findOne({ rider: rider.rider._id });

      expect(rideRequest.status).to.equal(100);
      expect(rideRequest.searchRetries).to.equal(1);
    });
  });
});
