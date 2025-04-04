import request from 'supertest-promised';
import moment from 'moment-timezone';
import sinon from 'sinon';
import { expect } from 'chai';
import app from '../server';
import driverSearcher from '../services/driverSearch';
import { domain } from '../config';
import { fetchAllowedAdForEmail } from '../utils/digitalAds';
import {
  createScenarioRiders, createRequest, getPaymentSettings,
  riderConfirmPaymentIntent, setupPromocode, createFsRequest,
  riderApprovePayment, riderEndpoint
} from './utils/rider';
import {
  Riders, Drivers, FixedStopStatus, Tips,
  Requests, Rides, Settings, FixedStops,
  PaymentStatus, Promocodes, MatchingRules
} from '../models';
import { emptyAllCollections, emptyCollectionList } from './utils/helper';
import { createAdvertiser, createMediaItem, createCampaign } from './utils/digitalAds';

import { html as receiptHtml, subject as receiptSubject } from '../services/mailers/templates/receipt';
import { html as forgotHtml, subject as forgotSubject } from '../services/mailers/templates/forgot-password';
import { html as verifyHtml, subject as verifySubject } from '../services/mailers/templates/email-verify';
import { stripe } from '../services';
import * as dumpUtils from '../utils/dump';

import { createScenarioDrivers, pickUp, dropOff } from './utils/driver';
import { createScenarioLocation, listScenarioPoints } from './utils/location';

let sandbox;
let dumpEmailReceiptDataSpy;
let dumpEmailChargeHoldDataSpy;
let dumpEmailTipDataSpy;

let driver1Token;
let driver2Token;
let driver3Token;
let rider1;
let rider2;
let rider1Token;
let rider2Token;
let location1;
let location2;
let location3;
let fs1;
let fs2;
let fixedStopRide;

const pointsBrooklyn = listScenarioPoints('Brooklyn');
const pointsCoimbra = listScenarioPoints('Coimbra');

