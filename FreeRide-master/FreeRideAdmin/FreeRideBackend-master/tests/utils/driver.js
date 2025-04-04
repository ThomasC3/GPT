import logger from '../../logger';
import { login, useEndpoint } from './ride';
import { createGEMVehicle } from './vehicle';
import { populateParams } from './object';
import { Drivers, Locations } from '../../models';
import { sleep } from '../../utils/ride';

const DEFAULT_DRIVER_INFO = {
  firstName: 'Driver FN',
  lastName: 'Driver LN',
  displayName: 'Driver FN Driver LN',
  email: 'some@mail.com',
  zip: 10001,
  phone: 123456789,
  isOnline: true,
  isTemporaryPassword: false,
  password: 'Password1',
  dob: '2000-12-11',
  isAvailable: true
};

export const driverEndpoint = async (
  url, requestType, driverToken, app, request, domain, payload = {}, status = 200
) => useEndpoint(url, requestType, driverToken, app, request, domain.driver, payload, {}, status);

export const setLocation = async (
  location, driverToken, app, request, domain, status = null
) => driverEndpoint(
  '/v1/driver/location', 'put', driverToken, app, request, domain, { activeLocation: location }, status
);

export const updateStatus = async (
  driverToken, app, request, domain, payload, status = null
) => driverEndpoint(
  '/v1/driver/status', 'post', driverToken, app, request, domain, payload, status
);

export const driverLogin = async (
  email, password, app, request, domain
) => login(email, password, app, request, domain.driver);

export const authenticateDriver = async (driverSocket, driverToken) => driverSocket
  .emit('authenticate', { token: driverToken })
  .on('authenticated', () => {
    logger.debug('DRIVER1 authentiticated through sockets');
  })
  .on('unauthorized', (msg) => {
    throw new Error(msg);
  });

export const createDriver = async (
  driverParams
) => {
  const params = populateParams(driverParams, DEFAULT_DRIVER_INFO);
  const driver = await Drivers.createDriver(params);
  return { driver, params };
};

export const createDriverLogin = async (
  driverParams, app, request, domain, driverSocket = null,
  { setActiveLocation = true, attachSharedVehicle = true } = {}
) => {
  let { vehicle } = driverParams;
  if (!vehicle && attachSharedVehicle) {
    let { activeLocation } = driverParams;
    if (!activeLocation) {
      activeLocation = driverParams.locations?.length
        ? driverParams.locations[0] : (await Locations.findOne({}))?._id;
    }
    vehicle = await createGEMVehicle(false, activeLocation, { driverDump: true });
  }

  const result = await createDriver({ ...driverParams, vehicle });
  let { driver } = result;
  const { email, password, isAvailable } = result.params;

  const driverSessionResponse = await driverLogin(email, password, app, request, domain);
  if (isAvailable) {
    driver = await Drivers.updateDriver(driver._id, { isAvailable: true });
  }
  const driverToken = driverSessionResponse.accessToken;

  if (!driver.activeLocation && setActiveLocation) {
    const location = driver.locations?.length
      ? driver.locations[0] : (await Locations.findOne({}))?._id;
    if (location) {
      await setLocation(location, driverToken, app, request, domain);
    }
  }

  if (driverSocket) {
    await authenticateDriver(driverSocket, driverToken);
  }

  await Drivers.syncIndexes();

  return { driver, driverToken, driverSocket };
};

export const pickUp = async (driverToken, ride, app, request, domain, status) => {
  logger.debug('> Picking up...');
  return driverEndpoint(`/v1/ride/${ride._id}/pickup`, 'put', driverToken, app, request, domain, {}, status);
};

export const pickUpFs = async (driverToken, fixedStop, app, request, domain, status = 200) => {
  logger.debug('> Picking up fixed-stop...');
  return driverEndpoint(
    `/v1/fixed-stops/${fixedStop._id}/pickup`,
    'put',
    driverToken,
    app,
    request,
    domain,
    {},
    status
  );
};

export const dropOff = async (driverToken, ride, app, request, domain, status = 200) => {
  logger.debug('> Dropping off...');
  return driverEndpoint(`/v1/ride/${ride._id}/complete`, 'put', driverToken, app, request, domain, {}, status);
};

