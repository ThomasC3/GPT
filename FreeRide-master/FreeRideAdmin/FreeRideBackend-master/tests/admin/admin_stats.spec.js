/* eslint-disable no-await-in-loop */

import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import moment from 'moment';
import app from '../../server';
import { port, domain } from '../../config';
import {
  Riders, Rides,
  Locations, Requests,
  PaymentStatus, Promocodes, Settings
} from '../../models';
import { stripe } from '../../services';
import { calcETAmetrics } from '../../utils/ride';
import { emptyAllCollections } from '../utils/helper';

import {
  createRequest,
  createRiderLogin,
  cancelRequest,
  getPaymentSettings,
  riderConfirmPaymentIntent,
  tip,
  riderApprovePayment
} from '../utils/rider';

import {
  pickUp,
  dropOff,
  createDriverLogin
} from '../utils/driver';

import {
  createAdminLogin,
  adminEndpoint
} from '../utils/admin';

import driverSearcher from '../../services/driverSearch';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

const REFUNDED_STATUS_NAME = PaymentStatus.properties[PaymentStatus.refunded].name;

let driver1;
let driver1Socket;
let driver1Token;

let developerToken;

let rider1;
let rider1Socket;
let rider1Token;
let ride1;
let ride3;

let rider2;
let rider2Socket;
let rider2Token;
let ride2;

let location1;
let location2;

let promocode;

let etaMetrics;

const keyLoc = {
  // Driver 1
  d1a: [40.194478, -8.404691, 'Leroy Merlin'],
  d1b: [40.198857, -8.40275, 'Via lusitania'],
  // Request 1
  req1p: [40.19689, -8.402655, 'Minipreco'],
  req1d: [40.2041, -8.404072, 'McDonalds']
};

const locationInfo = {
  isUsingServiceTimes: false,
  isActive: true,
  poolingEnabled: true,
  timezone: 'Europe/Lisbon',
  serviceArea: [
    {
      latitude: 40.2246842,
      longitude: -8.4420742
    },
    {
      latitude: 40.2238472,
      longitude: -8.3978139
    },
    {
      latitude: 40.1860998,
      longitude: -8.3972703
    },
    {
      latitude: 40.189714,
      longitude: -8.430009
    },
    {
      latitude: 40.2246842,
      longitude: -8.4420742
    }
  ]
};

const defaultDriverInfo = {
  email: 'some@mail.com',
  dob: '2000-12-11',
  currentLocation: {
    coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
    type: 'Point'
  }
};

const defaultRiderInfo = {
  firstName: 'Rider FN',
  lastName: 'Rider LN',
  dob: '2000-12-11'
};

