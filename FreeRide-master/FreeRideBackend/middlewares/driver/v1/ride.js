import {
  Rides, Routes, Drivers, Locations, Zones, RideStatus
} from '../../../models';
import { validator, errorCatchHandler, Sentry } from '../../../utils';
import { websocket } from '../../../services';
import {
  dumpRideFetchDriver,
  dumpRideHistoryForDriver,
  dumpCardsForDriver
} from '../../../utils/dump';
import {
  RideNotFoundError,
  ApplicationError
} from '../../../errors';
import {
  getHailedActionCards,
  getPoolingActionCards,
  getNonPoolingActionCards,
  rideChecks
} from '../utils/ride';
import { checkStrikeBan } from '../../../utils/report';
import logger from '../../../logger';
import {
  driverArrivedService, rideCancelService, rideCompleteService, ridePickUpService
} from '../../../services/driver/ride';
import { createRideForMatch } from '../../../services/matching';

const fetch = async (req, res) => {
  try {
    const { id: rideId } = validator.validate(
      validator.rules.object().keys({
        id: validator.rules.string().required()
      }),
      req.params
    );

    const ride = await Rides.findOne({
      _id: rideId
    }).populate([
      { path: 'rider' },
      { path: 'requestMessages', model: 'Message' }
    ]);
    if (!ride) {
      throw new RideNotFoundError(`Ride with specified if of ${rideId} not found`);
    }

    res.json(dumpRideFetchDriver(ride));
  } catch (err) {
    errorCatchHandler(res, err);
  }
};

const hail = async (req, res) => {
  try {
    const ride = validator.validate(
      validator.rules.object().keys({
        location: validator.rules.string().required(),
        passengers: validator.rules.number().integer().min(1).required(),
        isADA: validator.rules.boolean().required()
      }),
      req.body
    );
    const { _id: driverId } = req.user;
    const driver = await Drivers.findOne({ _id: driverId });
    const {
      currentLocation: { coordinates: driverCoordinates }
    } = driver;
    const [hailedPickupLongitude, hailedPickupLatitude] = driverCoordinates;
    const pickupZone = await Zones.detectZone(ride.location, {
      longitude: hailedPickupLongitude,
      latitude: hailedPickupLatitude
    });
    const { poolingEnabled } = await Locations.getLocation(ride.location);

    const result = await createRideForMatch({
      ...ride,
      isFixedStop: false,
      pickupZone: pickupZone ? {
        id: pickupZone._id,
        name: pickupZone.name
      } : null,
      hailedPickupLatitude,
      hailedPickupLongitude,
      isPickupFixedStop: false,
      status: RideStatus.RideInProgress,
      poolingLocation: poolingEnabled
    }, driver);

    const driverSocketIds = await websocket.getUserSocketIds(driverId, 'driver');
    await websocket.joinSocketToRoom(driverSocketIds, result._id.toString());
    res.status(200).json({
      id: result._id,
      location: result.location,
      passengers: result.passengers,
      isADA: result.isADA
    });
  } catch (err) {
    errorCatchHandler(res, err, 'We were unable to create this ride for you at this time.');
  }
};

const update = async (req, res) => {
  try {
    const ride = validator.validate(
      validator.rules.object().keys({
        passengers: validator.rules.number().integer().min(1).required(),
        isADA: validator.rules.boolean().required()
      }),
      req.body
    );
    const { id } = validator.validate(
      validator.rules.object().keys({
        id: validator.rules.string().required()
      }),
      req.params
    );

    const { passengers, isADA } = ride;
    const result = await Rides.updateRide(id, { passengers, isADA });

    res.status(200).json({
      id: result._id,
      location: result.location,
      passengers: result.passengers,
      isADA: result.isADA
    });
  } catch (err) {
    errorCatchHandler(res, err, 'We were unable to update this ride for you at this time.');
  }
};

const getHistory = async (req, res) => {
  try {
    const filterParams = validator.validate(
      validator.rules.object().keys({
        sort: validator.rules.string(),
        order: validator.rules.string().regex(/^(asc|desc)$/),
        skip: validator.rules.number().integer().min(1),
        limit: validator.rules.number().integer().min(1),
        isActiveOnly: validator.rules.boolean()
      }),
      req.query
    );
    filterParams.populate = 'rider';

    const { _id: driverId } = req.user;

    const rides = await Rides.getHistory({
      ...filterParams,
      driver: driverId
    });

    res.json(rides.map(dumpRideHistoryForDriver));
  } catch (err) {
    errorCatchHandler(res, err);
  }
};

