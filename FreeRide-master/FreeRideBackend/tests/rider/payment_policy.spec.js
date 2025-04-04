import { expect } from 'chai';
// eslint-disable-next-line no-unused-vars
import { clear } from 'winston';
import io from 'socket.io-client';
import request from 'supertest-promised';
import momentTimezone from 'moment-timezone';
import app from '../../server';
import {
  FareTypes,
  Locations, PaymentPolicies, Promocodes, Requests, Riders, Settings, Zones
} from '../../models';
import { port, domain } from '../../config';
import { createZone } from '../utils/location';
import { determinePaymentSourceForRideRequest } from '../../utils/ride';
import { createDefaultZone } from '../../utils/zone';
import { stripe } from '../../services';
import { emptyAllCollections } from '../utils/helper';
import {
  createRequest, createRiderLogin, getPaymentSettings, riderEndpoint, setupPromocode
} from '../utils/rider';
import { adminEndpoint, createAdminLogin } from '../utils/admin';


const locationServiceArea = [[
  [40.7132646, -73.5733125],
  [40.7247139, -73.4730622],
  [40.6627603, -73.4593293],
  [40.6486955, -73.5616395],
  [40.7132646, -73.5733125]
]];
const zoneAServiceArea = [[
  [40.6902437, -73.5554945],
  [40.6985013, -73.4853253],
  [40.6681543, -73.4744476],
  [40.6623055, -73.5530249],
  [40.6902437, -73.5554945]
]];
const zoneBServiceArea = [[
  [40.6829105, -73.5277867],
  [40.6839550, -73.5072208],
  [40.6771378, -73.5062026],
  [40.6746324, -73.5259483],
  [40.6829105, -73.5277867]
]];

const pointDefaultZone = [-73.5085338, 40.7053987, 'Default Zone St'];
const pointZoneA = [-73.5269619, 40.6886314, 'Zone A St'];
const pointZoneB = [-73.5192391, 40.6796784, 'Zone B St'];

let zoneA;
let zoneB;
let defaultZone;
let riderSocket;
let rider;
let riderToken;
let adminToken;
let location;

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
const locationInfo = {
  name: 'location',
  isActive: true,
  poolingEnabled: false,
  serviceArea: locationServiceArea[0].map(
    coord => ({ latitude: coord[1], longitude: coord[0] })
  ),
  paymentEnabled: true,
  paymentInformation: {
    ridePrice: 1,
    capEnabled: true,
    priceCap: 10,
    pricePerHead: 1,
    currency: 'usd'
  },
  ridesFareCopy: 'Rides fare copy'
};