describe('Admin stats', () => {
  before(async () => {
    driver1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location1 = await Locations.createLocation({ name: 'ZLocation', ...locationInfo });
    location2 = await Locations.createLocation({
      name: 'Paid location',
      paymentInformation: {
        ridePrice: 100,
        capEnabled: false,
        priceCap: 50,
        pricePerHead: 50,
        currency: 'usd'
      },
      paymentEnabled: true,
      tipInformation: {
        tipOptions: [100, 500, 1000],
        maxCustomValue: 2000,
        currency: 'usd'
      },
      tipEnabled: true,
      ...locationInfo
    });

    ({
      driver: driver1, driverSocket: driver1Socket, driverToken: driver1Token
    } = await createDriverLogin(
      { ...defaultDriverInfo, locations: [location1._id] }, app, request, domain, driver1Socket
    ));

    ({ rider: rider1, riderToken: rider1Token } = await createRiderLogin(
      { email: 'rider1@mail.com', password: 'Password1', ...defaultRiderInfo }, app, request, domain, rider1Socket
    ));
    ({ rider: rider2, riderToken: rider2Token } = await createRiderLogin(
      { email: 'rider2@mail.com', password: 'Password2', ...defaultRiderInfo }, app, request, domain, rider2Socket
    ));

    ({ adminToken: developerToken } = await createAdminLogin());

    // ====================
    // Location 1
    //   - 3 rides (3 completed with ratings)
    //   - 7 requests (3 successful, 2 cancelled by rider, 1 cancelled duplicate, 1 missed)
    // ====================
    await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location1, app, request, domain);
    await driverSearcher.search();
    ride1 = await Rides.findOne({ rider: rider1 });
    sinon.assert.match(ride1.driver, driver1._id);

    await createRequest(rider2Token, keyLoc.req1p, keyLoc.req1d, location1, app, request, domain);
    await driverSearcher.search();
    ride2 = await Rides.findOne({ rider: rider2 });
    sinon.assert.match(ride2.driver, driver1._id);

    await pickUp(driver1Token, ride1, app, request, domain);
    await pickUp(driver1Token, ride2, app, request, domain);
    await dropOff(driver1Token, ride1, app, request, domain);
    await dropOff(driver1Token, ride2, app, request, domain);

    ride1.createdTimestamp = new Date(2019, 1, 1, 0, 0);
    ride1.pickupTimestamp = Math.floor(new Date(2019, 1, 1, 0, 2) / 1);
    ride1.initialEta = (parseFloat(ride1.pickupTimestamp) / 1000) + 3 * 60;
    ride1.dropoffTimestamp = new Date(2019, 1, 1, 0, 4);
    ride1.ratingForDriver = 5;
    etaMetrics = calcETAmetrics(ride1.toJSON());
    ride1.etaDifference = etaMetrics.etaDifference;
    ride1.etaMinutes = etaMetrics.etaMinutes;
    await ride1.save();

    ride2.createdTimestamp = new Date(2019, 1, 2, 0, 0);
    ride2.pickupTimestamp = Math.floor(new Date(2019, 1, 2, 0, 4) / 1);
    ride2.initialEta = (parseFloat(ride2.pickupTimestamp) / 1000) + 4 * 60;
    ride2.dropoffTimestamp = new Date(2019, 1, 2, 0, 8);
    ride2.ratingForDriver = 1;
    etaMetrics = calcETAmetrics(ride2.toJSON());
    ride2.etaDifference = etaMetrics.etaDifference;
    ride2.etaMinutes = etaMetrics.etaMinutes;
    await ride2.save();

    await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location1, app, request, domain);
    await driverSearcher.search();
    ride3 = await Rides.findOne({ rider: rider1, ratingForDriver: null });
    sinon.assert.match(ride3.driver, driver1._id);

    await pickUp(driver1Token, ride3, app, request, domain);
    await dropOff(driver1Token, ride3, app, request, domain);

    ride3.createdTimestamp = new Date(2019, 1, 4, 0, 0);
    ride3.pickupTimestamp = Math.floor(new Date(2019, 1, 4, 0, 3) / 1);
    ride3.initialEta = (parseFloat(ride3.pickupTimestamp) / 1000) + 4 * 60;
    ride3.dropoffTimestamp = new Date(2019, 1, 4, 0, 6);
    ride3.ratingForDriver = 3;
    etaMetrics = calcETAmetrics(ride3.toJSON());
    ride3.etaDifference = etaMetrics.etaDifference;
    ride3.etaMinutes = etaMetrics.etaMinutes;
    await ride3.save();

    // Cancelled requests - cancelledBy RIDER_ON_REQUEST
    await createRequest(rider2Token, keyLoc.req1p, keyLoc.req1d, location1, app, request, domain);
    await cancelRequest(rider2Token, app, request, domain);

    await createRequest(rider2Token, keyLoc.req1p, keyLoc.req1d, location1, app, request, domain);
    await cancelRequest(rider2Token, app, request, domain);

    // Duplicate request - cancelledBy DUPLICATE_REQUEST
    await createRequest(rider2Token, keyLoc.req1p, keyLoc.req1d, location1, app, request, domain);
    await createRequest(rider2Token, keyLoc.req1p, keyLoc.req1d, location1, app, request, domain);

    // Missed ride - cancelledBy NO_AVAILABILITY
    driver1.isAvailable = false;
    await driver1.save();

    const requested5MinAgo = Date.now() - 5 * 60 * 1000 - 1;
    await Requests.findOneAndUpdate(
      { rider: rider2._id, status: 100 }, { requestTimestamp: requested5MinAgo }
    );
    await driverSearcher.search();

    // ====================
    // Location 2 - Paid
    //   - 3 rides (3 completed)
    //   - 4 requests (3 successful, 1 zombie cancelled by admin)
    // ====================

    // Paid ride
    promocode = await Promocodes.createPromocode({
      name: '20% off',
      code: '20PercOff',
      location: location2._id,
      type: 'percentage',
      value: 20,
      isEnabled: true
    });

    rider1 = await Riders.findOneAndUpdate(
      { _id: rider1._id },
      { $set: { promocode: promocode._id } },
      { new: true, upsert: false }
    );

    driver1.isAvailable = true;
    driver1.activeLocation = location2._id;
    await driver1.save();

    await getPaymentSettings(rider1Token, app, request, domain);
    rider1 = await Riders.findOne({ _id: rider1._id });
    await stripe.attachPaymentMethod(rider1.stripeCustomerId, 'pm_card_visa_debit');
    let requestInfo;
    let paymentIntent;
    const requestList = [];
    for (let i = 0; i < 3; i += 1) {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location2, app, request, domain);
      await riderApprovePayment(rider1Token, app, request, domain);
      requestInfo = await Requests.findOne(
        { rider: rider1._id, status: 100, waitingPaymentConfirmation: true }
      );
      sinon.assert.match(requestInfo.paymentInformation.status, 'requires_confirmation');
      // Confirm payment
      paymentIntent = await stripe.confirmPaymentIntent(
        requestInfo.paymentInformation.paymentIntentId
      );
      await riderConfirmPaymentIntent(
        rider1Token, app, request, domain, PaymentStatus[paymentIntent.status], paymentIntent.id
      );
      await driverSearcher.search();
      ride1 = await Rides.findOne({ rider: rider1, status: { $in: [200, 201, 202, 203] } });
      sinon.assert.match(ride1.driver, driver1._id);
      await pickUp(driver1Token, ride1, app, request, domain);
      await dropOff(driver1Token, ride1, app, request, domain);
      if (i === 0) {
        rider1 = await Riders.findOne({ _id: rider1._id });
        rider1.promocode = null;
        await rider1.save();
        await tip(rider1Token, app, request, domain, ride1._id, 1000);
      }
      requestList.push(requestInfo._id);
    }
    const refundedRequest = await Requests.findOne({ _id: requestList[1] });
    refundedRequest.paymentInformation.status = REFUNDED_STATUS_NAME;
    const totalPriceValue = refundedRequest.paymentInformation.totalPrice;
    refundedRequest.paymentInformation.amountRefunded = totalPriceValue;
    await refundedRequest.save();

    const partialRefundedRequest = await Requests.findOne({ _id: requestList[2] });
    partialRefundedRequest.paymentInformation.status = REFUNDED_STATUS_NAME;
    partialRefundedRequest.paymentInformation.amountRefunded = 50;
    await partialRefundedRequest.save();

    // Zombie awating for payment confirmation - cancelledBy ADMIN
    await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location2, app, request, domain);
    requestInfo = await Requests.findOne(
      { rider: rider1._id, status: 100, waitingPaymentConfirmation: true }
    );

    await Requests.findOneAndUpdate(
      { rider: rider1._id, status: 100, waitingPaymentConfirmation: true },
      {
        $set: {
          requestTimestamp: moment(requestInfo.requestTimestamp).subtract(2, 'h').toDate()
        }
      },
      { new: true }
    );

    await adminEndpoint('/v1/requests/clearZombies', 'post', developerToken, app, request, domain, { location: location2._id });
  });

  beforeEach(async () => {
    driver1Socket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();
  });

  describe('Admin stats calculation', () => {
    it('Wait time stats', async () => {
      const response = await adminEndpoint('/v1/stats/wait-times', 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get stats!');
      }

      const result = [
        response.body.waitTimes[1].city,
        response.body.waitTimes[1].rideCount,
        response.body.waitTimes[1].pickupTimeAvg
      ];
      return sinon.assert.match(result, ['ZLocation', 3, '03:00:000']);
    });

    it('Rider stats', async () => {
      const response = await adminEndpoint('/v1/stats/riders', 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get stats!');
      }

      const result = [
        response.body.riderStats[1].city,
        response.body.riderStats[1].rideCount,
        response.body.riderStats[1].average,
        response.body.volumeStats[1].city,
        response.body.volumeStats[1].rideCount,
        response.body.volumeStats[1].perDay
      ];
      return sinon.assert.match(result, [
        'ZLocation',
        3,
        '1.000',
        'ZLocation',
        3,
        '1.000'
      ]);
    });

    it('Ride success', async () => {
      const response = await adminEndpoint('/v1/stats/rides', 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get stats!');
      }
      const result = [
        [
          response.body.rideStats[0].city,
          response.body.rideStats[0].completedRides,
          response.body.rideStats[0].cancelledRequests,
          response.body.rideStats[0].missedRides,
          response.body.rideStats[0].requestCount
        ],
        [
          response.body.rideStats[1].city,
          response.body.rideStats[1].completedRides,
          response.body.rideStats[1].cancelledRequests,
          response.body.rideStats[1].missedRides,
          response.body.rideStats[1].requestCount
        ]
      ];
      return sinon.assert.match(result, [['Paid location', 3, 1, 0, 4], ['ZLocation', 3, 3, 1, 7]]);
    });

    it('Ride stats', async () => {
      const response = await adminEndpoint('/v1/stats/rides', 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get stats!');
      }
      const result = [
        response.body.rideStats[1].city,
        response.body.rideStats[1].rideCount,
        response.body.rideStats[1].completedRides,
        response.body.rideStats[1].completedRidesPerc,
        response.body.rideStats[1].missedRides
      ];
      return sinon.assert.match(result, ['ZLocation', 3, 3, '100.0', 1]);
    });

    it('Rating stats', async () => {
      const response = await adminEndpoint('/v1/stats/rating', 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get stats!');
      }

      const result = [
        response.body.ratingStats[1].city,
        response.body.ratingStats[1].ratings,
        response.body.ratingStats[1].average,
        response.body.ratingStats[1].one_star,
        response.body.ratingStats[1].three_star,
        response.body.ratingStats[1].five_star
      ];
      return sinon.assert.match(result, ['ZLocation', 3, '3.000', 1, 1, 1]);
    });

    it('Mile stats', async () => {
      const response = await adminEndpoint('/v1/stats/miles', 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get stats!');
      }

      const result = [
        response.body.mileStats[1].city,
        response.body.mileStats[1].rideCount,
        response.body.mileStats[1].miles,
        response.body.mileStats[1].passengerCount,
        response.body.mileStats[1].passengersPerMile
      ];
      return sinon.assert.match(result, ['ZLocation', 3, '1.312', 3, '2.286']);
    });

    it('Experience stats', async () => {
      const response = await adminEndpoint('/v1/stats/experience', 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get stats!');
      }

      const result = [
        response.body.experienceStats[1].city,
        response.body.experienceStats[1].totalRideCount,
        response.body.experienceStats[1].rideCountOne,
        response.body.experienceStats[1].poolingOnePerc,
        response.body.experienceStats[1].ratingsOne,
        response.body.experienceStats[1].rideCountMult,
        response.body.experienceStats[1].poolingMultPerc,
        response.body.experienceStats[1].ratingsMult,
        response.body.experienceStats[1].stopsBeforeDropoffOne,
        response.body.experienceStats[1].stopsBeforeDropoffMult
      ];
      return sinon.assert.match(result, ['ZLocation', 3, 1, 100, '1.000', 1, 100, '5.000', 1, 1]);
    });

    it('Pooling stats', async () => {
      const response = await adminEndpoint('/v1/stats/pooling', 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get stats!');
      }

      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location1, app, request, domain);

      const result = [
        response.body.poolingStats[1].city,
        response.body.poolingStats[1].rideCount,
        response.body.poolingStats[1].pooledRide,
        response.body.poolingStats[1].pooledRidePerc,
        response.body.poolingStats[1].avgETADifference,
        response.body.poolingStats[1].avgETA
      ];
      // ETAs are 6, 7 and 7 mins -> avg 6:40 ETAs
      // Pickups are 3 mins for all -> avg 3:40 difference
      return sinon.assert.match(result, ['ZLocation', 3, 2, 67, '03:40', '06:40']);
    });

    it('Payment stats', async () => {
      const response = await adminEndpoint('/v1/stats/payment', 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get stats!');
      }

      const {
        city, requestCount, succeededValue, succeededCount,
        refundedValue, refundedCount, partialChargeValue,
        partialChargeCount, driverCount, perDriver, riderCount,
        perRider, perRide
      } = response.body.paymentStats[0];

      const {
        requestCount: totalRequestCount,
        succeededValue: totalSucceededValue,
        succeededCount: totalSucceededCount
      } = response.body.paymentStatsTotal[0];

      sinon.assert.match(city, 'Paid location');
      sinon.assert.match(requestCount, 4);
      sinon.assert.match(succeededValue, 80);
      sinon.assert.match(succeededCount, 1);
      sinon.assert.match(refundedValue, 150);
      sinon.assert.match(refundedCount, 2);
      sinon.assert.match(partialChargeValue, 50);
      sinon.assert.match(partialChargeCount, 1);
      sinon.assert.match(driverCount, 1);
      sinon.assert.match(perDriver, (succeededValue + partialChargeValue) / driverCount);
      sinon.assert.match(riderCount, 1);
      sinon.assert.match(perRider, (succeededValue + partialChargeValue) / riderCount);
      sinon.assert.match(perRide,
        (succeededValue + partialChargeValue) / (succeededCount + partialChargeCount));

      sinon.assert.match(totalRequestCount, 4);
      sinon.assert.match(totalSucceededValue, 80);
      return sinon.assert.match(totalSucceededCount, 1);
    });

    it('Promocode stats', async () => {
      const response = await adminEndpoint('/v1/stats/promocode', 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get stats!');
      }
      const result = [
        response.body.promocodeStats[0].city,
        response.body.promocodeStats[0].totalSaved,
        response.body.promocodeStats[0].promocodeCode,
        response.body.promocodeStats[0].promocodeUseCount,
        response.body.promocodeStats[0].riderCount,
        response.body.promocodeStatsTotal[0].city,
        response.body.promocodeStatsTotal[0].totalSaved,
        response.body.promocodeStatsTotal[0].promocodeUseCount,
        response.body.promocodeStatsTotal[0].riderCount
      ];
      return sinon.assert.match(result, ['Paid location', 20, '20PercOff', 1, 1, 'Paid location', 20, 1, 1]);
    });
    it('Tip stats', async () => {
      const response = await adminEndpoint('/v1/stats/tips', 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get stats!');
      }

      const result = [
        response.body.tipStats[0].city,
        response.body.tipStats[0].tipTotal,
        response.body.tipStats[0].tipPerc,
        response.body.tipStats[0].rideCount,
        response.body.tipStats[0].tipCount
      ];
      return sinon.assert.match(result, ['Paid location', 1000, 33, 3, 1]);
    });
    it('Tip list', async () => {
      const response = await adminEndpoint(
        `/v1/tips?locationId=${location2._id}`,
        'get', developerToken, app, request, domain
      );
      const { items: tips, driverStats } = response.body;
      sinon.assert.match(
        [
          driverStats.length,
          driverStats[0].total,
          `${driverStats[0].driverFirstName} ${driverStats[0].driverLastName}`
        ],
        [
          1,
          1000,
          'Driver FN Driver LN'
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
          1,
          1000,
          'usd',
          'succeeded',
          'Driver FN Driver LN',
          'Rider FN Rider LN'
        ]
      );
    });
  });
  describe('Ride list totals calculation', () => {
    it('Payment and tip totals', async () => {
      const response = await adminEndpoint('/v1/rides', 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get rides!');
      }
      const result = [
        response.body.paymentTotal.succeededView,
        response.body.paymentTotal.refundedView,
        response.body.paymentTotal.succeeded,
        response.body.paymentTotal.refunded,

        response.body.tipTotal.totalView,
        response.body.tipTotal.netView,
        response.body.tipTotal.total,
        response.body.tipTotal.net
      ];
      return sinon.assert.match(result, [
        130, 150, 130, 150,
        1000, 941, 1000, 941
      ]);
    });
  });
});