const getQueue = async (req, res) => {
  try {
    const filterParams = validator.validate(
      validator.rules.object().keys({
        order: validator.rules.string().regex(/^(asc|desc)$/),
        skip: validator.rules.number().integer().min(1),
        limit: validator.rules.number().integer().min(1)
      }),
      req.query
    );
    filterParams.populate = 'rider';
    filterParams.order = 'asc';

    const { _id: driverId } = req.user;

    const rides = await Rides.getHistory({
      ...filterParams,
      isActiveOnly: true,
      sort: 'createdTimestamp',
      driver: driverId
    });

    const ridesDump = rides.map(dumpRideHistoryForDriver);
    let hasCurrent = false;
    ridesDump.forEach((ride, index) => {
      if (ride.current) {
        hasCurrent = true;
      } else {
        ridesDump[index].current = false;
      }
    });

    if (ridesDump.length > 0) {
      if (!hasCurrent) {
        ridesDump[0].current = true;
      }
    }

    if (
      (!ridesDump.length && rides.length)
      || (ridesDump.length && !ridesDump.find(item => item.current))
    ) {
      Sentry.captureScopedException(new ApplicationError('Get queue error', 500),
        {
          tag: 'getQueue',
          type: 'API',
          info: {
            rides,
            ridesDump
          }
        });
    }

    res.json(ridesDump);
  } catch (err) {
    errorCatchHandler(res, err);
  }
};

const getActions = async (req, res) => {
  try {
    const filterParams = validator.validate(
      validator.rules.object().keys({
        order: validator.rules.string().regex(/^(asc|desc)$/),
        skip: validator.rules.number().integer().min(1),
        limit: validator.rules.number().integer().min(1)
      }),
      req.query
    );
    filterParams.populate = 'rider';
    filterParams.order = 'asc';

    const { _id: driverId } = req.user;

    const cards = [];
    let actionCards;

    // Hailed actions
    let hailedRides = [];
    ({ actionCards, hailedRides } = await getHailedActionCards(driverId, filterParams));
    actionCards.forEach(actionCard => cards.push(actionCard));

    let hasCurrent = false;

    // Pooling actions
    const route = await Routes.findOne({ driver: driverId, active: true });
    let stops;
    if (route && route.activeRideId && route.stops.length) {
      ({
        actionCards,
        hasCurrent
      } = await getPoolingActionCards(driverId, route, hasCurrent));
      actionCards.forEach(actionCard => cards.push(actionCard));
    }

    // Non pooling actions
    if (!route) {
      ({
        actionCards,
        hasCurrent
      } = await getNonPoolingActionCards(driverId, filterParams, hasCurrent));
      actionCards.forEach(actionCard => cards.push(actionCard));
    }

    const cardsDump = cards.map(dumpCardsForDriver);

    if (cardsDump.length > 0) {
      if (!hasCurrent) {
        cardsDump[0].current = true;
      }
    }

    if ((!cardsDump.length && ((route && stops.length) || hailedRides.length))) {
      Sentry.captureScopedException(new ApplicationError('Get actions error', 500),
        {
          tag: 'getActions',
          type: 'API',
          info: {
            hailedRides,
            waitingStops: stops,
            cardsDump
          }
        });
    }

    res.json(cardsDump);
  } catch (err) {
    errorCatchHandler(res, err);
  }
};

const rate = async (req, res) => {
  try {
    if (!req.body.feedback) {
      delete req.body.feedback;
    }
    const ride = validator.validate(
      validator.rules.object().keys({
        ride: validator.rules.string().required(),
        rating: validator.rules.number().integer().min(1).max(5)
          .required(),
        feedback: validator.rules.string()
      }),
      req.body
    );

    const result = await Rides.updateRide(
      ride.ride,
      {
        ratingForRider: ride.rating,
        feedbackForRider: ride.feedback
      }
    );

    await checkStrikeBan('Rider', result.rider);

    res.status(200).json({
      ride: result._id,
      feedback: result.feedbackForRider,
      rating: result.ratingForRider,
      successMessage: 'Thank you for your feedback!'
    });
  } catch (err) {
    errorCatchHandler(res, err, 'We were unable to rate this ride at this time.');
  }
};

const cancelRide = async (req, res) => {
  const { user, params, body } = req;
  logger.info(`[ride-cancel] endpoint called with ride=${params.id}`);
  try {
    const checkedRide = await rideChecks({ ride: params.id }, user._id);
    const { ride, success, error } = await rideCancelService(checkedRide, body);
    if (!success) {
      throw new ApplicationError(error.message || 'Something went wrong', 400);
    }
    res.json({
      success: true,
      message: 'Ride cancelled successfully',
      data: ride
    });
  } catch (error) {
    errorCatchHandler(
      res,
      error,
      error.message || 'We were unable to cancel this ride at this time.'
    );
  }
};

const cancelFixedStopRides = async (req, res) => {
  const { user, params, body } = req;
  logger.info(`[fixed-stop-cancel] endpoint called with stop=${params.id}`);
  try {
    const rides = await rideChecks({ fixedStopId: params.id }, user._id);
    const rideResponses = await Promise.all(
      rides.map(ride => rideCancelService(ride, body))
    );

    const hasErrors = rideResponses.some(
      rideResponse => !rideResponse.success
    );

    const responseStatus = hasErrors ? 207 : 200;
    const message = hasErrors
      ? 'There was an issue cancelling some rides'
      : 'Rides cancelled successfully';
    const errorCode = hasErrors ? 'MIXED_ERROR' : null;
    res.status(responseStatus).json({
      success: !hasErrors,
      errorCode,
      message,
      data: rideResponses.map(item => item.ride)
    });
  } catch (error) {
    errorCatchHandler(res, error, 'We were unable to cancel this fixed stop at this time.');
  }
};

