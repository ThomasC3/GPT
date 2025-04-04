import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import moment from 'moment';
import csv from 'csv';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import {
  Drivers, Locations, Riders,
  Tips, Rides, Settings, PaymentStatus
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { stripe } from '../../services';

import {
  createRiderLogin, riderEndpoint, createRequest, getPaymentSettings, tip
} from '../utils/rider';
import { createDriverLogin, pickUp, dropOff } from '../utils/driver';
import { createAdminLogin, adminEndpoint } from '../utils/admin';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let driver;
let driver2;
let driverSocket;
let driver2Socket;
let rider;
let riderSocket;
let sandbox;
let location;
let ride;
let ride2;
let ride3;
let developer;
let confirmedTip2;
let location2;

const keyLoc = {
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

describe('Admin - Driver tips', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    driver2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

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

    location2 = await Locations.createLocation({
      name: 'Location 2',
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
      firstName: 'ZDriver FN',
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
    rider = await createRiderLogin({
      firstName: 'Rider FN',
      lastName: 'Rider LN',
      location: location._id,
      dob: '2000-12-11',
      email: 'rider1@mail.com',
      password: 'Password1'
    }, app, request, domain, riderSocket);

    // Set stripe customer and add payment method
    const paymentInformation = await getPaymentSettings(rider.riderToken, app, request, domain);
    rider.rider = await Riders.findOne({ _id: rider.rider._id });
    if (!paymentInformation.stripePaymentMethods.length) {
      await stripe.attachPaymentMethod(rider.rider.stripeCustomerId, 'pm_card_visa_debit');
    }

    // Create ride to match with first driver
    await createRequest(
      rider.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
    );
    await driverSearcher.search();
    ride = await Rides.findOne({ rider: rider.rider._id });
    await pickUp(driver.driverToken, ride, app, request, domain);
    await dropOff(driver.driverToken, ride, app, request, domain);

    const driverObject = await Drivers.findOne({ _id: driver.driver._id });
    driverObject.isOnline = false;
    driver.driver = await driverObject.save();

    driver2 = await createDriverLogin({
      firstName: 'Driver FN2',
      lastName: 'Driver LN2',
      email: 'some2@mail.com',
      zip: 10001,
      phone: 123456789,
      isOnline: true,
      isTemporaryPassword: false,
      password: 'Password2',
      dob: '2000-12-11',
      currentLocation: {
        coordinates: [keyLoc.req1p[1], keyLoc.req1p[0]],
        type: 'Point'
      },
      locations: [location._id]
    }, app, request, domain, driver2Socket);

    // Create ride to match with second driver
    await createRequest(
      rider.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
    );
    await driverSearcher.search();
    ride2 = await Rides.findOne({ rider: rider.rider._id, driver: driver2.driver._id });
    await pickUp(driver2.driverToken, ride2, app, request, domain);
    await dropOff(driver2.driverToken, ride2, app, request, domain);

    // Create another ride to match with second driver
    await createRequest(
      rider.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
    );
    await driverSearcher.search();
    ride3 = await Rides.findOne(
      { status: { $ne: 700 }, rider: rider.rider._id, driver: driver2.driver._id }
    );
    await pickUp(driver2.driverToken, ride3, app, request, domain);
    await dropOff(driver2.driverToken, ride3, app, request, domain);

    // create admin
    developer = await createAdminLogin();

    // Create pending tip
    let tipData = {
      rideId: ride2._id,
      tipAmount: 500
    };
    await riderEndpoint('/v1/tip', 'post', rider.riderToken, app, request, domain, tipData);

    tipData = {
      rideId: ride._id,
      tipAmount: 500
    };
    await riderEndpoint('/v1/tip', 'post', rider.riderToken, app, request, domain, tipData);

    // Create and confirm tip
    const { paymentIntentId } = await tip(rider.riderToken, app, request, domain, ride._id, 500);
    const confirmedTip = await Tips.findOne({ paymentIntentId });
    sinon.assert.match(confirmedTip.status, PaymentStatus.properties[PaymentStatus.succeeded].name);

    const allTips = await Tips.find({ rideId: tipData.rideId });
    sinon.assert.match(allTips.length, 2);

    // Add fee and net to tip
    confirmedTip.fee = 45;
    confirmedTip.net = 455;
    await confirmedTip.save();

    // Create and confirm tip
    const {
      paymentIntentId: paymentIntentId2
    } = await tip(rider.riderToken, app, request, domain, ride3._id, 500);
    confirmedTip2 = await Tips.findOne({ paymentIntentId: paymentIntentId2 });
    sinon.assert.match(
      confirmedTip2.status,
      PaymentStatus.properties[PaymentStatus.succeeded].name
    );

    // Add fee and net to tip
    confirmedTip2.fee = 45;
    confirmedTip2.net = 455;
    await confirmedTip2.save();
  });

  beforeEach(async () => {
    sandbox.restore();

    driver.driverSocket.removeAllListeners();
    rider.riderSocket.removeAllListeners();

    await Drivers.syncIndexes();
    await Locations.syncIndexes();
  });

  describe('Admin driver tips', () => {
    it('Should show tips in ride list', async () => {
      // Get Ride list with tips
      const response = await adminEndpoint('/v1/rides', 'get', developer.adminToken, app, request, domain);
      const { items: rides, tipTotal } = response.body;

      sinon.assert.match(
        [
          rides[0].tips.length, `${rides[0]._id}`,
          rides[0].tips[0].status, rides[0].tips[0].total, rides[0].tips[0].currency,
          `${rides[0].tips[0].driverFirstName} ${rides[0].tips[0].driverLastName}`,
          rides[1].tips.length, `${rides[1]._id}`,
          rides[2].tips.length, `${rides[2]._id}`,
          rides[2].tips[0].status, rides[2].tips[0].total, rides[2].tips[0].currency,
          `${rides[2].tips[0].driverFirstName} ${rides[2].tips[0].driverLastName}`
        ],
        [
          1, `${ride3._id}`,
          'succeeded', 500, 'usd', 'Driver FN2 Driver LN2',
          0, `${ride2._id}`,
          1, `${ride._id}`,
          'succeeded', 500, 'usd', 'ZDriver FN Driver LN'
        ]
      );
      sinon.assert.match(
        [
          tipTotal.total,
          tipTotal.totalView,
          tipTotal.net,
          tipTotal.netView,
          tipTotal.fee,
          tipTotal.feeView
        ],
        [1000, 1000, 910, 910, 90, 90]
      );

      // Get Ride with tips
      const ride1 = await Rides.getRide({ _id: ride._id });
      return sinon.assert.match(
        [
          `${ride1._id}`,
          ride1.tips.length,
          ride1.tips[0].status,
          ride1.tips[0].total,
          ride1.tips[0].net,
          ride1.tips[0].fee,
          ride1.tips[0].currency],
        [
          `${ride1._id}`,
          1,
          'succeeded',
          500,
          455,
          45,
          'usd'
        ]
      );
    });
    it('Should show tips in tip list', async () => {
      // Get tip list
      const { body: { items: tips, driverStats } } = await adminEndpoint(
        `/v1/tips?locationId=${location._id}`,
        'get', developer.adminToken, app, request, domain
      );

      return sinon.assert.match(
        [
          // driverStats sorted by driver name
          driverStats[0].total, `${driverStats[0].driverFirstName} ${driverStats[0].driverLastName}`,
          driverStats[1].total, `${driverStats[1].driverFirstName} ${driverStats[1].driverLastName}`,
          // tips sorted by timestamp
          tips.length,
          tips[0].total,
          tips[0].currency,
          tips[0].status,
          `${tips[0].driverFirstName} ${tips[0].driverLastName}`,
          `${tips[0].riderFirstName} ${tips[0].riderLastName}`,
          tips[1].status,
          `${tips[1].driverFirstName} ${tips[1].driverLastName}`,
          `${tips[1].riderFirstName} ${tips[1].riderLastName}`,
          tips[2].status,
          `${tips[2].driverFirstName} ${tips[2].driverLastName}`,
          `${tips[2].riderFirstName} ${tips[2].riderLastName}`,
          tips[3].status,
          `${tips[3].driverFirstName} ${tips[3].driverLastName}`,
          `${tips[3].riderFirstName} ${tips[3].riderLastName}`
        ],
        [
          500, 'Driver FN2 Driver LN2',
          500, 'ZDriver FN Driver LN',
          4,
          500, 'usd', 'succeeded', 'Driver FN2 Driver LN2', 'Rider FN Rider LN',
          'succeeded', 'ZDriver FN Driver LN', 'Rider FN Rider LN',
          'canceled', 'ZDriver FN Driver LN', 'Rider FN Rider LN',
          'requires_confirmation', 'Driver FN2 Driver LN2', 'Rider FN Rider LN'
        ]
      );
    });
    it('Should filter per driver in tips', async () => {
      const response = await adminEndpoint(
        `/v1/tips?locationId=${location._id}&driverId=${driver2.driver._id}`,
        'get', developer.adminToken, app, request, domain
      );
      const tips = response.body.items;
      return sinon.assert.match(
        [
          tips.length,
          tips[0].total, tips[0].currency, tips[0].status,
          `${tips[0].driverFirstName} ${tips[0].driverLastName}`,
          `${tips[0].riderFirstName} ${tips[0].riderLastName}`,
          tips[1].total, tips[1].currency, tips[1].status,
          `${tips[1].driverFirstName} ${tips[1].driverLastName}`,
          `${tips[1].riderFirstName} ${tips[1].riderLastName}`
        ],
        [
          2,
          500, 'usd', 'succeeded', 'Driver FN2 Driver LN2', 'Rider FN Rider LN',
          500, 'usd', 'requires_confirmation', 'Driver FN2 Driver LN2', 'Rider FN Rider LN'
        ]
      );
    });
    it('Should show driver stats in tips', async () => {
      const response = await adminEndpoint(
        `/v1/tips?locationId=${location._id}`,
        'get', developer.adminToken, app, request, domain
      );
      const { items: tips, driverStats } = response.body;
      sinon.assert.match(
        [
          // driverStats sorted by driver name
          driverStats.length,
          driverStats[0].total,
          `${driverStats[0].driverFirstName} ${driverStats[0].driverLastName}`,
          driverStats[1].total,
          `${driverStats[1].driverFirstName} ${driverStats[1].driverLastName}`
        ],
        [
          2,
          500, 'Driver FN2 Driver LN2',
          500, 'ZDriver FN Driver LN'
        ]
      );
      return sinon.assert.match(
        [
          tips.length,
          tips[0].total,
          tips[0].currency,
          tips[0].status,
          `${tips[0].driverFirstName} ${tips[0].driverLastName}`,
          `${tips[0].riderFirstName} ${tips[0].riderLastName}`
        ],
        [
          4,
          500,
          'usd',
          'succeeded',
          'Driver FN2 Driver LN2',
          'Rider FN Rider LN'
        ]
      );
    });
    it('Should show tip stats in payment stats', async () => {
      const start = encodeURI(moment().subtract(1, 'day').format('YYYY-MM-DD'));
      const end = encodeURI(moment().add(1, 'day').format('YYYY-MM-DD'));
      const response = await adminEndpoint(
        `/v1/stats/tips?filters%5Bstart%5D=${start}%2000%3A00&filters%5Bend%5D=${end}%2023%3A59`,
        'get', developer.adminToken, app, request, domain
      );
      const { tipStats } = response.body;
      const location1TipStats = tipStats.find(tipStat => tipStat.city === location.name);
      const location2TipStats = tipStats.find(tipStat => tipStat.city === location2.name);
      sinon.assert.match(
        [
          location1TipStats.city,
          location1TipStats.tipTotal,
          location1TipStats.tipPerc,
          location1TipStats.rideCount,
          location1TipStats.tipCount
        ],
        [
          location.name,
          1000,
          67,
          3,
          2
        ]
      );

      return sinon.assert.match(
        [
          location2TipStats.city,
          location2TipStats.tipTotal,
          location2TipStats.tipPerc,
          location2TipStats.rideCount,
          location2TipStats.tipCount
        ],
        [
          location2.name,
          0,
          '--',
          0,
          0
        ]
      );
    });
    it('Should download tip csv', async () => {
      const start = encodeURI(moment().subtract(1, 'day').format('YYYY-MM-DD'));
      const end = encodeURI(moment().add(1, 'day').format('YYYY-MM-DD'));
      const url = `/v1/csvtips?createdTimestamp%5Bstart%5D=${start}%2000%3A00&createdTimestamp%5Bend%5D=${end}%2023%3A59&locationId=${location._id}`;

      const headers = {
        host: domain.admin,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${developer.adminToken}`
      };

      const csvFile = await new Promise((resolve) => {
        request(app).get(url)
          .set(headers)
          .pipe(csv.parse((parseErr, records) => resolve(records)));
      }).then(data => data);

      // timestamps
      const createdTimestamp = moment(confirmedTip2.createdTimestamp).tz('America/New_York').format('MM/DD/YYYY HH:mm');
      const {
        total, net, fee, currency
      } = confirmedTip2;

      return sinon.assert.match(
        [
          csvFile.length,
          csvFile[0],
          csvFile[1]
        ],
        [
          5,
          [
            'index', 'status', 'driverFirstName',
            'driverLastName', 'driverId',
            'createdTimestamp', 'total', 'net',
            'fee', 'currency', 'riderFirstName',
            'riderLastName', 'riderId', 'rideId'
          ],
          [
            '1', 'succeeded', `${driver2.driver.firstName}`,
            `${driver2.driver.lastName}`, `${driver2.driver._id}`,
            createdTimestamp, `${total}`, `${net}`,
            `${fee}`, currency, `${rider.rider.firstName}`,
            `${rider.rider.lastName}`, `${rider.rider._id}`, `${ride3._id}`
          ]
        ]
      );
    });
  });
});
