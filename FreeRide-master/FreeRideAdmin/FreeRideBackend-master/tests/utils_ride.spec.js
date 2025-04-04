import { expect } from 'chai';
import request from 'supertest-promised';
import moment from 'moment';
import mongodb from '../services/mongodb';
import app from '../server';
import { domain } from '../config';
import {
  Settings, Rides, Routes, Drivers, Requests, FixedStops, Locations
} from '../models';
import {
  updateRideEta, updateRouteRide, getGoogleEta, fixRoute,
  applyStopAction, updateRouteOrClose, fixAndUpdateEtas,
  stopsBeforeDropoffCount, stopsBeforePickupCount
} from '../utils/ride';
import { createScenarioLocation, listScenarioPoints } from './utils/location';
import { createScenarioRiders, createAnyStopRequest } from './utils/rider';
import {
  createScenarioDrivers, hailRide, pickUp, dropOff
} from './utils/driver';
import { createWebsockets } from './utils/websockets';
import driverSearcher from '../services/driverSearch';

let location;
let points;
let riders;
let driver;
let fs1;
let fs2;

describe('Ride utils - pooling', () => {
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
    ([fs1, fs2] = await Promise.all([
      FixedStops.createFixedStop({ ...fs1Data, status: 1, location: location._id }),
      FixedStops.createFixedStop({ ...fs2Data, status: 1, location: location._id })
    ]));
  });
  beforeEach(async () => {
    await Drivers.updateMany({}, { $set: { driverRideList: [] } });
    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    const fixedstop1 = {
      latitude: fs1.latitude,
      longitude: fs1.longitude,
      name: fs1.name,
      address: fs1.address,
      fixedStopId: fs1._id
    };
    const fixedstop2 = {
      latitude: fs2.latitude,
      longitude: fs2.longitude,
      name: fs2.name,
      address: fs2.address,
      fixedStopId: fs2._id
    };
    await Promise.all(riders.slice(1).map(
      rider => createAnyStopRequest(
        rider.riderToken,
        fixedstop1, fixedstop2,
        location, app, request, domain
      )
    ));
    await Locations.findOneAndUpdate({ _id: location._id }, { $set: { fixedStopEnabled: false } });
    await createAnyStopRequest(
      riders[0].riderToken,
      { latitude: points[0][1], longitude: points[0][0] },
      { latitude: points[1][1], longitude: points[1][0] },
      location, app, request, domain
    );
    await Locations.findOneAndUpdate({ _id: location._id }, { $set: { fixedStopEnabled: true } });
    await driverSearcher.search();
  });
  it('updateRideEta - Updates both eta and dropoffEta', async () => {
    const ridesBefore = await Rides.find();
    const route = await Routes.findOneAndUpdate(
      {},
      {
        $inc: {
          'stops.3.cost': 120,
          'stops.4.cost': 120,
          'stops.5.cost': 120,
          'stops.6.cost': 120,
          'stops.7.cost': 120,
          'stops.8.cost': 120
        }
      },
      { new: true, upsert: false }
    );

    await updateRideEta(route.stops);
    const ridesAfter = await Promise.all([
      Rides.findOne({ _id: ridesBefore[0]._id }),
      Rides.findOne({ _id: ridesBefore[1]._id }),
      Rides.findOne({ _id: ridesBefore[2]._id })
    ]);

    expect(ridesAfter[0].eta).to.be.greaterThan(ridesBefore[0].eta);
    expect(ridesAfter[0].dropoffEta).to.be.greaterThan(ridesBefore[0].dropoffEta);
    expect(ridesAfter[1].eta).to.be.greaterThan(ridesBefore[1].eta);
    expect(ridesAfter[1].dropoffEta).to.be.greaterThan(ridesBefore[1].dropoffEta);
    expect(ridesAfter[2].eta).to.be.greaterThan(ridesBefore[2].eta);
    expect(ridesAfter[2].dropoffEta).to.be.greaterThan(ridesBefore[2].dropoffEta);
  });
  it('updateRouteRide - Cancels ride in route', async () => {
    const ride = await Rides.findOne({});

    await updateRouteRide(ride, 'cancel');

    const route = await Routes.findOne({});
    const cancelledRideStops = route.stops.filter(stop => `${stop.ride}` === `${ride._id}`);

    expect(cancelledRideStops[0].status).to.equal('cancelled');
    expect(cancelledRideStops[1].status).to.equal('cancelled');
  });
  it('updateRouteRide - Picks up and drops off ride in route', async () => {
    const ride = await Rides.findOne({});

    await updateRouteRide(ride, 'pickup');
    let route = await Routes.findOne({});
    const pickedUpRideStop = route.stops.find(stop => `${stop.ride}` === `${ride._id}` && stop.stopType === 'pickup');
    const notDroppedOffRideStop = route.stops.find(stop => `${stop.ride}` === `${ride._id}` && stop.stopType === 'dropoff');
    expect(pickedUpRideStop.status).to.equal('done');
    expect(notDroppedOffRideStop.status).to.equal('waiting');

    await updateRouteRide(ride, 'dropoff');
    route = await Routes.findOne({});
    const droppedOffRideStop = route.stops.find(stop => `${stop.ride}` === `${ride._id}` && stop.stopType === 'dropoff');
    expect(droppedOffRideStop.status).to.equal('done');
  });
  it('getGoogleEta - gets correct mocked value', async () => {
    const googleETA = await getGoogleEta(points[0][0], points[0][1]);
    expect(googleETA * 60).to.equal(120);
  });
  it('fixRoute - fixes completed ride in out-of-sync route', async () => {
    const driverBefore = await Drivers.findOne();
    expect(driverBefore.driverRideList).to.be.lengthOf(3);

    const ride = await Rides.findOneAndUpdate({}, { $set: { status: 700 } }, { new: true });
    let route = await Routes.findOne({});

    const rideStops = route.stops.filter(stop => `${stop.ride}` === `${ride._id}`);
    expect(rideStops[0].status).to.equal('waiting');
    expect(rideStops[1].status).to.equal('waiting');

    await fixRoute(ride.driver);

    route = await Routes.findOne({});
    const completedRideStops = route.stops.filter(stop => `${stop.ride}` === `${ride._id}`);
    expect(completedRideStops[0].status).to.equal('done');
    expect(completedRideStops[1].status).to.equal('done');

    const driverAfter = await Drivers.findOne();
    expect(driverAfter.driverRideList).to.be.lengthOf(2);
  });
  it('fixRoute - fixes cancelled ride in out-of-sync route', async () => {
    const driverBefore = await Drivers.findOne();
    expect(driverBefore.driverRideList).to.be.lengthOf(3);

    const ride = await Rides.findOneAndUpdate({}, { $set: { status: 207 } }, { new: true });
    let route = await Routes.findOne({});

    const rideStops = route.stops.filter(stop => `${stop.ride}` === `${ride._id}`);
    expect(rideStops[0].status).to.equal('waiting');
    expect(rideStops[1].status).to.equal('waiting');

    await fixRoute(ride.driver);

    route = await Routes.findOne({});
    const cancelledRideStops = route.stops.filter(stop => `${stop.ride}` === `${ride._id}`);
    expect(cancelledRideStops[0].status).to.equal('cancelled');
    expect(cancelledRideStops[1].status).to.equal('cancelled');

    const driverAfter = await Drivers.findOne();
    expect(driverAfter.driverRideList).to.be.lengthOf(2);
  });
  it('fixRoute - adds rides back to out-of-sync driver', async () => {
    await hailRide(driver.driverToken, location, app, request, domain);

    const driverBefore = await Drivers.findOne();
    expect(driverBefore.driverRideList).to.be.lengthOf(4);
    const driverRideListBefore = driverBefore.toJSON().driverRideList.map(ride => ({ ...ride, rideId: `${ride.rideId}` }));

    await Drivers.findOneAndUpdate({ _id: driver.driver._id }, { $set: { driverRideList: [] } });
    const driverNoRides = await Drivers.findOne();
    expect(driverNoRides.driverRideList).to.be.lengthOf(0);

    await fixRoute(driver.driver._id);

    const driverRouteFixed = await Drivers.findOne();
    const driverRideListAfter = driverRouteFixed.toJSON().driverRideList.map(ride => ({ ...ride, rideId: `${ride.rideId}` }));
    expect(driverRideListBefore).to.be.eql(driverRideListAfter);
  });

  it('applyStopAction - applies the pickup, dropoff and cancel actions to a route', async () => {
    const driverWithRides = await Drivers.findOne();
    expect(driverWithRides.driverRideList).to.be.lengthOf(3);
    const route = await Routes.findOne({ driver: driver.driver._id, active: true });
    const ride1 = await Rides.findOne({ _id: driverWithRides.driverRideList[0].rideId });
    const ride2 = await Rides.findOne({ _id: driverWithRides.driverRideList[1].rideId });
    const ride3 = await Rides.findOne({ _id: driverWithRides.driverRideList[2].rideId });

    const { newStops: stopsAfterPickup, routeChangedCheck: rc1, outOfSequence: oos1 } = applyStopAction(route, ride1, 'pickup');
    expect(stopsAfterPickup.find(stop => `${stop.ride}` === `${ride1._id}` && stop.stopType === 'pickup').status).to.equal('done');
    expect(stopsAfterPickup.find(stop => `${stop.ride}` === `${ride1._id}` && stop.stopType === 'dropoff').status).to.equal('waiting');
    expect(`${stopsAfterPickup[3].ride}`).to.equal(`${ride1._id}`);
    expect(rc1).to.equal(true);
    expect(oos1).to.equal(false);
    route.stops = stopsAfterPickup;

    const { routeChangedCheck: rc1b, outOfSequence: oos1b } = applyStopAction(route, ride1, 'pickup');
    expect(rc1b).to.equal(false);
    expect(oos1b).to.equal(false);

    const { newStops: stopsAfterDropoff, routeChangedCheck: rc2, outOfSequence: oos2 } = applyStopAction(route, ride1, 'dropoff');
    expect(stopsAfterDropoff.find(stop => `${stop.ride}` === `${ride1._id}` && stop.stopType === 'pickup').status).to.equal('done');
    expect(stopsAfterDropoff.find(stop => `${stop.ride}` === `${ride1._id}` && stop.stopType === 'dropoff').status).to.equal('done');
    expect(rc2).to.equal(true);
    expect(oos2).to.equal(false);
    route.stops = stopsAfterDropoff;

    const { newStops: stopsAfterCancel, routeChangedCheck: rc3, outOfSequence: oos3 } = applyStopAction(route, ride3, 'cancel');
    expect(stopsAfterCancel.find(stop => `${stop.ride}` === `${ride3._id}` && stop.stopType === 'pickup').status).to.equal('cancelled');
    expect(stopsAfterCancel.find(stop => `${stop.ride}` === `${ride3._id}` && stop.stopType === 'dropoff').status).to.equal('cancelled');
    expect(rc3).to.equal(true);
    expect(oos3).to.equal(true);
    route.stops = stopsAfterCancel;

    expect(stopsAfterCancel.find(stop => `${stop.ride}` === `${ride2._id}` && stop.stopType === 'pickup').status).to.equal('waiting');
    expect(stopsAfterCancel.find(stop => `${stop.ride}` === `${ride2._id}` && stop.stopType === 'dropoff').status).to.equal('waiting');
  });

  it('updateRouteOrClose - updates route and closes after it is finished', async () => {
    const driverWithRides = await Drivers.findOne();
    expect(driverWithRides.driverRideList).to.be.lengthOf(3);
    const route = await Routes.findOne({ driver: driver.driver._id, active: true });
    const ride1 = await Rides.findOne({ _id: driverWithRides.driverRideList[0].rideId });
    const ride2 = await Rides.findOne({ _id: driverWithRides.driverRideList[1].rideId });
    const ride3 = await Rides.findOne({ _id: driverWithRides.driverRideList[2].rideId });

    // Pickup
    const { newStops: stopsAfterPickup } = applyStopAction(route, ride1, 'pickup');
    route.stops = stopsAfterPickup;

    // Dropoff
    const { newStops: stopsAfterDropoff } = applyStopAction(route, ride1, 'dropoff');
    route.stops = stopsAfterDropoff;

    // Cancel
    const { newStops: stopsAfterCancel } = applyStopAction(route, ride3, 'cancel');
    route.stops = stopsAfterCancel;

    const routeBefore = await Routes.findOne({ _id: route._id });
    await updateRouteOrClose(route);
    const routeAfter = await Routes.findOne({ _id: route._id });
    expect(routeBefore.stops.filter(stop => stop.status === 'waiting').length).to.equal(6);
    expect(routeAfter.stops.filter(stop => stop.status === 'waiting').length).to.equal(2);

    // Pickup
    const { newStops: stopsAfterRide2Pickup } = applyStopAction(route, ride2, 'pickup');
    route.stops = stopsAfterRide2Pickup;

    // Dropoff
    const { newStops: stopsAfterRide2Dropoff } = applyStopAction(route, ride2, 'dropoff');
    route.stops = stopsAfterRide2Dropoff;

    const routeBeforeClosing = await Routes.findOne({ _id: route._id });
    await updateRouteOrClose(route);
    const routeAfterClosing = await Routes.findOne({ _id: route._id });
    expect(routeBeforeClosing.stops.filter(stop => stop.status === 'waiting').length).to.equal(2);
    expect(routeAfterClosing.stops.filter(stop => stop.status === 'waiting').length).to.equal(0);
  });

  it('fixAndUpdateEtas - fixes route', async () => {
    const driverWithRides = await Drivers.findOne();
    expect(driverWithRides.driverRideList).to.be.lengthOf(3);
    const ride1 = await Rides.findOneAndUpdate(
      { _id: driverWithRides.driverRideList[0].rideId }, { $set: { status: 700 } }
    );

    const currentRoute = await Routes.findOne({ driver: driver.driver._id, active: true });
    expect(currentRoute.stops.find(stop => `${stop.ride}` === `${ride1._id}` && stop.stopType === 'pickup').status).to.equal('waiting');
    expect(currentRoute.stops.find(stop => `${stop.ride}` === `${ride1._id}` && stop.stopType === 'dropoff').status).to.equal('waiting');

    await fixAndUpdateEtas(driver.driver._id);
    const fixedRoute = await Routes.findOne({ _id: currentRoute._id });
    expect(fixedRoute.stops.find(stop => `${stop.ride}` === `${ride1._id}` && stop.stopType === 'pickup').status).to.equal('done');
    expect(fixedRoute.stops.find(stop => `${stop.ride}` === `${ride1._id}` && stop.stopType === 'dropoff').status).to.equal('done');
  });

  it('fixAndUpdateEtas - re-organizes route', async () => {
    const driverWithRides = await Drivers.findOne();
    expect(driverWithRides.driverRideList).to.be.lengthOf(3);
    await Rides.findOneAndUpdate(
      { _id: driverWithRides.driverRideList[0].rideId }, { $set: { status: 700 } }
    );
    await Rides.findOneAndUpdate(
      { _id: driverWithRides.driverRideList[2].rideId }, { $set: { status: 700 } }
    );
    const ride2 = driverWithRides.driverRideList[1].rideId;

    const currentRoute = await Routes.findOne({ driver: driver.driver._id, active: true });
    expect(currentRoute.stops.findIndex(stop => `${stop.ride}` === `${ride2}` && stop.stopType === 'pickup')).not.to.equal(currentRoute.stops.length - 2);
    expect(currentRoute.stops.findIndex(stop => `${stop.ride}` === `${ride2}` && stop.stopType === 'dropoff')).not.to.equal(currentRoute.stops.length - 1);

    await Routes.findOneAndUpdate(
      { driver: driver.driver._id, active: true },
      {
        $set: {
          lastUpdate: moment(currentRoute.lastUpdate).subtract(5, 'm').toDate()
        }
      },
      { $new: true }
    );
    await fixAndUpdateEtas(driver.driver._id);
    const fixedRoute = await Routes.findOne({ driver: driver.driver._id, active: true });
    expect(fixedRoute.stops.findIndex(stop => `${stop.ride}` === `${ride2}` && stop.stopType === 'pickup')).to.equal(fixedRoute.stops.length - 2);
    expect(fixedRoute.stops.findIndex(stop => `${stop.ride}` === `${ride2}` && stop.stopType === 'dropoff')).to.equal(fixedRoute.stops.length - 1);
  });

  it('fixAndUpdateEtas - closes route', async () => {
    const driverWithRides = await Drivers.findOne();
    expect(driverWithRides.driverRideList).to.be.lengthOf(3);
    await Rides.findOneAndUpdate(
      { _id: driverWithRides.driverRideList[0].rideId }, { $set: { status: 700 } }
    );
    await Rides.findOneAndUpdate(
      { _id: driverWithRides.driverRideList[1].rideId }, { $set: { status: 700 } }
    );
    await Rides.findOneAndUpdate(
      { _id: driverWithRides.driverRideList[2].rideId }, { $set: { status: 700 } }
    );

    const currentRoute = await Routes.findOne({ driver: driver.driver._id, active: true });
    expect(currentRoute.stops.length).to.equal(9);
    expect(currentRoute.stops.filter(stop => stop.status === 'waiting').length).to.equal(6);
    expect(currentRoute.active).to.equal(true);

    await fixAndUpdateEtas(driver.driver._id);
    const closedRoute = await Routes.findOne({ _id: currentRoute._id });
    expect(closedRoute.stops.length).to.equal(9);
    expect(closedRoute.stops.filter(stop => stop.status === 'waiting').length).to.equal(0);
    expect(closedRoute.active).to.equal(false);
  });

  it('stopsBeforeDropoffCount / stopsBeforePickupCount - correctly for rides with mixed stop types', async () => {
    const driverWithRides = await Drivers.findOne();
    expect(driverWithRides.driverRideList).to.be.lengthOf(3);
    const [ride1, ride2, ride3] = driverWithRides.driverRideList.map(ride => ride.rideId);

    const currentRoute = await Routes.findOne({ driver: driverWithRides._id, active: true });
    const routeData = currentRoute.stops
      .filter(stop => stop.stopType !== 'current_location')
      .map(stop => [`${stop.ride}`, stop.stopType, `${stop.fixedStopId}`]);

    const expectedRouteData = [
      [`${ride1}`, 'pickup', `${fs1._id}`],
      [`${ride2}`, 'pickup', `${fs1._id}`],
      [`${ride3}`, 'pickup', 'undefined'],
      [`${ride1}`, 'dropoff', `${fs2._id}`],
      [`${ride2}`, 'dropoff', `${fs2._id}`],
      [`${ride3}`, 'dropoff', 'undefined']
    ];
    expect(routeData).to.eql(expectedRouteData);

    expect(await stopsBeforeDropoffCount(ride1)).to.eql({ actionCount: 2, stopCount: 1 });
    expect(await stopsBeforeDropoffCount(ride2)).to.eql({ actionCount: 2, stopCount: 1 });
    expect(await stopsBeforeDropoffCount(ride3)).to.eql({ actionCount: 2, stopCount: 1 });

    expect(await stopsBeforePickupCount(ride1)).to.eql({ actionCount: 0, stopCount: 0 });
    expect(await stopsBeforePickupCount(ride2)).to.eql({ actionCount: 1, stopCount: 0 });
    expect(await stopsBeforePickupCount(ride3)).to.eql({ actionCount: 2, stopCount: 1 });

    await pickUp(driver.driverToken, { _id: ride1 }, app, request, domain);
    await pickUp(driver.driverToken, { _id: ride2 }, app, request, domain);
    await pickUp(driver.driverToken, { _id: ride3 }, app, request, domain);

    await dropOff(driver.driverToken, { _id: ride1 }, app, request, domain);
    await dropOff(driver.driverToken, { _id: ride2 }, app, request, domain);
    await dropOff(driver.driverToken, { _id: ride3 }, app, request, domain);

    expect(await stopsBeforeDropoffCount(ride1)).to.eql({ actionCount: 2, stopCount: 1 });
    expect(await stopsBeforeDropoffCount(ride2)).to.eql({ actionCount: 2, stopCount: 1 });
    expect(await stopsBeforeDropoffCount(ride3)).to.eql({ actionCount: 2, stopCount: 1 });

    expect(await stopsBeforePickupCount(ride1)).to.eql({ actionCount: 0, stopCount: 0 });
    expect(await stopsBeforePickupCount(ride2)).to.eql({ actionCount: 1, stopCount: 0 });
    expect(await stopsBeforePickupCount(ride3)).to.eql({ actionCount: 2, stopCount: 1 });

    const rides = await Rides.find({ _id: { $in: [ride1, ride2, ride3] } });

    expect(
      rides.map(ride => (
        {
          stopsBeforeDropoff: ride.stopsBeforeDropoff,
          fixedStopsBeforeDropoff: ride.fixedStopsBeforeDropoff,
          poolingLocation: ride.poolingLocation
        }
      ))
    ).eql([
      { stopsBeforeDropoff: 2, fixedStopsBeforeDropoff: 1, poolingLocation: true },
      { stopsBeforeDropoff: 2, fixedStopsBeforeDropoff: 1, poolingLocation: true },
      { stopsBeforeDropoff: 2, fixedStopsBeforeDropoff: 1, poolingLocation: true }
    ]);
  });
});
describe('Ride utils - without pooling', () => {
  before(async () => {
    await mongodb.connection.dropDatabase();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
    location = await createScenarioLocation('Long Island', { fixedStopEnabled: true, poolingEnabled: false });
    points = listScenarioPoints('Long Island');
    const riderSockets = createWebsockets(2).map(ws => ({ riderSocket: ws }));
    const [driverSocket] = createWebsockets(1);
    riders = await createScenarioRiders(2, { app, request, domain }, riderSockets);
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
    ([fs1, fs2] = await Promise.all([
      FixedStops.createFixedStop({ ...fs1Data, status: 1, location: location._id }),
      FixedStops.createFixedStop({ ...fs2Data, status: 1, location: location._id })
    ]));
  });
  beforeEach(async () => {
    await Drivers.updateMany({}, { $set: { driverRideList: [] } });
    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    const fixedstop1 = {
      latitude: fs1.latitude,
      longitude: fs1.longitude,
      name: fs1.name,
      address: fs1.address,
      fixedStopId: fs1._id
    };
    const fixedstop2 = {
      latitude: fs2.latitude,
      longitude: fs2.longitude,
      name: fs2.name,
      address: fs2.address,
      fixedStopId: fs2._id
    };
    await createAnyStopRequest(
      riders[0].riderToken,
      fixedstop1, fixedstop2,
      location, app, request, domain
    );
    await Locations.findOneAndUpdate({ _id: location._id }, { $set: { fixedStopEnabled: false } });
    await createAnyStopRequest(
      riders[1].riderToken,
      { latitude: points[0][1], longitude: points[0][0] },
      { latitude: points[1][1], longitude: points[1][0] },
      location, app, request, domain
    );
    await Locations.findOneAndUpdate({ _id: location._id }, { $set: { fixedStopEnabled: true } });
    await driverSearcher.search();
  });
  it('stopsBeforeDropoffCount / stopsBeforePickupCount - non-pooling counts stops correctly for rides with mixed stop types', async () => {
    await Routes.deleteMany();
    const driverWithRides = await Drivers.findOne();
    expect(driverWithRides.driverRideList).to.be.lengthOf(2);
    const [ride1, ride2] = driverWithRides.driverRideList.map(ride => ride.rideId);


    expect(await stopsBeforeDropoffCount(ride1)).to.eql({ actionCount: 0, stopCount: 0 });
    expect(await stopsBeforeDropoffCount(ride2)).to.eql({ actionCount: 0, stopCount: 0 });

    expect(await stopsBeforePickupCount(ride1)).to.eql({ actionCount: 0, stopCount: 0 });
    expect(await stopsBeforePickupCount(ride2)).to.eql({ actionCount: 2, stopCount: 2 });

    await pickUp(driver.driverToken, { _id: ride1 }, app, request, domain);

    expect(await stopsBeforePickupCount(ride2)).to.eql({ actionCount: 1, stopCount: 1 });

    await dropOff(driver.driverToken, { _id: ride1 }, app, request, domain);
    await pickUp(driver.driverToken, { _id: ride2 }, app, request, domain);
    await dropOff(driver.driverToken, { _id: ride2 }, app, request, domain);

    expect(await stopsBeforeDropoffCount(ride1)).to.eql({ actionCount: 0, stopCount: 0 });
    expect(await stopsBeforeDropoffCount(ride2)).to.eql({ actionCount: 0, stopCount: 0 });

    expect(await stopsBeforePickupCount(ride1)).to.eql({ actionCount: 0, stopCount: 0 });
    expect(await stopsBeforePickupCount(ride2)).to.eql({ actionCount: 0, stopCount: 0 });

    const rides = await Rides.find({ _id: { $in: [ride1, ride2] } });

    expect(
      rides.map(ride => (
        {
          stopsBeforeDropoff: ride.stopsBeforeDropoff,
          fixedStopsBeforeDropoff: ride.fixedStopsBeforeDropoff,
          poolingLocation: ride.poolingLocation
        }
      ))
    ).eql([
      { stopsBeforeDropoff: 0, fixedStopsBeforeDropoff: 0, poolingLocation: false },
      { stopsBeforeDropoff: 0, fixedStopsBeforeDropoff: 0, poolingLocation: false }
    ]);
  });
});