const completeRide = async (req, res) => {
  const { user, params } = req;
  logger.info(`[ride-complete] endpoint called with ride=${params.id}`);
  try {
    const checkedRide = await rideChecks({ ride: params.id }, user._id);
    const { ride, success, error } = await rideCompleteService(checkedRide);
    if (!success) {
      throw new ApplicationError(error.message || 'Something went wrong', 400);
    }
    res.json({
      success: true,
      message: 'Ride completed successfully',
      data: ride
    });
  } catch (error) {
    errorCatchHandler(res, error, 'We were unable to complete this ride at this time.');
  }
};

const completeFixedStopRides = async (req, res) => {
  const { user, params } = req;
  logger.info(`[fixed-stop-complete] endpoint called with stop=${params.id}`);
  try {
    const rides = await rideChecks({ fixedStopId: params.id }, user._id);
    const rideResponses = await Promise.all(
      rides.map(ride => rideCompleteService(ride))
    );

    const hasErrors = rideResponses.some(
      rideResponse => !rideResponse.success
    );

    const responseStatus = hasErrors ? 207 : 200;
    const message = hasErrors
      ? 'There was an issue completing some rides'
      : 'Rides completed successfully';
    const errorCode = hasErrors ? 'MIXED_ERROR' : null;
    res.status(responseStatus).json({
      success: !hasErrors,
      errorCode,
      message,
      data: rideResponses.map(item => item.ride)
    });
  } catch (error) {
    errorCatchHandler(res, error, 'We were unable to complete this ride at this time.');
  }
};

const driverArrived = async (req, res) => {
  const { user, params } = req;
  logger.info(`[driver-arrived] called with ride=${params.id}`);
  try {
    const checkedRide = await rideChecks({ ride: params.id }, user._id);
    const { ride, success, error } = await driverArrivedService(checkedRide);
    if (!success) {
      throw new ApplicationError(error.message || 'Something went wrong', 400);
    }
    res.json({
      success: true,
      message: 'Request processed successfully',
      data: ride
    });
  } catch (error) {
    errorCatchHandler(res, error, 'We were unable to process this request at this time.');
  }
};

const driverArrivedFixedStops = async (req, res) => {
  const { user, params } = req;
  logger.info(`[driver-arrived-fixedStops] called with fixedStop=${params.id}`);
  try {
    const rides = await rideChecks({ fixedStopId: params.id }, user._id);
    const rideResponses = await Promise.all(
      rides.map(ride => driverArrivedService(ride))
    );

    const hasErrors = rideResponses.some(
      rideResponse => !rideResponse.success
    );

    const responseStatus = hasErrors ? 207 : 200;
    const message = hasErrors
      ? 'We were unable to process some of the requests'
      : 'Request processed successfully';
    const errorCode = hasErrors ? 'MIXED_ERROR' : null;
    res.status(responseStatus).json({
      success: !hasErrors,
      errorCode,
      message,
      data: rideResponses.map(item => item.ride)
    });
  } catch (error) {
    errorCatchHandler(res, error, 'We were unable to process this request at this time.');
  }
};

const pickUpRide = async (req, res) => {
  const { params, user } = req;
  logger.info(`[ride-pick-up] event called with ride=${params.id}`);
  try {
    const checkedRide = await rideChecks({ ride: params.id }, user._id);
    const { ride, success, error } = await ridePickUpService(checkedRide);
    if (!success) {
      throw new ApplicationError(error.message || 'Something went wrong', 400);
    }
    res.json({
      success: true,
      message: 'Request processed successfully',
      data: ride
    });
  } catch (error) {
    errorCatchHandler(res, error, 'We were unable to process this request at this time.');
  }
};

const pickUpFixedStops = async (req, res) => {
  const { params, user } = req;
  logger.info(`[fixed-stops-pick-up] event called with stop=${params.id}`);
  try {
    const rides = await rideChecks({ fixedStopId: params.id }, user._id);
    const rideResponses = await Promise.all(
      rides.map(ride => ridePickUpService(ride))
    );

    const hasErrors = rideResponses.some(
      rideResponse => !rideResponse.success
    );

    const responseStatus = hasErrors ? 207 : 200;
    const message = hasErrors
      ? 'We were unable to process some of the requests'
      : 'Request processed successfully';
    const errorCode = hasErrors ? 'MIXED_ERROR' : null;
    res.status(responseStatus).json({
      success: !hasErrors,
      errorCode,
      message,
      data: rideResponses.map(item => item.ride)
    });
  } catch (error) {
    errorCatchHandler(res, error, 'We were unable to process this request at this time.');
  }
};

export default {
  hail,
  update,
  fetch,
  getHistory,
  getQueue,
  rate,
  getActions,
  cancelRide,
  cancelFixedStopRides,
  completeRide,
  completeFixedStopRides,
  driverArrived,
  driverArrivedFixedStops,
  pickUpRide,
  pickUpFixedStops
};
