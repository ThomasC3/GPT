/* eslint-disable max-len */
/* eslint-disable arrow-body-style */
import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../server';
import { emptyAllCollections } from './utils/helper';
import { port, domain } from '../config';
import { Settings, Riders, Locations } from '../models';
import { TI18N } from './utils/i18nHelper';
import {
  InvalidPhoneNumberError,
  LocationNotFoundError,
  RiderNotFoundError,
  UnprocessableError,
  EmailNotSentError,
  InvalidPinCodeNumber,
  ApplicationError,
  StripeCustomerError,
  StripeSetupError,
  StripePaymentMethodError,
  RideNotFoundError,
  LocationError,
  InvalidPromocodeError,
  InvalidAccessTokenError,
  FacebookError,
  ForbiddenError,
  GoogleMapsError,
  CancelCooldownError,
  InvalidPhoneNumberFormatError
} from '../errors';
import { parse as phoneNumberParse } from '../middlewares/rider/utils/phoneNumber';
import {
  riderEndpoint,
  createRiderLogin
} from './utils/rider';
import { compareError } from './utils/comparison';
import {
  useEndpoint,
  emitEvent
} from './utils/ride';
import { buildTranslator, translator } from '../utils/translation';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let riderSocket;
let rider;
let riderToken;

const locationInfo = {
  name: 'Location',
  isADA: false,
  isUsingServiceTimes: false,
  isActive: true,
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
  ],
  alert: {
    title: 'En alert',
    copy: 'En alert copy'
  },
  closedCopy: 'En closed copy',
  inactiveCopy: 'En inactiveCopy',
  suspendedCopy: 'En suspended copy',
  suspendedTitle: 'En suspended title',
  copyData: [{
    alert: {
      title: 'Es alert title',
      copy: 'Es alert copy'
    },
    localeName: 'Spanish',
    closedCopy: 'Es closed copy',
    suspendedTitle: 'Es suspended title',
    suspendedCopy: 'Es suspended copy',
    locale: 'es'
  }]
};
const requestOrigin = {
  latitude: 40.721239,
  longitude: -73.978573
};
const requestDestination = {
  latitude: 40.660845,
  longitude: -73.978573
};
let location;

