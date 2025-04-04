import sinon from 'sinon';
import logger from '../../logger';
import { stripe } from '../../services';
import { login, useEndpoint } from './ride';
import { populateParams } from './object';
import { Riders, PaymentStatus } from '../../models';

const DEFAULT_RIDER_INFO = {
  email: 'rider1@mail.com',
  firstName: 'Rider FN',
  lastName: 'Rider LN',
  password: 'Password1',
  dob: '2000-12-11'
};

export const riderLogin = async (
  email, password, app, request, domain
) => login(email, password, app, request, domain.rider);

export const authenticateRider = async (riderSocket, riderToken) => riderSocket
  .emit('authenticate', { token: riderToken })
  .on('authenticated', () => {
    logger.debug('RIDER authentiticated through sockets');
  })
  .on('unauthorized', (msg) => {
    throw new Error(msg);
  });

export const createRiderLogin = async (riderParams, app, request, domain, riderSocket = null) => {
  const params = populateParams(riderParams, DEFAULT_RIDER_INFO);
  const {
    email, password
  } = params;
  const rider = await new Riders(params).save();
  const riderSessionResponse = await riderLogin(email, password, app, request, domain);
  const riderToken = riderSessionResponse.accessToken;

  if (riderSocket) {
    await authenticateRider(riderSocket, riderToken);
  }
  return { rider, riderToken, riderSocket };
};

export const riderEndpoint = async (
  url, requestType, riderToken, app, request, domain, payload = {}, statusCode = 200, appVersion = '1.0.0',
  headers = {}
) => {
  const additionalHeaders = headers;
  if (appVersion) {
    additionalHeaders['X-Mobile-Os'] = 'Android';
    additionalHeaders['X-App-Version'] = appVersion;
  }
  return useEndpoint(
    url, requestType, riderToken, app, request, domain.rider, payload, additionalHeaders, statusCode
  );
};

export const createRequest = async (
  riderToken, pickup, dropoff, location, app, request,
  domain, ada = false, n_passengers = 1, statusCode = 200,
  appVersion = '1.0.0', pwywValue = null, skipPaymentIntentCreation = true
) => {
  const payload = {
    passengers: n_passengers,
    isADA: ada,
    origin: {
      address: pickup.length > 1 ? pickup[2] : '',
      latitude: pickup[0],
      longitude: pickup[1]
    },
    message: null,
    location: location._id.toString(),
    destination: {
      address: dropoff.length > 1 ? dropoff[2] : '',
      latitude: dropoff[0],
      longitude: dropoff[1]
    },
    pwywValue
  };
  payload.skipPaymentIntentCreation = skipPaymentIntentCreation;
  return riderEndpoint(
    '/v1/ride/request',
    'post',
    riderToken,
    app,
    request,
    domain,
    payload,
    statusCode,
    appVersion
  ).then(result => result.body);
};

export const createFsRequest = async (
  riderToken, pickupFixedStopId, dropoffFixedStopId, location, app, request,
  domain, ada = false, n_passengers = 1, statusCode = 200,
  appVersion = '1.0.0'
) => {
  const payload = {
    passengers: n_passengers,
    isADA: ada,
    origin: {
      fixedStopId: pickupFixedStopId
    },
    message: null,
    location: location._id.toString(),
    destination: {
      fixedStopId: dropoffFixedStopId
    }
  };
  return riderEndpoint('/v1/ride/request', 'post', riderToken, app, request, domain, payload, statusCode, appVersion)
    .then(result => result.body);
};

export const createAnyStopRequest = async (
  riderToken, pickup, dropoff, location, app, request,
  domain, ada = false, n_passengers = 1, statusCode = 200,
  appVersion = '1.0.0', pwywValue = null
) => {
  const payload = {
    passengers: n_passengers,
    isADA: ada,
    origin: pickup.fixedStopId ? {
      fixedStopId: pickup.fixedStopId,
      address: pickup.address || 'Address'
    } : {
      address: pickup.address || 'Address',
      latitude: pickup.latitude,
      longitude: pickup.longitude
    },
    message: null,
    location: location._id.toString(),
    destination: dropoff.fixedStopId ? {
      fixedStopId: dropoff.fixedStopId,
      address: dropoff.address || 'Address'
    } : {
      address: dropoff.address || 'Address',
      latitude: dropoff.latitude,
      longitude: dropoff.longitude
    },
    pwywValue
  };
  return riderEndpoint('/v1/ride/request', 'post', riderToken, app, request, domain, payload, statusCode, appVersion)
    .then(result => result.body);
};

export const createRequestAnyStatus = async (
  riderToken, pickup, dropoff, location, app, request,
  domain, ada = false, n_passengers = 1, appVersion
) => {
  const payload = {
    passengers: n_passengers,
    isADA: ada,
    origin: {
      address: pickup[2],
      latitude: pickup[0],
      longitude: pickup[1]
    },
    message: null,
    location: location._id.toString(),
    destination: {
      address: dropoff[2],
      latitude: dropoff[0],
      longitude: dropoff[1]
    }
  };
  return riderEndpoint('/v1/ride/request', 'post', riderToken, app, request, domain, payload, null, appVersion)
    .then(result => result.body);
};

export const rideContext = async (
  ride, riderToken, app, request, domain
) => riderEndpoint(`/v1/rides/${ride._id}/status`, 'get', riderToken, app, request, domain, {})
  .then(item => item.body);

