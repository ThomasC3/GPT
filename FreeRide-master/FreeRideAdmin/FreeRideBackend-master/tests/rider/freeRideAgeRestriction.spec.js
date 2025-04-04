import request from 'supertest-promised';
import io from 'socket.io-client';
import moment from 'moment-timezone';
import sinon from 'sinon';
import chai from 'chai';
import jsonSchema from 'chai-json-schema';
import { stripe } from '../../services';
import { emptyAllCollections } from '../utils/helper';
import app from '../../server';
import { port, domain } from '../../config';
import {
  Locations, Settings, Riders, Requests, FareTypes
} from '../../models';
import {
  createRequest, createRiderLogin,
  riderEndpoint, getPaymentSettings
} from '../utils/rider';
import { dumpRequestForRiderSchema } from '../utils/schemas';
import { createAdminLogin, adminEndpoint } from '../utils/admin';
import { meetsFreeRideAgeRequirement } from '../../utils/check';

chai.use(jsonSchema);
const { expect } = chai;

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let location;
let rider;
let riderToken;
let riderSocket;
let sandbox;
let adminToken;

const keyLoc = {
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

describe('Rider free ride age restriction', () => {
  before(async () => {
    sandbox = sinon.createSandbox();
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

    location = await Locations.createLocation({
      name: 'Location',
      isUsingServiceTimes: false,
      isActive: true,
      serviceArea: [
        { longitude: -73.978573, latitude: 40.721239 },
        { longitude: -73.882936, latitude: 40.698337 },
        { longitude: -73.918642, latitude: 40.629585 },
        { longitude: -73.978573, latitude: 40.660845 },
        { longitude: -73.978573, latitude: 40.721239 }
      ],
      serviceHours: []
    });

    ({
      rider, riderToken, riderSocket
    } = await createRiderLogin({ dob: moment().subtract(40, 'year').format('YYYY-MM-DD') }, app, request, domain, riderSocket));

    // Set stripe customer and add payment method
    const paymentInformation = await getPaymentSettings(riderToken, app, request, domain);
    rider = await Riders.findOne({ _id: rider._id });
    if (!paymentInformation.stripePaymentMethods.length) {
      await stripe.attachPaymentMethod(rider.stripeCustomerId, 'pm_card_visa_debit');
    }

    ({ adminToken } = await createAdminLogin());
  });

  beforeEach(async () => {
    sandbox.restore();
    riderSocket.removeAllListeners();
    await Locations.syncIndexes();
    await Riders.syncIndexes();
    await Requests.deleteMany();
  });

  describe('Checking age with meetsFreeRideAgeRequirement for rider aged 40', () => {
    it('should show rider does not meet age restriction if freeRideAgeRestrictionEnabled is null ', async () => {
      const locationPayload = {
        freeRideAgeRestrictionEnabled: null,
        freeRideAgeRestrictionInterval: { min: 18, max: 60 }
      };
      const { body: updatedLocation } = await adminEndpoint(
        `/v1/locations/${location._id}`, 'put',
        adminToken, app, request, domain, locationPayload
      );
      return expect(meetsFreeRideAgeRequirement(updatedLocation, rider)).to.equal(false);
    });
    it('should show rider does not meet age restriction if freeRideAgeRestrictionEnabled is disabled ', async () => {
      const locationPayload = {
        freeRideAgeRestrictionEnabled: false,
        freeRideAgeRestrictionInterval: { min: 18, max: 60 }
      };
      const { body: updatedLocation } = await adminEndpoint(
        `/v1/locations/${location._id}`, 'put',
        adminToken, app, request, domain, locationPayload
      );
      return expect(meetsFreeRideAgeRequirement(updatedLocation, rider)).to.equal(false);
    });
    it('should show rider meets age restriction for age range [18, 60]', async () => {
      const locationPayload = {
        freeRideAgeRestrictionEnabled: true,
        freeRideAgeRestrictionInterval: { min: 18, max: 60 }
      };
      const { body: updatedLocation } = await adminEndpoint(
        `/v1/locations/${location._id}`, 'put',
        adminToken, app, request, domain, locationPayload
      );
      return expect(meetsFreeRideAgeRequirement(updatedLocation, rider)).to.equal(true);
    });
    it('should show rider meets age restriction for age range [18, 60]', async () => {
      const locationPayload = {
        freeRideAgeRestrictionEnabled: true,
        freeRideAgeRestrictionInterval: { min: 18, max: 60 }
      };
      const { body: updatedLocation } = await adminEndpoint(
        `/v1/locations/${location._id}`, 'put',
        adminToken, app, request, domain, locationPayload
      );
      return expect(meetsFreeRideAgeRequirement(updatedLocation, rider)).to.equal(true);
    });
    it('should show rider meets age restriction for age range [18, 40] if same as max limit', async () => {
      const locationPayload = {
        freeRideAgeRestrictionEnabled: true,
        freeRideAgeRestrictionInterval: { min: 18, max: 40 }
      };
      const { body: updatedLocation } = await adminEndpoint(
        `/v1/locations/${location._id}`, 'put',
        adminToken, app, request, domain, locationPayload
      );
      return expect(meetsFreeRideAgeRequirement(updatedLocation, rider)).to.equal(true);
    });
    it('should show rider meets age restriction for age range [40, 60] if same as min limit', async () => {
      const locationPayload = {
        freeRideAgeRestrictionEnabled: true,
        freeRideAgeRestrictionInterval: { min: 40, max: 60 }
      };
      const { body: updatedLocation } = await adminEndpoint(
        `/v1/locations/${location._id}`, 'put',
        adminToken, app, request, domain, locationPayload
      );
      return expect(meetsFreeRideAgeRequirement(updatedLocation, rider)).to.equal(true);
    });
    it('should show rider meets age restriction [39, null] if above minimum', async () => {
      const locationPayload = {
        freeRideAgeRestrictionEnabled: true,
        freeRideAgeRestrictionInterval: { min: 39, max: null }
      };
      const { body: updatedLocation } = await adminEndpoint(
        `/v1/locations/${location._id}`, 'put',
        adminToken, app, request, domain, locationPayload
      );
      return expect(meetsFreeRideAgeRequirement(updatedLocation, rider)).to.equal(true);
    });
    it('should show rider meets age restriction [null, 41] if below maximum', async () => {
      const locationPayload = {
        freeRideAgeRestrictionEnabled: true,
        freeRideAgeRestrictionInterval: { min: null, max: 41 }
      };
      const { body: updatedLocation } = await adminEndpoint(
        `/v1/locations/${location._id}`, 'put',
        adminToken, app, request, domain, locationPayload
      );
      return expect(meetsFreeRideAgeRequirement(updatedLocation, rider)).to.equal(true);
    });
    it('should show rider does not meet age restriction for age range [18, 39] if above', async () => {
      const locationPayload = {
        freeRideAgeRestrictionEnabled: true,
        freeRideAgeRestrictionInterval: { min: 18, max: 39 }
      };
      const { body: updatedLocation } = await adminEndpoint(
        `/v1/locations/${location._id}`, 'put',
        adminToken, app, request, domain, locationPayload
      );
      return expect(meetsFreeRideAgeRequirement(updatedLocation, rider)).to.equal(false);
    });
    it('should show rider does not meet age restriction for age range [41, 60] if below', async () => {
      const locationPayload = {
        freeRideAgeRestrictionEnabled: true,
        freeRideAgeRestrictionInterval: { min: 41, max: 60 }
      };
      const { body: updatedLocation } = await adminEndpoint(
        `/v1/locations/${location._id}`, 'put',
        adminToken, app, request, domain, locationPayload
      );
      return expect(meetsFreeRideAgeRequirement(updatedLocation, rider)).to.equal(false);
    });
    it('should show rider does not meet age restriction [41, null] if below minimum', async () => {
      const locationPayload = {
        freeRideAgeRestrictionEnabled: true,
        freeRideAgeRestrictionInterval: { min: 41, max: null }
      };
      const { body: updatedLocation } = await adminEndpoint(
        `/v1/locations/${location._id}`, 'put',
        adminToken, app, request, domain, locationPayload
      );
      return expect(meetsFreeRideAgeRequirement(updatedLocation, rider)).to.equal(false);
    });
    it('should show rider does not meet age restriction [null, 39] if above maximum', async () => {
      const locationPayload = {
        freeRideAgeRestrictionEnabled: true,
        freeRideAgeRestrictionInterval: { min: null, max: 39 }
      };
      const { body: updatedLocation } = await adminEndpoint(
        `/v1/locations/${location._id}`, 'put',
        adminToken, app, request, domain, locationPayload
      );
      return expect(meetsFreeRideAgeRequirement(updatedLocation, rider)).to.equal(false);
    });
  });

  describe('Rider location payment information and quote', () => {
    describe('with location with age restriction enabled and payments disabled', () => {
      before(async () => {
        const locationPayload = {
          freeRideAgeRestrictionEnabled: true,
          freeRideAgeRestrictionInterval: { min: 18, max: 60 },
          paymentEnabled: false,
          pwywEnabled: false
        };
        await adminEndpoint(`/v1/locations/${location._id}`, 'put', adminToken, app, request, domain, locationPayload);
      });
      it('should show payment disabled so ride is free', async () => {
        const response = await riderEndpoint(
          `/v1/location/${location._id}/payment-information?originLatitude=${keyLoc.req1p[0]}&originLongitude=${keyLoc.req1p[1]}&destinationLatitude=${keyLoc.req1d[0]}&destinationLongitude=${keyLoc.req1d[1]}`, 'get',
          riderToken, app, request, domain
        );
        const expectedResponse = {
          ...FareTypes.paymentDisabled,
          paymentInformation: null,
          poweredByCopy: ''
        };
        return expect(response.body).to.eql(expectedResponse);
      });
      it('should show quote cannot be retreived', async () => {
        const { body: { message } } = await riderEndpoint(
          `/v1/quote?locationId=${location._id}&passengers=3&originLatitude=${keyLoc.req1p[0]}&originLongitude=${keyLoc.req1p[1]}&destinationLatitude=${keyLoc.req1d[0]}&destinationLongitude=${keyLoc.req1d[1]}`, 'get',
          riderToken, app, request, domain, {}, 400
        );
        return expect(message).to.equal(`Could not retrieve quote for Location ${location.name}`);
      });
      it('should allow free ride to be requested', async () => {
        const freeRequest = await createRequest(
          riderToken, keyLoc.req1p, keyLoc.req1d,
          location._id, app, request, domain, false, 3
        );
        expect(freeRequest).to.be.jsonSchema(dumpRequestForRiderSchema);
        expect(freeRequest.waitingPaymentConfirmation).to.equal(false);
        expect(freeRequest.paymentInformation).to.equal(null);

        const { body: [freeRequestRecovery] } = await riderEndpoint('/v1/requests', 'get', riderToken, app, request, domain);
        expect(freeRequestRecovery).to.be.jsonSchema(dumpRequestForRiderSchema);

        const requestInfo = await Requests.findOne({ rider: rider._id });
        return expect(requestInfo.waitingPaymentConfirmation).to.equal(false);
      });
    });
    describe('with location with age restriction enabled and pwyw', () => {
      before(async () => {
        const locationPayload = {
          freeRideAgeRestrictionEnabled: true,
          freeRideAgeRestrictionInterval: { min: 18, max: 60 },
          paymentEnabled: false,
          pwywEnabled: true,
          pwywInformation: {
            pwywOptions: [100, 500, 1000],
            maxCustomValue: 10000,
            currency: 'usd'
          }
        };
        await adminEndpoint(`/v1/locations/${location._id}`, 'put', adminToken, app, request, domain, locationPayload);
      });
      it('should show rider meets age restriction', async () => {
        const response = await riderEndpoint(
          `/v1/location/${location._id}/payment-information?originLatitude=${keyLoc.req1p[0]}&originLongitude=${keyLoc.req1p[1]}&destinationLatitude=${keyLoc.req1d[0]}&destinationLongitude=${keyLoc.req1d[1]}`, 'get',
          riderToken, app, request, domain
        );
        const expectedResponse = {
          ...FareTypes.freeAgeRestriction,
          paymentInformation: null,
          poweredByCopy: ''
        };
        return expect(response.body).to.eql(expectedResponse);
      });
      it('should show quote is pwyw', async () => {
        const { body: { totalPrice } } = await riderEndpoint(
          `/v1/quote?locationId=${location._id}&passengers=3&pwywValue=100&originLatitude=${keyLoc.req1p[0]}&originLongitude=${keyLoc.req1p[1]}&destinationLatitude=${keyLoc.req1d[0]}&destinationLongitude=${keyLoc.req1d[1]}`, 'get',
          riderToken, app, request, domain
        );
        return expect(totalPrice).to.equal(100);
      });
      it('should allow free ride to be requested', async () => {
        const freeRequest = await createRequest(
          riderToken, keyLoc.req1p, keyLoc.req1d,
          location._id, app, request, domain, false, 3, 200, '1.0.0', 100
        );
        expect(freeRequest).to.be.jsonSchema(dumpRequestForRiderSchema);
        expect(freeRequest.waitingPaymentConfirmation).to.equal(false);
        expect(freeRequest.paymentInformation).to.equal(null);

        const { body: [freeRequestRecovery] } = await riderEndpoint('/v1/requests', 'get', riderToken, app, request, domain);
        expect(freeRequestRecovery).to.be.jsonSchema(dumpRequestForRiderSchema);

        const requestInfo = await Requests.findOne({ rider: rider._id });
        return expect(requestInfo.waitingPaymentConfirmation).to.equal(false);
      });
    });
    describe('with location with age restriction disabled and pwyw', () => {
      before(async () => {
        const locationPayload = {
          freeRideAgeRestrictionEnabled: false,
          freeRideAgeRestrictionInterval: { min: 18, max: 60 },
          paymentEnabled: false,
          pwywEnabled: true,
          pwywInformation: {
            pwywOptions: [100, 500, 1000],
            maxCustomValue: 10000,
            currency: 'usd'
          }
        };
        await adminEndpoint(`/v1/locations/${location._id}`, 'put', adminToken, app, request, domain, locationPayload);
        location = await Locations.findOne({ _id: location._id });
      });
      it('should show rider does not meet age restriction if disabled so ride is pwyw', async () => {
        const response = await riderEndpoint(
          `/v1/location/${location._id}/payment-information?originLatitude=${keyLoc.req1p[0]}&originLongitude=${keyLoc.req1p[1]}&destinationLatitude=${keyLoc.req1d[0]}&destinationLongitude=${keyLoc.req1d[1]}`, 'get',
          riderToken, app, request, domain
        );
        const expectedResponse = {
          ...FareTypes.pwyw,
          paymentInformation: {
            ...location.toJSON().pwywInformation,
            pwywCopy: 'How much do you want to pay for this ride?'
          },
          poweredByCopy: ''
        };
        return expect(response.body).to.eql(expectedResponse);
      });
      it('should show quote is pwyw', async () => {
        const { body: { totalPrice } } = await riderEndpoint(
          `/v1/quote?locationId=${location._id}&passengers=3&pwywValue=100&originLatitude=${keyLoc.req1p[0]}&originLongitude=${keyLoc.req1p[1]}&destinationLatitude=${keyLoc.req1d[0]}&destinationLongitude=${keyLoc.req1d[1]}`, 'get',
          riderToken, app, request, domain
        );
        return expect(totalPrice).to.equal(100);
      });
      it('should allow a pwyw ride to be requested', async () => {
        const pwywRequest = await createRequest(
          riderToken, keyLoc.req1p, keyLoc.req1d,
          location._id, app, request, domain, false, 3, 200, '1.0.0', 100
        );
        expect(pwywRequest).to.be.jsonSchema(dumpRequestForRiderSchema);
        expect(pwywRequest.waitingPaymentConfirmation).to.equal(true);
        expect(pwywRequest.paymentInformation.totalPrice).to.equal(100);

        const { body: [pwywRequestRecovery] } = await riderEndpoint('/v1/requests', 'get', riderToken, app, request, domain);
        expect(pwywRequestRecovery).to.be.jsonSchema(dumpRequestForRiderSchema);

        const requestInfo = await Requests.findOne({ rider: rider._id });
        expect(requestInfo.paymentInformation).to.have.property('pwywOptions');
        return expect(requestInfo.paymentInformation.totalPrice).to.equal(100);
      });
    });
    describe('with location with age restriction enabled and pwyw', () => {
      before(async () => {
        const locationPayload = {
          freeRideAgeRestrictionEnabled: true,
          freeRideAgeRestrictionInterval: { min: 18, max: 39 },
          paymentEnabled: false,
          pwywEnabled: true,
          pwywInformation: {
            pwywOptions: [100, 500, 1000],
            maxCustomValue: 10000,
            currency: 'usd'
          }
        };
        await adminEndpoint(`/v1/locations/${location._id}`, 'put', adminToken, app, request, domain, locationPayload);
        location = await Locations.findOne({ _id: location._id });
      });
      it('should show rider does not meet age restriction for age range so ride is pwyw', async () => {
        const response = await riderEndpoint(
          `/v1/location/${location._id}/payment-information?originLatitude=${keyLoc.req1p[0]}&originLongitude=${keyLoc.req1p[1]}&destinationLatitude=${keyLoc.req1d[0]}&destinationLongitude=${keyLoc.req1d[1]}`, 'get',
          riderToken, app, request, domain
        );
        const expectedResponse = {
          ...FareTypes.pwyw,
          paymentInformation: {
            ...location.toJSON().pwywInformation,
            pwywCopy: 'How much do you want to pay for this ride?'
          },
          poweredByCopy: ''
        };
        expect(response.body).to.eql(expectedResponse);
      });
      it('should show quote is pwyw', async () => {
        const { body: { totalPrice } } = await riderEndpoint(
          `/v1/quote?locationId=${location._id}&passengers=3&pwywValue=100&originLatitude=${keyLoc.req1p[0]}&originLongitude=${keyLoc.req1p[1]}&destinationLatitude=${keyLoc.req1d[0]}&destinationLongitude=${keyLoc.req1d[1]}`, 'get',
          riderToken, app, request, domain
        );
        return expect(totalPrice).to.equal(100);
      });
      it('should allow a pwyw ride to be requested', async () => {
        const pwywRequest = await createRequest(
          riderToken, keyLoc.req1p, keyLoc.req1d,
          location._id, app, request, domain, false, 3, 200, '1.0.0', 100
        );
        expect(pwywRequest).to.be.jsonSchema(dumpRequestForRiderSchema);
        expect(pwywRequest.waitingPaymentConfirmation).to.equal(true);
        expect(pwywRequest.paymentInformation.totalPrice).to.equal(100);

        const { body: [pwywRequestRecovery] } = await riderEndpoint('/v1/requests', 'get', riderToken, app, request, domain);
        expect(pwywRequestRecovery).to.be.jsonSchema(dumpRequestForRiderSchema);

        const requestInfo = await Requests.findOne({ rider: rider._id });
        expect(requestInfo.paymentInformation).to.have.property('pwywOptions');
        return expect(requestInfo.paymentInformation.totalPrice).to.equal(100);
      });
    });
    describe('with location with age restriction enabled and fixed payment', () => {
      before(async () => {
        const locationPayload = {
          freeRideAgeRestrictionEnabled: true,
          freeRideAgeRestrictionInterval: { min: 18, max: 39 },
          pwywEnabled: false,
          paymentEnabled: true,
          paymentInformation: {
            ridePrice: 100,
            capEnabled: false,
            priceCap: 200,
            pricePerHead: 50,
            currency: 'usd'
          }
        };
        await adminEndpoint(`/v1/locations/${location._id}`, 'put', adminToken, app, request, domain, locationPayload);
        location = await Locations.findOne({ _id: location._id });
      });
      it('should show rider does not meet age restriction for age range so ride is fixed payment', async () => {
        const response = await riderEndpoint(
          `/v1/location/${location._id}/payment-information?originLatitude=${keyLoc.req1p[0]}&originLongitude=${keyLoc.req1p[1]}&destinationLatitude=${keyLoc.req1d[0]}&destinationLongitude=${keyLoc.req1d[1]}`, 'get',
          riderToken, app, request, domain
        );
        const expectedResponse = {
          ...FareTypes.fixedPayment,
          paymentInformation: location.toJSON().paymentInformation,
          poweredByCopy: ''
        };
        return expect(response.body).to.eql(expectedResponse);
      });
      it('should show quote is fixed payment', async () => {
        const { body: { totalPrice } } = await riderEndpoint(
          `/v1/quote?locationId=${location._id}&passengers=3&originLatitude=${keyLoc.req1p[0]}&originLongitude=${keyLoc.req1p[1]}&destinationLatitude=${keyLoc.req1d[0]}&destinationLongitude=${keyLoc.req1d[1]}`, 'get',
          riderToken, app, request, domain
        );
        return expect(totalPrice).to.equal(200);
      });
      it('should allow a fixed payment ride to be requested', async () => {
        const fixedPaymentRequest = await createRequest(
          riderToken, keyLoc.req1p, keyLoc.req1d,
          location._id, app, request, domain, false, 3
        );
        expect(fixedPaymentRequest).to.be.jsonSchema(dumpRequestForRiderSchema);
        expect(fixedPaymentRequest.waitingPaymentConfirmation).to.equal(true);
        expect(fixedPaymentRequest.paymentInformation.totalPrice).to.equal(200);

        const { body: [fixedPaymentRequestRecovery] } = await riderEndpoint('/v1/requests', 'get', riderToken, app, request, domain);
        expect(fixedPaymentRequestRecovery).to.be.jsonSchema(dumpRequestForRiderSchema);

        const requestInfo = await Requests.findOne({ rider: rider._id });
        expect(requestInfo.paymentInformation.pwywOptions).to.eql([]);
        return expect(requestInfo.paymentInformation.totalPrice).to.equal(200);
      });
    });
  });
});
