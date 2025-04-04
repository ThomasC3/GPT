import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import {
  driverEndpoint,
  createDriverLogin
} from '../utils/driver';
import {
  Locations, Settings, Events
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let sandbox;
let location;
let driver;

describe('Event timeline for Driver', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    const driverSocket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();

    location = await Locations.createLocation({
      name: 'Location',
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
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

    const setActiveLocation = false;

    driver = await createDriverLogin({
      currentLocation: {
        coordinates: [-73.9078617, 40.6810937],
        type: 'Point'
      },
      locations: [location._id],
      email: 'driver1@mail.com',
      password: 'Password1',
      isOnline: true,
      isAvailable: false
    }, app, request, domain, driverSocket,
    { setActiveLocation, attachSharedVehicle: false });
    driver.driverSocket = driverSocket;
  });

  beforeEach(async () => {
    sandbox.restore();
    await Settings.deleteMany();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
  });

  describe('LOGIN, LOGOUT, ONLINE and OFFLINE events', () => {
    it('Should have 3 events of login and logout', async () => {
      await driverEndpoint('/v1/logout', 'post', driver.driverToken, app, request, domain, { deviceToken: driver.driverToken });
      await driverEndpoint('/v1/login', 'post', driver.driverToken, app, request, domain, { email: 'driver1@mail.com', password: 'Password1' });

      const { items: events } = await Events.getEvents({ sourceId: driver.driver._id, sourceType: 'Driver' });

      return sinon.assert.match(
        [
          `${events[0].source.id}`,
          events[2].eventType,
          events[1].eventType,
          events[0].eventType
        ],
        [`${driver.driver._id}`, 'LOGIN', 'LOGOUT', 'LOGIN']
      );
    });
  });
});