export const rideEta = async (
  ride, riderToken, app, request, domain
) => rideContext(ride, riderToken, app, request, domain)
  .then(body => body.eta);

export const riderCancel = async (driverSocket, riderSocket, ride) => {
  logger.debug('riderCancel');
  return new Promise((res, rej) => {
    riderSocket
      .emit('ride-cancel', { ride: ride._id });

    driverSocket
      .on('ride-updates', (updatedRide) => {
        if (updatedRide.status < 207) {
          return riderCancel(driverSocket, riderSocket, ride);
        }

        sinon.assert.match(updatedRide, {
          ride: String(ride._id),
          status: 207,
          message: null
        });
        driverSocket.off('ride-updates');
        return res();
      })
      .on('wserror', msg => rej(msg));
  });
};

export const requestCancel = async (
  request, app, domain, riderToken, riderRequest
) => riderEndpoint(
  '/v1/ride/request/cancel', 'post', riderToken, app, request, domain, riderRequest
);

export const getQuote = async (
  riderToken, app, request, domain, locationId, passengers, keyLoc
) => riderEndpoint(
  `/v1/quote?locationId=${locationId}&passengers=${passengers}&originLatitude=${keyLoc.req1p[0]}&originLongitude=${keyLoc.req1p[1]}&destinationLatitude=${keyLoc.req1d[0]}&destinationLongitude=${keyLoc.req1d[1]}`, 'get',
  riderToken, app, request, domain, {}
).then(result => result.body);

export const setupPromocode = async (
  riderToken, app, request, domain, locationId, promocode, status = 200
) => riderEndpoint(
  '/v1/promocode', 'post',
  riderToken, app, request, domain, { locationId, promocode }, status
).then(result => result.body);

export const removePromocode = async (
  riderToken, app, request, domain
) => riderEndpoint(
  '/v1/promocode', 'delete', riderToken, app, request, domain, {}
).then(result => result.body);

export const cancelRequest = async (
  riderToken, app, request, domain
) => riderEndpoint(
  '/v1/ride/request/cancel', 'post', riderToken, app, request, domain, {}
).then(result => result.body);

export const getPaymentSettings = async (riderToken, app, request, domain, locationId
) => riderEndpoint(
  `/v1/payment-settings?locationId=${locationId}`, 'get', riderToken, app, request, domain, {}
).then(result => result.body);

export const getSetupIntent = async (
  riderToken, app, request, domain
) => riderEndpoint(
  '/v1/payment-settings/setup', 'post', riderToken, app, request, domain, {}
).then(result => result.body);

export const removePaymentMethod = async (
  riderToken, app, request, domain, locationId
) => riderEndpoint(
  `/v1/payment-settings/setup?locationId=${locationId}`, 'delete', riderToken, app, request, domain, {}
).then(result => result.body);

export const riderConfirmPaymentIntent = async (
  riderToken, app, request, domain, paymentIntentStatus, paymentIntentId
) => riderEndpoint(
  '/v1/ride/request/confirm', 'post', riderToken, app, request, domain, { paymentIntentId, paymentIntentStatus }
).then(result => result.body);

export const tip = async (
  riderToken, app, request, domain, rideId, tipAmount
) => {
  const {
    body: { paymentIntentId }
  } = await riderEndpoint('/v1/tip', 'post', riderToken, app, request, domain, { rideId, tipAmount });

  const tipPaymentData = {
    paymentIntentId,
    paymentIntentStatus: PaymentStatus.requires_capture
  };

  await stripe.confirmPaymentIntent(paymentIntentId);
  return riderEndpoint(
    '/v1/tip/confirm', 'post', riderToken, app, request, domain, tipPaymentData
  ).then(result => ({ ...result.body, paymentIntentId }));
};

// Approve stripe payment
export const riderApprovePayment = async (
  riderToken, app, request, domain
) => riderEndpoint(
  '/v1/ride/request/payment-authorization', 'post', riderToken, app, request, domain
).then(result => result.body);

export const createScenarioRiders = async (number, appParams, riderAttributes = [{}]) => {
  const { app, request, domain } = appParams;
  const riders = [];
  let riderParams;
  let riderSocket;
  for (let i = 0; i < number; i += 1) {
    riderParams = riderAttributes.length > i ? riderAttributes[i] : {};
    ({ riderSocket } = riderParams);
    if (riderSocket) {
      delete riderParams.riderSocket;
    }
    // eslint-disable-next-line no-await-in-loop
    riders.push(createRiderLogin({
      ...DEFAULT_RIDER_INFO,
      email: `rider${i + 1}@mail.com`,
      lastName: `${i + 1}`,
      ...riderParams
    }, app, request, domain, riderSocket));
  }
  return Promise.all(riders);
};

export default {
  riderLogin,
  authenticateRider,
  createRiderLogin,
  createRequest,
  createFsRequest,
  createRequestAnyStatus,
  rideEta,
  rideContext,
  riderCancel,
  requestCancel,
  getQuote,
  setupPromocode,
  removePromocode,
  cancelRequest,
  getPaymentSettings,
  getSetupIntent,
  removePaymentMethod,
  riderConfirmPaymentIntent,
  tip,
  createAnyStopRequest
};
