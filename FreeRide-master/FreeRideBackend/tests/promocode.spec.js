import sinon from 'sinon';
import io from 'socket.io-client';
import chai from 'chai';
import jsonSchema from 'chai-json-schema';
import request from 'supertest-promised';
import moment from 'moment-timezone';
import app from '../server';
import { port, domain } from '../config';
import logger from '../logger';
import driverSearcher from '../services/driverSearch';
import {
  Locations,
  Promocodes,
  Riders,
  Requests,
  Drivers,
  PaymentStatus,
  Rides,
  PromocodeStatus,
  Settings
} from '../models';
import { emptyAllCollections } from './utils/helper';
import { stripe } from '../services';
import {
  setupPromocode,
  removePromocode,
  getPaymentSettings,
  createRequest,
  riderConfirmPaymentIntent,
  getQuote,
  riderEndpoint,
  riderApprovePayment
} from './utils/rider';
import { pickUp, dropOff, createDriverLogin } from './utils/driver';
import { createAdminLogin, adminEndpoint } from './utils/admin';
import { dumpRequestForRiderSchema, dumpRideForRiderSchema } from './utils/schemas';

chai.use(jsonSchema);
const { expect } = chai;

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let sandbox;
let location;
let location2;
let rider;
let riderSocket;
let riderToken;

let driver;
let driverSocket;
let driverToken;

let adminToken;

