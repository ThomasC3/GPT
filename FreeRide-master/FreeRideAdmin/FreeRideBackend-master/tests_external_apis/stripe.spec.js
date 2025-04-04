import moment from 'moment-timezone';
import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import { expect } from 'chai';
import app from '../server';
import { port, domain } from '../config';
import {
  Drivers, Riders, Locations, Requests, Rides, PaymentStatus, Settings, RequestStatus
} from '../models';
import { stripe } from '../services';
import { emptyAllCollections } from './utils/helper';
import driverSearcher from '../services/driverSearch';
import { sleep } from '../utils/ride';
import { mockStripe, ORIGINAL_STRIPE_CLIENT } from './global';

import {
  getPaymentSettings,
  getSetupIntent,
  removePaymentMethod,
  riderConfirmPaymentIntent,
  createRequest,
  cancelRequest,
  riderCancel,
  getQuote,
  createRiderLogin,
  riderApprovePayment
} from './utils/rider';

import {
  driverCancel, noShowCancel,
  pickUp, createDriverLogin
} from './utils/driver';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let driverPaidSocket;
let driverFreeSocket;
let driverFreeToken;
let riderSocket;
let rider2Socket;
let rider3Socket;
let rider4Socket;
let rider5Socket;
let sandbox;
let driverPaid;
let driverFree;
let driverPaidToken;
let rider;
let rider2;
let rider3;
let rider4;
let rider5;
let riderToken;
let rider2Token;
let rider3Token;
let rider4Token;
let rider5Token;
let location;
let freePaidLocation;

const keyLoc = {
  // Request 1
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA'],
  // Request 2
  req2p: [32.711663, -117.137382, '99 cents only store'],
  req2d: [32.709406, -117.136760, 'Grant Hill Neighborhood Park']
};