describe('Zones, payment policies and payment information', () => {
  before(async () => {
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

    location = await Locations.createLocation({ ...locationInfo, name: 'Location' });

    ({
      rider, riderToken, riderSocket
    } = await createRiderLogin({ dob: momentTimezone().subtract(30, 'year').format('YYYY-MM-DD') }, app, request, domain, riderSocket));

    // Set stripe customer and add payment method
    const paymentInformation = await getPaymentSettings(riderToken, app, request, domain);
    rider = await Riders.findOne({ _id: rider._id });
    if (!paymentInformation.stripePaymentMethods.length) {
      await stripe.attachPaymentMethod(rider.stripeCustomerId, 'pm_card_visa_debit');
    }

    ({ adminToken } = await createAdminLogin());
  });

  beforeEach(async () => {
    riderSocket.removeAllListeners();
    await Locations.syncIndexes();
    await Requests.deleteMany();
  });

  describe('determinePaymentSourceForRideRequest', () => {
    beforeEach(async () => {
      await Zones.deleteMany({});
      await PaymentPolicies.deleteMany({});
    });


    it('should return location when originZone and destinationZone are not defined', async () => {
      const result = await determinePaymentSourceForRideRequest({
        locationId: location._id,
        origin: {
          latitude: pointDefaultZone[1],
          longitude: pointDefaultZone[0]
        },
        destination: {
          latitude: locationServiceArea[0][0][1],
          longitude: locationServiceArea[0][0][0]
        }
      });

      expect(`${result._id}`).to.eql(`${location._id}`);
      expect(result.paymentEnabled).to.eql(true);
      expect(result.paymentInformation.ridePrice).to.eql(
        location.paymentInformation.ridePrice
      );
      expect(result.paymentInformation.capEnabled).to.eql(
        location.paymentInformation.capEnabled
      );
      expect(result.paymentInformation.priceCap).to.eql(
        location.paymentInformation.priceCap
      );
      expect(result.paymentInformation.pricePerHead).to.eql(
        location.paymentInformation.pricePerHead
      );
      expect(result.paymentInformation.currency).to.eql(
        location.paymentInformation.currency
      );
    });

    it('should return location when policy is not found', async () => {
      zoneA = await createZone({
        serviceArea: zoneAServiceArea,
        name: 'Zone A',
        location: location._id,
        code: 'ZA'
      });

      zoneB = await createZone({
        serviceArea: zoneBServiceArea,
        name: 'Zone B',
        location: location._id,
        code: 'ZB'
      });

      const result = await determinePaymentSourceForRideRequest({
        locationId: location._id,
        origin: {
          latitude: pointZoneA[1],
          longitude: pointZoneA[0]
        },
        destination: {
          latitude: pointZoneB[1],
          longitude: pointZoneB[0]
        }
      });

      expect(`${result._id}`).to.eql(`${location._id}`);
    });

    it('should return originZone when policy value is "origin"', async () => {
    // create payment policies
      zoneA = await createZone({
        serviceArea: zoneAServiceArea,
        name: 'Zone A',
        location: location._id,
        code: 'ZA',
        paymentEnabled: true,
        paymentInformation: {
          ridePrice: 1,
          capEnabled: true,
          priceCap: 10,
          pricePerHead: 1,
          currency: 'usd'
        }
      });

      zoneB = await createZone({
        serviceArea: zoneBServiceArea,
        name: 'Zone B',
        location: location._id,
        code: 'ZB'
      });
      await PaymentPolicies.createPaymentPolicy({
        originZone: zoneA._id,
        destinationZone: zoneB._id,
        location: location._id,
        value: 'origin'
      });

      const result = await determinePaymentSourceForRideRequest({
        locationId: location._id,
        origin: {
          latitude: pointZoneA[0],
          longitude: pointZoneA[1]
        },
        destination: {
          latitude: pointZoneB[0],
          longitude: pointZoneB[1]
        }
      });
      expect(`${result._id}`).to.eql(`${zoneA._id}`);
      expect(result.paymentEnabled).to.eql(true);
      expect(result.paymentInformation.ridePrice).to.eql(zoneA.paymentInformation.ridePrice);
      expect(result.paymentInformation.capEnabled).to.eql(zoneA.paymentInformation.capEnabled);
      expect(result.paymentInformation.priceCap).to.eql(zoneA.paymentInformation.priceCap);
      expect(result.paymentInformation.pricePerHead).to.eql(zoneA.paymentInformation.pricePerHead);
      expect(result.paymentInformation.currency).to.eql(zoneA.paymentInformation.currency);
    });
    it('should return destinationZone when policy value is "destination"', async () => {
    // create payment policies
      zoneA = await createZone({
        serviceArea: zoneAServiceArea,
        name: 'Zone A',
        location: location._id,
        code: 'ZA'
      });

      zoneB = await createZone({
        serviceArea: zoneBServiceArea,
        name: 'Zone B',
        location: location._id,
        code: 'ZB'
      });
      await PaymentPolicies.createPaymentPolicy({
        originZone: zoneA._id,
        destinationZone: zoneB._id,
        location: location._id,
        value: 'destination'
      });

      const result = await determinePaymentSourceForRideRequest({
        locationId: location._id,
        origin: {
          latitude: pointZoneA[0],
          longitude: pointZoneA[1]
        },
        destination: {
          latitude: pointZoneB[0],
          longitude: pointZoneB[1]
        }
      });
      expect(`${result._id}`).to.eql(`${zoneB._id}`);
    });
    it('should return location when policy value is destination and falls on defaultZone', async () => {
    // create payment policies
      zoneA = await createZone({
        serviceArea: zoneAServiceArea,
        name: 'Zone A',
        location: location._id,
        code: 'ZA'
      });
      defaultZone = await createDefaultZone(location);
      await PaymentPolicies.createPaymentPolicy({
        originZone: zoneA._id,
        destinationZone: defaultZone._id,
        location: location._id,
        value: 'destination'
      });

      const result = await determinePaymentSourceForRideRequest({
        locationId: location._id,
        origin: {
          latitude: pointZoneA[0],
          longitude: pointZoneA[1]
        },
        destination: {
          latitude: pointDefaultZone[0],
          longitude: pointDefaultZone[1]
        }
      });
      expect(`${result._id}`).to.eql(`${location._id}`);
    });
    it('should return location when policy value is origin and falls on defaultZone', async () => {
    // create payment policies
      zoneA = await createZone({
        serviceArea: zoneAServiceArea,
        name: 'Zone A',
        location: location._id,
        code: 'ZA'
      });
      defaultZone = await createDefaultZone(location);
      await PaymentPolicies.createPaymentPolicy({
        originZone: defaultZone._id,
        destinationZone: zoneA._id,
        location: location._id,
        value: 'origin'
      });

      const result = await determinePaymentSourceForRideRequest({
        locationId: location._id,
        origin: {
          latitude: pointDefaultZone[0],
          longitude: pointDefaultZone[1]
        },
        destination: {
          latitude: pointZoneA[0],
          longitude: pointZoneA[1]
        }
      });
      expect(`${result._id}`).to.eql(`${location._id}`);
    });
  });

  describe('Ride payment information and quote with zones and payment policies', () => {
    let quoteEndpoint;
    let paymentInformationEndpoint;
    before(async () => {
      quoteEndpoint = `/v1/quote?locationId=${location._id}&passengers=3&pwywValue=100&originLatitude=${pointZoneA[0]}&originLongitude=${pointZoneA[1]}&destinationLatitude=${pointZoneB[0]}&destinationLongitude=${pointZoneB[1]}`;
      paymentInformationEndpoint = `/v1/location/${location._id}/payment-information?originLatitude=${pointZoneA[0]}&originLongitude=${pointZoneA[1]}&destinationLatitude=${pointZoneB[0]}&destinationLongitude=${pointZoneB[1]}`;
      await Zones.deleteMany({});
      await PaymentPolicies.deleteMany({});
      await Locations.updateOne({ _id: location._id }, { $set: { zones: [] } });

      zoneA = await createZone({
        serviceArea: zoneAServiceArea,
        name: 'Zone A',
        location: location._id,
        code: 'ZA',
        poweredBy: 'Zone A'
      });

      zoneB = await createZone({
        serviceArea: zoneBServiceArea,
        name: 'Zone B',
        location: location._id,
        code: 'ZB',
        poweredBy: 'Zone B'
      });
      await PaymentPolicies.createPaymentPolicy({
        originZone: zoneA._id,
        destinationZone: zoneB._id,
        location: location._id,
        value: 'destination'
      });
    });
    describe('when location age restriction is disabled', () => {
      describe('when pwyw is enabled for payment source', () => {
        before(async () => {
          const locationPayload = {
            freeRideAgeRestrictionEnabled: false,
            freeRideAgeRestrictionInterval: null,
            pwywEnabled: false,
            paymentEnabled: false
          };
          await adminEndpoint(`/v1/locations/${location._id}`, 'put', adminToken, app, request, domain, locationPayload);
          const zoneUpdatePayload = {
            paymentEnabled: false,
            pwywEnabled: true,
            pwywInformation: {
              pwywOptions: [100, 500, 1000],
              maxCustomValue: 10000,
              currency: 'usd'
            }
          };
          zoneB = await Zones.updateZone({ _id: zoneB._id }, zoneUpdatePayload);
        });
        it('should show pwyw information', async () => {
          const response = await riderEndpoint(
            paymentInformationEndpoint, 'get',
            riderToken, app, request, domain
          );
          const expectedResponse = {
            ...FareTypes.pwyw,
            paymentInformation: {
              ...zoneB.toJSON().pwywInformation,
              pwywCopy: 'How much do you want to pay for this ride?'
            },
            poweredByCopy: 'This ride is powered by Zone B.'
          };
          return expect(response.body).to.eql(expectedResponse);
        });
        it('should show quote is pwyw', async () => {
          const { body: { totalPrice } } = await riderEndpoint(
            quoteEndpoint, 'get',
            riderToken, app, request, domain
          );
          return expect(totalPrice).to.equal(100);
        });
        it('should allow a pwyw ride to be requested', async () => {
          await createRequest(
            riderToken, pointZoneA, pointZoneB,
            location._id, app, request, domain, false, 3, 200, '1.0.0', 100
          );
          const requestInfo = await Requests.findOne({ rider: rider._id });
          expect(requestInfo.paymentInformation).to.have.property('pwywOptions');
          return expect(requestInfo.paymentInformation.totalPrice).to.equal(100);
        });
        it('should allow a pwyw ride with promocode attached', async () => {
          const promocode = await Promocodes.createPromocode({
            name: 'Free ride',
            code: 'freeRide',
            location: location._id,
            type: 'percentage',
            value: 50,
            isEnabled: true
          });
          expect(promocode._id).to.not.equal(null);

          const result = await setupPromocode(
            riderToken, app, request, domain, location._id, promocode.code
          );

          expect(result.promocode.code).to.equal(promocode.code);

          const { body: { totalPrice } } = await riderEndpoint(
            quoteEndpoint, 'get',
            riderToken, app, request, domain
          );
          expect(totalPrice).to.equal(50);

          await createRequest(
            riderToken, pointZoneA, pointZoneB,
            location._id, app, request, domain, false, 3, 200, '1.0.0', 100
          );
          const requestInfo = await Requests.findOne({ rider: rider._id });
          expect(requestInfo.paymentInformation).to.have.property('pwywOptions');
          expect(requestInfo.paymentInformation.totalPrice).to.equal(50);

          // remove promocode
          await Promocodes.deleteOne({ _id: promocode._id });
          await Riders.updateOne({ _id: rider._id }, { $set: { promocode: null } });
        });
      });
      describe('when fixed payment is enabled for payment source', () => {
        before(async () => {
          const locationPayload = {
            freeRideAgeRestrictionEnabled: false,
            paymentEnabled: false,
            pwywEnabled: false
          };
          await adminEndpoint(`/v1/locations/${location._id}`, 'put', adminToken, app, request, domain, locationPayload);
          const zoneUpdatePayload = {
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
          zoneB = await Zones.updateZone({ _id: zoneB._id }, zoneUpdatePayload);
        });
        it('should show ride is fixed payment', async () => {
          const response = await riderEndpoint(
            paymentInformationEndpoint, 'get',
            riderToken, app, request, domain
          );
          const expectedResponse = {
            ...FareTypes.fixedPayment,
            paymentInformation: zoneB.toJSON().paymentInformation,
            poweredByCopy: 'This ride is powered by Zone B.'
          };
          return expect(response.body).to.eql(expectedResponse);
        });
        it('should show quote is fixed payment', async () => {
          const { body: { totalPrice } } = await riderEndpoint(
            quoteEndpoint, 'get',
            riderToken, app, request, domain
          );
          return expect(totalPrice).to.equal(200);
        });
        it('should allow a fixed payment ride to be requested', async () => {
          await createRequest(
            riderToken, pointZoneA, pointZoneB,
            location._id, app, request, domain, false, 3
          );
          const requestInfo = await Requests.findOne({ rider: rider._id });
          expect(requestInfo.paymentInformation.pwywOptions).to.eql([]);
          return expect(requestInfo.paymentInformation.totalPrice).to.equal(200);
        });
      });
    });

    describe('when location age restriction is enabled', () => {
      describe('when pwyw is enabled for payment source', () => {
        before(async () => {
          const locationPayload = {
            freeRideAgeRestrictionEnabled: true,
            freeRideAgeRestrictionInterval: { min: 18, max: 39 },
            pwywEnabled: false,
            paymentEnabled: false
          };
          await adminEndpoint(`/v1/locations/${location._id}`, 'put', adminToken, app, request, domain, locationPayload);
          const zoneUpdatePayload = {
            paymentEnabled: false,
            pwywEnabled: true,
            pwywInformation: {
              pwywOptions: [100, 500, 1000],
              maxCustomValue: 10000,
              currency: 'usd'
            }
          };
          zoneB = await Zones.updateZone({ _id: zoneB._id }, zoneUpdatePayload);
        });
        describe('When rider meets age requirement', () => {
          it('should show rider meets age requirement', async () => {
            const response = await riderEndpoint(
              paymentInformationEndpoint, 'get',
              riderToken, app, request, domain
            );
            const expectedResponse = {
              ...FareTypes.freeAgeRestriction,
              paymentInformation: null,
              poweredByCopy: 'This ride is powered by Zone B.'
            };
            return expect(response.body).to.eql(expectedResponse);
          });
          it('should show quote is pwyw from payment source', async () => {
            const { body: { totalPrice } } = await riderEndpoint(
              `/v1/quote?locationId=${location._id}&passengers=3&pwywValue=100&originLatitude=${pointZoneA[0]}&originLongitude=${pointZoneA[1]}&destinationLatitude=${pointZoneB[0]}&destinationLongitude=${pointZoneB[1]}`, 'get',
              riderToken, app, request, domain
            );
            return expect(totalPrice).to.equal(100);
          });
          it('should allow free ride to be requested', async () => {
            await createRequest(
              riderToken, pointZoneA, pointZoneB,
              location._id, app, request, domain, false, 3, 200, '1.0.0', 100
            );
            const requestInfo = await Requests.findOne({ rider: rider._id });
            return expect(requestInfo.waitingPaymentConfirmation).to.equal(false);
          });
        });
        describe('When rider does not meet age requirement', () => {
          before(async () => {
            await Riders.updateOne({ _id: rider._id }, { $set: { dob: momentTimezone().subtract(41, 'year').format('YYYY-MM-DD') } });
          });
          it('should show rider does not meet age requirement so ride is pwyw', async () => {
            const response = await riderEndpoint(
              paymentInformationEndpoint, 'get',
              riderToken, app, request, domain
            );
            const expectedResponse = {
              ...FareTypes.pwyw,
              paymentInformation: {
                ...zoneB.toJSON().pwywInformation,
                pwywCopy: 'How much do you want to pay for this ride?'
              },
              poweredByCopy: 'This ride is powered by Zone B.'
            };
            expect(response.body).to.eql(expectedResponse);
          });
          it('should show quote is pwyw from payment source', async () => {
            const { body: { totalPrice } } = await riderEndpoint(
              `/v1/quote?locationId=${location._id}&passengers=3&pwywValue=100&originLatitude=${pointZoneA[0]}&originLongitude=${pointZoneA[1]}&destinationLatitude=${pointZoneB[0]}&destinationLongitude=${pointZoneB[1]}`, 'get',
              riderToken, app, request, domain
            );
            return expect(totalPrice).to.equal(100);
          });
          it('should allow a pwyw ride to be requested', async () => {
            await createRequest(
              riderToken, pointZoneA, pointZoneB,
              location._id, app, request, domain, false, 3, 200, '1.0.0', 100
            );
            const requestInfo = await Requests.findOne({ rider: rider._id });
            expect(requestInfo.paymentInformation).to.have.property('pwywOptions');
            return expect(requestInfo.paymentInformation.totalPrice).to.equal(100);
          });
        });
      });
      describe('when fixed payment is enabled for payment source', () => {
        before(async () => {
          const locationPayload = {
            freeRideAgeRestrictionEnabled: true,
            freeRideAgeRestrictionInterval: { min: 18, max: 39 },
            paymentEnabled: false,
            pwywEnabled: false
          };
          await adminEndpoint(`/v1/locations/${location._id}`, 'put', adminToken, app, request, domain, locationPayload);
          const zoneUpdatePayload = {
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
          zoneB = await Zones.updateZone({ _id: zoneB._id }, zoneUpdatePayload);
        });

        describe('When rider does not meet age requirement', () => {
          before(async () => {
            await Riders.updateOne({ _id: rider._id }, { $set: { dob: momentTimezone().subtract(41, 'year').format('YYYY-MM-DD') } });
          });
          it('should show rider does not meet age requirement for age range so ride is fixed payment', async () => {
            const response = await riderEndpoint(
              paymentInformationEndpoint, 'get',
              riderToken, app, request, domain
            );
            const expectedResponse = {
              ...FareTypes.fixedPayment,
              paymentInformation: zoneB.toJSON().paymentInformation,
              poweredByCopy: 'This ride is powered by Zone B.'
            };
            return expect(response.body).to.eql(expectedResponse);
          });
          it('should show quote is fixed payment', async () => {
            const { body: { totalPrice } } = await riderEndpoint(
              quoteEndpoint, 'get',
              riderToken, app, request, domain
            );
            return expect(totalPrice).to.equal(200);
          });
          it('should allow a fixed payment ride to be requested', async () => {
            await createRequest(
              riderToken, pointZoneA, pointZoneB,
              location._id, app, request, domain, false, 3
            );
            const requestInfo = await Requests.findOne({ rider: rider._id });
            expect(requestInfo.paymentInformation.pwywOptions).to.eql([]);
            return expect(requestInfo.paymentInformation.totalPrice).to.equal(200);
          });
        });
        describe('When rider meets age requirement', () => {
          before(async () => {
            await Riders.updateOne({ _id: rider._id }, { $set: { dob: momentTimezone().subtract(30, 'year').format('YYYY-MM-DD') } });
          });
          it('should show rider meets age requirement', async () => {
            const response = await riderEndpoint(
              paymentInformationEndpoint, 'get',
              riderToken, app, request, domain
            );
            const expectedResponse = {
              ...FareTypes.freeAgeRestriction,
              paymentInformation: null,
              poweredByCopy: 'This ride is powered by Zone B.'
            };
            return expect(response.body).to.eql(expectedResponse);
          });
          it('should show quote is not available', async () => {
            const { body: { totalPrice } } = await riderEndpoint(
              quoteEndpoint, 'get',
              riderToken, app, request, domain
            );
            return expect(totalPrice).to.equal(200);
          });
          it('should allow free ride to be requested', async () => {
            await createRequest(
              riderToken, pointZoneA, pointZoneB,
              location._id, app, request, domain, false, 3, 200, '1.0.0', 100
            );
            const requestInfo = await Requests.findOne({ rider: rider._id });
            return expect(requestInfo.waitingPaymentConfirmation).to.equal(false);
          });
        });
      });
    });
  });
  describe('Rides fare copy', () => {
    it('should get Rides Fares Copy for /locations endpoint', async () => {
      const response = await riderEndpoint(
        `/v1/locations/${location._id}`, 'get',
        riderToken, app, request, domain
      );
      return expect(response.body.ridesFareCopy).to.equal(location.ridesFareCopy);
    });
    it('should  Rides Fares Copy for all locations fetched by rider', async () => {
      const response = await riderEndpoint(
        `/v1/locations?latitude=${locationServiceArea[0][0][1]}&longitude=${locationServiceArea[0][0][0]}`, 'get',
        riderToken, app, request, domain
      );
      return expect(response.body[0].ridesFareCopy).to.equal(location.ridesFareCopy);
    });
  });
  describe('Powered By copy', () => {
    let paymentInformationEndpoint;
    let location2;
    before(async () => {
      location2 = await Locations.createLocation({ ...locationInfo, name: 'Location 2' });
      paymentInformationEndpoint = `/v1/location/${location2._id}/payment-information?originLatitude=${pointZoneA[0]}&originLongitude=${pointZoneA[1]}&destinationLatitude=${pointZoneB[0]}&destinationLongitude=${pointZoneB[1]}`;
    });
    it('should not return Powered By Copy when value does not exist', async () => {
      const response = await riderEndpoint(
        paymentInformationEndpoint, 'get',
        riderToken, app, request, domain
      );
      return expect(response?.body?.poweredByCopy).to.eql('');
    });
    it('should return Powered By Copy when value exists', async () => {
      await Locations.updateOne({ _id: location2._id }, { $set: { poweredBy: '2 & sons' } });
      const response = await riderEndpoint(
        paymentInformationEndpoint, 'get',
        riderToken, app, request, domain
      );
      const poweredByCopy = 'This ride is powered by 2 & sons.';
      return expect(response?.body?.poweredByCopy).to.eql(poweredByCopy);
    });
    it('should return Powered By Copy in spanish', async () => {
      await Locations.updateOne({ _id: location2._id }, { $set: { poweredBy: '2 & sons' } });
      const response = await riderEndpoint(
        paymentInformationEndpoint, 'get',
        riderToken, app, request, domain, {}, 200, '1.0.0', { 'accept-language': 'es' }
      );
      const poweredByCopy = 'Este viaje fue impulsado por 2 & sons.';
      return expect(response?.body?.poweredByCopy).to.eql(poweredByCopy);
    });
  });
});
