import moment from 'moment-timezone';
import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../server';
import driverSearcher from '../services/driverSearch';
import { port, domain } from '../config';
import logger from '../logger';
import {
  Riders, Drivers, Locations, Requests, Rides, Routes, Settings, RideStatus
} from '../models';
import { emptyAllCollections } from './utils/helper';

import { createRequest, riderCancel } from './utils/rider';
import {
  pickUp,
  dropOff,
  driverCancel,
  noShowCancel,
  driverMoved,
  driverArrived,
  createDriverLogin
} from './utils/driver';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let driverSocket;
let driverToken;
let riderSocket;
let sandbox;
let driver;
let rider;
let riderToken;
let location;

const pickup = [
  40.70120332404696,
  -73.91910552978516,
  '482 Driggs Ave, Brooklyn, NY 11211, USA'
];
const dropoff = [
  40.68714671764471,
  -73.90846252441406,
  '29 1/2 Conselyea St, Brooklyn, NY 11211, USA'
];

describe('Websockets', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      isADA: true,
      isUsingServiceTimes: false,
      isActive: true,
      serviceArea: [
        {
          longitude: -73.924135,
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
          longitude: -73.973573,
          latitude: 40.660845
        },
        {
          longitude: -73.924135,
          latitude: 40.721239
        }
      ]
    });

    const driverInfo = {
      firstName: 'Driver FN',
      lastName: 'Driver LN',
      email: 'some@mail.com',
      zip: 10001,
      phone: 123456789,
      isOnline: true,
      isTemporaryPassword: false,
      locations: [location._id],
      password: 'Password1',
      dob: '2000-12-11',
      currentLocation: {
        coordinates: [
          -73.929073,
          40.66883
        ],
        type: 'Point'
      }
    };

    ({ driver, driverSocket, driverToken } = await createDriverLogin(
      driverInfo, app, request, domain, driverSocket
    ));

    rider = await new Riders({
      email: 'some@mail.com',
      firstName: 'Rider FN',
      lastName: 'Rider LN',
      password: 'Password1',
      location: location._id,
      dob: '2000-12-11'
    }).save();

    const riderSessionResponse = await request(app)
      .post('/v1/login')
      .set('host', domain.rider)
      .set('X-Mobile-Os', 'Android')
      .set('X-App-Version', '1.0.0')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ email: 'some@mail.com', password: 'Password1' })
      .expect(200)
      .end()
      .get('body');

    riderToken = riderSessionResponse.accessToken;

    riderSocket
      .emit('authenticate', { token: riderToken })
      .on('authenticated', () => {
        logger.debug('RIDER authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });
  });

  beforeEach(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    await Drivers.updateOne({ _id: driver._id }, { $set: { driverRideList: [] } });

    driverSocket.removeAllListeners();
    riderSocket.removeAllListeners();

    await Drivers.syncIndexes();
    await Locations.syncIndexes();

    await Riders.updateRider(rider._id, { lastCancelTimestamp: null });
  });

  describe('Ride request', () => {
    it('Should find driver for ride request', async () => {
      await createRequest(riderToken, pickup, dropoff, location, app, request, domain);

      driverSearcher.search();

      return new Promise((res, rej) => {
        riderSocket.on('request-completed', (riderRideMsg) => {
          sinon.assert.match(riderRideMsg, {
            id: sinon.match.string,
            driverName: 'Driver FN Driver LN',
            origin:
            {
              address: pickup[2],
              latitude: pickup[0],
              longitude: pickup[1]
            },
            destination:
            {
              address: dropoff[2],
              latitude: dropoff[0],
              longitude: dropoff[1]
            },
            isADA: false,
            status: 202,
            createdTimestamp: sinon.match.string
          });

          driverSocket.on('ride-request-received', (driverRideMsg) => {
            sinon.assert.match(driverRideMsg, {
              ride: sinon.match.string,
              rider: { name: 'Rider FN Rider LN', phone: null },
              origin:
              {
                address: pickup[2],
                latitude: pickup[0],
                longitude: pickup[1]
              },
              destination:
              {
                address: dropoff[2],
                latitude: dropoff[0],
                longitude: dropoff[1]
              },
              isADA: false,
              passengers: 1,
              status: 202,
              createdTimestamp: sinon.match.string
            });

            res();
          })
            .on('wserror', (msg) => {
              rej(msg);
            });
        })
          .on('wserror', (msg) => {
            rej(msg);
          });
      });
    });
  });

  describe('Ride cancel', () => {
    describe('When rider cancels', () => {
      it('Should send message to driver app with cancellation', async () => {
        await createRequest(riderToken, pickup, dropoff, location, app, request, domain);
        await driverSearcher.search();
        const ride = await Rides.findOne({ rider });
        return riderCancel(driverSocket, riderSocket, ride);
      });
    });

    describe('When driver cancels', () => {
      describe('Before picking up', () => {
        it('Should send message to rider app with cancellation while en route', async () => {
          await createRequest(riderToken, pickup, dropoff, location, app, request, domain);
          await driverSearcher.search();
          const ride = await Rides.findOne({ rider });

          riderSocket
            .on('ride-updates', (riderRideMsg) => {
              sinon.assert.match(riderRideMsg, {
                message: null,
                status: RideStatus.CancelledEnRoute,
                ride: `${ride._id}`
              });
            });

          return driverCancel(driverToken, ride._id, app, request, domain);
        });
      });

      describe('When rider doesn\'t show up', () => {
        it('Should send message to rider app with cancellation by no show', async () => {
          await createRequest(riderToken, pickup, dropoff, location, app, request, domain);
          await driverSearcher.search();
          const ride = await Rides.findOne({ rider });

          await driverMoved(driverSocket, pickup[0], pickup[1]);
          await driverArrived(driverToken, ride, app, request, domain);
          const driverArrivedTimestamp = moment(ride.driverArrivedTimestamp).subtract(3, 'm').toDate();
          await Rides.updateRide(ride._id, { driverArrivedTimestamp });

          riderSocket
            .on('ride-updates', (riderRideMsg) => {
              sinon.assert.match(riderRideMsg, {
                message: null,
                status: RideStatus.CancelledNoShow,
                ride: `${ride._id}`
              });
            });

          return noShowCancel(driverToken, { ride }, app, request, domain);
        });
      });

      describe('While too far from the pickup location', () => {
        it('Should not allow cancellation', async () => {
          await createRequest(riderToken, pickup, dropoff, location, app, request, domain);
          await driverSearcher.search();
          const ride = await Rides.findOne({ rider });

          const response = await noShowCancel(driverToken, { ride }, app, request, domain, 400);
          sinon.assert.match(response.body.message, 'You must arrive at your pickup location first!');
        });
      });

      describe('When driver doesn\'t wait the required time', () => {
        it('Should not allow cancellation', async () => {
          await createRequest(riderToken, pickup, dropoff, location, app, request, domain);
          await driverSearcher.search();
          const ride = await Rides.findOne({ rider });

          await driverMoved(driverSocket, pickup[0], pickup[1]);
          await driverArrived(driverToken, ride, app, request, domain);

          const response = await noShowCancel(driverToken, { ride }, app, request, domain, 400);
          sinon.assert.match(response.body.message, 'You\'ll only be able to cancel the ride in 3 minutes.');
        });
      });
    });
  });

  describe('Ride message', () => {
    it('Should send message to driver from rider', async () => {
      await createRequest(riderToken, pickup, dropoff, location, app, request, domain);

      driverSearcher.search();

      return new Promise((res, rej) => {
        riderSocket
          .on('request-completed', (riderRideMsg) => {
            riderSocket
              .emit('ride-message', { ride: riderRideMsg.id, message: 'TEST_MSG_1' });


            driverSocket.on('ride-message-received', (messageFromRider) => {
              sinon.assert.match(messageFromRider, {
                id: sinon.match.string,
                message: 'TEST_MSG_1',
                owner: rider._id.toString(),
                ride: riderRideMsg.id,
                sender: 'RIDER'
              });

              res();
            })
              .on('wserror', (msg) => {
                rej(msg);
              });
          })
          .on('wserror', (msg) => {
            rej(msg);
          });
      });
    });
  });

  describe('Rider requested a call', () => {
    it('Should send message to driver that rider requested a call', async () => {
      await createRequest(riderToken, pickup, dropoff, location, app, request, domain);

      driverSearcher.search();

      return new Promise((res, rej) => {
        riderSocket
          .on('request-completed', (riderRideMsg) => {
            riderSocket
              .emit('rider-request-call', { ride: riderRideMsg.id });

            driverSocket.on('ride-call-requested', (messageFromRider) => {
              sinon.assert.match(messageFromRider, {
                ride: riderRideMsg.id
              });

              res();
            })
              .on('wserror', (msg) => {
                rej(msg);
              });
          })
          .on('wserror', (msg) => {
            rej(msg);
          });
      });
    });
  });

  describe('Ride complete', () => {
    it('Should send message to rider that the ride complete', async () => {
      await new Requests({
        cancelTimestamp: null,
        driver: null,
        requestMessages: [],
        location: location._id.toString(),
        rider: rider._id.toString(),
        passengers: 1,
        isADA: false,
        pickupAddress: pickup[2],
        pickupLatitude: pickup[0],
        pickupLongitude: pickup[1],
        dropoffAddress: dropoff[2],
        dropoffLatitude: dropoff[0],
        dropoffLongitude: dropoff[1],
        status: 100,
        pickupZone: {
          id: '5d41eb558f144230ac51e29d',
          name: 'Pickup Zone'
        },
        dropoffZone: {
          id: '5d41eb558f144230ac51e29d',
          name: 'Dropoff Zone'
        }
      }).save();

      await driverSearcher.search();
      const ride = await Rides.findOne({ rider });
      await pickUp(driverToken, ride, app, request, domain);

      riderSocket
        .on('request-completed', (riderRideMsg) => {
          sinon.assert.match(riderRideMsg, {
            status: RideStatus.RideComplete
          });
        });

      return dropOff(driverToken, ride, app, request, domain);
    });
  });

  describe('Driver arrive', () => {
    it('Should send message to rider that the ride status updated', async () => {
      await new Requests({
        cancelTimestamp: null,
        driver: null,
        requestMessages: [],
        location: location._id.toString(),
        rider: rider._id.toString(),
        passengers: 1,
        isADA: false,
        pickupAddress: pickup[2],
        pickupLatitude: pickup[0],
        pickupLongitude: pickup[1],
        dropoffAddress: dropoff[2],
        dropoffLatitude: dropoff[0],
        dropoffLongitude: dropoff[1],
        status: 100,
        pickupZone: {
          id: '5d41eb558f144230ac51e29d',
          name: 'Pickup Zone'
        },
        dropoffZone: {
          id: '5d41eb558f144230ac51e29d',
          name: 'Dropoff Zone'
        }
      }).save();

      await driverSearcher.search();
      const ride = await Rides.findOne({ rider });

      riderSocket
        .on('ride-updates', (riderRideMsg) => {
          sinon.assert.match(riderRideMsg, {
            message: null,
            ride: `${ride._id}`,
            status: RideStatus.DriverArrived
          });
        });

      return driverArrived(driverToken, ride, app, request, domain);
    });
  });

  describe('Ride pick up', () => {
    it('Should send message to rider when driver picks them up', async () => {
      await new Requests({
        cancelTimestamp: null,
        driver: null,
        requestMessages: [],
        location: location._id.toString(),
        rider: rider._id.toString(),
        passengers: 1,
        isADA: false,
        pickupAddress: pickup[2],
        pickupLatitude: pickup[0],
        pickupLongitude: pickup[1],
        dropoffAddress: dropoff[2],
        dropoffLatitude: dropoff[0],
        dropoffLongitude: dropoff[1],
        status: 100,
        pickupZone: {
          id: '5d41eb558f144230ac51e29d',
          name: 'Pickup Zone'
        },
        dropoffZone: {
          id: '5d41eb558f144230ac51e29d',
          name: 'Dropoff Zone'
        }
      }).save();

      await driverSearcher.search();
      const ride = await Rides.findOne({ rider });

      riderSocket
        .on('ride-updates', (riderRideMsg) => {
          sinon.assert.match(riderRideMsg, {
            message: null,
            ride: `${ride._id}`,
            status: RideStatus.DriverArrived
          });
        });

      await driverArrived(driverToken, ride, app, request, domain);
      riderSocket.off('ride-updates');
      return pickUp(driverToken, ride, app, request, domain);
    });

    it('Should send message to rider when ride is in progress', async () => {
      await new Requests({
        cancelTimestamp: null,
        driver: null,
        requestMessages: [],
        location: location._id.toString(),
        rider: rider._id.toString(),
        passengers: 1,
        isADA: false,
        pickupAddress: pickup[2],
        pickupLatitude: pickup[0],
        pickupLongitude: pickup[1],
        dropoffAddress: dropoff[2],
        dropoffLatitude: dropoff[0],
        dropoffLongitude: dropoff[1],
        status: 100,
        pickupZone: {
          id: '5d41eb558f144230ac51e29d',
          name: 'Pickup Zone'
        },
        dropoffZone: {
          id: '5d41eb558f144230ac51e29d',
          name: 'Dropoff Zone'
        }
      }).save();

      await driverSearcher.search();
      const ride = await Rides.findOne({ rider });
      await driverArrived(driverToken, ride, app, request, domain);

      riderSocket
        .on('ride-updates', (riderRideMsg) => {
          sinon.assert.match(riderRideMsg, {
            message: null,
            ride: `${ride._id}`,
            status: RideStatus.RideInProgress
          });
        });

      return pickUp(driverToken, ride, app, request, domain);
    });
  });
});
