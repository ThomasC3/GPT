import sinon from 'sinon';
import request from 'supertest-promised';
import moment from 'moment-timezone';
import app from '../../server';
import { domain } from '../../config';
import {
  driverEndpoint,
  createDriver,
  driverLogin,
  setLocation,
  updateStatus
} from '../utils/driver';
import {
  createAdminLogin,
  adminEndpoint
} from '../utils/admin';
import {
  Locations, Settings, Events, Drivers
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

let sandbox;
let location;
let driver;
let driver2;
let adminToken;
let dates;
let eventQuery;
let hourQuery;
let locationQuery;
let driverId1;
let driverId2;

const setQueryRange = (start, end) => {
  eventQuery['createdTimestamp[start]'] = start;
  eventQuery['createdTimestamp[end]'] = end;

  hourQuery['createdTimestamp[start]'] = start;
  hourQuery['createdTimestamp[end]'] = end;

  locationQuery['createdTimestamp[start]'] = start;
  locationQuery['createdTimestamp[end]'] = end;
};

const buildEventQuery = () => new URLSearchParams(eventQuery).toString();
const buildHourQuery = () => new URLSearchParams(hourQuery).toString();
const buildLocationQuery = () => new URLSearchParams(locationQuery).toString();

const changeEvent = async (
  sourceId, eventType, targetEventType, targetCreatedTimestamp, nin_id = []
) => Events.findOneAndUpdate(
  { sourceId, eventType, _id: { $nin: nin_id } },
  { $set: { createdTimestamp: targetCreatedTimestamp, eventType: targetEventType } }
);

const setupScenario = async (setup) => {
  sandbox.restore();

  // Reset
  await Drivers.deleteMany();

  const drivers = [];
  for (let d = 0; d < 2; d += 1) {
    drivers.push(createDriver({
      currentLocation: {
        coordinates: [-73.9078617, 40.6810937],
        type: 'Point'
      },
      locations: [location._id],
      email: `driver${d + 1}@mail.com`,
      password: `Password${d + 1}`,
      isOnline: false,
      isAvailable: false
    }));
  }

  ([driver, driver2] = await Promise.all(drivers));
  ({ driver: { _id: driverId1 } } = driver);
  ({ driver: { _id: driverId2 } } = driver2);

  await Events.deleteMany();
  await Drivers.syncIndexes();
  await Locations.syncIndexes();

  eventQuery = {
    targetId: driverId1,
    targetType: 'Driver',
    location: location._id,
    skip: 0,
    limit: 15
  };

  hourQuery = {
    targetId: driverId1,
    targetType: 'Driver',
    location: location._id
  };

  locationQuery = {
    targetType: 'Driver'
  };

  if (setup === 'location') {
    delete hourQuery.targetId;
  }

  // Create events and update dates
  dates = {
    startQ1: '2022-01-29 00:00',
    login: moment('2022-01-29 19:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true),
    setLoc1: moment('2022-01-29 20:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true),
    startQ1b: '2022-01-29 20:30',
    setLoc2: moment('2022-01-29 21:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true), // ignored in duplicate
    available1: moment('2022-01-29 22:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true),
    available2: moment('2022-01-29 23:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true),

    startQ2: '2022-01-30 00:00',
    endQ1: '2022-01-30 23:59',

    unavailable2: moment('2022-01-31 03:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true),
    unavailable1: moment('2022-01-31 04:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true), // ignored in duplicate
    logout1: moment('2022-01-31 05:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true),
    logout2: moment('2022-01-31 06:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true),
    endQ2: '2022-01-31 23:59'
  };

  // Correct
  // setLoc1 -> logout1 4+24+5 = 33    available1 -> unavailable1 2+24+4 = 30
  // setLoc1 -> endQ1 4+24 = 28        available1 -> endQ1 2+24 = 26
  // startQ2 -> logout1 24+5 = 29      startQ2 -> unvailable1 24+4 = 28

  // Duplicate
  // setLoc1 -> logout1 4+24+5 = 33    available1 -> unavailable1 2+24+3 = 29
  // setLoc1 -> endQ1 4+24 = 28        available1 -> endQ1 2+24 = 26
  // startQ2 -> logout1 24+5 = 29      startQ2 -> unvailable2 24+3 = 27

  // 2 drivers in location
  // setLoc1 -> logout1 4+24+5 = 33    available1 -> unavailable1 2+24+4 = 30
  // setLoc1 -> endQ1 4+24 = 28        available1 -> endQ1 2+24 = 26
  // startQ2 -> logout1 24+5 = 29      startQ2 -> unvailable1 24+4 = 28

  // setLoc2 -> logout2 3+24+6 = 33    available2 -> unavailable2 1+24+3 = 28
  // setLoc2 -> endQ1 3+24 = 27        available2 -> endQ1 1+24 = 25
  // startQ2 -> logout2 24+6 = 30      startQ2 -> unvailable2 24+3 = 27

  const { accessToken: driver1Token } = await driverLogin('driver1@mail.com', 'Password1', app, request, domain);
  const { accessToken: driver2Token } = await driverLogin('driver2@mail.com', 'Password2', app, request, domain);
  await changeEvent(driverId1, 'LOGIN', 'LOGIN', dates.login);
  await changeEvent(driverId2, 'LOGIN', 'LOGIN', dates.login);

  await setLocation(location._id, driver1Token, app, request, domain);
  await setLocation(location._id, driver2Token, app, request, domain);
  await changeEvent(driverId1, 'LOCATION SET', 'LOCATION SET', dates.setLoc1);
  await changeEvent(driverId2, 'LOCATION SET', 'LOCATION SET', dates.setLoc2);

  await updateStatus(driver1Token, app, request, domain, { isAvailable: true });
  await updateStatus(driver2Token, app, request, domain, { isAvailable: true });
  const available1 = await changeEvent(driverId1, 'AVAILABLE', 'AVAILABLE', dates.available1);
  await changeEvent(driverId2, 'AVAILABLE', 'AVAILABLE', dates.available2);

  if (setup === 'duplicate') {
    await updateStatus(driver1Token, app, request, domain, { isAvailable: false });
    const available2 = await changeEvent(driverId1, 'UNAVAILABLE', 'AVAILABLE', dates.available2);

    await updateStatus(driver1Token, app, request, domain, { isAvailable: true });
    const unavailable1 = await changeEvent(
      driverId1, 'AVAILABLE', 'UNAVAILABLE', dates.unavailable1, [available1._id, available2._id]
    );

    await updateStatus(driver1Token, app, request, domain, { isAvailable: false });
    await changeEvent(driverId1, 'UNAVAILABLE', 'UNAVAILABLE', dates.unavailable2, [unavailable1._id]);
  } else {
    await updateStatus(driver1Token, app, request, domain, { isAvailable: false });
    await changeEvent(driverId1, 'UNAVAILABLE', 'UNAVAILABLE', dates.unavailable1);
  }

  await updateStatus(driver2Token, app, request, domain, { isAvailable: false });
  await changeEvent(driverId2, 'UNAVAILABLE', 'UNAVAILABLE', dates.unavailable2);

  await driverEndpoint('/v1/logout', 'post', driver1Token, app, request, domain, { deviceToken: driver1Token });
  await driverEndpoint('/v1/logout', 'post', driver2Token, app, request, domain, { deviceToken: driver2Token });
  await changeEvent(driverId1, 'LOGOUT', 'LOGOUT', dates.logout1);
  await changeEvent(driverId2, 'LOGOUT', 'LOGOUT', dates.logout2);
};

describe('Event hour count for drivers', () => {
  before(async () => {
    await emptyAllCollections();

    location = await Locations.createLocation({
      name: 'Location',
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      timezone: 'America/New_York',
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

    ({ adminToken } = await createAdminLogin());

    await Settings.deleteMany();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
    sandbox = sinon.createSandbox();
  });

  describe('Driver with correct events', () => {
    before(async () => {
      await setupScenario('correct');
    });

    it('Should have all events', async () => {
      setQueryRange(dates.startQ1, dates.endQ2);

      const { body: events } = await adminEndpoint(
        `/v1/events?${buildEventQuery()}`, 'get', adminToken, app, request, domain
      );
      const { body: { locationHours: loginHours } } = await adminEndpoint(
        `/v1/events/login-hours?${buildHourQuery()}`, 'get', adminToken, app, request, domain
      );
      const { body: { locationHours: availableHours } } = await adminEndpoint(
        `/v1/events/available-hours?${buildHourQuery()}`, 'get', adminToken, app, request, domain
      );

      const eventChecks = events.items.map(
        it => [it.eventType, it.eventData?.location]
      ).reverse();

      sinon.assert.match(
        [
          events.items.length,
          `${events.items[0].source.id}`,
          ...eventChecks
        ],
        [
          5,
          `${driverId1}`,
          ['LOGIN', undefined],
          ['LOCATION SET', `${location._id}`],
          ['AVAILABLE', `${location._id}`],
          ['UNAVAILABLE', `${location._id}`],
          ['LOGOUT', `${location._id}`]
        ]
      );

      return sinon.assert.match(
        [
          loginHours.location, availableHours.location,
          Math.ceil(loginHours.totalHours), Math.ceil(availableHours.totalHours)
        ],
        [
          `${location._id}`, `${location._id}`,
          33, 30
        ]
      );
    });
    it('Should have logout and unavailable events missing', async () => {
      setQueryRange(dates.startQ1, dates.endQ1);

      const { body: events } = await adminEndpoint(
        `/v1/events?${buildEventQuery()}`, 'get', adminToken, app, request, domain
      );
      const { body: { locationHours: loginHours } } = await adminEndpoint(
        `/v1/events/login-hours?${buildHourQuery()}`, 'get', adminToken, app, request, domain
      );
      const { body: { locationHours: availableHours } } = await adminEndpoint(
        `/v1/events/available-hours?${buildHourQuery()}`, 'get', adminToken, app, request, domain
      );

      const eventChecks = events.items.map(
        it => [it.eventType, it.eventData?.location]
      ).reverse();

      sinon.assert.match(
        [
          events.items.length,
          `${events.items[0].source.id}`,
          ['LOGIN', undefined],
          ['LOCATION SET', `${location._id}`],
          ['AVAILABLE', `${location._id}`]
        ],
        [
          3,
          `${driverId1}`,
          ...eventChecks
        ]
      );

      return sinon.assert.match(
        [
          loginHours.location, availableHours.location,
          Math.ceil(loginHours.totalHours), Math.ceil(availableHours.totalHours)
        ],
        [
          `${location._id}`, `${location._id}`,
          28, 26
        ]
      );
    });
    it('Should have login, set location and available events missing', async () => {
      setQueryRange(dates.startQ2, dates.endQ2);

      const { body: events } = await adminEndpoint(
        `/v1/events?${buildEventQuery()}`, 'get', adminToken, app, request, domain
      );
      const { body: { locationHours: loginHours } } = await adminEndpoint(
        `/v1/events/login-hours?${buildHourQuery()}`, 'get', adminToken, app, request, domain
      );
      const { body: { locationHours: availableHours } } = await adminEndpoint(
        `/v1/events/available-hours?${buildHourQuery()}`, 'get', adminToken, app, request, domain
      );

      const eventChecks = events.items.map(
        it => [it.eventType, it.eventData?.location]
      ).reverse();

      sinon.assert.match(
        [
          events.items.length,
          `${events.items[0].source.id}`,
          ...eventChecks
        ],
        [
          2,
          `${driverId1}`,
          ['UNAVAILABLE', `${location._id}`],
          ['LOGOUT', `${location._id}`]
        ]
      );

      return sinon.assert.match(
        [
          loginHours.location, availableHours.location,
          Math.ceil(loginHours.totalHours), Math.ceil(availableHours.totalHours)
        ],
        [
          `${location._id}`, `${location._id}`,
          29, 28
        ]
      );
    });
  });
  describe('Driver with unmatched events', () => {
    before(async () => {
      await setupScenario('duplicate');
    });

    it('Should have all events', async () => {
      setQueryRange(dates.startQ1, dates.endQ2);

      const { body: events } = await adminEndpoint(
        `/v1/events?${buildEventQuery()}`, 'get', adminToken, app, request, domain
      );
      const { body: { locationHours: loginHours } } = await adminEndpoint(
        `/v1/events/login-hours?${buildHourQuery()}`, 'get', adminToken, app, request, domain
      );
      const { body: { locationHours: availableHours } } = await adminEndpoint(
        `/v1/events/available-hours?${buildHourQuery()}`, 'get', adminToken, app, request, domain
      );

      const eventChecks = events.items.map(
        it => [it.eventType, it.eventData?.location]
      ).reverse();

      sinon.assert.match(
        [
          events.items.length,
          `${events.items[0].source.id}`,
          ...eventChecks
        ],
        [
          7,
          `${driverId1}`,
          ['LOGIN', undefined],
          ['LOCATION SET', `${location._id}`],
          ['AVAILABLE', `${location._id}`],
          ['AVAILABLE', `${location._id}`],
          ['UNAVAILABLE', `${location._id}`],
          ['UNAVAILABLE', `${location._id}`],
          ['LOGOUT', `${location._id}`]
        ]
      );

      return sinon.assert.match(
        [
          loginHours.location, availableHours.location,
          Math.ceil(loginHours.totalHours), Math.ceil(availableHours.totalHours)
        ],
        [
          `${location._id}`, `${location._id}`,
          33, 29
        ]
      );
    });
    it('Should have logout and unavailable events missing', async () => {
      setQueryRange(dates.startQ1, dates.endQ1);

      const { body: events } = await adminEndpoint(
        `/v1/events?${buildEventQuery()}`, 'get', adminToken, app, request, domain
      );
      const { body: { locationHours: loginHours } } = await adminEndpoint(
        `/v1/events/login-hours?${buildHourQuery()}`, 'get', adminToken, app, request, domain
      );
      const { body: { locationHours: availableHours } } = await adminEndpoint(
        `/v1/events/available-hours?${buildHourQuery()}`, 'get', adminToken, app, request, domain
      );

      const eventChecks = events.items.map(
        it => [it.eventType, it.eventData?.location]
      ).reverse();

      sinon.assert.match(
        [
          events.items.length,
          `${events.items[0].source.id}`,
          ...eventChecks
        ],
        [
          4,
          `${driverId1}`,
          ['LOGIN', undefined],
          ['LOCATION SET', `${location._id}`],
          ['AVAILABLE', `${location._id}`],
          ['AVAILABLE', `${location._id}`]
        ]
      );
      return sinon.assert.match(
        [
          loginHours.location, availableHours.location,
          Math.ceil(loginHours.totalHours), Math.ceil(availableHours.totalHours)
        ],
        [
          `${location._id}`, `${location._id}`,
          28, 26
        ]
      );
    });
    it('Should have login, set location and available events missing', async () => {
      setQueryRange(dates.startQ2, dates.endQ2);

      const { body: events } = await adminEndpoint(
        `/v1/events?${buildEventQuery()}`, 'get', adminToken, app, request, domain
      );
      const { body: { locationHours: loginHours } } = await adminEndpoint(
        `/v1/events/login-hours?${buildHourQuery()}`, 'get', adminToken, app, request, domain
      );
      const { body: { locationHours: availableHours } } = await adminEndpoint(
        `/v1/events/available-hours?${buildHourQuery()}`, 'get', adminToken, app, request, domain
      );

      const eventChecks = events.items.map(
        it => [it.eventType, it.eventData?.location]
      ).reverse();

      sinon.assert.match(
        [
          events.items.length,
          `${events.items[0].source.id}`,
          ...eventChecks
        ],
        [
          3,
          `${driverId1}`,
          ['UNAVAILABLE', `${location._id}`],
          ['UNAVAILABLE', `${location._id}`],
          ['LOGOUT', `${location._id}`]
        ]
      );

      return sinon.assert.match(
        [
          loginHours.location, availableHours.location,
          Math.ceil(loginHours.totalHours), Math.ceil(availableHours.totalHours)
        ],
        [
          `${location._id}`, `${location._id}`,
          29, 27
        ]
      );
    });
  });

  describe('Location driver logged-in hours', () => {
    before(async () => {
      await setupScenario('location');
      location = await Locations.createLocation({
        name: 'Location 2',
        isADA: false,
        isUsingServiceTimes: false,
        isActive: true,
        timezone: 'America/New_York',
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
    });

    it('Should have all events', async () => {
      setQueryRange(dates.startQ1, dates.endQ2);

      const { body: { locationHours: loginHours } } = await adminEndpoint(
        `/v1/events/login-hours?${buildHourQuery()}`, 'get', adminToken, app, request, domain
      );
      const { body: { locationHours: availableHours } } = await adminEndpoint(
        `/v1/events/available-hours?${buildHourQuery()}`, 'get', adminToken, app, request, domain
      );

      return sinon.assert.match(
        [
          Math.ceil(loginHours.totalHours), Math.ceil(availableHours.totalHours),
          Math.ceil(loginHours.individualHours.filter(it => it.id === `${driverId1}`)[0].totalHours),
          Math.ceil(availableHours.individualHours.filter(it => it.id === `${driverId1}`)[0].totalHours),
          Math.ceil(loginHours.individualHours.filter(it => it.id === `${driverId2}`)[0].totalHours),
          Math.ceil(availableHours.individualHours.filter(it => it.id === `${driverId2}`)[0].totalHours)
        ],
        [
          66, 58,
          33, 30,
          33, 28
        ]
      );
    });

    it('Should have logout and unavailable events missing', async () => {
      setQueryRange(dates.startQ1, dates.endQ1);

      const { body: { locationHours: loginHours } } = await adminEndpoint(
        `/v1/events/login-hours?${buildHourQuery()}`, 'get', adminToken, app, request, domain
      );
      const { body: { locationHours: availableHours } } = await adminEndpoint(
        `/v1/events/available-hours?${buildHourQuery()}`, 'get', adminToken, app, request, domain
      );

      return sinon.assert.match(
        [
          Math.ceil(loginHours.totalHours), Math.ceil(availableHours.totalHours),
          Math.ceil(loginHours.individualHours.filter(it => it.id === `${driverId1}`)[0].totalHours),
          Math.ceil(availableHours.individualHours.filter(it => it.id === `${driverId1}`)[0].totalHours),
          Math.ceil(loginHours.individualHours.filter(it => it.id === `${driverId2}`)[0].totalHours),
          Math.ceil(availableHours.individualHours.filter(it => it.id === `${driverId2}`)[0].totalHours)
        ],
        [
          55, 51,
          28, 26,
          27, 25
        ]
      );
    });

    it('Should have login, set location and available events missing', async () => {
      setQueryRange(dates.startQ2, dates.endQ2);

      const { body: { locationHours: loginHours } } = await adminEndpoint(
        `/v1/events/login-hours?${buildHourQuery()}`, 'get', adminToken, app, request, domain
      );
      const { body: { locationHours: availableHours } } = await adminEndpoint(
        `/v1/events/available-hours?${buildHourQuery()}`, 'get', adminToken, app, request, domain
      );

      return sinon.assert.match(
        [
          Math.ceil(loginHours.totalHours), Math.ceil(availableHours.totalHours),
          Math.ceil(loginHours.individualHours.filter(it => it.id === `${driverId1}`)[0].totalHours),
          Math.ceil(availableHours.individualHours.filter(it => it.id === `${driverId1}`)[0].totalHours),
          Math.ceil(loginHours.individualHours.filter(it => it.id === `${driverId2}`)[0].totalHours),
          Math.ceil(availableHours.individualHours.filter(it => it.id === `${driverId2}`)[0].totalHours)
        ],
        [
          59, 55,
          29, 28,
          30, 27
        ]
      );
    });

    it('Should have location metrics', async () => {
      setQueryRange(dates.startQ1, dates.endQ2);

      const { body: { driverHours } } = await adminEndpoint(
        `/v1/stats/driver-hours?${buildLocationQuery()}`, 'get', adminToken, app, request, domain
      );

      const loc1 = driverHours.find(loc => loc.city === 'Location');
      const loc2 = driverHours.find(loc => loc.city === 'Location 2');

      return sinon.assert.match(
        [
          loc1.city, loc2.city,
          Math.ceil(loc1.loginHours.totalHours), Math.ceil(loc2.loginHours.totalHours),
          Math.ceil(loc1.availableHours.totalHours), Math.ceil(loc2.availableHours.totalHours),
          loc1.individualHours.length, loc2.individualHours.length,
          Math.ceil(loc1.individualHours.find(it => it.id === `${driverId1}`).loginHours),
          Math.ceil(loc1.individualHours.find(it => it.id === `${driverId2}`).loginHours),
          Math.ceil(loc1.individualHours.find(it => it.id === `${driverId1}`).availableHours),
          Math.ceil(loc1.individualHours.find(it => it.id === `${driverId2}`).availableHours)
        ],
        [
          'Location', 'Location 2',
          66, 0,
          58, 0,
          2, 0,
          33, 33,
          30, 28
        ]
      );
    });

    it('Should have only login hours for one driver', async () => {
      setQueryRange(dates.startQ1b, dates.endQ1);

      const { body: { driverHours } } = await adminEndpoint(
        `/v1/stats/driver-hours?${buildLocationQuery()}`, 'get', adminToken, app, request, domain
      );

      const loc1 = driverHours.find(loc => loc.city === 'Location');
      const loc2 = driverHours.find(loc => loc.city === 'Location 2');

      return sinon.assert.match(
        [
          loc1.city, loc2.city,
          Math.ceil(loc1.loginHours.totalHours), Math.ceil(loc2.loginHours.totalHours),
          Math.ceil(loc1.availableHours.totalHours), Math.ceil(loc2.availableHours.totalHours),
          loc1.individualHours.length, loc2.individualHours.length,
          ...loc1.individualHours.map(driv => driv.name),
          Math.ceil(loc1.individualHours.find(it => it.id === `${driverId1}`).loginHours),
          Math.ceil(loc1.individualHours.find(it => it.id === `${driverId2}`).loginHours),
          Math.ceil(loc1.individualHours.find(it => it.id === `${driverId1}`).availableHours),
          Math.ceil(loc1.individualHours.find(it => it.id === `${driverId2}`).availableHours)
        ],
        [
          'Location', 'Location 2',
          27, 0,
          51, 0,
          2, 0,
          'Driver FN Driver LN', 'Driver FN Driver LN',
          0, 27,
          26, 25
        ]
      );
    });
  });
});