describe('Translation', () => {
  describe('Error default messages', () => {
    it('InvalidPhoneNumberError', () => {
      return compareError(
        new InvalidPhoneNumberError(), 'Invalid phone number', TI18N.en.InvalidPhoneNumberFormatError.default, 'InvalidPhoneNumberFormatError.default'
      );
    });
    it('LocationNotFoundError', () => {
      return compareError(
        new LocationNotFoundError(), 'Location not found.', TI18N.en.LocationNotFoundError.default, 'LocationNotFoundError.default'
      );
    });
    it('RiderNotFoundError', () => {
      return compareError(
        new RiderNotFoundError(), 'Rider not found.', TI18N.en.RiderNotFoundError.default, 'RiderNotFoundError.default'
      );
    });
    it('UnprocessableError', () => {
      return compareError(
        new UnprocessableError(), 'Unprocessable', TI18N.en.UnprocessableError.default, 'UnprocessableError.default'
      );
    });
    it('EmailNotSentError', () => {
      return compareError(
        new EmailNotSentError(), 'Email not sent', TI18N.en.EmailNotSentError.default, 'EmailNotSentError.default'
      );
    });
    it('InvalidPinCodeNumber', () => {
      return compareError(
        new InvalidPinCodeNumber(), 'Wrong pincode', TI18N.en.InvalidPinCodeNumber.default, 'InvalidPinCodeNumber.default'
      );
    });
    it('ApplicationError', () => {
      return compareError(
        new ApplicationError(), 'Something went wrong. Please try again.', TI18N.en.genericFailure, 'genericFailure'
      );
    });
    it('StripeCustomerError', () => {
      return compareError(
        new StripeCustomerError(), 'Something went wrong. Please try again.', TI18N.en.genericFailure, 'genericFailure'
      );
    });
    it('StripeSetupError', () => {
      return compareError(
        new StripeSetupError(), 'Something went wrong. Please try again.', TI18N.en.genericFailure, 'genericFailure'
      );
    });
    it('StripePaymentMethodError', () => {
      return compareError(
        new StripePaymentMethodError(), 'Something went wrong. Please try again.', TI18N.en.genericFailure, 'genericFailure'
      );
    });
    it('RideNotFoundError', () => {
      return compareError(
        new RideNotFoundError(), 'Ride not found', TI18N.en.ride.notFoundSimple, 'ride.notFoundSimple'
      );
    });
    it('LocationError', () => {
      return compareError(
        new LocationError(), 'Location error.', TI18N.en.location.error, 'location.error'
      );
    });
    it('InvalidPromocodeError', () => {
      return compareError(
        new InvalidPromocodeError(), 'Invalid promocode', TI18N.en.promocode.invalid, 'promocode.invalid'
      );
    });
    it('InvalidAccessTokenError', () => {
      return compareError(
        new InvalidAccessTokenError(), 'Invalid access token', TI18N.en.InvalidAccessTokenError.default, 'InvalidAccessTokenError.default'
      );
    });
    it('FacebookError', () => {
      return compareError(
        new FacebookError(), 'Facebook request error', TI18N.en.FacebookError.default, 'FacebookError.default'
      );
    });
    it('ForbiddenError', () => {
      return compareError(
        new ForbiddenError(), 'Forbidden', TI18N.en.ForbiddenError.default, 'ForbiddenError.default'
      );
    });
    it('GoogleMapsError', () => {
      return compareError(
        new GoogleMapsError(), 'Google Maps request was unsuccessful', TI18N.en.googleMapsClient.default, 'googleMapsClient.default'
      );
    });
    it('CancelCooldownError', () => {
      return compareError(
        new CancelCooldownError(), 'Please wait a few moments and trying again', TI18N.en.request.cancelCooldownDefault, 'request.cancelCooldownDefault'
      );
    });
    it('InvalidPhoneNumberFormatError', () => {
      return compareError(
        new InvalidPhoneNumberFormatError(), 'Invalid phone format', TI18N.en.InvalidPhoneNumberFormatError.phoneParseFail, 'InvalidPhoneNumberFormatError.phoneParseFail'
      );
    });
  });
  describe('Error custom messages', () => {
    it('LocationNotFoundError #1', () => {
      return compareError(
        new LocationNotFoundError(TI18N.en.LocationNotFoundError.address, 'LocationNotFoundError.address'),
        'We were unable to find an available address for your location.',
        TI18N.en.LocationNotFoundError.address,
        'LocationNotFoundError.address'
      );
    });
    it('LocationNotFoundError #2', () => {
      return compareError(
        new LocationNotFoundError(TI18N.en.LocationNotFoundError.fixedStopSearch, 'LocationNotFoundError.fixedStopSearch'),
        'We were unable to fetch this location\'s information.',
        TI18N.en.LocationNotFoundError.fixedStopSearch,
        'LocationNotFoundError.fixedStopSearch'
      );
    });
    it('LocationNotFoundError #3', () => {
      return compareError(
        new LocationNotFoundError(TI18N.en.location.fetchLocationInfoLocationIdNotFound, 'location.fetchLocationInfoLocationIdNotFound'),
        'We were unable to fetch this location information.',
        TI18N.en.location.fetchLocationInfoLocationIdNotFound,
        'location.fetchLocationInfoLocationIdNotFound'
      );
    });
    it('LocationNotFoundError #4', () => {
      const locationId = '123';
      return compareError(
        new LocationNotFoundError(TI18N.en.location.notFound.replace('{{locationId}}', locationId), 'location.notFound', { locationId }),
        'Location with id of 123 not found',
        TI18N.en.location.notFound.replace('{{locationId}}', locationId),
        'location.notFound',
        { locationId }
      );
    });
    it('RiderNotFoundError #1', () => {
      return compareError(
        new RiderNotFoundError(TI18N.en.riderAccount.infoFetchFail, 'riderAccount.infoFetchFail'),
        'We were unable to fetch your account information.',
        TI18N.en.riderAccount.infoFetchFail,
        'riderAccount.infoFetchFail'
      );
    });
    it('RiderNotFoundError #2', () => {
      return compareError(
        new RiderNotFoundError(TI18N.en.riderEmailVerification.riderNotFound, 'riderEmailVerification.riderNotFound'),
        'No rider with such email',
        TI18N.en.riderEmailVerification.riderNotFound,
        'riderEmailVerification.riderNotFound'
      );
    });
    it('RiderNotFoundError #3', () => {
      const riderId = '123';
      return compareError(
        new RiderNotFoundError(TI18N.en.rider.notFound.replace('{{riderId}}', riderId), 'rider.notFound', { riderId }),
        'Rider with id of 123 not found',
        TI18N.en.rider.notFound.replace('{{riderId}}', riderId),
        'rider.notFound',
        { riderId }
      );
    });
    it('UnprocessableError', () => {
      return compareError(
        new UnprocessableError(TI18N.en.emailLogin.emptyPassword, 'emailLogin.emptyPassword'),
        'Hey Rider, welcome back! Before we can log you in, we need you to update your password. Check your account\'s email inbox for a PIN code which you can enter here so that we can verify your account.',
        TI18N.en.emailLogin.emptyPassword,
        'emailLogin.emptyPassword'
      );
    });
    it('InvalidPinCodeNumber #1', () => {
      return compareError(
        new InvalidPinCodeNumber(TI18N.en.riderPhoneVerification.wrongPinCodeEntered, 'riderPhoneVerification.wrongPinCodeEntered'),
        'The pincode you entered is invalid.',
        TI18N.en.riderPhoneVerification.wrongPinCodeEntered,
        'riderPhoneVerification.wrongPinCodeEntered'
      );
    });
    it('InvalidPinCodeNumber #2', () => {
      return compareError(
        new InvalidPinCodeNumber(TI18N.en.riderEmailVerification.wrongPinCodeEntered, 'riderEmailVerification.wrongPinCodeEntered'),
        'The pincode you entered is invalid.',
        TI18N.en.riderEmailVerification.wrongPinCodeEntered,
        'riderEmailVerification.wrongPinCodeEntered'
      );
    });
    it('ApplicationError #1', () => {
      return compareError(
        new ApplicationError(TI18N.en.riderPhonePinCodeRequest.smsSendFail, 500, 'riderPhonePinCodeRequest.smsSendFail'),
        'We were unable to send a pincode to this number.',
        TI18N.en.riderPhonePinCodeRequest.smsSendFail,
        'riderPhonePinCodeRequest.smsSendFail'
      );
    });
    it('ApplicationError #2', () => {
      return compareError(
        new ApplicationError(TI18N.en.ride.noRider, 500, 'ride.noRider'),
        'This ride doesn\'t have rider',
        TI18N.en.ride.noRider,
        'ride.noRider'
      );
    });
    it('ApplicationError #3', () => {
      return compareError(
        new ApplicationError(TI18N.en.ride.wrongId, 500, 'ride.wrongId'),
        'Wrong ride id',
        TI18N.en.ride.wrongId,
        'ride.wrongId'
      );
    });
    it('ApplicationError #4', () => {
      return compareError(
        new ApplicationError(TI18N.en.request.notFound, 500, 'request.notFound'),
        'Request not found',
        TI18N.en.request.notFound,
        'request.notFound'
      );
    });
    it('ApplicationError #5', () => {
      return compareError(
        new ApplicationError(TI18N.en.globalSettings.fetchFail, 500, 'globalSettings.fetchFail'),
        'Error fetching global settings',
        TI18N.en.globalSettings.fetchFail,
        'globalSettings.fetchFail'
      );
    });
    it('ApplicationError #6', () => {
      return compareError(
        new ApplicationError(TI18N.en.request.fail, 500, 'request.fail'),
        'We were unable to process your ride request at this time.',
        TI18N.en.request.fail,
        'request.fail'
      );
    });
    it('ApplicationError #7', () => {
      const stripeCustomerId = '123';
      return compareError(
        new ApplicationError(TI18N.en.stripe.paymentIntentFail.replace('{{stripeCustomerId}}', stripeCustomerId), 500, 'stripe.paymentIntentFail', { stripeCustomerId }),
        'Could not create payment intent for 123',
        TI18N.en.stripe.paymentIntentFail.replace('{{stripeCustomerId}}', stripeCustomerId),
        'stripe.paymentIntentFail'
      );
    });
    it('ApplicationError #8', () => {
      const rideId = '123';
      return compareError(
        new ApplicationError(TI18N.en.ride.notFound.replace('{{rideId}}', rideId), 500, 'ride.notFound', { rideId }),
        'Ride with specified id of 123 not found',
        TI18N.en.ride.notFound.replace('{{rideId}}', rideId),
        'ride.notFound',
        { rideId }
      );
    });
    it('StripeCustomerError', () => {
      return compareError(
        new StripeCustomerError(TI18N.en.stripe.createCustomerFail, 'stripe.createCustomerFail'),
        'Could not create Stripe customer',
        TI18N.en.stripe.createCustomerFail,
        'stripe.createCustomerFail'
      );
    });
    it('StripePaymentMethodError', () => {
      return compareError(
        new StripePaymentMethodError(TI18N.en.stripe.removePaymentMethodFail, 'stripe.removePaymentMethodFail'),
        'Could not remove payment method',
        TI18N.en.stripe.removePaymentMethodFail,
        'stripe.removePaymentMethodFail'
      );
    });
    it('RideNotFoundError #1', () => {
      return compareError(
        new RideNotFoundError(TI18N.en.ride.notFoundSimple, 'ride.notFoundSimple'),
        'Ride not found',
        TI18N.en.ride.notFoundSimple,
        'ride.notFoundSimple'
      );
    });
    it('RideNotFoundError #2', () => {
      const rideId = '123';
      return compareError(
        new RideNotFoundError(TI18N.en.ride.notFound.replace('{{rideId}}', rideId), 'ride.notFound', { rideId }),
        'Ride with specified id of 123 not found',
        TI18N.en.ride.notFound.replace('{{rideId}}', rideId),
        'ride.notFound',
        { rideId }
      );
    });
    it('RideNotFoundError #3', () => {
      const riderId = '123';
      return compareError(
        new RideNotFoundError(TI18N.en.ride.noActiveRidesForRider.replace('{{riderId}}', riderId), 'ride.noActiveRidesForRider', { riderId }),
        'There are no active rides for rider 123',
        TI18N.en.ride.noActiveRidesForRider.replace('{{riderId}}', riderId),
        'ride.noActiveRidesForRider',
        { riderId }
      );
    });
    it('LocationError #1', () => {
      const locationName = '123';
      return compareError(
        new LocationError(TI18N.en.request.pickupOutsideArea.replace('{{locationName}}', locationName), 'request.pickupOutsideArea', { locationName }),
        'Pick up is not within service area of 123',
        TI18N.en.request.pickupOutsideArea.replace('{{locationName}}', locationName),
        'request.pickupOutsideArea',
        { locationName }
      );
    });
    it('LocationError #2', () => {
      const locationName = '123';
      return compareError(
        new LocationError(TI18N.en.request.dropoffOutsideArea.replace('{{locationName}}', locationName), 'request.dropoffOutsideArea', { locationName }),
        'Drop off is not within service area of 123',
        TI18N.en.request.dropoffOutsideArea.replace('{{locationName}}', locationName),
        'request.dropoffOutsideArea',
        { locationName }
      );
    });
    it('InvalidAccessTokenError #1', () => {
      return compareError(
        new InvalidAccessTokenError(TI18N.en.facebookLogin.accessTokenMissing, 'facebookLogin.accessTokenMissing'),
        'Access token is required',
        TI18N.en.facebookLogin.accessTokenMissing,
        'facebookLogin.accessTokenMissing'
      );
    });
    it('InvalidAccessTokenError #2', () => {
      return compareError(
        new InvalidAccessTokenError(TI18N.en.googleLogin.accessTokenMissing, 'googleLogin.accessTokenMissing'),
        'Access token is required',
        TI18N.en.googleLogin.accessTokenMissing,
        'googleLogin.accessTokenMissing'
      );
    });
    it('FacebookError', () => {
      return compareError(
        new FacebookError(TI18N.en.FacebookError.default, 'FacebookError.default'),
        'Facebook request error',
        TI18N.en.FacebookError.default,
        'FacebookError.default'
      );
    });
    it('ForbiddenError', () => {
      return compareError(
        new ForbiddenError(TI18N.en.login.suspendedAccount, 'login.suspendedAccount'),
        'Your account has been suspended.',
        TI18N.en.login.suspendedAccount,
        'login.suspendedAccount'
      );
    });
    it('GoogleMapsError', () => {
      return compareError(
        new GoogleMapsError(TI18N.en.googleMapsClient.locationFromZipFail, 'googleMapsClient.locationFromZipFail'),
        'Failed to retrieve lat and lng from users zip',
        TI18N.en.googleMapsClient.locationFromZipFail,
        'googleMapsClient.locationFromZipFail'
      );
    });
    it('CancelCooldownError', () => {
      const timeString = '123';
      return compareError(
        new CancelCooldownError(TI18N.en.request.cancelCooldown.replace('{{timeString}}', timeString), 'request.cancelCooldown', { timeString }),
        'Please try requesting again 123',
        TI18N.en.request.cancelCooldown.replace('{{timeString}}', timeString),
        'request.cancelCooldown',
        { timeString }
      );
    });
    it('InvalidPhoneNumberFormatError #1', () => {
      let result;
      try {
        phoneNumberParse('123');
      } catch (error) {
        result = error;
      }
      const { message, errorKey } = result;
      const spy = sinon.spy();
      spy([message, message, errorKey]);
      return sinon.assert.calledWith(spy, sinon.match.array.deepEquals([
        'Invalid phone format',
        TI18N.en.InvalidPhoneNumberFormatError.phoneParseFail,
        'InvalidPhoneNumberFormatError.phoneParseFail'
      ]));
    });
    it('InvalidPhoneNumberFormatError #2', () => {
      return compareError(
        new InvalidPhoneNumberFormatError(TI18N.en.InvalidPhoneNumberFormatError.phoneParseFail, 'InvalidPhoneNumberFormatError.phoneParseFail'),
        'Invalid phone format',
        TI18N.en.InvalidPhoneNumberFormatError.phoneParseFail,
        'InvalidPhoneNumberFormatError.phoneParseFail'
      );
    });
  });

  describe('Rider Endpoint errors', () => {
    before(async () => {
      riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

      await emptyAllCollections();
      await Settings.createSettings({ riderAndroid: '1.0.0' });

      const result = await createRiderLogin({
        email: 'rider1@mail.com',
        password: 'Password1',
        phone: '+351912345678',
        phoneCode: '1234',
        emailCode: '5678'
      }, app, request, domain, riderSocket);
      // eslint-disable-next-line prefer-destructuring
      riderToken = result.riderToken;
      // eslint-disable-next-line prefer-destructuring
      rider = result.rider;

      location = await Locations.createLocation(locationInfo);
      await Locations.syncIndexes();
    });
    it('/fixed-stops', async () => {
      let result;
      try {
        const queryParams = { latitude: 40.194478, longitude: -8.404691, locationId: rider._id };
        const queryString = new URLSearchParams(queryParams).toString();
        result = await riderEndpoint(`/v1/fixed-stops?${queryString}`, 'get', riderToken, app, request, domain, {}, 404);
        result = result.body;
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.message, 'We were unable to fetch this location\'s information.');
      sinon.assert.match(result.message, TI18N.en.LocationNotFoundError.fixedStopSearch);
    });
    it('/change-password', async () => {
      let result;
      try {
        result = await riderEndpoint('/v1/change-password', 'post', riderToken, app, request, domain, { password: '123' }, 200);
        result = result.body;
        rider = await Riders.findOneAndUpdate({ _id: rider._id }, { $set: { password: 'Password1' } }, { new: true });
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.message, 'Your password has been successfully updated.');
      sinon.assert.match(result.message, TI18N.en.riderPassword.updateSuccess);
    });
    it('/phone-verify wrong pincode', async () => {
      let result;
      try {
        result = await riderEndpoint('/v1/phone-verify', 'post', riderToken, app, request, domain, { phone: '+351912345678', code: '1111', countryCode: 'PT' }, 400);
        result = result.body;
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.message, 'The pincode you entered is invalid.');
      sinon.assert.match(result.message, TI18N.en.riderPhoneVerification.wrongPinCodeEntered);
    });
    it('/phone-verify wrong phone number', async () => {
      let result;
      try {
        result = await riderEndpoint('/v1/phone-verify', 'post', riderToken, app, request, domain, { phone: '+351912345679', code: '1234', countryCode: 'PT' }, 404);
        result = result.body;
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.message, 'Invalid phone number');
      sinon.assert.match(result.message, TI18N.en.InvalidPhoneNumberFormatError.default);
    });
    it('/phone-verify success', async () => {
      let result;
      try {
        result = await riderEndpoint('/v1/phone-verify', 'post', riderToken, app, request, domain, { phone: '+351912345678', code: '1234', countryCode: 'PT' }, 200);
        result = result.body;
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.message, 'Your phone number has been successfully verified.');
      sinon.assert.match(result.message, TI18N.en.riderPhoneVerification.pinCodeVerifySuccess);
    });
    it('/forgot-password', async () => {
      let result;
      try {
        result = await riderEndpoint('/v1/forgot-password', 'post', riderToken, app, request, domain, { email: 'rider1@mail.com' }, 200);
        result = result.body;
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.message, 'Please check your email inbox for a PIN code to verify your account.');
      sinon.assert.match(result.message, TI18N.en.riderForgotPasswordRequest.emailSendSuccess);
    });
    it('/forgot-password/verify wrong code', async () => {
      let result;
      try {
        result = await riderEndpoint('/v1/forgot-password/verify', 'post', riderToken, app, request, domain, { email: 'rider1@mail.com', code: '5679' }, 400);
        result = result.body;
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.message, 'The pincode you entered is invalid.');
      sinon.assert.match(result.message, TI18N.en.riderEmailVerification.wrongPinCodeEntered);
    });
    it('/forgot-password/verify wrong email', async () => {
      let result;
      try {
        result = await riderEndpoint('/v1/forgot-password/verify', 'post', riderToken, app, request, domain, { email: 'rider555@mail.com', code: '5678' }, 404);
        result = result.body;
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.message, 'No rider with such email');
      sinon.assert.match(result.message, TI18N.en.riderEmailVerification.riderNotFound);
    });
    it('/locations/:id wrong locationId', async () => {
      let result;
      try {
        result = await riderEndpoint(`/v1/locations/${rider._id}`, 'get', riderToken, app, request, domain, { }, 404);
        result = result.body;
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.message, 'We were unable to fetch this location information.');
      sinon.assert.match(result.message, TI18N.en.location.fetchLocationInfoLocationIdNotFound);
    });
    it('/locations copy in spanish', async () => {
      let result;
      try {
        result = await request(app)
          .get(`/v1/locations/${location._id}`)
          .set('host', domain.rider)
          .set('Accept', 'application/json')
          .set('Content-Type', 'application/json')
          .set('X-Mobile-Os', 'Android')
          .set('X-App-Version', '1.0.0')
          .set('Authorization', `Bearer ${riderToken}`)
          .set('Accept-language', 'es')
          .end()
          .then(response => response.body);
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.closedCopy, 'Es closed copy');
      sinon.assert.match(result.alert.copy, 'Es alert copy');
      try {
        result = await request(app)
          .get('/v1/locations?longitude=-73.978573&latitude=40.721239')
          .set('host', domain.rider)
          .set('Accept', 'application/json')
          .set('Content-Type', 'application/json')
          .set('X-Mobile-Os', 'Android')
          .set('X-App-Version', '1.0.0')
          .set('Authorization', `Bearer ${riderToken}`)
          .set('Accept-language', 'es')
          .end()
          .then(response => response.body[0]);
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.closedCopy, 'Es closed copy');
      sinon.assert.match(result.alert.copy, 'Es alert copy');
    });
    it('/locations copy in english', async () => {
      let result;
      try {
        result = await riderEndpoint(`/v1/locations/${location._id}`, 'get', riderToken, app, request, domain, { }, 200);
        result = result.body;
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.closedCopy, 'En closed copy');
      sinon.assert.match(result.alert.copy, 'En alert copy');

      try {
        result = await riderEndpoint('/v1/locations?longitude=-73.978573&latitude=40.721239', 'get', riderToken, app, request, domain, { }, 200);
        // eslint-disable-next-line prefer-destructuring
        result = result.body[0];
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.closedCopy, 'En closed copy');
      sinon.assert.match(result.alert.copy, 'En alert copy');
    });
  });
  describe('errorCatchHandler', () => {
    before(async () => {
      riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

      await emptyAllCollections();
      await Settings.createSettings({ riderAndroid: '1.0.0' });

      const result = await createRiderLogin({
        email: 'rider1@mail.com',
        password: 'Password1',
        phone: '+351912345678',
        phoneCode: '1234',
        emailCode: '5678',
        locale: 'es'
      }, app, request, domain, riderSocket);
      // eslint-disable-next-line prefer-destructuring
      riderToken = result.riderToken;
      // eslint-disable-next-line prefer-destructuring
      rider = result.rider;
    });
    it('/ride/rating with wrong parameters in english', async () => {
      let result;
      try {
        result = await useEndpoint(
          '/v1/ride/rating', 'post', riderToken, app, request, domain.rider, { }, { 'accept-language': 'en' }, 400
        );
        result = result.body;
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.message, TI18N.en.feedbackByRider.fail);
    });
    it('/ride/rating with wrong parameters in spanish', async () => {
      let result;
      try {
        result = await useEndpoint(
          '/v1/ride/rating', 'post', riderToken, app, request, domain.rider, { }, { 'accept-language': 'es' }, 400
        );
        result = result.body;
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.message, TI18N.es.feedbackByRider.fail);
    });
    it('/ride/rating with wrong parameters in spanish', async () => {
      let result;
      try {
        result = await useEndpoint(
          '/v1/ride/rating', 'post', riderToken, app, request, domain.rider, { }, { 'accept-language': 'es' }, 400
        );
        result = result.body;
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.message, TI18N.es.feedbackByRider.fail);
    });
    it('/current-ride without rides', async () => {
      let result;
      try {
        result = await useEndpoint(
          '/v1/current-ride', 'get', riderToken, app, request, domain.rider, { }, { 'accept-language': 'en' }, 404
        );
        result = result.body;
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.message, TI18N.en.ride.noActiveRidesForRider.replace('{{riderId}}', rider._id));
    });
    it('/quote with wrong location id in english', async () => {
      let result;
      try {
        result = await useEndpoint(
          `/v1/quote?locationId=${rider._id}&passengers=1&originLatitude=${requestOrigin.latitude}&originLongitude=${requestOrigin.longitude}&destinationLatitude=${requestDestination.latitude}&destinationLongitude=${requestDestination.longitude}`, 'get', riderToken, app, request, domain.rider, { }, { 'accept-language': 'en' }, 404
        );
        result = result.body;
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.message, TI18N.en.location.notFound.replace('{{locationId}}', rider._id));
    });
    it('/quote with wrong location id in spanish', async () => {
      let result;
      try {
        result = await useEndpoint(
          `/v1/quote?locationId=${rider._id}&passengers=1&originLatitude=${requestOrigin.latitude}&originLongitude=${requestOrigin.longitude}&destinationLatitude=${requestDestination.latitude}&destinationLongitude=${requestDestination.longitude}`, 'get', riderToken, app, request, domain.rider, { }, { 'accept-language': 'es' }, 404
        );
        result = result.body;
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.message, TI18N.es.location.notFound.replace('{{locationId}}', rider._id));
    });
    it('/quote with no location id', async () => {
      let result;
      try {
        result = await useEndpoint(
          '/v1/quote', 'get', riderToken, app, request, domain.rider, { }, { 'accept-language': 'en' }, 400
        );
        result = result.body;
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.message, 'Something went wrong. Please try again.');
    });
    it('wsErrorCatchHandler - ride-cancel no ride', async () => {
      let result;
      try {
        result = await emitEvent(riderSocket, 'ride-cancel', riderSocket, 'ride-cancel');
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.message, 'Something went wrong. Please try again.');
    });
    it('wsErrorCatchHandler - ride-cancel wrong rideId', async () => {
      let result;
      try {
        result = await emitEvent(riderSocket, 'ride-cancel', riderSocket, 'ride-cancel', { ride: rider._id });
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.message, TI18N.es.ride.wrongId);
    });
    it('get payment settings without locationId', async () => {
      let result;
      try {
        result = await request(app)
          .get('/v1/payment-settings')
          .set('host', domain.rider)
          .set('Accept', 'application/json')
          .set('Content-Type', 'application/json')
          .set('X-Mobile-Os', 'Android')
          .set('X-App-Version', '1.0.0')
          .set('Authorization', `Bearer ${riderToken}`)
          .set('Accept-language', 'es')
          .end()
          .then(response => response.body);
      } catch (error) {
        result = error;
      }
      sinon.assert.match(result.message, 'Something went wrong. Please try again.');
    });
  });
  describe('errorCatchHandler', () => {
    before(async () => {
      riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

      await emptyAllCollections();
      await Settings.createSettings({ riderAndroid: '1.0.0' });

      const result = await createRiderLogin({
        email: 'rider1@mail.com',
        password: 'Password1',
        phone: '+351912345678',
        phoneCode: '1234',
        emailCode: '5678',
        locale: 'es'
      }, app, request, domain, riderSocket);
      // eslint-disable-next-line prefer-destructuring
      riderToken = result.riderToken;
      // eslint-disable-next-line prefer-destructuring
      rider = result.rider;
    });
    it('login for suspended account in spanish', async () => {
      let result;
      try {
        await Riders.findOneAndUpdate({ _id: rider._id }, { $set: { isBanned: true } });
        result = await request(app)
          .post('/v1/login')
          .set('host', domain.rider)
          .set('Accept', 'application/json')
          .set('Content-Type', 'application/json')
          .set('Accept-language', 'es')
          .send({ email: 'rider1@mail.com', password: 'Password1' })
          .end()
          .then(response => response.body);
      } catch (error) {
        result = error;
      }
      await Riders.findOneAndUpdate({ _id: rider._id }, { $set: { isBanned: false } });
      return sinon.assert.match(result.message, TI18N.es.login.authenticationFailed);
    });
    it('normal login', async () => {
      let result;
      try {
        result = await request(app)
          .post('/v1/login')
          .set('host', domain.rider)
          .set('Accept', 'application/json')
          .set('Content-Type', 'application/json')
          .set('Accept-language', 'es')
          .send({ email: 'rider1@mail.com', password: 'Password1' })
          .end()
          .then(response => response.body);
      } catch (error) {
        result = error;
      }
      return sinon.assert.match(result.email, rider.email);
    });
    it('failed login in english', async () => {
      let result;
      try {
        result = await request(app)
          .post('/v1/login')
          .set('host', domain.rider)
          .set('Accept', 'application/json')
          .set('Content-Type', 'application/json')
          .set('Accept-language', 'en')
          .send({ email: 'rider1@mail.com', password: 'Password2' })
          .expect(403)
          .end()
          .then(response => response.body);
      } catch (error) {
        result = error;
      }
      return sinon.assert.match(result.message, TI18N.en.login.authenticationFailed);
    });
    it('failed login in spanish', async () => {
      let result;
      try {
        result = await request(app)
          .post('/v1/login')
          .set('host', domain.rider)
          .set('Accept', 'application/json')
          .set('Content-Type', 'application/json')
          .set('Accept-language', 'es')
          .send({ email: 'rider1@mail.com', password: 'Password2' })
          .expect(403)
          .end()
          .then(response => response.body);
      } catch (error) {
        result = error;
      }
      return sinon.assert.match(result.message, TI18N.es.login.authenticationFailed);
    });
  });
  describe('Custom translator and key testing', () => {
    it('Translates to null if key does not exist in "en" for "en" translator', async () => {
      const req = await buildTranslator('en');
      const message = await translator(req.t, 'null', {}, req.lng);
      return sinon.assert.match(message, null);
    });
    it('Translates to null if key does not exist in "en" for "es" translator', async () => {
      const req = await buildTranslator('es');
      const message = await translator(req.t, null, {}, req.lng);
      return sinon.assert.match(message, null);
    });
    it('Defaults to "en" if missing key in "es"', async () => {
      const req = await buildTranslator('es');
      const message = await translator(req.t, 'testOnlyEnglish', {}, req.lng);
      return sinon.assert.match(message, 'English');
    });
    it('Translates key only in "en" for "en" translator', async () => {
      const req = await buildTranslator('en');
      const message = await translator(req.t, 'testOnlyEnglish', {}, req.lng);
      return sinon.assert.match(message, 'English');
    });
    it('Does not translate key only in "es" for "en" translator', async () => {
      const req = await buildTranslator('en');
      const message = await translator(req.t, 'testOnlySpanish', {}, req.lng);
      return sinon.assert.match(message, null);
    });
    it('Translates key only in "es" for "es" translator', async () => {
      const req = await buildTranslator('es');
      const message = await translator(req.t, 'testOnlySpanish', {}, req.lng);
      return sinon.assert.match(message, 'Spanish');
    });
    it('Defaults to "en" for sub-language "en-us"', async () => {
      const req = await buildTranslator('en-us');
      const message = await translator(req.t, 'testOnlyEnglish', {}, req.lng);
      return sinon.assert.match(message, 'English');
    });
    it('Defaults to "en" for sub-language "en-gb"', async () => {
      const req = await buildTranslator('en-gb');
      const message = await translator(req.t, 'testOnlyEnglish', {}, req.lng);
      return sinon.assert.match(message, 'English');
    });
    it('Defaults to "es" for sub-language "es-mx"', async () => {
      const req = await buildTranslator('es-mx');
      const message = await translator(req.t, 'testOnlySpanish', {}, req.lng);
      return sinon.assert.match(message, 'Spanish');
    });
    it('Defaults to "en" for sub-language "es-mx" when key does not exist in "es"', async () => {
      const req = await buildTranslator('es-mx');
      const message = await translator(req.t, 'testOnlyEnglish', {}, req.lng);
      return sinon.assert.match(message, 'English');
    });
  });
});
