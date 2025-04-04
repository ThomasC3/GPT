import sinon from 'sinon';
import chai from 'chai';
import jsonSchema from 'chai-json-schema';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import {
  Drivers, Locations, Riders,
  Tips, Rides, Settings, PaymentStatus
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { stripe } from '../../services';
import { sleep } from '../../utils/ride';
import { dumpRideForRiderSchema } from '../utils/schemas';

import {
  createRiderLogin, riderEndpoint, createRequest, getPaymentSettings
} from '../utils/rider';
import { createDriverLogin, pickUp, dropOff } from '../utils/driver';

chai.use(jsonSchema);
const { expect } = chai;

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let driver;
let driverSocket;
let rider;
let riderSocket;
let sandbox;
let location;
let ride;

const keyLoc = {
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

describe('Driver tips', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
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

    await createRequest(
      rider.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
    );
    await driverSearcher.search();
    ride = await Rides.findOne({ rider: rider.rider._id });
    await pickUp(driver.driverToken, ride, app, request, domain);
    await dropOff(driver.driverToken, ride, app, request, domain);
  });

  beforeEach(async () => {
    sandbox.restore();

    await Tips.deleteMany();

    driver.driverSocket.removeAllListeners();
    rider.riderSocket.removeAllListeners();

    await Drivers.syncIndexes();
    await Locations.syncIndexes();
  });

  describe('Validate, create, confirm and capture driver tips', () => {
    it('Should create a tip for a completed ride', async () => {
      const tipData = {
        rideId: ride._id,
        tipAmount: 1000
      };
      let response = await riderEndpoint('/v1/tip', 'post', rider.riderToken, app, request, domain, tipData);
      const tipPaymentData = {
        paymentIntentId: response.body.paymentIntentId,
        paymentIntentStatus: PaymentStatus.requires_capture
      };

      await stripe.confirmPaymentIntent(response.body.paymentIntentId);
      await riderEndpoint('/v1/tip/confirm', 'post', rider.riderToken, app, request, domain, tipPaymentData);
      await sleep(2000); // due to async call to balance transaction on stripe

      const tips = await Tips.find({});
      sinon.assert.match(tips.length, 1);
      sinon.assert.match(
        [
          tips[0].status,
          tips[0].total,
          tips[0].net,
          tips[0].fee,
          tips[0].paymentIntentId,
          `${tips[0].rideId}`,
          `${tips[0].locationId}`,
          tips[0].rideTimestamp
        ],
        [
          PaymentStatus.properties[PaymentStatus.succeeded].name,
          1000,
          941,
          59,
          tipPaymentData.paymentIntentId,
          `${ride._id}`,
          `${ride.location}`,
          ride.createdTimestamp
        ]
      );
      response = await riderEndpoint(`/v1/rides/${ride._id}`, 'get', rider.riderToken, app, request, domain);
      const rideData = response.body;
      expect(rideData).to.be.jsonSchema(dumpRideForRiderSchema);
      expect(rideData.tipCurrency).to.equal('usd');
      expect(rideData.tipTotal).to.equal(1000);
      return sinon.assert.match(
        [
          rideData.tipTotal,
          rideData.tipCurrency
        ],
        [
          1000,
          'usd'
        ]
      );
    });
    it('Should cancel an unconfirmed tip', async () => {
      const tipData = {
        rideId: ride._id,
        tipAmount: 500
      };
      const response = await riderEndpoint('/v1/tip', 'post', rider.riderToken, app, request, domain, tipData);
      const tipPaymentData = {
        paymentIntentId: response.body.paymentIntentId
      };
      await stripe.confirmPaymentIntent(response.body.paymentIntentId);
      await riderEndpoint('/v1/tip/cancel', 'post', rider.riderToken, app, request, domain, tipPaymentData);
      await sleep(2000); // due to async call to balance transaction on stripe
      const tips = await Tips.find({});
      sinon.assert.match(tips.length, 1);
      return sinon.assert.match(
        [
          tips[0].status,
          tips[0].total,
          tips[0].net,
          tips[0].fee,
          tips[0].paymentIntentId,
          `${tips[0].rideId}`,
          `${tips[0].locationId}`
        ],
        [
          PaymentStatus.properties[PaymentStatus.canceled].name,
          500,
          undefined,
          undefined,
          tipPaymentData.paymentIntentId,
          `${ride._id}`,
          `${ride.location}`
        ]
      );
    });
    it('Should show tip in ride history', async () => {
      const tipData = {
        rideId: ride._id,
        tipAmount: 1000
      };
      let response = await riderEndpoint('/v1/tip', 'post', rider.riderToken, app, request, domain, tipData);
      const tipPaymentData = {
        paymentIntentId: response.body.paymentIntentId,
        paymentIntentStatus: PaymentStatus.requires_capture
      };

      await stripe.confirmPaymentIntent(response.body.paymentIntentId);
      await riderEndpoint('/v1/tip/confirm', 'post', rider.riderToken, app, request, domain, tipPaymentData);
      await sleep(2000); // due to async call to balance transaction on stripe

      const tips = await Tips.find({});
      sinon.assert.match(tips.length, 1);

      response = await riderEndpoint('/v1/rides', 'get', rider.riderToken, app, request, domain);
      expect(response.body[0]).to.be.jsonSchema(dumpRideForRiderSchema);
      expect(response.body[0].tipCurrency).to.equal('usd');
      expect(response.body[0].tipTotal).to.equal(1000);
      return sinon.assert.match([
        response.body[0].tipTotal,
        response.body[0].tipCurrency
      ],
      [
        1000,
        'usd'
      ]);
    });
    it('Should not show tip in ride history if not succeeded', async () => {
      const tipData = {
        rideId: ride._id,
        tipAmount: 1000
      };
      let response = await riderEndpoint('/v1/tip', 'post', rider.riderToken, app, request, domain, tipData);

      const tips = await Tips.find({});
      sinon.assert.match(tips.length, 1);

      response = await riderEndpoint('/v1/rides', 'get', rider.riderToken, app, request, domain);
      return sinon.assert.match(response.body[0].tipTotal, undefined);
    });
    it('Should not allow more than one succeeded tip per ride', async () => {
      // Create pending tip
      const tipData = {
        rideId: ride._id,
        tipAmount: 500
      };
      let response = await riderEndpoint('/v1/tip', 'post', rider.riderToken, app, request, domain, tipData);
      const pendingTip = await Tips.findOne({ rideId: tipData.rideId });

      // Create another tip
      response = await riderEndpoint('/v1/tip', 'post', rider.riderToken, app, request, domain, tipData);
      const tipPaymentData = {
        paymentIntentId: response.body.paymentIntentId,
        paymentIntentStatus: PaymentStatus.requires_capture
      };

      let allTips = await Tips.find({ rideId: tipData.rideId });
      sinon.assert.match(allTips.length, 2);

      const cancelledTip = await Tips.findOne({ _id: pendingTip._id });
      sinon.assert.match(
        cancelledTip.status,
        PaymentStatus.properties[PaymentStatus.canceled].name
      );

      // Confirm tip
      await stripe.confirmPaymentIntent(response.body.paymentIntentId);
      await riderEndpoint('/v1/tip/confirm', 'post', rider.riderToken, app, request, domain, tipPaymentData);
      const confirmedTip = await Tips.findOne({ paymentIntentId: tipPaymentData.paymentIntentId });
      sinon.assert.match(
        confirmedTip.status,
        PaymentStatus.properties[PaymentStatus.succeeded].name
      );

      // Try another tip
      response = await riderEndpoint('/v1/tip', 'post', rider.riderToken, app, request, domain, tipData, 409);
      sinon.assert.match(
        response.body.message,
        'A tip has already been processed successfully for this ride. Thanks again for helping support your local drivers!'
      );
      allTips = await Tips.find({ rideId: tipData.rideId });
      return sinon.assert.match(allTips.length, 2);
    });
    it('Should confirm tip with wrong status sent in request', async () => {
      const tipData = {
        rideId: ride._id,
        tipAmount: 1000
      };
      const response = await riderEndpoint('/v1/tip', 'post', rider.riderToken, app, request, domain, tipData);
      const tipPaymentData = {
        paymentIntentId: response.body.paymentIntentId,
        paymentIntentStatus: PaymentStatus.refunded
      };

      let tips = await Tips.find({});
      sinon.assert.match(tips.length, 1);
      sinon.assert.match([tips[0].status, tips[0].waitingPaymentConfirmation, !!tips[0].net], ['requires_confirmation', true, false]);

      await stripe.confirmPaymentIntent(response.body.paymentIntentId);
      await riderEndpoint('/v1/tip/confirm', 'post', rider.riderToken, app, request, domain, tipPaymentData);
      await sleep(2000); // due to async call to balance transaction on stripe

      tips = await Tips.find({});
      sinon.assert.match(tips.length, 1);
      sinon.assert.match([tips[0].status, tips[0].waitingPaymentConfirmation, !!tips[0].net], ['succeeded', false, true]);
    });
  });
});
