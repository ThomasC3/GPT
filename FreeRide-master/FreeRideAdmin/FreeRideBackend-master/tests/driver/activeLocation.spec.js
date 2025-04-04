import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import {
  driverEndpoint,
  createDriver,
  setLocation
} from '../utils/driver';
import {
  Locations, Settings, Events, Drivers
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

describe('Active location setting for driver', () => {
  before(async () => {
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


    await Settings.deleteMany();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
    sandbox = sinon.createSandbox();
  });

  beforeEach(async () => {
    sandbox.restore();

    await Drivers.deleteMany();

    const driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    driver = await createDriver({
      currentLocation: {
        coordinates: [-73.9078617, 40.6810937],
        type: 'Point'
      },
      locations: [location._id],
      email: 'driver1@mail.com',
      password: 'Password1',
      isOnline: false,
      isAvailable: false
    });
    driver.driverSocket = driverSocket;

    await Events.deleteMany();
    await Drivers.syncIndexes();
    await Locations.syncIndexes();
  });

  describe('Set active location', () => {
    it('Should have 2 events of login and logout without active location', async () => {
      const { activeLocation: activeLocationBefore } = await Drivers.findOne({});

      const { body: { accessToken: driverToken } } = await driverEndpoint(
        '/v1/login', 'post', null, app, request, domain, { email: 'driver1@mail.com', password: 'Password1' }
      );
      const { activeLocation: activeLocationDuring } = await Drivers.findOne({});

      const { body: { message }, status } = await driverEndpoint(
        '/v1/driver/status/', 'post', driverToken, app, request, domain, { isAvailable: true }, 400
      );
      sinon.assert.match([message, status], ['Unable to update your availability because you have not set location', 400]);

      await driverEndpoint('/v1/logout', 'post', driverToken, app, request, domain, { deviceToken: driverToken });
      const { activeLocation: activeLocationAfter } = await Drivers.findOne({});

      const { items: events } = await Events.getEvents({ sourceId: driver.driver._id, sourceType: 'Driver' });

      sinon.assert.match(
        [activeLocationBefore, activeLocationDuring, activeLocationAfter],
        [null, null, null]
      );

      return sinon.assert.match(
        [
          events.length,
          `${events[0].source.id}`,
          events[1].eventType,
          events[1].eventData,
          events[0].eventType,
          events[0].eventData.location
        ],
        [2, `${driver.driver._id}`, 'LOGIN', undefined, 'LOGOUT', null]
      );
    });
    it('Should not be able to become available without active location', async () => {
      const { body: { accessToken: driverToken } } = await driverEndpoint(
        '/v1/login', 'post', null, app, request, domain, { email: 'driver1@mail.com', password: 'Password1' }
      );

      const payload = { isAvailable: true };
      const { body: { message }, status } = await driverEndpoint(
        '/v1/driver/status/', 'post', driverToken, app, request, domain, payload, 400
      );
      return sinon.assert.match(
        [message, status],
        ['Unable to update your availability because you have not set location', 400]
      );
    });
    it('Should be able to become unavailable without active location', async () => {
      const { body: { accessToken: driverToken } } = await driverEndpoint(
        '/v1/login', 'post', null, app, request, domain, { email: 'driver1@mail.com', password: 'Password1' }
      );

      const currentDriver = await Drivers.updateDriver(driver.driver._id, { isAvailable: true });

      const { body } = await driverEndpoint(
        '/v1/driver/status/', 'post', driverToken, app, request, domain, { isAvailable: false }
      );
      sinon.assert.match(
        [currentDriver.isAvailable, body.isAvailable],
        [true, false]
      );

      await driverEndpoint('/v1/logout', 'post', driverToken, app, request, domain, { deviceToken: driverToken });

      const { items: events } = await Events.getEvents({ sourceId: driver.driver._id, sourceType: 'Driver' });

      return sinon.assert.match(
        [
          events.length,
          `${events[0].source.id}`,
          events[2].eventType,
          events[2].eventData,
          events[1].eventType,
          events[1].eventData.location,
          events[0].eventType,
          events[0].eventData.location
        ],
        [
          3,
          `${driver.driver._id}`,
          'LOGIN', undefined,
          'UNAVAILABLE', null,
          'LOGOUT', null
        ]
      );
    });
    it('Should have 5 events of login, set location, available, unavailable and logout with active location', async () => {
      const {
        activeLocation: activeLocationBefore,
        lastActiveLocation: lastActiveLocationBefore
      } = await Drivers.findOne({});

      const { body: { accessToken: driverToken } } = await driverEndpoint(
        '/v1/login', 'post', null, app, request, domain, { email: 'driver1@mail.com', password: 'Password1' }
      );
      const {
        activeLocation: activeLocationLogin,
        lastActiveLocation: lastActiveLocationLogin,
        currentLatitude: latitude,
        currentLongitude: longitude
      } = await Drivers.findOne({});


      const { body: locations } = await driverEndpoint(
        `/v1/locations?latitude=${latitude}&longitude=${longitude}`,
        'get', driverToken, app, request, domain, { deviceToken: driverToken }
      );

      await setLocation(locations[0].id, driverToken, app, request, domain);

      const {
        activeLocation: activeLocationDuring,
        lastActiveLocation: lastActiveLocationDuring
      } = await Drivers.findOne({});


      let currentDriver = await Drivers.findOne({ _id: driver.driver._id });

      let { body } = await driverEndpoint(
        '/v1/driver/status/', 'post', driverToken, app, request, domain, { isAvailable: true }
      );
      sinon.assert.match(
        [currentDriver.isAvailable, body.isAvailable],
        [false, true]
      );


      currentDriver = await Drivers.findOne({ _id: driver.driver._id });

      ({ body } = await driverEndpoint(
        '/v1/driver/status/', 'post', driverToken, app, request, domain, { isAvailable: false }
      ));
      sinon.assert.match(
        [currentDriver.isAvailable, body.isAvailable],
        [true, false]
      );

      await driverEndpoint('/v1/logout', 'post', driverToken, app, request, domain, { deviceToken: driverToken });
      const {
        activeLocation: activeLocationAfter,
        lastActiveLocation: lastActiveLocationAfter
      } = await Drivers.findOne({});

      const { items: events } = await Events.getEvents({ sourceId: driver.driver._id, sourceType: 'Driver' });

      sinon.assert.match(
        [
          activeLocationBefore,
          activeLocationLogin,
          activeLocationDuring,
          activeLocationAfter
        ],
        [null, null, location._id, null]
      );

      sinon.assert.match(
        [
          lastActiveLocationBefore,
          lastActiveLocationLogin,
          lastActiveLocationDuring,
          lastActiveLocationAfter
        ],
        [null, null, location._id, location._id]
      );

      return sinon.assert.match(
        [
          events.length,
          `${events[0].source.id}`,
          events[4].eventType,
          events[4].eventData,
          events[3].eventType,
          events[3].eventData.location,
          events[2].eventType,
          events[2].eventData.location,
          events[1].eventType,
          events[1].eventData.location,
          events[0].eventType,
          events[0].eventData.location
        ],
        [
          5,
          `${driver.driver._id}`,
          'LOGIN', undefined,
          'LOCATION SET', location._id,
          'AVAILABLE', location._id,
          'UNAVAILABLE', location._id,
          'LOGOUT', location._id
        ]
      );
    });
    it('Should not be able to set active location twice', async () => {
      const {
        activeLocation: activeLocationBefore,
        lastActiveLocation: lastActiveLocationBefore
      } = await Drivers.findOne({});

      const { body: { accessToken: driverToken } } = await driverEndpoint(
        '/v1/login', 'post', null, app, request, domain, { email: 'driver1@mail.com', password: 'Password1' }
      );
      const {
        activeLocation: activeLocationLogin,
        lastActiveLocation: lastActiveLocationLogin,
        currentLatitude: latitude,
        currentLongitude: longitude
      } = await Drivers.findOne({});


      const { body: locations } = await driverEndpoint(
        `/v1/locations?latitude=${latitude}&longitude=${longitude}`,
        'get', driverToken, app, request, domain, { deviceToken: driverToken }
      );

      let {
        body: { message }
      } = await setLocation(locations[0].id, driverToken, app, request, domain);
      sinon.assert.match(message, 'Successfully set location');

      ({
        body: { message }
      } = await setLocation(locations[0].id, driverToken, app, request, domain));
      sinon.assert.match(message, 'Already set location.');

      const {
        activeLocation: activeLocationDuring,
        lastActiveLocation: lastActiveLocationDuring
      } = await Drivers.findOne({});


      sinon.assert.match(
        [
          activeLocationBefore,
          activeLocationLogin,
          activeLocationDuring
        ],
        [null, null, location._id]
      );

      return sinon.assert.match(
        [
          lastActiveLocationBefore,
          lastActiveLocationLogin,
          lastActiveLocationDuring
        ],
        [null, null, location._id]
      );
    });
  });
});