export const dropOffFs = async (
  driverToken,
  fixedStopId,
  app,
  request,
  domain,
  status = 200
) => {
  logger.debug('> Dropping off...');
  return driverEndpoint(
    `/v1/fixed-stops/${fixedStopId}/complete`,
    'put',
    driverToken,
    app,
    request,
    domain,
    {},
    status
  );
};

export const driverCancel = async (
  driverToken,
  rideId,
  app,
  request,
  domain,
  status = 200
) => {
  logger.debug('driverCancel');
  return driverEndpoint(
    `/v1/ride/${rideId}/cancel`,
    'put',
    driverToken,
    app,
    request,
    domain,
    {},
    status
  );
};

export const driverCancelFs = async (driverToken, fixedStop, app, request, domain) => {
  logger.debug('driverCancelFs');
  return driverEndpoint(`/v1/fixed-stops/${fixedStop._id}/cancel`, 'put', driverToken, app, request, domain);
};


export const noShowCancel = async (
  driverToken, data, app, request, domain, status = 200
) => {
  logger.debug('noShowCancel');
  const { ride, latitude, longitude } = data;
  const reqData = {
    ride: ride._id, latitude, longitude, noShow: true
  };
  return driverEndpoint(`/v1/ride/${ride._id}/cancel`, 'put', driverToken, app, request, domain, reqData, status);
};

export const hailRide = async (
  driverToken, location, app, request, domain, ada = false, n_passengers = 1
) => {
  const payload = {
    passengers: n_passengers,
    isADA: ada,
    location: location._id.toString()
  };
  return driverEndpoint('/v1/ride/hail', 'post', driverToken, app, request, domain, payload, 200)
    .then(result => result.body);
};

export const driverMoved = async (driverSocket, latitude, longitude) => {
  logger.debug('> Driver moving...');
  return new Promise((res, rej) => {
    driverSocket
      .emit('ride-driver-moved', { latitude, longitude });

    driverSocket
      .on('ride-driver-moved', async (eventInfo) => {
        if (eventInfo.latitude === latitude && eventInfo.longitude === longitude) {
          logger.debug('> Driver moved!');
          driverSocket.off('ride-driver-moved');
          await sleep(1000);

          return res();
        }

        return null;
      })
      .on('wserror', msg => rej(msg));
  });
};

export const driverArrived = async (driverToken, ride, app, request, domain, status = 200) => {
  logger.debug('> Driver arrived...');
  return driverEndpoint(`/v1/ride/${ride._id}/arrive`, 'put', driverToken, app, request, domain, {}, status);
};

export const driverArrivedFs = async (
  driverToken,
  fixedStop,
  app,
  request,
  domain,
  status = 200
) => {
  logger.debug('> Driver arrived...');
  return driverEndpoint(
    `/v1/fixed-stops/${fixedStop._id}/arrive`,
    'put',
    driverToken,
    app,
    request,
    domain,
    {},
    status
  );
};

export const createScenarioDrivers = async (number, appParams, driverAttributes = [{}]) => {
  const { app, request, domain } = appParams;
  const drivers = [];
  let driverParams;
  let driverSocket;
  for (let i = 0; i < number; i += 1) {
    driverParams = driverAttributes.length > i ? driverAttributes[i] : {};
    ({ driverSocket } = driverParams);
    if (driverSocket) {
      delete driverParams.driverSocket;
    }
    drivers.push(createDriverLogin({
      ...DEFAULT_DRIVER_INFO,
      email: `driver${i + 1}@mail.com`,
      lastName: `${i + 1}`,
      ...driverParams
    }, app, request, domain, driverSocket));
  }
  return Promise.all(drivers);
};

export const getQueue = async (
  driverToken, app, request, domain, status = null
) => driverEndpoint(
  '/v1/rides/queue', 'get', driverToken, app, request, domain, {}, status
).then(result => result.body);

export const getActions = async (
  driverToken, app, request, domain, status = null
) => driverEndpoint(
  '/v1/actions', 'get', driverToken, app, request, domain, {}, status
).then(result => result.body);

export default {
  driverLogin,
  setLocation,
  updateStatus,
  createDriver,
  createDriverLogin,
  pickUp,
  dropOff,
  driverCancel,
  noShowCancel,
  hailRide,
  driverMoved,
  driverArrived,
  pickUpFs,
  dropOffFs,
  driverCancelFs,
  driverArrivedFs,
  createScenarioDrivers,
  getQueue,
  getActions
};