const keyLoc = {
  // Driver 1
  d1a: pointsBrooklyn[0],
  // Request 1
  req1p: [...pointsBrooklyn[1].reverse(), '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [...pointsBrooklyn[4].reverse(), '178 Broadway, Brooklyn, NY 11211, USA'],
  // Request 2
  req2p: [...pointsBrooklyn[2].reverse(), '115-57 Eldert St, Brooklyn, NY 11207, USA'],
  req2d: [...pointsBrooklyn[4], '115-57 Eldert St, Brooklyn, NY 11207, USA'],

  d2a: pointsCoimbra[0],
  // Request 3
  req3p: [...pointsCoimbra[1].reverse(), 'Minipreco'],
  req3d: [...pointsCoimbra[2].reverse(), 'McDonalds']
};

describe('Email template', () => {
  before(async () => {
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    sandbox = sinon.createSandbox();
    dumpEmailReceiptDataSpy = sandbox.spy(dumpUtils, 'dumpEmailReceiptData');
    dumpEmailChargeHoldDataSpy = sandbox.spy(dumpUtils, 'dumpEmailChargeHoldData');
    dumpEmailTipDataSpy = sandbox.spy(dumpUtils, 'dumpEmailTipData');

    location1 = await createScenarioLocation('Brooklyn', {
      name: 'Location',
      tipEnabled: true,
      tipInformation: {
        tipOptions: [100, 500, 1000],
        maxCustomValue: 2000,
        currency: 'usd'
      }
    });

    location2 = await createScenarioLocation('Coimbra', {
      name: 'Location',
      paymentEnabled: true,
      paymentInformation: {
        ridePrice: 1000,
        capEnabled: false,
        priceCap: 100000,
        pricePerHead: 100,
        currency: 'usd'
      }
    });

    location3 = await createScenarioLocation('Brooklyn', {
      name: 'Location 3',
      fixedStopEnabled: true
    });

    const advertiser = await createAdvertiser();
    const mediaItem = await createMediaItem({
      sourceUrl: 'link_to_img',
      advertisement: {
        advertiserId: advertiser._id,
        url: 'link_to_page'
      }
    });
    await createCampaign({
      locations: [location1._id, location2._id, location3._id],
      mediaList: [mediaItem._id]
    });

    const commonFsInfo = {
      status: FixedStopStatus.enabled,
      location: location3._id,
      businessName: 'Business name',
      address: 'Here'
    };

    fs1 = await FixedStops.createFixedStop({
      name: 'Brand name 1',
      lng: -73.978573,
      lat: 40.721239,
      ...commonFsInfo
    });

    fs2 = await FixedStops.createFixedStop({
      name: 'Brand name 1',
      lng: -73.882936,
      lat: 40.698337,
      ...commonFsInfo
    });

    await MatchingRules.create({
      key: 'shared',
      title: 'Shared',
      description: 'Designated for all requests across all zones'
    });
    ([
      { driverToken: driver1Token },
      { driverToken: driver2Token },
      { driverToken: driver3Token }
    ] = await createScenarioDrivers(3, { app, request, domain }, [
      {
        locations: [location1._id],
        currentLocation: {
          coordinates: keyLoc.d1a,
          type: 'Point'
        }
      },
      {
        locations: [location2._id],
        currentLocation: {
          coordinates: keyLoc.d2a,
          type: 'Point'
        }
      },
      {
        locations: [location3._id],
        currentLocation: {
          coordinates: keyLoc.d1a,
          type: 'Point'
        }
      }
    ]));

    ([
      { rider: rider1, riderToken: rider1Token },
      { rider: rider2, riderToken: rider2Token }
    ] = await createScenarioRiders(2, { app, request, domain }, [{}, { firstName: 'Rider' }]));
  });

  beforeEach(async () => {
    await emptyCollectionList(['Requests', 'Rides', 'Routes', 'Promocodes']);
    await Drivers.updateMany({}, { $set: { driverRideList: [] } });
    dumpEmailReceiptDataSpy.resetHistory();
    dumpEmailChargeHoldDataSpy.resetHistory();
    dumpEmailTipDataSpy.resetHistory();
  });

  after(() => {
    dumpEmailReceiptDataSpy.restore();
    dumpEmailChargeHoldDataSpy.restore();
    dumpEmailTipDataSpy.restore();
    sandbox.restore();
  });

  describe('Email template', () => {
    it('Should have correct info rendered for default location email', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location1, app, request, domain);
      await driverSearcher.search();

      let ride1 = await Rides.findOne({ rider: rider1._id });
      await pickUp(driver1Token, ride1, app, request, domain);
      await dropOff(driver1Token, ride1, app, request, domain);

      ride1 = await Rides.findOne({ _id: ride1._id }).populate('rider').populate('driver').populate('location');
      const { rider, driver, location } = ride1;

      location.name = 'Default location';

      sinon.assert.calledOnce(dumpEmailReceiptDataSpy);

      const htmlData = dumpEmailReceiptDataSpy(
        ride1, ride1.request, rider, driver, location, domain.rider, 'en'
      );

      const htmlText = await receiptHtml(htmlData);
      const subjectText = await receiptSubject(htmlData);

      return expect([
        htmlText.includes(`${driver.displayName}`),
        htmlText.includes(ride1.pickupAddress),
        htmlText.includes('Thanks for riding with us in Default location'),
        htmlText.includes('Price'),
        subjectText.includes('Your ride receipt from Circuit'),
        htmlText.includes(`, ${new Date().getFullYear()}`)
      ]).to.eql([true, true, true, false, true, true]);
    });

    it('Should have correct info rendered for default location email in spanish', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location1, app, request, domain);
      await driverSearcher.search();

      let ride1 = await Rides.findOne({ rider: rider1._id });
      await pickUp(driver1Token, ride1, app, request, domain);
      await dropOff(driver1Token, ride1, app, request, domain);

      ride1 = await Rides.findOne({ _id: ride1._id }).populate('rider').populate('driver').populate('location');
      const { rider, driver, location } = ride1;

      location.name = 'Default location';

      sinon.assert.calledOnce(dumpEmailReceiptDataSpy);
      const htmlData = dumpEmailReceiptDataSpy(
        ride1, ride1.request, rider, driver, location, domain.rider, 'es'
      );

      const htmlText = await receiptHtml(htmlData, 'es');
      const subjectText = await receiptSubject(htmlData, 'es');

      return expect([
        htmlText.includes(`${driver.displayName}`),
        htmlText.includes(ride1.pickupAddress),
        htmlText.includes('Gracias por viajar con nosotros en Default location'),
        subjectText.includes('Tu recibo de viaje de Circuit'),
        htmlText.includes(`de ${new Date().getFullYear()}`)
      ]).to.eql([true, true, true, true, true]);
    });
    it('Should have correct info rendered for fred location email', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location1, app, request, domain);
      await driverSearcher.search();

      let ride1 = await Rides.findOne({ rider: rider1._id });
      await pickUp(driver1Token, ride1, app, request, domain);
      await dropOff(driver1Token, ride1, app, request, domain);

      ride1 = await Rides.findOne({ _id: ride1._id }).populate('rider').populate('driver').populate('location');
      const { rider, driver, location } = ride1;
      location.name = 'FRED - San Diego';

      sinon.assert.calledOnce(dumpEmailReceiptDataSpy);

      const htmlData = dumpEmailReceiptDataSpy(
        ride1, ride1.request, rider, driver, location, domain.rider, 'en'
      );

      const htmlText = await receiptHtml(htmlData);
      const subjectText = await receiptSubject(htmlData);

      return expect([
        htmlText.includes(`${driver.displayName}`),
        htmlText.includes(ride1.pickupAddress),
        htmlText.includes('Thanks for riding with FRED!'),
        htmlText.includes('Price'),
        subjectText.includes('Your ride receipt from Circuit')
      ]).to.eql([true, true, true, false, true]);
    });
    it('Should have correct info rendered for fred location email in spanish', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location1, app, request, domain);
      await driverSearcher.search();

      let ride1 = await Rides.findOne({ rider: rider1._id });
      await pickUp(driver1Token, ride1, app, request, domain);
      await dropOff(driver1Token, ride1, app, request, domain);

      ride1 = await Rides.findOne({ _id: ride1._id }).populate('rider').populate('driver').populate('location');
      const { rider, driver, location } = ride1;
      location.name = 'FRED - San Diego';

      sinon.assert.calledOnce(dumpEmailReceiptDataSpy);

      const htmlData = dumpEmailReceiptDataSpy(
        ride1, ride1.request, rider, driver, location, domain.rider, 'es'
      );

      const htmlText = await receiptHtml(htmlData, 'es');
      const subjectText = await receiptSubject(htmlData, 'es');

      return expect([
        htmlText.includes(`${driver.displayName}`),
        htmlText.includes(ride1.pickupAddress),
        htmlText.includes('Gracias por viajar con FRED!'),
        subjectText.includes('Tu recibo de viaje de Circuit')
      ]).to.eql([true, true, true, true]);
    });
    it('Should have correct info rendered for franc location email', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location1, app, request, domain);
      await driverSearcher.search();

      let ride1 = await Rides.findOne({ rider: rider1._id });
      await pickUp(driver1Token, ride1, app, request, domain);
      await dropOff(driver1Token, ride1, app, request, domain);

      ride1 = await Rides.findOne({ _id: ride1._id }).populate('rider').populate('driver').populate('location');
      const { rider, driver, location } = ride1;
      location.name = 'FRANC - Newport Center';

      sinon.assert.calledOnce(dumpEmailReceiptDataSpy);

      const htmlData = dumpEmailReceiptDataSpy(
        ride1, ride1.request, rider, driver, location, domain.rider, 'en'
      );

      const htmlText = await receiptHtml(htmlData);
      const subjectText = await receiptSubject(htmlData);

      return expect([
        htmlText.includes(`${driver.displayName}`),
        htmlText.includes(ride1.pickupAddress),
        htmlText.includes('Thanks for riding with FRANC - Newport Center!'),
        htmlText.includes('Price'),
        subjectText.includes('Your ride receipt from Circuit')
      ]).to.eql([true, true, true, false, true]);
    });

    it('Should have correct info rendered for franc location email in spanish', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location1, app, request, domain);
      await driverSearcher.search();

      let ride1 = await Rides.findOne({ rider: rider1._id });
      await pickUp(driver1Token, ride1, app, request, domain);
      await dropOff(driver1Token, ride1, app, request, domain);

      ride1 = await Rides.findOne({ _id: ride1._id }).populate('rider').populate('driver').populate('location');
      const { rider, driver, location } = ride1;
      location.name = 'FRANC - Newport Center';

      sinon.assert.calledOnce(dumpEmailReceiptDataSpy);

      const htmlData = dumpEmailReceiptDataSpy(
        ride1, ride1.request, rider, driver, location, domain.rider, 'es'
      );

      const htmlText = await receiptHtml(htmlData, 'es');
      const subjectText = await receiptSubject(htmlData, 'es');

      return expect([
        htmlText.includes(`${driver.displayName}`),
        htmlText.includes(ride1.pickupAddress),
        htmlText.includes('Gracias por viajar con FRANC - Newport Center!'),
        subjectText.includes('Tu recibo de viaje de Circuit')
      ]).to.eql([true, true, true, true]);
    });

    it('Should have correct info rendered for franc location email with payment', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location1, app, request, domain);
      await driverSearcher.search();

      let ride1 = await Rides.findOne({ rider: rider1._id });
      await pickUp(driver1Token, ride1, app, request, domain);
      await dropOff(driver1Token, ride1, app, request, domain);

      ride1 = await Rides.findOne({ _id: ride1._id })
        .populate('rider')
        .populate('driver')
        .populate('location')
        .populate('request');
      const {
        rider, driver, location
      } = ride1;
      location.name = 'FRANC - Newport Center';

      sinon.assert.calledOnce(dumpEmailReceiptDataSpy);

      const htmlData = dumpEmailReceiptDataSpy(
        ride1, ride1.request, rider, driver, location, domain.rider, 'en'
      );
      const htmlText = await receiptHtml(htmlData);
      const subjectText = await receiptSubject(htmlData);

      return expect([
        htmlText.includes(`${driver.displayName}`),
        htmlText.includes(ride1.pickupAddress),
        htmlText.includes('Thanks for riding with FRANC - Newport Center!'),
        htmlText.includes('Price'),
        subjectText.includes('Your ride receipt from Circuit')
      ]).to.eql([true, true, true, false, true]);
    });

    it('Should have correct info rendered from default location with payment', async () => {
      const promocode = await Promocodes.createPromocode({
        name: '1$ off',
        location: location2._id,
        type: 'value',
        value: 100,
        isEnabled: true
      });
      await setupPromocode(rider2Token, app, request, domain, location2._id, promocode.code);

      // Set stripe customer and add payment method
      await getPaymentSettings(rider2Token, app, request, domain);
      rider2 = await Riders.findOne({ _id: rider2._id });
      await stripe.clearPaymentMethods(rider2.stripeCustomerId);
      await stripe.attachPaymentMethod(rider2.stripeCustomerId, 'pm_card_visa_debit');

      await createRequest(rider2Token, keyLoc.req3p, keyLoc.req3d, location2, app, request, domain);

      await riderApprovePayment(rider2Token, app, request, domain);

      // Confirm payment
      const requestInfo = await Requests.findOne({ rider: rider2._id });
      expect(requestInfo.paymentInformation.status).to.equal('requires_confirmation');

      const paymentIntent = await stripe.confirmPaymentIntent(
        requestInfo.paymentInformation.paymentIntentId
      );
      await riderConfirmPaymentIntent(
        rider2Token, app, request, domain, PaymentStatus[paymentIntent.status], paymentIntent.id
      );

      await driverSearcher.search();

      let ride1 = await Rides.findOne({ rider: rider2._id });
      await pickUp(driver2Token, ride1, app, request, domain);
      await dropOff(driver2Token, ride1, app, request, domain);

      ride1 = await Rides.findOne({ _id: ride1._id })
        .populate('rider')
        .populate('driver')
        .populate('location')
        .populate('request');

      const {
        rider, driver, location
      } = ride1;
      location.name = 'Default location';

      sinon.assert.calledOnce(dumpEmailReceiptDataSpy);

      const htmlData = dumpEmailReceiptDataSpy(
        ride1, ride1.request, rider, driver, location, domain.rider, 'en', promocode
      );

      const htmlText = await receiptHtml(htmlData);
      const subjectText = await receiptSubject(htmlData);

      expect([
        htmlText.includes(`${driver.displayName}`),
        htmlText.includes(ride1.pickupAddress),
        htmlText.includes('Thanks for riding with us in Default location'),
        htmlText.includes('Ride Price'),
        htmlText.includes('$10.00'),
        htmlText.includes('Discount'),
        htmlText.includes('$1.00'),
        htmlText.includes('Final Payment'),
        htmlText.includes('$9.00'),
        htmlText.includes('1$ off'),
        subjectText.includes('Your ride receipt from Circuit')
      ]).to.eql([true, true, true, true, true, true, true, true, true, true, true]);

      const expectedPaymentInformation = requestInfo.paymentInformation;
      const expectedConfirmationTimestamp = requestInfo.requestTimestamp;
      const expectedRider = rider;
      const expectedRequest = requestInfo;
      const expectedLocation = location2;
      const expectedAdvertisement = await fetchAllowedAdForEmail(location, rider);
      const expectedLocale = 'en';

      sinon.assert.calledOnce(dumpEmailChargeHoldDataSpy);

      const chargeHoldData = dumpEmailChargeHoldDataSpy(
        expectedPaymentInformation,
        expectedConfirmationTimestamp,
        expectedRider,
        expectedRequest,
        expectedLocation,
        expectedAdvertisement,
        expectedLocale
      );
      expect(chargeHoldData.riderFirstName).to.equal('Rider');
      expect(chargeHoldData.passengerNumber).to.equal(1);
      expect(chargeHoldData.pickupInfo).to.equal('Minipreco');
      expect(chargeHoldData.dropoffInfo).to.equal('McDonalds');
      expect(chargeHoldData.pickupAddress).to.equal('Minipreco');
      expect(chargeHoldData.dropoffAddress).to.equal('McDonalds');
      expect(chargeHoldData.paymentEnabled).to.equal(true);
      expect(chargeHoldData.ridePrice).to.equal('$9.00');
      expect(chargeHoldData.hasDiscount).to.equal(true);
      expect(chargeHoldData.hasPromocode).to.equal(true);
      expect(chargeHoldData.promocodeName).to.equal('1$ off');
      expect(chargeHoldData.rideDiscount).to.equal('$1.00');
      expect(chargeHoldData.rideWithoutDiscount).to.equal('$10.00');
    });

    it('Should show Final payment $0.00 if 100% discount', async () => {
      const promocode = await Promocodes.createPromocode({
        name: 'Full Discount',
        location: location2._id,
        type: 'full',
        isEnabled: true
      });
      await setupPromocode(rider2Token, app, request, domain, location2._id, promocode.code);

      // Set stripe customer and add payment method
      await getPaymentSettings(rider2Token, app, request, domain);
      rider2 = await Riders.findOne({ _id: rider2._id });
      await stripe.clearPaymentMethods(rider2.stripeCustomerId);
      await stripe.attachPaymentMethod(rider2.stripeCustomerId, 'pm_card_visa_debit');

      await createRequest(rider2Token, keyLoc.req3p, keyLoc.req3d, location2, app, request, domain);

      await driverSearcher.search();

      let ride1 = await Rides.findOne({ rider: rider2._id });
      await pickUp(driver2Token, ride1, app, request, domain);
      await dropOff(driver2Token, ride1, app, request, domain);

      ride1 = await Rides.findOne({ _id: ride1._id })
        .populate('rider')
        .populate('driver')
        .populate('location')
        .populate('request');

      const {
        rider, driver, location
      } = ride1;
      location.name = 'FRANC - Newport Center';

      sinon.assert.calledOnce(dumpEmailReceiptDataSpy);

      const htmlData = dumpEmailReceiptDataSpy(
        ride1, ride1.request, rider, driver, location, domain.rider, 'en', promocode
      );

      const htmlText = await receiptHtml(htmlData);
      const subjectText = await receiptSubject(htmlData);

      return expect([
        htmlText.includes(`${driver.displayName}`),
        htmlText.includes(ride1.pickupAddress),
        htmlText.includes('Thanks for riding with FRANC - Newport Center!'),
        htmlText.includes('Ride Price'),
        htmlText.includes('$10.00'),
        htmlText.includes('Discount'),
        htmlText.includes('$10.00'),
        htmlText.includes('Final Payment'),
        htmlText.includes('$0.00'),
        htmlText.includes('Full Discount'),
        subjectText.includes('Your ride receipt from Circuit')
      ]).to.eql([true, true, true, true, true, true, true, true, true, true, true]);
    });

    it('Should have correct info rendered for forgot password email for rider', async () => {
      const values = {
        pincode: '12345',
        role: 'Rider'
      };
      const htmlText = await forgotHtml(values);
      const subjectText = await forgotSubject(values);

      return expect([
        subjectText.includes('Rider forgotten password request'),
        htmlText.includes('Use this pincode to restore password:'),
        htmlText.includes(values.pincode)
      ]).to.eql([true, true, true]);
    });
    it('Should have correct info rendered for forgot password email for rider in spanish', async () => {
      const values = {
        pincode: '12345',
        role: 'Rider'
      };
      const htmlText = await forgotHtml(values, 'es');
      const subjectText = await forgotSubject(values, 'es');

      return expect([
        subjectText.includes('Código PIN para recuperar la contraseña de Circuit'),
        htmlText.includes('Usa este código PIN para restaurar tu contraseña:'),
        htmlText.includes(values.pincode)
      ]).to.eql([true, true, true]);
    });
    it('Should have correct info rendered for email verify', async () => {
      const values = {
        password: 'ABC12345'
      };
      const htmlText = await verifyHtml(values);
      const subjectText = await verifySubject(values);

      return expect([
        htmlText.includes(values.password),
        subjectText.includes('Forgotten password request')
      ]).to.eql([true, true]);
    });
  });
  describe('Email template for fixed-stops', () => {
    it('Should have correct info for default location receipt with fixed-stops', async () => {
      await createFsRequest(rider1Token, fs1._id, fs2._id, location3, app, request, domain);
      await driverSearcher.search();

      const ride1 = await Rides.findOne({ rider: rider1._id });
      await pickUp(driver3Token, ride1, app, request, domain);
      await dropOff(driver3Token, ride1, app, request, domain);

      fixedStopRide = await Rides.findOne({ rider: rider1._id })
        .populate('rider')
        .populate('driver')
        .populate('location')
        .populate('request')
        .populate({ path: 'pickupFixedStopId', model: 'FixedStops' })
        .populate({ path: 'dropoffFixedStopId', model: 'FixedStops' });


      sinon.assert.calledOnce(dumpEmailReceiptDataSpy);

      const htmlData = dumpEmailReceiptDataSpy(
        fixedStopRide, request, fixedStopRide.rider, fixedStopRide.driver, fixedStopRide.location, domain.rider, 'en'
      );

      // Default
      let htmlText = await receiptHtml(htmlData);
      let subjectText = await receiptSubject(htmlData);

      expect([
        htmlText.includes(fixedStopRide.driver.displayName),
        htmlText.includes(fixedStopRide.pickupFixedStopId.name),
        htmlText.includes(fixedStopRide.dropoffFixedStopId.name),
        htmlText.includes('Pickup:'),
        htmlText.includes('Pickup Address:'),
        htmlText.includes('Thanks for riding with us in Location 3'),
        htmlText.includes(`, ${new Date().getFullYear()}`),
        subjectText.includes('Your ride receipt from Circuit')
      ]).to.eql([true, true, true, true, false, true, true, true]);

      // FRED - San Diego
      htmlData.locationName = 'FRED - San Diego';
      htmlText = await receiptHtml(htmlData);
      subjectText = await receiptSubject(htmlData);

      expect([
        htmlText.includes(fixedStopRide.driver.displayName),
        htmlText.includes(fixedStopRide.pickupFixedStopId.name),
        htmlText.includes(fixedStopRide.dropoffFixedStopId.name),
        htmlText.includes('Pickup:'),
        htmlText.includes('Pickup Address:'),
        htmlText.includes('Thanks for riding with FRED!'),
        htmlText.includes(`, ${new Date().getFullYear()}`),
        subjectText.includes('Your ride receipt from Circuit')
      ]).to.eql([true, true, true, true, false, true, true, true]);

      // FRANC - Newport Center
      htmlData.locationName = 'FRANC - Newport Center';
      htmlText = await receiptHtml(htmlData);
      subjectText = await receiptSubject(htmlData);

      return expect([
        htmlText.includes(fixedStopRide.driver.displayName),
        htmlText.includes(fixedStopRide.pickupFixedStopId.name),
        htmlText.includes(fixedStopRide.dropoffFixedStopId.name),
        htmlText.includes('Pickup:'),
        htmlText.includes('Pickup Address:'),
        htmlText.includes('Thanks for riding with FRANC - Newport Center!'),
        htmlText.includes(`, ${new Date().getFullYear()}`),
        subjectText.includes('Your ride receipt from Circuit')
      ]).to.eql([true, true, true, true, false, true, true, true]);
    });
    it('Should have correct info for default location receipt with fixed-stops in spanish', async () => {
      await createFsRequest(rider1Token, fs1._id, fs2._id, location3, app, request, domain);
      await driverSearcher.search();

      const ride1 = await Rides.findOne({ rider: rider1._id });
      await pickUp(driver3Token, ride1, app, request, domain);
      await dropOff(driver3Token, ride1, app, request, domain);

      fixedStopRide = await Rides.findOne({ rider: rider1._id })
        .populate('rider')
        .populate('driver')
        .populate('location')
        .populate('request')
        .populate({ path: 'pickupFixedStopId', model: 'FixedStops' })
        .populate({ path: 'dropoffFixedStopId', model: 'FixedStops' });

      sinon.assert.calledOnce(dumpEmailReceiptDataSpy);

      const htmlData = dumpEmailReceiptDataSpy(
        fixedStopRide, request, fixedStopRide.rider, fixedStopRide.driver, fixedStopRide.location, domain.rider, 'es'
      );

      // Default
      let htmlText = await receiptHtml(htmlData, 'es');
      let subjectText = await receiptSubject(htmlData, 'es');

      expect([
        htmlText.includes(fixedStopRide.driver.displayName),
        htmlText.includes(fixedStopRide.pickupFixedStopId.name),
        htmlText.includes(fixedStopRide.dropoffFixedStopId.name),
        htmlText.includes('Punto De Partida:'),
        htmlText.includes('Gracias por viajar con nosotros en Location 3'),
        htmlText.includes(`de ${new Date().getFullYear()}`),
        subjectText.includes('Tu recibo de viaje de Circuit')
      ]).to.eql([true, true, true, true, true, true, true]);

      // FRED - San Diego
      htmlData.locationName = 'FRED - San Diego';
      htmlText = await receiptHtml(htmlData, 'es');
      subjectText = await receiptSubject(htmlData, 'es');

      expect([
        htmlText.includes(fixedStopRide.driver.displayName),
        htmlText.includes(fixedStopRide.pickupFixedStopId.name),
        htmlText.includes(fixedStopRide.dropoffFixedStopId.name),
        htmlText.includes('Punto De Partida:'),
        htmlText.includes('Gracias por viajar con FRED!'),
        htmlText.includes(`de ${new Date().getFullYear()}`),
        subjectText.includes('Tu recibo de viaje de Circuit')
      ], [true, true, true, true, true, true, true]);

      // FRANC - Newport Center
      htmlData.locationName = 'FRANC - Newport Center';
      htmlText = await receiptHtml(htmlData, 'es');
      subjectText = await receiptSubject(htmlData, 'es');

      return expect([
        htmlText.includes(fixedStopRide.driver.displayName),
        htmlText.includes(fixedStopRide.pickupFixedStopId.name),
        htmlText.includes(fixedStopRide.dropoffFixedStopId.name),
        htmlText.includes('Punto De Partida:'),
        htmlText.includes('Gracias por viajar con FRANC - Newport Center!'),
        htmlText.includes(`de ${new Date().getFullYear()}`),
        subjectText.includes('Tu recibo de viaje de Circuit')
      ]).to.eql([true, true, true, true, true, true, true]);
    });
  });
  describe('Email dump for tip receipt', () => {
    it('Should have correct info rendered for driver tip email', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location1, app, request, domain);
      await driverSearcher.search();

      const ride = await Rides.findOne({ rider: rider1._id });
      await pickUp(driver1Token, ride, app, request, domain);
      await dropOff(driver1Token, ride, app, request, domain);

      const payload = { rideId: ride._id, tipAmount: 1000 };
      const {
        body: { paymentIntentId }
      } = await riderEndpoint('/v1/tip', 'post', rider1Token, app, request, domain, payload);
      const tip = await Tips.findOne();

      const tipPayload = {
        paymentIntentId,
        paymentIntentStatus: PaymentStatus.requires_capture
      };
      await riderEndpoint('/v1/tip/confirm', 'post', rider1Token, app, request, domain, tipPayload);

      const advertisement = await fetchAllowedAdForEmail(location1, rider1);

      sinon.assert.calledOnce(dumpEmailTipDataSpy);

      const dynamicTemplateData = dumpEmailTipDataSpy(
        tip,
        rider1,
        advertisement,
        'en',
        domain.rider
      );

      expect(dynamicTemplateData.driverDisplayName).to.equal('Driver FN Driver LN');
      expect(dynamicTemplateData.riderFirstName).to.equal('Rider FN');
      expect(dynamicTemplateData.riderLastName).to.equal('1');
      expect(dynamicTemplateData.locationName).to.equal('Location');
      // eslint-disable-next-line no-unused-expressions
      expect(dynamicTemplateData.requestTime).to.not.be.empty;
      expect(dynamicTemplateData.passengerNumber).to.equal(1);
      expect(dynamicTemplateData.total).to.equal('$10.00');
      expect(dynamicTemplateData.showAd).to.equal(true);
      expect(dynamicTemplateData.adImg).to.equal('link_to_img');
      expect(dynamicTemplateData.adUrl).to.equal('link_to_page');
      expect(dynamicTemplateData.unsubscribeUrl).to.include('/v1/unsubscribe');
    });

    it('Should have correct info rendered for driver tip email in spanish', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location1, app, request, domain);
      await driverSearcher.search();

      const ride = await Rides.findOne({ rider: rider1._id });
      await pickUp(driver1Token, ride, app, request, domain);
      await dropOff(driver1Token, ride, app, request, domain);

      const payload = { rideId: ride._id, tipAmount: 1000 };
      const {
        body: { paymentIntentId }
      } = await riderEndpoint('/v1/tip', 'post', rider1Token, app, request, domain, payload);
      const tip = await Tips.findOne();

      const tipPayload = {
        paymentIntentId,
        paymentIntentStatus: PaymentStatus.requires_capture
      };
      await riderEndpoint('/v1/tip/confirm', 'post', rider1Token, app, request, domain, tipPayload);

      const advertisement = await fetchAllowedAdForEmail(location1, rider1);

      sinon.assert.calledOnce(dumpEmailTipDataSpy);

      const dynamicTemplateData = dumpEmailTipDataSpy(
        tip,
        rider1,
        advertisement,
        'es',
        domain.rider
      );

      expect(dynamicTemplateData.driverDisplayName).to.equal('Driver FN Driver LN');
      expect(dynamicTemplateData.riderFirstName).to.equal('Rider FN');
      expect(dynamicTemplateData.riderLastName).to.equal('1');
      expect(dynamicTemplateData.locationName).to.equal('Location');
      // eslint-disable-next-line no-unused-expressions
      expect(dynamicTemplateData.requestTime).to.not.be.empty;
      expect(dynamicTemplateData.passengerNumber).to.equal(1);
      expect(dynamicTemplateData.total).to.equal('$10.00');
      expect(dynamicTemplateData.showAd).to.equal(true);
      expect(dynamicTemplateData.adImg).to.equal('link_to_img');
      expect(dynamicTemplateData.adUrl).to.equal('link_to_page');
      expect(dynamicTemplateData.unsubscribeUrl).to.include('/v1/unsubscribe');
    });
  });
});
