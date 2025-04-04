import { ApplicationError } from '../../../errors';
import { FixedStops, Promocodes, Rides } from '../../../models';
import { getActiveFixedStop, getFixedStopNameFromStop, ridesFromFixedStop } from '../../../utils/ride';
import { Sentry, validator } from '../../../utils';
import { getLocaleFromUser } from '../../../utils/translation';
import { domain } from '../../../config';
import { dumpEmailReceiptData } from '../../../utils/dump';
import { fetchAllowedAdForEmail } from '../../../utils/digitalAds';
import { SesMailer } from '../../../services';
import logger from '../../../logger';

export const getRideInfoFromStop = async (stop) => {
  const ride = await Rides.findOne({ _id: stop.ride })
    .populate('rider')
    .populate({ path: 'pickupFixedStopId', model: 'FixedStops' })
    .populate({ path: 'dropoffFixedStopId', model: 'FixedStops' });

  return { ride, stop };
};

export const getPoolingActionCards = async (driverId, route, hasCurrent_) => {
  let hasCurrent = hasCurrent_;
  const actionCards = [];
  const stops = route.stops.filter(stop => stop.status === 'waiting');

  let ridesFromStops = stops.map(stop => getRideInfoFromStop(stop));
  ridesFromStops = await Promise.all(ridesFromStops);

  ridesFromStops.forEach((rideAndStop) => {
    const { ride, stop } = rideAndStop;

    actionCards.push({
      ...ride.toJSON(),
      cost: new Date(stop.cost * 1000),
      stopType: stop.stopType,
      fixedStopId: stop.fixedStopId,
      fixedStopName: getFixedStopNameFromStop(stop, ride),
      current: !hasCurrent
    });
    hasCurrent = true;
  });
  return { actionCards, hasCurrent };
};

export const getNonPoolingActionCards = async (driverId, filterParams, hasCurrent_) => {
  let hasCurrent = hasCurrent_;
  const actionCards = [];
  filterParams.populate = 'rider pickupFixedStopId dropoffFixedStopId';
  const rides = await Rides.getHistory({
    ...filterParams,
    isActiveOnly: true,
    sort: 'createdTimestamp',
    driver: driverId,
    request: { $ne: null }
  });

  rides.forEach((ride) => {
    if (ride.status < 300) {
      actionCards.push({
        ...ride,
        stopType: 'pickup',
        cost: new Date(ride.eta * 1000),
        current: !hasCurrent,
        fixedStopId: ride.pickupFixedStopId?._id,
        fixedStopName: ride.pickupFixedStopId?.name
      });
      hasCurrent = true;
    }

    actionCards.push({
      ...ride,
      stopType: 'dropoff',
      cost: new Date(ride.dropoffEta * 1000),
      current: !hasCurrent,
      fixedStopId: ride.dropoffFixedStopId?._id,
      fixedStopName: ride.dropoffFixedStopId?.name
    });
    hasCurrent = true;
  });
  return { actionCards, hasCurrent };
};

export const getHailedActionCards = async (driverId, filterParams) => {
  const actionCards = [];
  const hailedRides = await Rides.getHistory({
    ...filterParams,
    isActiveOnly: true,
    sort: 'createdTimestamp',
    driver: driverId,
    request: null
  }) || [];
  hailedRides.forEach((ride) => {
    actionCards.push({
      ...ride, stopType: 'dropoff', cost: null, current: false
    });
  });
  return { actionCards, hailedRides };
};

export const rideChecks = async (data, driverId) => {
  const {
    ride: rideId,
    fixedStopId
  } = validator.validate(
    validator.rules.object().keys({
      ride: validator.rules.string(),
      fixedStopId: validator.rules.string(),
      latitude: validator.rules.number().min(-90).max(90),
      longitude: validator.rules.number().min(-180).max(180)
    }).or('ride', 'fixedStopId'),
    data
  );

  if (rideId) {
    const ride = await Rides.findById(rideId);

    if (ride?.driver?.toString() !== driverId) {
      throw new ApplicationError('Wrong ride id', 400);
    }

    return ride;
  }

  if (fixedStopId) {
    const activeFixedStop = await getActiveFixedStop(driverId);
    const fixedStop = await FixedStops.findById(fixedStopId);
    if (!fixedStop || `${activeFixedStop}` !== `${fixedStopId}`) {
      throw new ApplicationError('Wrong fixed-stop id', 400);
    }
    return ridesFromFixedStop(driverId, fixedStopId);
  }

  throw new ApplicationError('Something went wrong');
};

export const sendRideCompletedEmail = async (ride) => {
  try {
    const {
      rider, driver, location, request
    } = ride;

    if (rider && rider._id && rider.subscriptions.receipt) {
      const riderLocale = await getLocaleFromUser('rider', ride.rider);
      const promocodeId = request?.paymentInformation?.promocodeId;
      const promoCode = promocodeId ? await Promocodes.findById(promocodeId) : null;

      const advertisement = await fetchAllowedAdForEmail(location, rider);

      const htmlData = dumpEmailReceiptData(
        ride, request, rider,
        driver, { ...location.toJSON(), advertisement }, domain.rider,
        riderLocale, promoCode
      );

      await SesMailer.send('receipt', rider.email, {
        subject: { role: 'Rider' },
        html: htmlData
      },
      riderLocale.split('-')[0]);
    }
  } catch (error) {
    logger.error('Ride Receipt email Error');
    logger.error(error);
    Sentry.captureException(error);
  }
};


export default {
  getRideInfoFromStop,
  getPoolingActionCards,
  getNonPoolingActionCards,
  getHailedActionCards,
  rideChecks,
  sendRideCompletedEmail
};
