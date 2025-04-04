import sinon from 'sinon';
import chai from 'chai';
import jsonSchema from 'chai-json-schema';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import {
  Drivers, Riders, Locations,
  Requests, Rides, Settings,
  PaymentStatus, Promocodes
} from '../../models';
import { stripe } from '../../services';
import { emptyAllCollections } from '../utils/helper';
import { dump } from '../../utils';
import { getLocaleFromUser } from '../../utils/translation';

import {
  getPaymentSettings,
  createRequest,
  createRiderLogin,
  riderConfirmPaymentIntent,
  setupPromocode,
  riderEndpoint,
  riderApprovePayment
} from '../utils/rider';
import { dumpRequestForRiderSchema } from '../utils/schemas';
import { pickUp, dropOff, createDriverLogin } from '../utils/driver';
import driverSearcher from '../../services/driverSearch';

chai.use(jsonSchema);
const { expect } = chai;

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let driverSocket;
let riderSocket;
let sandbox;
let driver;
let rider;
let location;
let promocode;
let promocode2;

const keyLoc = {
  // Request 1
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

describe('Rider pwyw requests', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      pwywEnabled: true,
      pwywInformation: {
        pwywOptions: [0, 500, 1000],
        maxCustomValue: 10000,
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

    driver = await createDriverLogin({
      currentLocation: {
        coordinates: [keyLoc.req1p[1], keyLoc.req1p[0]],
        type: 'Point'
      },
      firstName: 'Driver',
      lastName: '1',
      email: 'driver1@mail.com',
      zip: 10001,
      phone: 123456789,
      isOnline: true,
      isTemporaryPassword: false,
      locations: [location._id],
      password: 'Password1',
      dob: '2000-12-11'
    }, app, request, domain, driverSocket);

    rider = await createRiderLogin({
      email: 'rider1@mail.com',
      firstName: 'Rider FN',
      lastName: 'Rider LN',
      password: 'Password1',
      dob: '2000-12-11'
    }, app, request, domain, riderSocket);

    // Create promocode
    promocode = await Promocodes.createPromocode({
      name: 'Free ride',
      code: 'freeRide',
      location: location._id,
      type: 'full',
      isEnabled: true
    });
    promocode2 = await Promocodes.createPromocode({
      name: '20% Off',
      code: '20PercOff',
      location: location._id,
      value: 20,
      type: 'percentage',
      isEnabled: true
    });

    // Set stripe customer and add payment method
    const paymentInformation = await getPaymentSettings(rider.riderToken, app, request, domain);
    const stripeCustomer = await Riders.findOne({ _id: rider.rider._id });
    if (!paymentInformation.stripePaymentMethods.length) {
      await stripe.attachPaymentMethod(stripeCustomer.stripeCustomerId, 'pm_card_visa_debit');
    }
  });

  before(async () => {
    sandbox.restore();
  });

  beforeEach(async () => {
    sandbox.restore();
    await Requests.deleteMany();
    await Rides.deleteMany();
    await Riders.updateRider(rider._id, { lastCancelTimestamp: null });
    rider.rider.promocode = null;
    await rider.rider.save();
    await Drivers.updateOne({ _id: driver._id }, { $set: { driverRideList: [] } });
    location.pwywInformation.pwywOptions = [0, 500, 1000];
    await location.save();
  });

  describe('PWYW requests', () => {
    it('Should create a free ride if pwyw value is 0', async () => {
      const freePwywRequest = await createRequest(rider.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1, 200, '1.0.0', 0);
      expect(freePwywRequest).to.be.jsonSchema(dumpRequestForRiderSchema);
      expect(freePwywRequest.waitingPaymentConfirmation).to.equal(false);
      expect(freePwywRequest.paymentInformation.totalPrice).to.equal(0);

      const { body: [freePwywRequestRecovery] } = await riderEndpoint('/v1/requests', 'get', rider.riderToken, app, request, domain);
      expect(freePwywRequestRecovery).to.be.jsonSchema(dumpRequestForRiderSchema);

      const rideRequest = await Requests.findOne({
        rider: rider.rider._id,
        status: 100,
        waitingPaymentConfirmation: false
      });
      return sinon.assert.match(!!rideRequest, true);
    });

    it('Should prevent request creation if there is no pwyw value', async () => {
      await createRequest(rider.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1, 400, '1.0.0');
      const rideRequest = await Requests.findOne({
        rider: rider.rider._id,
        status: 100,
        waitingPaymentConfirmation: true
      });
      return sinon.assert.match(!!rideRequest, false);
    });

    it('Should prevent request creation if pwyw value is lower than minimum', async () => {
      location.pwywInformation.pwywOptions = [500, 1000, 2000];
      await location.save();
      await createRequest(rider.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1, 400, '1.0.0', 200);
      const rideRequest = await Requests.findOne({
        rider: rider.rider._id,
        status: 100,
        waitingPaymentConfirmation: true
      });
      return sinon.assert.match(!!rideRequest, false);
    });

    it('Should prevent request creation if pwyw value is above maximum', async () => {
      await createRequest(rider.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1, 400, '1.0.0', 20000);
      const rideRequest = await Requests.findOne({
        rider: rider.rider._id,
        status: 100,
        waitingPaymentConfirmation: true
      });
      return sinon.assert.match(!!rideRequest, false);
    });

    it('Should create request with correct value', async () => {
      const pwywRequest = await createRequest(rider.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1, 200, '1.0.0', 500);

      await riderApprovePayment(rider.riderToken, app, request, domain);
      expect(pwywRequest).to.be.jsonSchema(dumpRequestForRiderSchema);
      expect(pwywRequest.waitingPaymentConfirmation).to.equal(true);
      expect(pwywRequest.paymentInformation.totalPrice).to.equal(500);

      const { body: [pwywRequestRecovery] } = await riderEndpoint('/v1/requests', 'get', rider.riderToken, app, request, domain);
      expect(pwywRequestRecovery).to.be.jsonSchema(dumpRequestForRiderSchema);

      let requestInfo = await Requests.findOne({
        rider: rider.rider._id,
        status: 100,
        waitingPaymentConfirmation: true
      });
      sinon.assert.match(!!requestInfo, true);

      // Confirm payment
      const paymentIntent = await stripe.confirmPaymentIntent(
        requestInfo.paymentInformation.paymentIntentId
      );
      await riderConfirmPaymentIntent(
        rider.riderToken, app, request, domain,
        PaymentStatus[paymentIntent.status],
        paymentIntent.id
      );

      // Check confirmation success
      requestInfo = await Requests.findOne({ _id: requestInfo._id });
      sinon.assert.match(requestInfo.waitingPaymentConfirmation, false);
      sinon.assert.match(requestInfo.paymentInformation.status, 'requires_capture');

      // Find driver for ride
      await driverSearcher.search();
      const ride = await Rides.findOne({ rider: rider.rider._id });
      sinon.assert.match(!!ride, true);

      // Pickup Ride
      await pickUp(driver.driverToken, ride, app, request, domain);

      requestInfo = await Requests.findOne({ _id: requestInfo._id });
      return sinon.assert.match(requestInfo.paymentInformation.status, 'succeeded');
    });
    it('Should create pwyw request with promocode if value is the same as minimum', async () => {
      location.pwywInformation.pwywOptions = [500, 1000, 2000];
      await location.save();

      const result = await setupPromocode(
        rider.riderToken, app, request, domain, location._id, promocode.code
      );
      sinon.assert.match(result.promocode.code, promocode.code);

      const pwywPromocodeRequest = await createRequest(
        rider.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1, 200, '1.0.0', 500
      );
      expect(pwywPromocodeRequest).to.be.jsonSchema(dumpRequestForRiderSchema);
      expect(pwywPromocodeRequest.waitingPaymentConfirmation).to.equal(false);
      expect(pwywPromocodeRequest.paymentInformation.totalWithoutDiscount).to.equal(500);
      expect(pwywPromocodeRequest.paymentInformation.discount).to.equal(500);
      expect(pwywPromocodeRequest.paymentInformation.totalPrice).to.equal(0);
      expect(pwywPromocodeRequest.paymentInformation.promocodeCode).to.equal('freeRide');
      expect(pwywPromocodeRequest.paymentInformation.promocodeName).to.equal('Free ride');
      expect(pwywPromocodeRequest.paymentInformation.isPromocodeValid).to.equal(true);

      const { body: [pwywPromocodeRequestRecovery] } = await riderEndpoint('/v1/requests', 'get', rider.riderToken, app, request, domain);
      expect(pwywPromocodeRequestRecovery).to.be.jsonSchema(dumpRequestForRiderSchema);

      const requestInfo = await Requests.findOne({
        rider: rider.rider._id, status: 100, waitingPaymentConfirmation: false
      });
      return sinon.assert.match(requestInfo.paymentInformation.discount, 500);
    });
    it('Should create pwyw request without promocode if value is above minimum', async () => {
      location.pwywInformation.pwywOptions = [500, 1000, 2000];
      await location.save();

      const result = await setupPromocode(
        rider.riderToken, app, request, domain, location._id, promocode.code
      );
      sinon.assert.match(result.promocode.code, promocode.code);

      const pwywRequest = await createRequest(rider.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1, 200, '1.0.0', 600);
      expect(pwywRequest).to.be.jsonSchema(dumpRequestForRiderSchema);
      expect(pwywRequest.waitingPaymentConfirmation).to.equal(true);
      expect(pwywRequest.paymentInformation.totalPrice).to.equal(600);

      const { body: [pwywRequestRecovery] } = await riderEndpoint('/v1/requests', 'get', rider.riderToken, app, request, domain);
      expect(pwywRequestRecovery).to.be.jsonSchema(dumpRequestForRiderSchema);
      const requestInfo = await Requests.findOne({
        rider: rider.rider._id,
        status: 100,
        waitingPaymentConfirmation: true
      });
      return sinon.assert.match(requestInfo.paymentInformation.discount, null);
    });
    it('Should get quote for pwyw request with promocode if value is the same as minimum', async () => {
      location.pwywInformation.pwywOptions = [500, 1000, 2000];
      await location.save();

      const result = await setupPromocode(
        rider.riderToken, app, request, domain, location._id, promocode.code
      );
      sinon.assert.match(result.promocode.code, promocode.code);

      const { body } = await riderEndpoint(
        `/v1/quote?locationId=${location._id}&passengers=1&pwywValue=500&originLatitude=${keyLoc.req1p[0]}&originLongitude=${keyLoc.req1p[1]}&destinationLatitude=${keyLoc.req1d[0]}&destinationLongitude=${keyLoc.req1d[1]}`, 'get', rider.riderToken, app, request, domain
      );
      return sinon.assert.match(body.totalPrice, 0);
    });
    it('Should get quote for pwyw request without promocode if value is above minimum', async () => {
      location.pwywInformation.pwywOptions = [500, 1000, 2000];
      await location.save();

      const result = await setupPromocode(
        rider.riderToken, app, request, domain, location._id, promocode.code
      );
      sinon.assert.match(result.promocode.code, promocode.code);

      const { body } = await riderEndpoint(
        `/v1/quote?locationId=${location._id}&passengers=1&pwywValue=600&originLatitude=${keyLoc.req1p[0]}&originLongitude=${keyLoc.req1p[1]}&destinationLatitude=${keyLoc.req1d[0]}&destinationLongitude=${keyLoc.req1d[1]}`, 'get', rider.riderToken, app, request, domain
      );
      return sinon.assert.match(body.totalPrice, 600);
    });
    it('Should not use promocode if pwyw value is 0', async () => {
      location.pwywInformation.pwywOptions = [0, 1000, 2000];
      await location.save();

      const result = await setupPromocode(
        rider.riderToken, app, request, domain, location._id, promocode.code
      );
      sinon.assert.match(result.promocode.code, promocode.code);

      const freePwywRequest = await createRequest(rider.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1, 200, '1.0.0', 0);
      expect(freePwywRequest).to.be.jsonSchema(dumpRequestForRiderSchema);
      expect(freePwywRequest.waitingPaymentConfirmation).to.equal(false);
      expect(freePwywRequest.paymentInformation.totalPrice).to.equal(0);

      const { body: [freePwywRequestRecovery] } = await riderEndpoint('/v1/requests', 'get', rider.riderToken, app, request, domain);
      expect(freePwywRequestRecovery).to.be.jsonSchema(dumpRequestForRiderSchema);

      let requestInfo = await Requests.findOne({ rider: rider.rider._id });
      sinon.assert.match([
        !!requestInfo,
        requestInfo.paymentInformation.isPromocodeValid,
        requestInfo.paymentInformation.promocodeUsed,
        requestInfo.paymentInformation.totalPrice,
        requestInfo.paymentInformation.totalWithoutDiscount
      ],
      [
        true,
        false,
        false,
        0,
        null
      ]);

      // Complete Ride
      await driverSearcher.search();
      const ride = await Rides.findOne({ request: requestInfo._id });
      await pickUp(driver.driverToken, ride, app, request, domain);
      await dropOff(driver.driverToken, ride, app, request, domain);

      requestInfo = await Requests.findOne({ rider: rider.rider._id });
      sinon.assert.match([
        !!requestInfo,
        requestInfo.paymentInformation.isPromocodeValid,
        requestInfo.paymentInformation.promocodeUsed,
        requestInfo.paymentInformation.totalPrice,
        requestInfo.paymentInformation.totalWithoutDiscount
      ],
      [
        true,
        false,
        false,
        0,
        null
      ]);
    });
    it('Should have correct email dump', async () => {
      const result = await setupPromocode(
        rider.riderToken, app, request, domain, location._id, promocode2.code
      );
      sinon.assert.match(result.promocode.code, promocode2.code);

      location.pwywInformation.pwywOptions = [500, 1000, 2000];
      await location.save();

      await createRequest(rider.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1, 200, '1.0.0', 500);
      await riderApprovePayment(rider.riderToken, app, request, domain);
      const requestInfo = await Requests.findOne({
        rider: rider.rider._id,
        status: 100,
        waitingPaymentConfirmation: true
      });
      sinon.assert.match(!!requestInfo, true);

      // Confirm payment
      const paymentIntent = await stripe.confirmPaymentIntent(
        requestInfo.paymentInformation.paymentIntentId
      );
      await riderConfirmPaymentIntent(
        rider.riderToken, app, request, domain,
        PaymentStatus[paymentIntent.status],
        paymentIntent.id
      );

      // Find driver for ride
      await driverSearcher.search();
      const ride = await Rides.findOne({ rider: rider.rider._id });
      sinon.assert.match(!!ride, true);

      // Complete Ride
      await pickUp(driver.driverToken, ride, app, request, domain);
      await dropOff(driver.driverToken, ride, app, request, domain);

      const updatedRide = await Rides.findById(ride._id)
        .populate('rider')
        .populate('driver')
        .populate('location')
        .populate('request')
        .populate({ path: 'pickupFixedStopId', model: 'FixedStops' })
        .populate({ path: 'dropoffFixedStopId', model: 'FixedStops' });

      const {
        rider: rider1, driver: driver1, location: location1, request: request1
      } = updatedRide;

      const riderLocale = await getLocaleFromUser('rider', updatedRide.rider);
      const promocodeId = requestInfo?.paymentInformation?.promocodeId;
      const promoCode = promocodeId ? await Promocodes.findById(promocodeId) : null;

      const htmlData = dump.dumpEmailReceiptData(
        updatedRide, request1, rider1,
        driver1, location1, domain.rider,
        riderLocale, promoCode
      );
      return sinon.assert.match([
        htmlData.ridePrice,
        htmlData.hasDiscount,
        htmlData.rideDiscount,
        htmlData.rideWithoutDiscount,
        htmlData.promocodeName,
        htmlData.driverDisplayName
      ],
      [
        '$4.00',
        true,
        '$1.00',
        '$5.00',
        '20% Off',
        driver1.displayName
      ]);
    });
    it('Should not create pwyw request if value is below minimum', async () => {
      location.pwywInformation.pwywOptions = [500, 1000, 2000];
      await location.save();

      const result = await createRequest(rider.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1, 400, '1.0.0', 100);
      sinon.assert.match(result.message, 'So close! Due to Credit Card Processing fees we ask for a minimum of $1 when chipping in and supporting the service. We really appreciate the support, people like you help keep the community moving!');
      const requestInfo = await Requests.findOne({
        rider: rider.rider._id,
        status: 100,
        waitingPaymentConfirmation: true
      });
      return sinon.assert.match(requestInfo, null);
    });
  });
});