describe('Stripe payments', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    stripe.stripeClient = ORIGINAL_STRIPE_CLIENT;

    driverPaidSocket = io.connect(`http://localhost:${port}`, ioOptions);
    driverFreeSocket = io.connect(`http://localhost:${port}`, ioOptions);
    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider3Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider4Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider5Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      paymentEnabled: true,
      paymentInformation: {
        ridePrice: 100,
        capEnabled: false,
        priceCap: 50,
        pricePerHead: 0,
        currency: 'usd'
      },
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

    freePaidLocation = await Locations.createLocation({
      name: 'Location',
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      paymentEnabled: true,
      paymentInformation: {
        ridePrice: 0,
        capEnabled: false,
        priceCap: 50,
        pricePerHead: 0,
        currency: 'usd'
      },
      serviceArea: [
        {
          latitude: 32.746804,
          longitude: -117.171647
        },
        {
          latitude: 32.750081,
          longitude: -117.007942
        },
        {
          latitude: 32.658783,
          longitude: -117.020256
        },
        {
          latitude: 32.657523,
          longitude: -117.187222
        },
        {
          latitude: 32.746804,
          longitude: -117.171647
        }
      ]
    });

    ({ driver: driverPaid, driverToken: driverPaidToken } = await createDriverLogin({
      currentLocation: {
        coordinates: [keyLoc.req1p[1], keyLoc.req1p[0]],
        type: 'Point'
      },
      firstName: 'Driver',
      lastName: '1',
      email: 'driver1@mail.com',
      locations: [location._id],
      password: 'Password1'
    }, app, request, domain, driverPaidSocket));

    ({ driver: driverFree, driverToken: driverFreeToken } = await createDriverLogin({
      currentLocation: {
        coordinates: [keyLoc.req2p[1], keyLoc.req2p[0]],
        type: 'Point'
      },
      firstName: 'Driver',
      lastName: '2',
      email: 'driver2@mail.com',
      locations: [freePaidLocation._id],
      password: 'Password2'
    }, app, request, domain, driverFreeSocket));

    ({ rider, riderToken } = await createRiderLogin(
      { email: 'rider1@mail.com', password: 'Password1' }, app, request, domain, riderSocket
    ));
    ({ rider: rider2, riderToken: rider2Token } = await createRiderLogin(
      { email: 'rider2@mail.com', password: 'Password2' }, app, request, domain, rider2Socket
    ));
    ({ rider: rider3, riderToken: rider3Token } = await createRiderLogin(
      { email: 'rider3@mail.com', password: 'Password3' }, app, request, domain, rider3Socket
    ));
    ({ rider: rider4, riderToken: rider4Token } = await createRiderLogin(
      { email: 'rider4@mail.com', password: 'Password4' }, app, request, domain, rider4Socket
    ));
    ({ rider: rider5, riderToken: rider5Token } = await createRiderLogin(
      { email: 'rider5@mail.com', password: 'Password5' }, app, request, domain, rider5Socket
    ));

    // Set stripe customer and add payment method
    const paymentInformation = await getPaymentSettings(riderToken, app, request, domain);
    rider = await Riders.findOne({ _id: rider._id });
    if (!paymentInformation.stripePaymentMethods.length) {
      await stripe.attachPaymentMethod(rider.stripeCustomerId, 'pm_card_visa_debit');
    }

    const paymentInformation3 = await getPaymentSettings(rider3Token, app, request, domain);
    rider3 = await Riders.findOne({ _id: rider3._id });
    if (!paymentInformation3.stripePaymentMethods.length) {
      await stripe.attachPaymentMethod(rider3.stripeCustomerId, 'pm_card_visa_debit');
    }

    const paymentInformation4 = await getPaymentSettings(rider4Token, app, request, domain);
    rider4 = await Riders.findOne({ _id: rider4._id });
    if (!paymentInformation4.stripePaymentMethods.length) {
      await stripe.attachPaymentMethod(rider4.stripeCustomerId, 'pm_card_visa_debit');
    }

    const paymentInformation5 = await getPaymentSettings(rider5Token, app, request, domain);
    rider5 = await Riders.findOne({ _id: rider5._id });
    if (!paymentInformation5.stripePaymentMethods.length) {
      await stripe.attachPaymentMethod(rider5.stripeCustomerId, 'pm_card_visa_debit');
    }
  });

  beforeEach(async () => {
    await Requests.deleteMany();
    await Rides.deleteMany();
    await Riders.updateRider(rider._id, { lastCancelTimestamp: null });
    await Drivers.updateOne({ _id: driverFree._id }, { $set: { driverRideList: [] } });
    await Drivers.updateOne({ _id: driverPaid._id }, { $set: { driverRideList: [] } });
  });

  after(async () => {
    mockStripe();
    sandbox.restore();
  });

  describe('Stripe', () => {
    it('Should create a stripe customer if necessary', async () => {
      sinon.assert.match(rider2.stripeCustomerId, null);

      let paymentInfo = await getPaymentSettings(rider2Token, app, request, domain);
      sinon.assert.match(!!paymentInfo.stripeCustomerId, true);

      rider2 = await Riders.findOne({ _id: rider2._id });
      sinon.assert.match(!!rider2.stripeCustomerId, true);
      paymentInfo = await getPaymentSettings(rider2Token, app, request, domain);

      return sinon.assert.match(paymentInfo.stripeCustomerId, rider2.stripeCustomerId);
    });

    it('Should return a client secret for setup', async () => {
      rider = await Riders.findOne({ _id: rider._id });
      sinon.assert.match(!!rider.stripeCustomerId, true);

      const setupIntent = await getSetupIntent(riderToken, app, request, domain);

      return sinon.assert.match(!!setupIntent.clientSecret, true);
    });

    it('Should only keep last associated payment method', async () => {
      // Reset payment settings
      let paymentInfo = await getPaymentSettings(riderToken, app, request, domain);
      await getSetupIntent(riderToken, app, request, domain);
      await sleep(2500);
      paymentInfo = await getPaymentSettings(riderToken, app, request, domain);
      sinon.assert.match(paymentInfo.stripePaymentMethods.length, 0);

      // Add first card
      await getSetupIntent(riderToken, app, request, domain);
      await stripe.attachPaymentMethod(rider.stripeCustomerId, 'pm_card_visa');
      paymentInfo = await getPaymentSettings(riderToken, app, request, domain);
      sinon.assert.match(paymentInfo.stripePaymentMethods.length, 1);
      sinon.assert.match(paymentInfo.stripePaymentMethods[0].last4digits, '4242');

      // Add second card
      await getSetupIntent(riderToken, app, request, domain);
      await stripe.attachPaymentMethod(rider.stripeCustomerId, 'pm_card_visa_debit');
      paymentInfo = await getPaymentSettings(riderToken, app, request, domain);
      sinon.assert.match(paymentInfo.stripePaymentMethods.length, 1);

      return sinon.assert.match(paymentInfo.stripePaymentMethods[0].last4digits, '5556');
    });
    it('Should create and confirm payment intent successfully after ride request', async () => {
      let requestInfo = await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );

      expect(requestInfo).to.have.property('paymentInformation');
      expect(requestInfo.paymentInformation).to.have.property('totalPrice');
      expect(!!(requestInfo.paymentInformation.paymentIntentId)).to.equal(false);

      requestInfo = await riderApprovePayment(riderToken, app, request, domain);
      expect(!!(requestInfo.paymentInformation.paymentIntentId)).to.equal(true);

      // Confirm payment
      const paymentIntent = await stripe.confirmPaymentIntent(
        requestInfo.paymentInformation.paymentIntentId
      );
      await riderConfirmPaymentIntent(
        riderToken, app, request, domain,
        PaymentStatus[paymentIntent.status],
        paymentIntent.id
      );

      // Check confirmation success
      requestInfo = await Requests.findOne({ rider: rider._id });
      sinon.assert.match(requestInfo.waitingPaymentConfirmation, false);
      sinon.assert.match(requestInfo.paymentInformation.status, 'requires_capture');
    });
    it('Should create payment intent during request creation', async () => {
      let requestInfo = await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1,
        200, '1.0.0', null, false
      );

      expect(requestInfo).to.have.property('paymentInformation');
      expect(requestInfo.paymentInformation).to.have.property('totalPrice');
      expect(!!(requestInfo.paymentInformation.paymentIntentId)).to.equal(true);

      // Confirm payment
      const paymentIntent = await stripe.confirmPaymentIntent(
        requestInfo.paymentInformation.paymentIntentId
      );
      await riderConfirmPaymentIntent(
        riderToken, app, request, domain,
        PaymentStatus[paymentIntent.status],
        paymentIntent.id
      );

      // Check confirmation success
      requestInfo = await Requests.findOne({ rider: rider._id });
      sinon.assert.match(requestInfo.waitingPaymentConfirmation, false);
      sinon.assert.match(requestInfo.paymentInformation.status, 'requires_capture');
    });
    it('Should be able to cancel on request a payment intent before a confirm', async () => {
      let requestInfo = await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );

      requestInfo = await riderApprovePayment(riderToken, app, request, domain);
      expect(!!(requestInfo.paymentInformation.paymentIntentId)).to.equal(true);

      const {
        totalPrice, currency, status, clientSecret
      } = requestInfo.paymentInformation;
      sinon.assert.match(
        [!!clientSecret, totalPrice, currency, status],
        [true, 100, 'usd', 'requires_confirmation']
      );

      requestInfo = await Requests.findOne({ rider: rider._id });
      sinon.assert.match(requestInfo.waitingPaymentConfirmation, true);

      await cancelRequest(riderToken, app, request, domain);

      requestInfo = await Requests.findOne({ _id: requestInfo._id });
      const cancelledPaymentInformation = requestInfo.paymentInformation;
      return sinon.assert.match(cancelledPaymentInformation.status, 'canceled');
    });
    it('Should be able to cancel a payment on rider cancel', async () => {
      await createRequest(riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);

      let requestInfo = await riderApprovePayment(riderToken, app, request, domain);
      expect(!!(requestInfo.paymentInformation.paymentIntentId)).to.equal(true);
      expect(requestInfo.paymentInformation.status).to.equal('requires_confirmation');

      // Confirm payment
      const paymentIntent = await stripe.confirmPaymentIntent(
        requestInfo.paymentInformation.paymentIntentId
      );
      await riderConfirmPaymentIntent(
        riderToken, app, request, domain, PaymentStatus[paymentIntent.status], paymentIntent.id
      );

      // Check confirmation success
      requestInfo = await Requests.findOne({ rider: rider._id });
      sinon.assert.match(requestInfo.waitingPaymentConfirmation, false);
      sinon.assert.match(requestInfo.paymentInformation.status, 'requires_capture');

      // Find driver for ride
      await driverSearcher.search();
      const ride = await Rides.findOne({ rider: rider._id });
      sinon.assert.match(!!ride, true);

      // Cancel ride
      await riderCancel(riderSocket, riderSocket, ride._id);

      requestInfo = await Requests.findOne({ _id: requestInfo._id });
      return sinon.assert.match(requestInfo.paymentInformation.status, 'canceled');
    });
    it('Should be able to cancel a payment on driver not able cancel', async () => {
      await createRequest(rider3Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);

      let requestInfo = await riderApprovePayment(rider3Token, app, request, domain);
      expect(!!(requestInfo.paymentInformation.paymentIntentId)).to.equal(true);
      expect(requestInfo.paymentInformation.status).to.equal('requires_confirmation');

      // Confirm payment
      const paymentIntent = await stripe.confirmPaymentIntent(
        requestInfo.paymentInformation.paymentIntentId
      );
      await riderConfirmPaymentIntent(
        rider3Token, app, request, domain, PaymentStatus[paymentIntent.status], paymentIntent.id
      );

      // Check confirmation success
      requestInfo = await Requests.findOne({ rider: rider3._id });
      sinon.assert.match(requestInfo.waitingPaymentConfirmation, false);
      sinon.assert.match(requestInfo.paymentInformation.status, 'requires_capture');

      // Find driver for ride
      await driverSearcher.search();
      const ride = await Rides.findOne({ rider: rider3._id });
      sinon.assert.match(!!ride, true);

      // Cancel ride
      await driverCancel(driverPaidToken, ride._id, app, request, domain);

      requestInfo = await Requests.findOne({ _id: requestInfo._id });
      return sinon.assert.match(requestInfo.paymentInformation.status, 'canceled');
    });
    it('Should be able to cancel a payment on driver no-show cancel', async () => {
      await createRequest(riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);

      let requestInfo = await riderApprovePayment(riderToken, app, request, domain);
      expect(!!(requestInfo.paymentInformation.paymentIntentId)).to.equal(true);
      expect(requestInfo.paymentInformation.status).to.equal('requires_confirmation');

      // Confirm payment
      const paymentIntent = await stripe.confirmPaymentIntent(
        requestInfo.paymentInformation.paymentIntentId
      );
      await riderConfirmPaymentIntent(
        riderToken, app, request, domain, PaymentStatus[paymentIntent.status], paymentIntent.id
      );

      // Check confirmation success
      requestInfo = await Requests.findOne({ rider: rider._id });
      sinon.assert.match(requestInfo.waitingPaymentConfirmation, false);
      sinon.assert.match(requestInfo.paymentInformation.status, 'requires_capture');

      // Find driver for ride
      await driverSearcher.search();
      const ride = await Rides.findOne({ rider: rider._id });
      sinon.assert.match(!!ride, true);

      // Cancel ride
      await Rides.updateRide(ride._id, {
        status: 203,
        driverArrivedTimestamp: moment(ride.createdTimestamp).subtract(3, 'm').toDate(),
        driverArrivingTimestamp: ride.createdTimestamp
      });
      await noShowCancel(driverPaidToken, { ride }, app, request, domain);

      requestInfo = await Requests.findOne({ _id: requestInfo._id });
      return sinon.assert.match(requestInfo.paymentInformation.status, 'canceled');
    });
    it('Should be able to capture on pickup', async () => {
      await createRequest(riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);

      let requestInfo = await riderApprovePayment(riderToken, app, request, domain);
      expect(!!(requestInfo.paymentInformation.paymentIntentId)).to.equal(true);
      expect(requestInfo.paymentInformation.status).to.equal('requires_confirmation');

      // Confirm payment
      const paymentIntent = await stripe.confirmPaymentIntent(
        requestInfo.paymentInformation.paymentIntentId
      );
      await riderConfirmPaymentIntent(
        riderToken, app, request, domain, PaymentStatus[paymentIntent.status], paymentIntent.id
      );

      // Check confirmation success
      requestInfo = await Requests.findOne({ rider: rider._id });
      sinon.assert.match(requestInfo.waitingPaymentConfirmation, false);
      sinon.assert.match(requestInfo.paymentInformation.status, 'requires_capture');

      // Find driver for ride
      await driverSearcher.search();
      const ride = await Rides.findOne({ rider: rider._id });
      sinon.assert.match(!!ride, true);

      // Pickup Ride
      await pickUp(driverPaidToken, ride, app, request, domain);
      requestInfo = await Requests.findOne({ _id: requestInfo._id });
      return sinon.assert.match(requestInfo.paymentInformation.status, 'succeeded');
    });
    it('Should be able to get a quote', async () => {
      const quote = await getQuote(riderToken, app, request, domain, location._id, 4, keyLoc);
      sinon.assert.match(quote.capEnabled, false);
      sinon.assert.match(quote.ridePrice, 100);
      sinon.assert.match(quote.pricePerHead, 0);
      sinon.assert.match(quote.priceCap, 50);
      sinon.assert.match(quote.currency, 'usd');
      return sinon.assert.match(quote.totalPrice, 100);
    });
    it('Should remove payment method', async () => {
      await getSetupIntent(riderToken, app, request, domain);
      await sleep(1000);
      await stripe.attachPaymentMethod(rider.stripeCustomerId, 'pm_card_visa');
      let paymentInfo = await getPaymentSettings(riderToken, app, request, domain, location._id);
      sinon.assert.match(paymentInfo.stripePaymentMethods.length, 1);

      await removePaymentMethod(riderToken, app, request, domain, location._id);
      await sleep(1000);
      paymentInfo = await getPaymentSettings(riderToken, app, request, domain, location._id);
      return sinon.assert.match(paymentInfo.stripePaymentMethods.length, 0);
    });
    it('Should be able to cancel a free ride', async () => {
      await createRequest(
        riderToken, keyLoc.req2p, keyLoc.req2d, freePaidLocation, app, request, domain
      );
      let requestInfo = await Requests.findOne({ rider: rider._id });
      sinon.assert.match(requestInfo.paymentInformation.status, 'requires_capture');

      // Check confirmation success
      requestInfo = await Requests.findOne({ _id: requestInfo._id });
      sinon.assert.match(requestInfo.waitingPaymentConfirmation, false);
      sinon.assert.match(requestInfo.paymentInformation.status, 'requires_capture');

      // Find driver for ride
      await driverSearcher.search();
      const ride = await Rides.findOne({ rider: rider._id });
      sinon.assert.match(!!ride, true);

      // Cancel ride
      await riderCancel(riderSocket, riderSocket, ride._id);

      requestInfo = await Requests.findOne({ _id: requestInfo._id });
      sinon.assert.match(requestInfo.paymentInformation.promocodeUsed, false);
      return sinon.assert.match(requestInfo.paymentInformation.status, 'canceled');
    });
    it('Should be able to capture a free ride', async () => {
      await createRequest(
        rider3Token, keyLoc.req2p, keyLoc.req2d, freePaidLocation, app, request, domain
      );
      let requestInfo = await Requests.findOne({ rider: rider3._id });
      sinon.assert.match(requestInfo.paymentInformation.status, 'requires_capture');

      // Check confirmation success
      requestInfo = await Requests.findOne({ _id: requestInfo._id });
      sinon.assert.match(requestInfo.waitingPaymentConfirmation, false);
      sinon.assert.match(requestInfo.paymentInformation.status, 'requires_capture');

      // Find driver for ride
      await driverSearcher.search();
      const ride = await Rides.findOne({ rider: rider3._id });
      sinon.assert.match(!!ride, true);

      // Pickup Ride
      await pickUp(driverFreeToken, ride, app, request, domain);

      requestInfo = await Requests.findOne({ _id: requestInfo._id });
      sinon.assert.match(requestInfo.paymentInformation.promocodeUsed, false);
      return sinon.assert.match(requestInfo.paymentInformation.status, 'succeeded');
    });
    it('Should be able to cancel request if no drivers available', async () => {
      await Drivers.findOneAndUpdate(
        { _id: driverPaid._id }, { isOnline: false }, { new: true, upsert: false }
      );

      await createRequest(rider3Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);

      let requestInfo = await riderApprovePayment(rider3Token, app, request, domain);
      expect(!!(requestInfo.paymentInformation.paymentIntentId)).to.equal(true);
      expect(requestInfo.paymentInformation.status).to.equal('requires_confirmation');

      // Confirm payment
      const paymentIntent = await stripe.confirmPaymentIntent(
        requestInfo.paymentInformation.paymentIntentId
      );
      await riderConfirmPaymentIntent(
        rider3Token, app, request, domain,
        PaymentStatus[paymentIntent.status],
        paymentIntent.id
      );

      // Check confirmation success
      requestInfo = await Requests.findOne({ rider: rider3._id });
      sinon.assert.match(requestInfo.waitingPaymentConfirmation, false);
      sinon.assert.match(requestInfo.paymentInformation.status, 'requires_capture');

      // Cancel request
      await requestInfo.cancel();

      await Drivers.findOneAndUpdate(
        { _id: driverPaid._id }, { isOnline: true }, { new: true, upsert: false }
      );

      requestInfo = await Requests.findOne({ _id: requestInfo._id });
      sinon.assert.match(requestInfo.status, 101);
      return sinon.assert.match(
        requestInfo.paymentInformation.status,
        PaymentStatus.properties[PaymentStatus.canceled].name
      );
    });
    it('Should be able to cancel request on a new request', async () => {
      await Drivers.findOneAndUpdate(
        { _id: driverPaid._id }, { isOnline: false }, { new: true, upsert: false }
      );

      await createRequest(rider3Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);

      await riderApprovePayment(rider3Token, app, request, domain);
      let zombieRequest = await Requests.findOne({ rider: rider3._id });
      sinon.assert.match(zombieRequest.paymentInformation.status, 'requires_confirmation');

      await Drivers.findOneAndUpdate(
        { _id: driverPaid._id }, { isOnline: true }, { new: true, upsert: false }
      );

      await createRequest(
        rider3Token, keyLoc.req1p, keyLoc.req1d,
        location, app, request, domain
      );
      await riderApprovePayment(rider3Token, app, request, domain);
      zombieRequest = await Requests.findOne({ _id: zombieRequest._id });
      sinon.assert.match(zombieRequest.status, 101);

      const secondRequest = await Requests.findOne({ rider: rider3._id, status: 100 });
      sinon.assert.match(
        zombieRequest.paymentInformation.status,
        PaymentStatus.properties[PaymentStatus.canceled].name
      );
      return sinon.assert.match(secondRequest.paymentInformation.status, 'requires_confirmation');
    });

    it('Should be able to capture on pickup after stripe customer deleted', async () => {
      await createRequest(rider4Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);

      let requestInfo = await riderApprovePayment(rider4Token, app, request, domain);
      expect(!!(requestInfo.paymentInformation.paymentIntentId)).to.equal(true);
      expect(requestInfo.paymentInformation.status).to.equal('requires_confirmation');

      // Confirm payment
      const paymentIntent = await stripe.confirmPaymentIntent(
        requestInfo.paymentInformation.paymentIntentId
      );
      await riderConfirmPaymentIntent(
        rider4Token, app, request, domain, PaymentStatus[paymentIntent.status], paymentIntent.id
      );

      // Check confirmation success
      requestInfo = await Requests.findOne({ rider: rider4._id });
      sinon.assert.match(requestInfo.waitingPaymentConfirmation, false);
      sinon.assert.match(requestInfo.paymentInformation.status, 'requires_capture');

      // Find driver for ride
      await driverSearcher.search();
      const ride = await Rides.findOne({ rider: rider4._id });
      sinon.assert.match(!!ride, true);

      // Delete customer
      await stripe.deleteCustomer(rider4.stripeCustomerId);
      const deletedCustomer = await stripe.getCustomer(rider4.stripeCustomerId);
      sinon.assert.match(deletedCustomer.deleted, true);
      sinon.assert.match(deletedCustomer.id, rider4.stripeCustomerId);
      await Riders.findOneAndUpdate(
        { _id: rider4._id }, { isDeleted: true }, { new: true, upsert: false }
      );

      // Pickup Ride
      await pickUp(driverPaidToken, ride, app, request, domain);
      requestInfo = await Requests.findOne({ _id: requestInfo._id });
      return sinon.assert.match(requestInfo.paymentInformation.status, 'succeeded');
    });

    it('Should be able to have driver cancel ride with deleted stripe customer', async () => {
      let requestInfo = await createRequest(
        rider5Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );

      requestInfo = await riderApprovePayment(rider5Token, app, request, domain);

      const {
        totalPrice, currency, status, clientSecret, paymentIntentId
      } = requestInfo.paymentInformation;
      sinon.assert.match(
        [!!clientSecret, totalPrice, currency, status, !!paymentIntentId],
        [true, 100, 'usd', 'requires_confirmation', true]
      );

      requestInfo = await Requests.findOne({ rider: rider5._id });
      sinon.assert.match(requestInfo.waitingPaymentConfirmation, true);

      // Confirm payment
      const paymentIntent = await stripe.confirmPaymentIntent(
        requestInfo.paymentInformation.paymentIntentId
      );
      await riderConfirmPaymentIntent(
        rider5Token, app, request, domain, PaymentStatus[paymentIntent.status], paymentIntent.id
      );

      // Find driver for ride
      await driverSearcher.search();
      const ride = await Rides.findOne({ rider: rider5._id });
      sinon.assert.match(!!ride, true);

      // Delete customer
      await stripe.deleteCustomer(rider5.stripeCustomerId);
      const deletedCustomer = await stripe.getCustomer(rider5.stripeCustomerId);
      sinon.assert.match(deletedCustomer.deleted, true);
      sinon.assert.match(deletedCustomer.id, rider5.stripeCustomerId);
      await Riders.findOneAndUpdate(
        { _id: rider5._id }, { isDeleted: true }, { new: true, upsert: false }
      );

      await driverCancel(driverPaidToken, ride._id, app, request, domain);

      requestInfo = await Requests.findOne({ _id: requestInfo._id });
      const cancelledPaymentInformation = requestInfo.paymentInformation;
      return sinon.assert.match(cancelledPaymentInformation.status, 'canceled');
    });
    it('Should not allow paid ride request creation if rider has no payment method', async () => {
      const paymentInformation = await removePaymentMethod(riderToken, app, request, domain);
      const { stripePaymentMethods } = paymentInformation;
      expect(stripePaymentMethods.length).to.equal(0);

      const response = await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1,
        400, '1.0.0', null
      );
      expect(response.code).to.equal(400);
      return expect(response.message).to.equal('Please attach a valid payment method to your account');
    });
    it('Should allow free ride request creation if rider has no payment method', async () => {
      const paymentInformation = await removePaymentMethod(riderToken, app, request, domain);
      const { stripePaymentMethods } = paymentInformation;
      expect(stripePaymentMethods.length).to.equal(0);

      await Locations.updateLocation(location._id, { paymentEnabled: false });

      const response = await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1,
        200, '1.0.0', null
      );
      return expect(response.status).to.equal(RequestStatus.RideRequested);
    });
  });
});
