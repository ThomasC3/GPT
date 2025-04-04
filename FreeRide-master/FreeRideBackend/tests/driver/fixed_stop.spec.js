import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import moment from 'moment-timezone';
import app from '../../server';
import { port, domain } from '../../config';
import { createRiderLogin, createFsRequest, createRequest } from '../utils/rider';
import {
  driverEndpoint, hailRide,
  createDriverLogin, pickUpFs,
  dropOffFs, pickUp, dropOff,
  driverCancelFs, driverArrivedFs
} from '../utils/driver';
import {
  Drivers, Requests, Rides,
  Locations, FixedStops,
  Routes, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import driverSearcher from '../../services/driverSearch';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let sandbox;
let location;
const riders = [];
let driver;
let fixedStops;

const keyLoc = {
  fs8: { lat: 40.6810937, lng: -73.9078617 },
  fs4: { lat: 40.6851291, lng: -73.9148140 },
  fs6: { lat: 40.6883182, lng: -73.9203072 },
  fs7: { lat: 40.6915723, lng: -73.9258862 },
  fs3: { lat: 40.6944357, lng: -73.9307785 },
  fs2: { lat: 40.6964530, lng: -73.9346409 },
  fs5: { lat: 40.6987957, lng: -73.9385891 },
  fs1: { lat: 40.7003574, lng: -73.9414215 }
};

describe('Fixed stop actions for Driver', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    const driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    const rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    const rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    const rider3Socket = io.connect(`http://localhost:${port}`, ioOptions);
    const rider4Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();

    location = await Locations.createLocation({
      name: 'Location',
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      fixedStopEnabled: true,
      poolingEnabled: true,
      serviceArea: [
        {
          longitude: -73.978573,
          latitude: 40.721239
        },
        {
          longitude: -73.882936,
          latitude: 40.698337
        },
        {
          longitude: -73.918642,
          latitude: 40.629585
        },
        {
          longitude: -73.978573,
          latitude: 40.660845
        },
        {
          longitude: -73.978573,
          latitude: 40.721239
        }
      ]
    });

    const fixedStopData = {
      status: 1,
      businessName: 'Coca-cola',
      address: 'Here',
      location: location._id
    };

    const promises = [];
    let key;
    for (let i = 0; i < Object.keys(keyLoc).length; i += 1) {
      key = Object.keys(keyLoc)[i];
      promises.push(FixedStops.createFixedStop(
        { name: key, ...keyLoc[key], ...fixedStopData }
      ));
    }
    fixedStops = await Promise.all(promises);

    riders.push(await createRiderLogin({ email: 'rider1@mail.com', password: 'Password1' }, app, request, domain, rider1Socket));
    riders.push(await createRiderLogin({ email: 'rider2@mail.com', password: 'Password2' }, app, request, domain, rider2Socket));
    riders.push(await createRiderLogin({ email: 'rider3@mail.com', password: 'Password3' }, app, request, domain, rider3Socket));
    riders.push(await createRiderLogin({ email: 'rider4@mail.com', password: 'Password4' }, app, request, domain, rider4Socket));

    driver = await createDriverLogin({
      currentLocation: {
        coordinates: [keyLoc.fs8.lng, keyLoc.fs8.lat],
        type: 'Point'
      },
      locations: [location._id],
      email: 'driver1@mail.com',
      password: 'Password1',
      isOnline: true
    }, app, request, domain, driverSocket, { attachSharedVehicle: false });
    driver.driverSocket = driverSocket;
  });

  before(async () => {
    sandbox.restore();
    await FixedStops.syncIndexes();
  });

  beforeEach(async () => {
    sandbox.restore();
    location.concurrentRideLimit = 3;
    location.fixedStopEnabled = true;
    location.poolingEnabled = true;
    location = await location.save();
    await Settings.deleteMany();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
    await Drivers.updateOne({ _id: driver.driver._id }, { $set: { driverRideList: [] } });
    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    await Drivers.syncIndexes();
    await Locations.syncIndexes();
  });

  describe('Fixed stops with pooling', () => {
    it('Should create a route for all riders with dropoffs before pickups', async () => {
      const [fsA, fsB, fsC] = fixedStops.slice(0, 3);

      await createFsRequest(riders[0].riderToken, fsB.id, fsC.id, location, app, request, domain);
      await driverSearcher.search();
      await createFsRequest(riders[1].riderToken, fsB.id, fsC.id, location, app, request, domain);
      await driverSearcher.search();
      await createFsRequest(riders[2].riderToken, fsB.id, fsC.id, location, app, request, domain);
      await driverSearcher.search();
      await createFsRequest(riders[3].riderToken, fsA.id, fsB.id, location, app, request, domain);
      await driverSearcher.search();

      const { body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain);

      const etas = Array.from(new Set(actionList.map(item => item.eta.split('T')[0])));
      sinon.assert.match(etas.length, 1);
      sinon.assert.match(etas[0], moment.utc().format('YYYY-MM-DD'));

      sinon.assert.match(`${actionList[0].fixedStopId}`, `${fsA._id}`);
      sinon.assert.match(`${actionList[1].fixedStopId}`, `${fsB._id}`);
      sinon.assert.match(`${actionList[2].fixedStopId}`, `${fsB._id}`);
      sinon.assert.match(`${actionList[3].fixedStopId}`, `${fsB._id}`);
      sinon.assert.match(`${actionList[4].fixedStopId}`, `${fsB._id}`);

      sinon.assert.match(`${actionList[0].fixedStopId}`, `${fsA._id}`);
      sinon.assert.match(`${actionList[1].fixedStopId}`, `${fsB._id}`);
      sinon.assert.match(`${actionList[2].fixedStopId}`, `${fsB._id}`);
      sinon.assert.match(`${actionList[3].fixedStopId}`, `${fsB._id}`);
      sinon.assert.match(`${actionList[4].fixedStopId}`, `${fsB._id}`);
      return sinon.assert.match(`${actionList[5].fixedStopId}`, `${fsC._id}`);
    });
    it('Should create a route for 4 riders with stop limit of 2 within ride', async () => {
      const [fsA, fsB, fsC, fsD, fsE] = fixedStops.slice(0, 5);

      await createFsRequest(riders[0].riderToken, fsA.id, fsE.id, location, app, request, domain);
      await driverSearcher.search();
      await createFsRequest(riders[1].riderToken, fsA.id, fsB.id, location, app, request, domain);
      await driverSearcher.search();
      await createFsRequest(riders[2].riderToken, fsB.id, fsC.id, location, app, request, domain);
      await driverSearcher.search();
      await createFsRequest(riders[3].riderToken, fsC.id, fsD.id, location, app, request, domain);
      await driverSearcher.search();

      const promises = await Promise.all([
        Rides.findOne({ rider: riders[0].rider._id }),
        Rides.findOne({ rider: riders[1].rider._id }),
        Rides.findOne({ rider: riders[2].rider._id }),
        Rides.findOne({ rider: riders[3].rider._id })
      ]);
      sinon.assert.match(!!promises[0], true);
      sinon.assert.match(!!promises[1], true);
      sinon.assert.match(!!promises[2], true);
      sinon.assert.match(!!promises[3], true);

      const { body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain);

      const result = actionList.map(item => [`${item.fixedStopId}`, item.stopType, `${item.id}`, item.current, item.fixedStopName]);

      const spy = sinon.spy();
      spy([
        [`${fsA._id}`, 'pickup', `${promises[0]._id}`, true, 'fs8'],
        [`${fsA._id}`, 'pickup', `${promises[1]._id}`, false, 'fs8'],
        [`${fsB._id}`, 'dropoff', `${promises[1]._id}`, false, 'fs4'],
        [`${fsB._id}`, 'pickup', `${promises[2]._id}`, false, 'fs4'],
        [`${fsC._id}`, 'dropoff', `${promises[2]._id}`, false, 'fs6'],
        [`${fsC._id}`, 'pickup', `${promises[3]._id}`, false, 'fs6'],
        [`${fsE._id}`, 'dropoff', `${promises[0]._id}`, false, 'fs3'],
        [`${fsD._id}`, 'dropoff', `${promises[3]._id}`, false, 'fs7']
      ]);
      return sinon.assert.calledWith(spy, sinon.match.array.deepEquals(result));
    });
    it('Should have both hailed and fixed stop rides', async () => {
      const [fsA, fsB, fsC] = fixedStops.slice(0, 3);

      await hailRide(driver.driverToken, location, app, request, domain);

      await createFsRequest(riders[0].riderToken, fsA.id, fsB.id, location, app, request, domain);
      await driverSearcher.search();
      await createFsRequest(riders[1].riderToken, fsB.id, fsC.id, location, app, request, domain);
      await driverSearcher.search();

      const promises = await Promise.all([
        Rides.findOne({ rider: null }),
        Rides.findOne({ rider: riders[0].rider._id }),
        Rides.findOne({ rider: riders[1].rider._id })
      ]);
      sinon.assert.match(!!promises[0], true);
      sinon.assert.match(!!promises[1], true);

      const { body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain);

      const result = actionList.map(item => [item.stopType, `${item.id}`, item.hailed, item.current, `${item.fixedStopName}`]);

      const spy = sinon.spy();
      spy([
        ['dropoff', `${promises[0]._id}`, true, false, 'undefined'],
        ['pickup', `${promises[1]._id}`, false, true, 'fs8'],
        ['dropoff', `${promises[1]._id}`, false, false, 'fs4'],
        ['pickup', `${promises[2]._id}`, false, false, 'fs4'],
        ['dropoff', `${promises[2]._id}`, false, false, 'fs6']
      ]);
      return sinon.assert.calledWith(spy, sinon.match.array.deepEquals(result));
    });
    it('Should have hailed, fixed stop and normal rides', async () => {
      const [fsA, fsB, fsC] = fixedStops.slice(0, 3);

      await hailRide(driver.driverToken, location, app, request, domain);

      await createFsRequest(riders[0].riderToken, fsA.id, fsC.id, location, app, request, domain);
      await driverSearcher.search();

      location.fixedStopEnabled = false;
      location = await location.save();

      await createRequest(riders[1].riderToken, [fsB.latitude, fsB.longitude, 'B'], [fsC.latitude, fsC.longitude, 'C'], location, app, request, domain);
      await driverSearcher.search();

      const promises = await Promise.all([
        Rides.findOne({ rider: null }),
        Rides.findOne({ rider: riders[0].rider._id }),
        Rides.findOne({ rider: riders[1].rider._id })
      ]);
      sinon.assert.match(!!promises[0], true);
      sinon.assert.match(!!promises[1], true);

      const { body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain);

      const result = actionList.map(item => [`${item.fixedStopId}`, item.stopType, `${item.id}`, item.hailed, item.current]);

      const spy = sinon.spy();
      spy([
        ['undefined', 'dropoff', `${promises[0]._id}`, true, false],
        [`${fsA._id}`, 'pickup', `${promises[1]._id}`, false, true],
        ['undefined', 'pickup', `${promises[2]._id}`, false, false],
        [`${fsC._id}`, 'dropoff', `${promises[1]._id}`, false, false],
        ['undefined', 'dropoff', `${promises[2]._id}`, false, false]
      ]);
      return sinon.assert.calledWith(spy, sinon.match.array.deepEquals(result));
    });
    it('Should do single and batch actions', async () => {
      const [fsA, fsB, fsC, fsD, fsE] = fixedStops.slice(0, 5);

      await createFsRequest(riders[0].riderToken, fsA.id, fsE.id, location, app, request, domain);
      await driverSearcher.search();
      await createFsRequest(riders[1].riderToken, fsA.id, fsB.id, location, app, request, domain);
      await driverSearcher.search();
      await createFsRequest(riders[2].riderToken, fsB.id, fsC.id, location, app, request, domain);
      await driverSearcher.search();
      await createFsRequest(riders[3].riderToken, fsC.id, fsD.id, location, app, request, domain);
      await driverSearcher.search();

      const promises = await Promise.all([
        Rides.findOne({ rider: riders[0].rider._id }),
        Rides.findOne({ rider: riders[1].rider._id }),
        Rides.findOne({ rider: riders[2].rider._id }),
        Rides.findOne({ rider: riders[3].rider._id })
      ]);
      sinon.assert.match(!!promises[0], true);
      sinon.assert.match(!!promises[1], true);
      sinon.assert.match(!!promises[2], true);
      sinon.assert.match(!!promises[3], true);

      let { body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain);

      const result = actionList.map(item => [`${item.fixedStopId}`, item.stopType, `${item.id}`, item.current]);

      const spy = sinon.spy();
      spy([
        [`${fsA._id}`, 'pickup', `${promises[0]._id}`, true],
        [`${fsA._id}`, 'pickup', `${promises[1]._id}`, false],
        [`${fsB._id}`, 'dropoff', `${promises[1]._id}`, false],
        [`${fsB._id}`, 'pickup', `${promises[2]._id}`, false],
        [`${fsC._id}`, 'dropoff', `${promises[2]._id}`, false],
        [`${fsC._id}`, 'pickup', `${promises[3]._id}`, false],
        [`${fsE._id}`, 'dropoff', `${promises[0]._id}`, false],
        [`${fsD._id}`, 'dropoff', `${promises[3]._id}`, false]
      ]);
      sinon.assert.calledWith(spy, sinon.match.array.deepEquals(result));

      let ride2 = await Rides.findOne({ rider: riders[1].rider._id });
      await driverArrivedFs(driver.driverToken, fsA, app, request, domain);
      let ride1 = await Rides.findOne({ rider: riders[0].rider._id });
      ride2 = await Rides.findOne({ rider: riders[1].rider._id });
      sinon.assert.match([ride1.status, ride2.status], [203, 203]);
      sinon.assert.match(
        [!!ride1.driverArrivedTimestamp, !!ride2.driverArrivedTimestamp], [true, true]
      );
      sinon.assert.match(
        ride1.driverArrivedTimestamp.toISOString().replace('T', ' ').substr(0, 19),
        ride2.driverArrivedTimestamp.toISOString().replace('T', ' ').substr(0, 19)
      );

      // [Batch action] Pickup rider 1 and 2 at A
      await pickUpFs(driver.driverToken, fsA, app, request, domain);
      ({ body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain));
      sinon.assert.match(actionList.length, 6);
      ride1 = await Rides.findOne({ rider: riders[0].rider._id });
      ride2 = await Rides.findOne({ rider: riders[1].rider._id });
      sinon.assert.match([ride1.status, ride2.status], [300, 300]);

      // [Batch action] Dropoff rider 2 at B
      await dropOffFs(driver.driverToken, fsB.id, app, request, domain, 207);
      ({ body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain));
      sinon.assert.match(actionList.length, 5);
      ride2 = await Rides.findOne({ rider: riders[1].rider._id });
      sinon.assert.match(ride2.status, 700);

      // [Single action] Pickup rider 3 at B
      let ride3 = await Rides.findOne({ rider: riders[2].rider._id });
      await pickUp(driver.driverToken, ride3, app, request, domain);
      ({ body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain));
      sinon.assert.match(actionList.length, 4);
      ride3 = await Rides.findOne({ rider: riders[2].rider._id });
      sinon.assert.match(ride3.status, 300);

      // [Single action] Dropoff rider 3 at C
      await dropOff(driver.driverToken, ride3, app, request, domain);
      ({ body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain));
      sinon.assert.match(actionList.length, 3);
      ride3 = await Rides.findOne({ rider: riders[2].rider._id });
      sinon.assert.match(ride3.status, 700);

      // [Batch action] Cancel rider 4 at C
      let ride4 = await Rides.findOne({ rider: riders[3].rider._id });
      await driverCancelFs(driver.driverToken, fsC, app, request, domain);
      ({ body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain));
      sinon.assert.match(actionList.length, 1);
      ride4 = await Rides.findOne({ rider: riders[3].rider._id });
      sinon.assert.match(ride4.status, 205);

      // [Batch action] Cancel rider 4 at C
      await dropOffFs(driver.driverToken, fsE.id, app, request, domain);
      ({ body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain));
      sinon.assert.match(actionList.length, 0);
      ride1 = await Rides.findOne({ rider: riders[0].rider._id });
      return sinon.assert.match(ride1.status, 700);
    });
    it('Should not allow actions on fixed-stops other than active fixed-stop', async () => {
      const [fsA, fsB, fsC, fsD] = fixedStops.slice(0, 4);

      await createFsRequest(riders[0].riderToken, fsB.id, fsC.id, location, app, request, domain);
      await driverSearcher.search();
      await createFsRequest(riders[1].riderToken, fsC.id, fsD.id, location, app, request, domain);
      await driverSearcher.search();

      let { body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain);

      sinon.assert.match(`${actionList[0].fixedStopId}`, `${fsB._id}`);
      sinon.assert.match(`${actionList[1].fixedStopId}`, `${fsC._id}`);
      sinon.assert.match(`${actionList[2].fixedStopId}`, `${fsC._id}`);
      sinon.assert.match(`${actionList[3].fixedStopId}`, `${fsD._id}`);

      let pickupResponse;

      pickupResponse = await pickUpFs(driver.driverToken, fsC, app, request, domain, 400);
      sinon.assert.match(pickupResponse.body.code, 400);

      ({ body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain));
      sinon.assert.match(actionList.length, 4);

      sinon.assert.match(`${actionList[0].fixedStopId}`, `${fsB._id}`);
      sinon.assert.match(`${actionList[1].fixedStopId}`, `${fsC._id}`);
      sinon.assert.match(`${actionList[2].fixedStopId}`, `${fsC._id}`);
      sinon.assert.match(`${actionList[3].fixedStopId}`, `${fsD._id}`);

      location.fixedStopEnabled = false;
      await location.save();

      await createRequest(riders[2].riderToken, [fsA.latitude, fsA.longitude, 'A'], [fsB.latitude, fsB.longitude, 'B'], location, app, request, domain);
      await driverSearcher.search();

      location.fixedStopEnabled = true;
      await location.save();

      ({ body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain));
      sinon.assert.match(actionList.length, 6);

      const ride = await Rides.findOne({ rider: riders[2].rider._id });

      sinon.assert.match(`${actionList[0].fixedStopId}`, 'undefined');
      sinon.assert.match(`${actionList[0].id}`, `${ride._id}`);
      sinon.assert.match(`${actionList[0].stopType}`, 'pickup');
      sinon.assert.match(`${actionList[1].fixedStopId}`, 'undefined');
      sinon.assert.match(`${actionList[1].id}`, `${ride._id}`);
      sinon.assert.match(`${actionList[1].stopType}`, 'dropoff');
      sinon.assert.match(`${actionList[2].fixedStopId}`, `${fsB._id}`);
      sinon.assert.match(`${actionList[3].fixedStopId}`, `${fsC._id}`);
      sinon.assert.match(`${actionList[4].fixedStopId}`, `${fsC._id}`);
      sinon.assert.match(`${actionList[5].fixedStopId}`, `${fsD._id}`);

      pickupResponse = await pickUpFs(driver.driverToken, fsA, app, request, domain, 400);
      sinon.assert.match(pickupResponse.body.code, 400);

      ({ body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain));
      sinon.assert.match(actionList.length, 6);

      sinon.assert.match(`${actionList[0].fixedStopId}`, 'undefined');
      sinon.assert.match(`${actionList[0].id}`, `${ride._id}`);
      sinon.assert.match(`${actionList[0].stopType}`, 'pickup');
      sinon.assert.match(`${actionList[1].fixedStopId}`, 'undefined');
      sinon.assert.match(`${actionList[1].id}`, `${ride._id}`);
      sinon.assert.match(`${actionList[1].stopType}`, 'dropoff');
      sinon.assert.match(`${actionList[2].fixedStopId}`, `${fsB._id}`);
      sinon.assert.match(`${actionList[3].fixedStopId}`, `${fsC._id}`);
      sinon.assert.match(`${actionList[4].fixedStopId}`, `${fsC._id}`);
      sinon.assert.match(`${actionList[5].fixedStopId}`, `${fsD._id}`);

      await pickUp(driver.driverToken, ride, app, request, domain);
      await dropOff(driver.driverToken, ride, app, request, domain);
      await pickUpFs(driver.driverToken, fsB, app, request, domain);

      ({ body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain));
      return sinon.assert.match(actionList.length, 3);
    });
    it('Should set arrived for new request after driver arrived on that fixed-stop', async () => {
      const [fsA, fsB] = fixedStops.slice(0, 2);

      await createFsRequest(riders[0].riderToken, fsA.id, fsB.id, location, app, request, domain);
      await driverSearcher.search();

      await driverArrivedFs(driver.driverToken, fsA, app, request, domain);
      const ride1 = await Rides.findOne({ rider: riders[0].rider._id });
      sinon.assert.match(!!ride1.driverArrivedTimestamp, true);

      await createFsRequest(riders[1].riderToken, fsA.id, fsB.id, location, app, request, domain);
      await driverSearcher.search();
      const ride2 = await Rides.findOne({ rider: riders[1].rider._id });
      sinon.assert.match(!!ride2.driverArrivedTimestamp, true);

      const { body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain);

      sinon.assert.match(`${actionList[0].fixedStopId}`, `${fsA._id}`);
      sinon.assert.match(`${actionList[1].fixedStopId}`, `${fsA._id}`);
      sinon.assert.match(`${actionList[2].fixedStopId}`, `${fsB._id}`);
      sinon.assert.match(`${actionList[3].fixedStopId}`, `${fsB._id}`);
    });
  });
  describe('Fixed stops without pooling', () => {
    it('Should create a route for 2 riders with fixed stops', async () => {
      location.poolingEnabled = false;
      location = await location.save();
      const [fsA, fsB, fsC] = fixedStops.slice(0, 5);

      await createFsRequest(riders[0].riderToken, fsA.id, fsB.id, location, app, request, domain);
      await driverSearcher.search();
      await createFsRequest(riders[1].riderToken, fsB.id, fsC.id, location, app, request, domain);
      await driverSearcher.search();

      const promises = await Promise.all([
        Rides.findOne({ rider: riders[0].rider._id }),
        Rides.findOne({ rider: riders[1].rider._id })
      ]);
      sinon.assert.match(!!promises[0], true);
      sinon.assert.match(!!promises[1], true);

      const { body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain);

      const etas = Array.from(new Set(actionList.map(item => item.eta.split('T')[0])));
      sinon.assert.match(etas.length, 1);
      sinon.assert.match(etas[0], moment.utc().format('YYYY-MM-DD'));

      const result = actionList.map(item => [`${item.fixedStopId}`, item.stopType, `${item.id}`, item.current, item.fixedStopName]);

      const spy = sinon.spy();
      spy([
        [`${fsA._id}`, 'pickup', `${promises[0]._id}`, true, 'fs8'],
        [`${fsB._id}`, 'dropoff', `${promises[0]._id}`, false, 'fs4'],
        [`${fsB._id}`, 'pickup', `${promises[1]._id}`, false, 'fs4'],
        [`${fsC._id}`, 'dropoff', `${promises[1]._id}`, false, 'fs6']
      ]);
      return sinon.assert.calledWith(spy, sinon.match.array.deepEquals(result));
    });
    it('Should have both hailed and fixed stop rides', async () => {
      location.poolingEnabled = false;
      location = await location.save();
      const [fsA, fsB, fsC] = fixedStops.slice(0, 3);

      await createFsRequest(riders[0].riderToken, fsA.id, fsB.id, location, app, request, domain);
      await driverSearcher.search();
      await createFsRequest(riders[1].riderToken, fsB.id, fsC.id, location, app, request, domain);
      await driverSearcher.search();

      await hailRide(driver.driverToken, location, app, request, domain);

      const promises = await Promise.all([
        Rides.findOne({ rider: null }),
        Rides.findOne({ rider: riders[0].rider._id }),
        Rides.findOne({ rider: riders[1].rider._id })
      ]);
      sinon.assert.match(!!promises[0], true);
      sinon.assert.match(!!promises[1], true);
      sinon.assert.match(!!promises[2], true);

      const { body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain);

      const result = actionList.map(item => [item.stopType, `${item.id}`, item.hailed, item.current, `${item.fixedStopName}`]);

      const spy = sinon.spy();
      spy([
        ['dropoff', `${promises[0]._id}`, true, false, 'undefined'],
        ['pickup', `${promises[1]._id}`, false, true, 'fs8'],
        ['dropoff', `${promises[1]._id}`, false, false, 'fs4'],
        ['pickup', `${promises[2]._id}`, false, false, 'fs4'],
        ['dropoff', `${promises[2]._id}`, false, false, 'fs6']
      ]);
      return sinon.assert.calledWith(spy, sinon.match.array.deepEquals(result));
    });
    it('Should have hailed, fixed stop and normal rides', async () => {
      location.poolingEnabled = false;
      location = await location.save();
      const [fsA, fsB, fsC] = fixedStops.slice(0, 3);

      await createFsRequest(riders[0].riderToken, fsA.id, fsC.id, location, app, request, domain);
      await driverSearcher.search();

      location.fixedStopEnabled = false;
      location = await location.save();

      await createRequest(riders[1].riderToken, [fsB.latitude, fsB.longitude, 'B'], [fsC.latitude, fsC.longitude, 'C'], location, app, request, domain);
      await driverSearcher.search();

      await hailRide(driver.driverToken, location, app, request, domain);

      const promises = await Promise.all([
        Rides.findOne({ rider: null }),
        Rides.findOne({ rider: riders[0].rider._id }),
        Rides.findOne({ rider: riders[1].rider._id })
      ]);
      sinon.assert.match(!!promises[0], true);
      sinon.assert.match(!!promises[1], true);
      sinon.assert.match(!!promises[2], true);

      const { body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain);

      const result = actionList.map(item => [`${item.fixedStopId}`, item.stopType, `${item.id}`, item.hailed, item.current]);

      const spy = sinon.spy();
      spy([
        ['undefined', 'dropoff', `${promises[0]._id}`, true, false],
        [`${fsA._id}`, 'pickup', `${promises[1]._id}`, false, true],
        [`${fsC._id}`, 'dropoff', `${promises[1]._id}`, false, false],
        ['undefined', 'pickup', `${promises[2]._id}`, false, false],
        ['undefined', 'dropoff', `${promises[2]._id}`, false, false]
      ]);
      return sinon.assert.calledWith(spy, sinon.match.array.deepEquals(result));
    });
    it('Should do single and batch actions', async () => {
      location.poolingEnabled = false;
      location = await location.save();
      const [fsA, fsB, fsC] = fixedStops.slice(0, 5);

      await createFsRequest(riders[0].riderToken, fsA.id, fsB.id, location, app, request, domain);
      await driverSearcher.search();
      await createFsRequest(riders[1].riderToken, fsB.id, fsC.id, location, app, request, domain);
      await driverSearcher.search();

      const promises = await Promise.all([
        Rides.findOne({ rider: riders[0].rider._id }),
        Rides.findOne({ rider: riders[1].rider._id })
      ]);
      sinon.assert.match(!!promises[0], true);
      sinon.assert.match(!!promises[1], true);

      let { body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain);

      const result = actionList.map(item => [`${item.fixedStopId}`, item.stopType, `${item.id}`, item.current]);

      const spy = sinon.spy();
      spy([
        [`${fsA._id}`, 'pickup', `${promises[0]._id}`, true],
        [`${fsB._id}`, 'dropoff', `${promises[0]._id}`, false],
        [`${fsB._id}`, 'pickup', `${promises[1]._id}`, false],
        [`${fsC._id}`, 'dropoff', `${promises[1]._id}`, false]
      ]);
      sinon.assert.calledWith(spy, sinon.match.array.deepEquals(result));

      // [Batch action] Pickup rider 1 at A
      await pickUpFs(driver.driverToken, fsA, app, request, domain);
      ({ body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain));
      sinon.assert.match(actionList.length, 3);
      let ride1 = await Rides.findOne({ rider: riders[0].rider._id });
      let ride2 = await Rides.findOne({ rider: riders[1].rider._id });
      sinon.assert.match([ride1.status, ride2.status], [300, 202]);

      // [Batch action] Dropoff rider 1 at B
      await dropOffFs(driver.driverToken, fsB.id, app, request, domain);
      ({ body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain));
      sinon.assert.match(actionList.length, 2);
      ride1 = await Rides.findOne({ rider: riders[0].rider._id });
      ride2 = await Rides.findOne({ rider: riders[1].rider._id });
      sinon.assert.match([ride1.status, ride2.status], [700, 202]);

      // [Single action] Pickup rider 2 at B
      ride2 = await Rides.findOne({ rider: riders[1].rider._id });
      await pickUp(driver.driverToken, ride2, app, request, domain);
      ({ body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain));
      sinon.assert.match(actionList.length, 1);
      ride1 = await Rides.findOne({ rider: riders[0].rider._id });
      ride2 = await Rides.findOne({ rider: riders[1].rider._id });
      sinon.assert.match([ride1.status, ride2.status], [700, 300]);

      // [Single action] Dropoff rider 2 at C
      await dropOff(driver.driverToken, ride2, app, request, domain);
      ({ body: actionList } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain));
      sinon.assert.match(actionList.length, 0);
      ride1 = await Rides.findOne({ rider: riders[0].rider._id });
      ride2 = await Rides.findOne({ rider: riders[1].rider._id });
      return sinon.assert.match([ride1.status, ride2.status], [700, 700]);
    });
  });
});