const keyLoc = {
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

const locationInfo = {
  isADA: true,
  isUsingServiceTimes: false,
  isActive: true,
  paymentEnabled: true,
  paymentInformation: {
    ridePrice: 100,
    capEnabled: false,
    priceCap: 50,
    pricePerHead: 50,
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
};

describe('Promocode', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);
    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({ ...locationInfo, name: 'Location' });
    location2 = await Locations.createLocation({ ...locationInfo, name: 'Location2' });

    const driverInfo = {
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
    };

    ({ driver, driverSocket, driverToken } = await createDriverLogin(
      driverInfo, app, request, domain, driverSocket
    ));

    rider = await new Riders({
      email: 'rider1@mail.com',
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
      .send({ email: 'rider1@mail.com', password: 'Password1' })
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

    ({ adminToken } = await createAdminLogin());
  });

  beforeEach(async () => {
    sandbox.restore();

    await Promocodes.deleteMany();
    await Requests.deleteMany();
    await Rides.deleteMany();
    await Drivers.updateOne({ _id: driver._id }, { $set: { driverRideList: [] } });
    await Riders.updateOne({ _id: rider._id }, { $set: { promocode: null } });
  });

  describe('Promocode', () => {
    it('Should create a promocode', async () => {
      const promocode = await Promocodes.createPromocode({
        name: '20% off',
        code: '20PercOff',
        location: location._id,
        type: 'percentage',
        value: 20
      });
      sinon.assert.match(promocode.code, '20PercOff');
      return sinon.assert.match(!!promocode._id, true);
    });
    it('Should create a promocode with random name if none specified', async () => {
      const promocode = await Promocodes.createPromocode({
        name: '1$ off',
        location: location._id,
        type: 'value',
        value: 100
      });
      sinon.assert.match(!!promocode._id, true);
      return sinon.assert.match(promocode.code.length, 6);
    });
    it('Should create a promocode with expiryDate 1 day after now', async () => {
      const promocode = await Promocodes.createPromocode({
        name: '1$ off',
        location: location._id,
        type: 'value',
        value: 100,
        expiryDate: moment().utc().subtract(1, 'day')
      });
      sinon.assert.match(!!promocode._id, true);

      const now = moment.utc();
      const expiryDate = moment(promocode.expiryDate);
      const validDayCount = expiryDate.diff(now, 'days');
      return sinon.assert.match(validDayCount, 1);
    });
    it('Should create a promocode with same expiryDate if valid', async () => {
      const promocode = await Promocodes.createPromocode({
        name: '1$ off',
        location: location._id,
        type: 'value',
        value: 100,
        expiryDate: moment().utc().add(3, 'day').add(1, 'hour')
      });
      sinon.assert.match(!!promocode._id, true);

      const now = moment.utc();
      const expiryDate = moment(promocode.expiryDate);
      const validDayCount = expiryDate.diff(now, 'days');
      return sinon.assert.match(validDayCount, 3);
    });
    it('Should fix a promocode with percentage over 100', async () => {
      const promocode = await Promocodes.createPromocode({
        name: '110% off',
        location: location._id,
        type: 'percentage',
        value: 110
      });
      sinon.assert.match(!!promocode._id, true);
      sinon.assert.match(promocode.type, 'percentage');
      return sinon.assert.match(promocode.value, 100);
    });
    it('Should fix a promocode with percentage under 0', async () => {
      const promocode = await Promocodes.createPromocode({
        name: '-10% off',
        location: location._id,
        type: 'percentage',
        value: -10,
        expiryDate: moment().utc().subtract(1, 'day')
      });
      sinon.assert.match(!!promocode._id, true);
      sinon.assert.match(promocode.type, 'percentage');
      return sinon.assert.match(promocode.value, 0);
    });
    it('Should be able to create a promocode with value over 100', async () => {
      const promocode = await Promocodes.createPromocode({
        name: '$1000 off',
        location: location._id,
        type: 'value',
        value: 1000000,
        expiryDate: moment().utc().subtract(1, 'day')
      });
      sinon.assert.match(!!promocode._id, true);
      sinon.assert.match(promocode.type, 'value');
      return sinon.assert.match(promocode.value, 1000000);
    });
    it('Should fix a promocode with value under 0', async () => {
      const promocode = await Promocodes.createPromocode({
        name: '- $10 off',
        location: location._id,
        type: 'value',
        value: -10,
        expiryDate: moment().utc().subtract(1, 'day')
      });
      sinon.assert.match(!!promocode._id, true);
      sinon.assert.match(promocode.type, 'value');
      return sinon.assert.match(promocode.value, 0);
    });
    it('Should not create a promocode if code already exists', async () => {
      let promocode = await Promocodes.createPromocode({
        name: '20% off',
        code: 'ABC',
        location: location._id,
        type: 'percentage',
        value: 20
      });
      sinon.assert.match(!!promocode._id, true);
      promocode = {};
      try {
        promocode = await Promocodes.createPromocode({
          name: '20% off',
          code: 'ABC',
          location: location._id,
          type: 'percentage',
          value: 20
        });
      } catch (error) {
        sinon.assert.match(error.message, 'Duplicate promocode');
      }
      return sinon.assert.match(!!promocode._id, false);
    });
    it('Should create a promocode if code already exists but is deleted', async () => {
      let promocode = await Promocodes.createPromocode({
        name: '20% off',
        code: 'ABC',
        location: location._id,
        type: 'percentage',
        value: 20,
        isDeleted: true
      });
      sinon.assert.match(!!promocode._id, true);
      promocode = await Promocodes.createPromocode({
        name: '20% off',
        code: 'ABC',
        location: location._id,
        type: 'percentage',
        value: 20
      });
      return sinon.assert.match(!!promocode._id, true);
    });
    it('Should create a promocode if code already exists but locations are different', async () => {
      let promocode = await Promocodes.createPromocode({
        name: '20% off',
        code: 'ABC',
        location: location._id,
        type: 'percentage',
        value: 20
      });
      sinon.assert.match(!!promocode._id, true);
      promocode = await Promocodes.createPromocode({
        name: '20% off',
        code: 'ABC',
        location: location2._id,
        type: 'percentage',
        value: 20
      });
      return sinon.assert.match(!!promocode._id, true);
    });
    it('Should associate a valid promocode to a rider', async () => {
      const promocode = await Promocodes.createPromocode({
        name: 'Free ride',
        code: 'freeRide',
        location: location._id,
        type: 'full',
        value: 20,
        isEnabled: true
      });
      sinon.assert.match(!!promocode._id, true);

      const result = await setupPromocode(
        riderToken, app, request, domain, location._id, promocode.code
      );
      return sinon.assert.match(result.promocode.code, promocode.code);
    });
    it('Should throw an error when trying to associate invalid promocode', async () => {
      const promocode = await Promocodes.createPromocode({
        name: '20% off',
        location: location._id,
        type: 'percentage',
        value: 20,
        isEnabled: true
      });
      sinon.assert.match(!!promocode._id, true);

      let result = await setupPromocode(
        riderToken, app, request, domain, location._id, promocode.code
      );
      sinon.assert.match(result.promocode.code, promocode.code);

      // Disabled promocode
      promocode.isEnabled = false;
      await promocode.save();
      result = await setupPromocode(
        riderToken, app, request, domain, location._id, promocode.code, 400
      );
      sinon.assert.match(result.message.includes(PromocodeStatus.invalid.message), true);

      // Deleted promocode
      promocode.isEnabled = true;
      promocode.isDeleted = true;
      await promocode.save();
      result = await setupPromocode(
        riderToken, app, request, domain, location._id, promocode.code, 400
      );
      sinon.assert.match(result.message.includes(PromocodeStatus.invalid.message), true);

      // Wrong location
      promocode.isDeleted = false;
      await promocode.save();
      result = await setupPromocode(
        riderToken, app, request, domain, location2._id, promocode.code, 400
      );
      sinon.assert.match(result.message.includes(PromocodeStatus.invalid.message), true);

      // Expired
      promocode.isEnabled = true;
      promocode.expiryDate = moment().utc().subtract(1, 'day');
      await promocode.save();
      result = await setupPromocode(
        riderToken, app, request, domain, location._id, promocode.code, 400
      );
      sinon.assert.match(result.message.includes(PromocodeStatus.expired.message), true);

      // Not expired
      promocode.isEnabled = true;
      promocode.expiryDate = moment().utc().add(3, 'day');
      await promocode.save();
      result = await setupPromocode(
        riderToken, app, request, domain, location._id, promocode.code, 200
      );
      sinon.assert.match(result.promocode?.isPromocodeValid, true);
      sinon.assert.match(!!result.promocode?.promocodeExpiryDate, true);
      sinon.assert.match(!!result.promocode?.promocodeUsesLeft, false);
      sinon.assert.match(!!result.promocode?.promocodeUsesMax, false);
      rider = await Riders.findOne({ _id: rider._id });
      rider.promocode = null;
      await rider.save();

      // Not expired with both expiry date and usage limit
      promocode.isEnabled = true;
      promocode.expiryDate = moment().utc().add(3, 'day');
      promocode.usageLimit = 1;
      await promocode.save();
      result = await setupPromocode(
        riderToken, app, request, domain, location._id, promocode.code, 200
      );
      sinon.assert.match(result.promocode?.promocodeUsesLeft, 1);
      sinon.assert.match(result.promocode?.promocodeUsesMax, 1);
      sinon.assert.match(!!result.promocode?.promocodeExpiryDate, true);
      sinon.assert.match(result.promocode?.name, '20% off');
      rider.promocode = null;
      await rider.save();

      // Usage limit
      promocode.expiryDate = null;
      promocode.usageLimit = 1;
      await promocode.save();
      result = await setupPromocode(
        riderToken, app, request, domain, location._id, promocode.code, 200
      );
      sinon.assert.match(result.promocode?.promocodeUsesLeft, 1);
      sinon.assert.match(result.promocode?.promocodeUsesMax, 1);
      sinon.assert.match(!!result.promocode?.promocodeExpiryDate, false);

      const { promocode: riderPromocode } = await Riders.findOne({ _id: rider._id }).populate('promocode');
      sinon.assert.match(riderPromocode.code, promocode.code);

      await getPaymentSettings(riderToken, app, request, domain, location._id);
      rider = await Riders.findOne({ _id: rider._id });
      await stripe.attachPaymentMethod(rider.stripeCustomerId, 'pm_card_visa_debit');

      await createRequest(riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await riderApprovePayment(riderToken, app, request, domain);
      let requestInfo = await Requests.findOne({ rider: rider._id });
      const requestList = await adminEndpoint(
        `/v1/requests?location=${location._id}`, 'get', adminToken, app, request, domain
      );
      sinon.assert.match(requestList.body.total, 1);
      sinon.assert.match(
        requestList.body.items[0].paymentInformation.promocodeId.code,
        promocode.code
      );

      // Confirm payment
      const paymentIntent = await stripe.confirmPaymentIntent(
        requestInfo.paymentInformation.paymentIntentId
      );
      await riderConfirmPaymentIntent(
        riderToken, app, request, domain, PaymentStatus[paymentIntent.status], paymentIntent.id
      );
      // Find driver for ride
      await driverSearcher.search();
      const ride = await Rides.findOne({ rider: rider._id });
      sinon.assert.match(!!ride, true);

      // Pickup Ride
      await pickUp(driverToken, ride, app, request, domain);
      requestInfo = await Requests.findOne({ rider: rider._id });

      result = await getPaymentSettings(riderToken, app, request, domain, location._id);
      sinon.assert.match(result.promocode?.promocodeUsesLeft, 0);
      sinon.assert.match(result.promocode?.promocodeUsesMax, 1);

      result = await setupPromocode(
        riderToken, app, request, domain, location._id, promocode.code, 400
      );
      return sinon.assert.match(result.message.includes(PromocodeStatus.usage_limit.message), true);
    });
    it('Should remove promocode', async () => {
      const promocode = await Promocodes.createPromocode({
        name: '20% off',
        location: location._id,
        type: 'percentage',
        value: 20,
        isEnabled: true
      });
      sinon.assert.match(!!promocode._id, true);

      let result = await setupPromocode(
        riderToken, app, request, domain, location._id, promocode.code
      );
      sinon.assert.match(result.promocode.code, promocode.code);

      result = await removePromocode(riderToken, app, request, domain, location._id);
      return sinon.assert.match(result.promocode, null);
    });
    it('Should create request with discount price', async () => {
      await getPaymentSettings(riderToken, app, request, domain, location._id);
      rider = await Riders.findOne({ _id: rider._id });
      await stripe.attachPaymentMethod(rider.stripeCustomerId, 'pm_card_visa_debit');

      const promocode = await Promocodes.createPromocode({
        name: '50% off',
        code: '50PercOff',
        location: location._id,
        type: 'percentage',
        value: 50,
        isEnabled: true
      });
      sinon.assert.match(!!promocode._id, true);

      const result = await setupPromocode(
        riderToken, app, request, domain, location._id, promocode.code
      );
      sinon.assert.match(result.promocode.code, promocode.code);

      const requestInfo = await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 2
      );
      expect(requestInfo).to.be.jsonSchema(dumpRequestForRiderSchema);
      expect(requestInfo.waitingPaymentConfirmation).to.equal(true);
      expect(requestInfo.paymentInformation.totalWithoutDiscount).to.equal(150);
      expect(requestInfo.paymentInformation.discount).to.equal(75);
      expect(requestInfo.paymentInformation.totalPrice).to.equal(75);
      expect(requestInfo.paymentInformation.promocodeCode).to.equal('50PercOff');
      expect(requestInfo.paymentInformation.promocodeName).to.equal('50% off');
      expect(requestInfo.paymentInformation.isPromocodeValid).to.equal(true);

      const {
        totalWithoutDiscount, discount, promocodeCode,
        isPromocodeValid, promocodeInvalidMessage, totalPrice
      } = requestInfo.paymentInformation;

      sinon.assert.match(totalWithoutDiscount, 150);
      sinon.assert.match(totalPrice, 75);
      sinon.assert.match(discount, 75);
      sinon.assert.match(promocodeCode, '50PercOff');
      sinon.assert.match(isPromocodeValid, true);
      sinon.assert.match(promocodeInvalidMessage, null);

      const response = await riderEndpoint('/v1/requests', 'get', riderToken, app, request, domain);
      expect(response.body[0]).to.be.jsonSchema(dumpRequestForRiderSchema);
      sinon.assert.match(response.body[0].paymentInformation.promocodeCode, '50PercOff');

      const { paymentInformation: reqPayInfo } = await Requests.findOne({ rider });

      sinon.assert.match(reqPayInfo.totalWithoutDiscount, 150);
      sinon.assert.match(reqPayInfo.totalPrice, 75);
      sinon.assert.match(reqPayInfo.discount, 75);
      sinon.assert.match(reqPayInfo.promocodeCode, '50PercOff');
      sinon.assert.match(reqPayInfo.isPromocodeValid, true);
      sinon.assert.match(reqPayInfo.promocodeInvalidMessage, null);
      sinon.assert.match(reqPayInfo.promocodeUsed, false);
    });
    it('Should create request without discount price', async () => {
      await getPaymentSettings(riderToken, app, request, domain, location._id);
      rider = await Riders.findOne({ _id: rider._id });
      await stripe.attachPaymentMethod(rider.stripeCustomerId, 'pm_card_visa_debit');

      const promocode = await Promocodes.createPromocode({
        name: '50% off',
        code: '50PercOff',
        location: location._id,
        type: 'percentage',
        value: 50,
        isEnabled: false
      });
      sinon.assert.match(!!promocode._id, true);

      rider.promocode = promocode._id;
      await rider.save();
      const result = await getPaymentSettings(riderToken, app, request, domain, location._id);
      sinon.assert.match(result.promocode.code, promocode.code);
      sinon.assert.match(result.promocode.name, '50% off');
      sinon.assert.match(result.promocode.type, 'percentage');
      sinon.assert.match(result.promocode.value, 50);
      sinon.assert.match(result.promocode.isPromocodeValid, false);
      sinon.assert.match(result.promocode.promocodeInvalidMessage, PromocodeStatus.invalid.message);

      const requestInfo = await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 2
      );

      expect(requestInfo).to.be.jsonSchema(dumpRequestForRiderSchema);
      expect(requestInfo.waitingPaymentConfirmation).to.equal(true);
      expect(requestInfo.paymentInformation.totalPrice).to.equal(150);
      expect(requestInfo.paymentInformation.promocodeCode).to.equal('50PercOff');
      expect(requestInfo.paymentInformation.promocodeName).to.equal('50% off');
      expect(requestInfo.paymentInformation.isPromocodeValid).to.equal(false);

      const {
        totalWithoutDiscount, discount, promocodeCode,
        isPromocodeValid, promocodeInvalidMessage, totalPrice
      } = requestInfo.paymentInformation;

      sinon.assert.match(totalWithoutDiscount, undefined);
      sinon.assert.match(totalPrice, 150);
      sinon.assert.match(discount, undefined);
      sinon.assert.match(promocodeCode, '50PercOff');
      sinon.assert.match(isPromocodeValid, false);
      sinon.assert.match(promocodeInvalidMessage, 'Promocode is not valid');

      const { paymentInformation: reqPayInfo } = await Requests.findOne({ rider });

      sinon.assert.match(reqPayInfo.totalWithoutDiscount, null);
      sinon.assert.match(reqPayInfo.totalPrice, 150);
      sinon.assert.match(reqPayInfo.discount, null);
      sinon.assert.match(reqPayInfo.promocodeCode, '50PercOff');
      sinon.assert.match(reqPayInfo.isPromocodeValid, false);
      sinon.assert.match(reqPayInfo.promocodeInvalidMessage, 'Promocode is not valid');
      sinon.assert.match(reqPayInfo.promocodeUsed, false);
    });
    it('Should return a quote with discount price', async () => {
      await getPaymentSettings(riderToken, app, request, domain, location._id);
      rider = await Riders.findOne({ _id: rider._id });
      await stripe.attachPaymentMethod(rider.stripeCustomerId, 'pm_card_visa_debit');

      const promocode = await Promocodes.createPromocode({
        name: '50% off',
        code: '50PercOff',
        location: location._id,
        type: 'percentage',
        value: 50,
        usageLimit: 6,
        expiryDate: moment().utc().add(10, 'day'),
        isEnabled: true
      });
      sinon.assert.match(!!promocode._id, true);

      const result = await setupPromocode(
        riderToken, app, request, domain, location._id, promocode.code
      );
      sinon.assert.match(result.promocode.code, promocode.code);
      sinon.assert.match(result.promocode.isPromocodeValid, true);
      sinon.assert.match(result.promocode.promocodeInvalidMessage, null);

      const quote = await getQuote(riderToken, app, request, domain, location._id, 2, keyLoc);

      sinon.assert.match(quote.totalWithoutDiscount, 150);
      sinon.assert.match(quote.totalPrice, 75);
      sinon.assert.match(quote.discount, 75);
      sinon.assert.match(quote.promocodeCode, '50PercOff');
      sinon.assert.match(quote.promocodeName, '50% off');
      sinon.assert.match(quote.promocodeUsesMax, 6);
      sinon.assert.match(quote.promocodeUsesLeft, 6);
      sinon.assert.match(!!quote.promocodeExpiryDate, true);
      return sinon.assert.match(quote.isPromocodeValid, true);
    });
    it('Should return a quote without discount price', async () => {
      await getPaymentSettings(riderToken, app, request, domain, location._id);
      rider = await Riders.findOne({ _id: rider._id });
      await stripe.attachPaymentMethod(rider.stripeCustomerId, 'pm_card_visa_debit');

      const promocode = await Promocodes.createPromocode({
        name: '50% off',
        code: '50PercOff',
        location: location._id,
        type: 'percentage',
        value: 50,
        isEnabled: true
      });
      sinon.assert.match(!!promocode._id, true);

      const result = await setupPromocode(
        riderToken, app, request, domain, location._id, promocode.code
      );
      sinon.assert.match(result.promocode.code, promocode.code);
      promocode.isEnabled = false;
      await promocode.save();

      const quote = await getQuote(riderToken, app, request, domain, location._id, 2, keyLoc);

      sinon.assert.match(quote.totalWithoutDiscount, undefined);
      sinon.assert.match(quote.totalPrice, 150);
      sinon.assert.match(quote.discount, undefined);
      sinon.assert.match(quote.promocodeCode, '50PercOff');
      return sinon.assert.match(quote.isPromocodeValid, false);
    });
    it('Should return a quote without full discount price', async () => {
      await getPaymentSettings(riderToken, app, request, domain);
      rider = await Riders.findOne({ _id: rider._id });
      await stripe.attachPaymentMethod(rider.stripeCustomerId, 'pm_card_visa_debit');

      const promocode = await Promocodes.createPromocode({
        name: 'Free ride',
        code: 'FreeRide4U',
        location: location._id,
        type: 'full',
        isEnabled: true
      });
      sinon.assert.match(!!promocode._id, true);

      const result = await setupPromocode(
        riderToken, app, request, domain, location._id, promocode.code
      );
      sinon.assert.match(result.promocode.code, promocode.code);

      const quote = await getQuote(riderToken, app, request, domain, location._id, 2, keyLoc);

      sinon.assert.match(quote.totalWithoutDiscount, 150);
      sinon.assert.match(quote.totalPrice, 0);
      sinon.assert.match(quote.discount, 150);
      sinon.assert.match(quote.promocodeCode, 'FreeRide4U');
      return sinon.assert.match(quote.isPromocodeValid, true);
    });
    it('Should use full discount coupon', async () => {
      await getPaymentSettings(riderToken, app, request, domain);
      rider = await Riders.findOne({ _id: rider._id });
      await stripe.attachPaymentMethod(rider.stripeCustomerId, 'pm_card_visa_debit');

      const promocode = await Promocodes.createPromocode({
        name: 'Free ride',
        code: 'FreeRide4U',
        location: location._id,
        type: 'full',
        usageLimit: 10,
        expiryDate: moment().utc().add(10, 'day'),
        isEnabled: true
      });
      sinon.assert.match(!!promocode._id, true);

      let result = await setupPromocode(
        riderToken, app, request, domain, location._id, promocode.code
      );
      sinon.assert.match(result.promocode.code, promocode.code);

      result = await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location._id, app, request, domain
      );
      sinon.assert.match(result.paymentInformation.status, 'requires_capture');
      sinon.assert.match(result.paymentInformation.promocodeUsesLeft, 10);
      sinon.assert.match(result.paymentInformation.promocodeUsesMax, 10);
      sinon.assert.match(!!result.paymentInformation.promocodeExpiryDate, true);

      let requestInfo = await Requests.findOne({ rider: rider._id });
      sinon.assert.match(requestInfo.waitingPaymentConfirmation, false);
      sinon.assert.match(requestInfo.paymentInformation.status, 'requires_capture');

      // Find driver for ride
      await driverSearcher.search();
      const ride = await Rides.findOne({ rider: rider._id });
      sinon.assert.match(!!ride, true);

      let response = await riderEndpoint('/v1/current-ride', 'get', riderToken, app, request, domain);
      expect(response.body).to.be.jsonSchema(dumpRideForRiderSchema);
      sinon.assert.match(response.body.paymentStatus, 'requires_capture');
      sinon.assert.match(response.body.totalPrice, 0);
      sinon.assert.match(response.body.currency, 'usd');

      response = await riderEndpoint(`/v1/rides/${ride._id}`, 'get', riderToken, app, request, domain);
      expect(response.body).to.be.jsonSchema(dumpRideForRiderSchema);
      sinon.assert.match(response.body.paymentStatus, 'requires_capture');
      sinon.assert.match(response.body.totalPrice, 0);
      sinon.assert.match(response.body.currency, 'usd');

      response = await riderEndpoint('/v1/requests', 'get', riderToken, app, request, domain);
      expect(response.body[0]).to.be.jsonSchema(dumpRequestForRiderSchema);
      sinon.assert.match(response.body[0].paymentInformation.promocodeUsesLeft, 10);
      sinon.assert.match(response.body[0].paymentInformation.promocodeUsesMax, 10);
      sinon.assert.match(!!response.body[0].paymentInformation.promocodeExpiryDate, true);
      sinon.assert.match(response.body[0].origin.address, keyLoc.req1p[2]);
      sinon.assert.match(response.body[0].destination.address, keyLoc.req1d[2]);
      sinon.assert.match(!!response.body[0].requestTimestamp, true);
      sinon.assert.match(response.body[0].waitingPaymentConfirmation, false);

      // Pickup Ride
      await pickUp(driverToken, ride, app, request, domain);

      requestInfo = await Requests.findOne({ _id: requestInfo._id });
      sinon.assert.match(requestInfo.paymentInformation.promocodeUsed, true);
      sinon.assert.match(requestInfo.paymentInformation.status, 'succeeded');

      response = await riderEndpoint('/v1/current-ride', 'get', riderToken, app, request, domain);
      sinon.assert.match(response.body.paymentStatus, 'succeeded');
      sinon.assert.match(response.body.totalPrice, 0);
      sinon.assert.match(response.body.currency, 'usd');

      response = await riderEndpoint(`/v1/rides/${ride._id}`, 'get', riderToken, app, request, domain);
      sinon.assert.match(response.body.paymentStatus, 'succeeded');
      sinon.assert.match(response.body.totalPrice, 0);
      sinon.assert.match(response.body.currency, 'usd');

      // Dropoff Ride
      await dropOff(driverToken, ride, app, request, domain);

      response = await riderEndpoint('/v1/rides', 'get', riderToken, app, request, domain);
      expect(response.body[0]).to.be.jsonSchema(dumpRideForRiderSchema);
      sinon.assert.match(response.body[0].paymentStatus, 'succeeded');
      sinon.assert.match(response.body[0].totalWithoutDiscount, 100);
      sinon.assert.match(response.body[0].discount, 100);
      sinon.assert.match(response.body[0].currency, 'usd');
      return sinon.assert.match(response.body[0].totalPrice, 0);
    });
  });

  describe('Admin promocode management', () => {
    it('Should add promocode with expiry date at end of day', async () => {
      const developer = await createAdminLogin({ role: 'Developer' });

      const promocodeData = {
        name: 'TEST1',
        code: 'TEST1',
        type: 'percentage',
        value: 10,
        expiryDate: '2030-12-01T00:00:00.000Z',
        isEnabled: true,
        location: String(location._id),
        id: '5f43e190fcbf1744d93742c1'
      };

      let response = await adminEndpoint('/v1/promocodes', 'post', developer.adminToken, app, request, domain, promocodeData);
      const promocodeId = response.body.id;
      let promocode = await Promocodes.findOne({ _id: promocodeId });
      sinon.assert.match(moment(promocode.expiryDate).utc().tz(location.timezone).format('lll'), 'Dec 1, 2030 11:59 PM');

      response = await adminEndpoint(`/v1/promocodes/${promocode._id}`, 'get', developer.adminToken, app, request, domain, promocodeData);
      promocode = response.body;

      // Update expiryDate
      promocode.expiryDate = '2030-12-02T00:00:00.000Z';
      response = await adminEndpoint(`/v1/promocodes/${promocode.id}`, 'put', developer.adminToken, app, request, domain, promocode);
      promocode = response.body;
      promocode = await Promocodes.findOne({ _id: promocode.id });
      sinon.assert.match(moment(promocode.expiryDate).utc().tz(location.timezone).format('lll'), 'Dec 2, 2030 11:59 PM');

      // Delete promocode
      await adminEndpoint(`/v1/promocodes/${promocode._id}`, 'put', developer.adminToken, app, request, domain, { isDeleted: true });
      promocode = await Promocodes.findOne({ _id: promocode.id });
      return sinon.assert.match(promocode.isDeleted, true);
    });
  });
});
