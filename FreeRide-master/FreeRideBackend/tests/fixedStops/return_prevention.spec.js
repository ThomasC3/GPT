import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import { createRiderLogin, createFsRequest } from '../utils/rider';
import { createDriverLogin, pickUp } from '../utils/driver';
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

let driverSocket;
let rider1Socket;
let rider2Socket;
let rider3Socket;
let rider4Socket;

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

describe('Fixed stop search for Driver', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider3Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider4Socket = io.connect(`http://localhost:${port}`, ioOptions);

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
    }, app, request, domain, driverSocket);
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
    location = await location.save();
    await Settings.deleteMany();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
    await Drivers.updateOne({ _id: driver.driver._id }, { $set: { driverRideList: [] } });
    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();
  });

  describe('Fixed stops', () => {
    it('Should prevent rider from being matched if driver just left fixed-stop', async () => {
      const [fsA, fsB, fsC, fsD] = fixedStops.slice(0, 5);

      await createFsRequest(riders[0].riderToken, fsA.id, fsD.id, location, app, request, domain);
      await driverSearcher.search();
      let ride1 = await Rides.findOne({ rider: riders[0].rider._id });

      await createFsRequest(riders[1].riderToken, fsA.id, fsB.id, location, app, request, domain);
      await driverSearcher.search();
      let ride2 = await Rides.findOne({ rider: riders[1].rider._id });

      // Finish stop A
      await pickUp(driver.driverToken, ride1, app, request, domain);
      await pickUp(driver.driverToken, ride2, app, request, domain);

      // Prevent new rider match with pickup at A
      await createFsRequest(riders[2].riderToken, fsA.id, fsB.id, location, app, request, domain);
      await driverSearcher.search();

      // Allow new rider match with pickup at B
      await createFsRequest(riders[3].riderToken, fsB.id, fsC.id, location, app, request, domain);
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: riders[0].rider._id });
      ride2 = await Rides.findOne({ rider: riders[1].rider._id });
      const ride3 = await Rides.findOne({ rider: riders[2].rider._id });
      const ride4 = await Rides.findOne({ rider: riders[3].rider._id });

      return sinon.assert.match([!!ride1, !!ride2, !!ride3, !!ride4], [true, true, false, true]);
    });
  });
});
