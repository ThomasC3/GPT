import sinon from 'sinon';
import moment from 'moment-timezone';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import {
  Drivers, Locations,
  Tips, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

import { createDriverLogin, driverEndpoint } from '../utils/driver';
import { getLastMonthsAndCurrent, getMonthYearList } from '../../utils/time';
import { mapDateSearchAggregate } from '../../utils/transformations';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let driver;
let driverSocket;
let sandbox;
let location;

const keyLoc = {
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

describe('Driver tips statistics', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      isUsingServiceTimes: false,
      isActive: true,
      tipEnabled: true,
      tipInformation: {
        tipOptions: [100, 500, 1000],
        maxCustomValue: 10000,
        currency: 'usd'
      },
      serviceArea: [
        { longitude: -73.978573, latitude: 40.721239 },
        { longitude: -73.882936, latitude: 40.698337 },
        { longitude: -73.918642, latitude: 40.629585 },
        { longitude: -73.978573, latitude: 40.660845 },
        { longitude: -73.978573, latitude: 40.721239 }
      ],
      advertisement: {
        imageUrl: 'https://example.com/a.jpg',
        url: 'https://www.ridecircuit.com',
        ageRestriction: 21
      },
      serviceHours: []
    });

    driver = await createDriverLogin({
      firstName: 'Driver FN',
      lastName: 'Driver LN',
      email: 'some@mail.com',
      zip: 10001,
      phone: 123456789,
      isOnline: true,
      isTemporaryPassword: false,
      password: 'Password1',
      dob: '2000-12-11',
      currentLocation: {
        coordinates: [keyLoc.req1p[1], keyLoc.req1p[0]],
        type: 'Point'
      },
      locations: [location._id]
    }, app, request, domain, driverSocket);

    const tipData = {
      paymentIntentId: 'pi_XXXXX',
      balanceTransactionId: null,
      clientSecret: null,
      status: 'succeeded',
      currency: 'usd',
      total: 500,
      net: 455,
      fee: 45,
      // Actors
      rideId: null,
      riderId: null,
      driverId: driver.driver._id,
      waitingPaymentConfirmation: false
    };
    // Single in feb 2020
    await Tips.create({
      ...tipData,
      createdTimestamp: moment.tz('2020-02-01T01:00:00', 'America/New_York').utc().toDate()
    });
    // Current month = 1000
    await Tips.create({
      ...tipData,
      createdTimestamp: moment.tz('2020-01-01T01:00:00', 'America/New_York').utc().toDate()
    });
    await Tips.create({
      ...tipData,
      createdTimestamp: moment.tz('2020-01-01T02:00:00', 'America/New_York').utc().toDate()
    });
    // Previous month = 2000
    await Tips.create({
      ...tipData,
      createdTimestamp: moment.tz('2019-12-01T01:00:00', 'America/New_York').utc().toDate()
    });
    await Tips.create({
      ...tipData,
      createdTimestamp: moment.tz('2019-12-01T02:00:00', 'America/New_York').utc().toDate()
    });
    await Tips.create({
      ...tipData,
      createdTimestamp: moment.tz('2019-12-01T03:00:00', 'America/New_York').utc().toDate()
    });
    await Tips.create({
      ...tipData,
      createdTimestamp: moment.tz('2019-12-01T04:00:00', 'America/New_York').utc().toDate()
    });
    // Two months prior = 1500
    await Tips.create({
      ...tipData,
      createdTimestamp: moment.tz('2019-11-01T01:00:00', 'America/New_York').utc().toDate()
    });
    await Tips.create({
      ...tipData,
      createdTimestamp: moment.tz('2019-11-01T02:00:00', 'America/New_York').utc().toDate()
    });
    await Tips.create({
      ...tipData,
      createdTimestamp: moment.tz('2019-11-01T03:00:00', 'America/New_York').utc().toDate()
    });
    await Tips.create({
      ...tipData,
      currency: 'eur',
      createdTimestamp: moment.tz('2019-12-01T01:00:00', 'America/New_York').utc().toDate()
    });
  });

  beforeEach(async () => {
    sandbox.restore();
    driver.driverSocket.removeAllListeners();
    await Drivers.syncIndexes();
    await Locations.syncIndexes();
  });

  describe('Group driver tips monthly', () => {
    it('Should get correct span', async () => {
      const now = moment.tz('2020-01-01T00:00:00', 'America/New_York');
      sinon.assert.match([
        now.format('YYYY-MM-DD HH:mm'),
        now.clone().utc().format('YYYY-MM-DD HH:mm')
      ], [
        '2020-01-01 00:00',
        '2020-01-01 05:00'
      ]);

      const span = getLastMonthsAndCurrent(2, now);
      sinon.assert.match([
        span.start.format('DD/MM/YYYY HH:mm:ss'),
        span.end.format('DD/MM/YYYY HH:mm:ss')
      ],
      [
        '01/11/2019 00:00:00',
        '31/01/2020 23:59:59'
      ]);

      const timezoneSpanUtc = mapDateSearchAggregate(span);
      sinon.assert.match([
        timezoneSpanUtc.$gte.toISOString(),
        timezoneSpanUtc.$lt.toISOString()
      ],
      [
        '2019-11-01T04:00:00.000Z',
        '2020-02-01T04:59:59.999Z'
      ]);
    });
    it('Should get correct months in year list', async () => {
      const now = moment.tz('2020-01-01T00:00:00', 'America/New_York');
      const span = getLastMonthsAndCurrent(2, now);
      const monthsInSpan = getMonthYearList(span.start, span.end);
      sinon.assert.match(
        monthsInSpan,
        [
          { month: 11, year: 2019, monthName: 'November' },
          { month: 12, year: 2019, monthName: 'December' },
          { month: 1, year: 2020, monthName: 'January' }
        ]
      );
    });
    it('Should get correct driver tips response for older date', async () => {
      const { body: tips } = await driverEndpoint(
        '/v1/driver/tips?refDate=2020-01-01T00:00:00',
        'get', driver.driverToken, app, request, domain
      );
      sinon.assert.match(
        tips,
        [
          {
            fee: 90, month: 'January', net: 910, value: 1000, year: 2020, currency: 'usd'
          },
          {
            fee: 180, month: 'December', net: 1820, value: 2000, year: 2019, currency: 'usd'
          }
        ]
      );
    });
    it('Should get correct driver tips (net, fee, total) for Feb', async () => {
      const { body: tips } = await driverEndpoint(
        '/v1/driver/tips?refDate=2020-03-01T00:00:00',
        'get', driver.driverToken, app, request, domain
      );
      sinon.assert.match(
        tips,
        [
          {
            fee: 0, month: 'March', net: 0, value: 0, year: 2020, currency: 'usd'
          },
          {
            fee: 45, month: 'February', net: 455, value: 500, year: 2020, currency: 'usd'
          }
        ]
      );
    });
    it('Should get correct driver tips for current date', async () => {
      const { body: tips } = await driverEndpoint('/v1/driver/tips', 'get', driver.driverToken, app, request, domain);
      const now = moment.tz('America/New_York');
      const lastMonth = moment.tz('America/New_York').subtract(1, 'month');
      sinon.assert.match(
        tips,
        [
          {
            month: now.format('MMMM'), year: now.year(), value: 0, fee: 0, net: 0, currency: 'usd'
          },
          {
            month: lastMonth.format('MMMM'), year: lastMonth.year(), value: 0, fee: 0, net: 0, currency: 'usd'
          }
        ]
      );
    });
  });
});
