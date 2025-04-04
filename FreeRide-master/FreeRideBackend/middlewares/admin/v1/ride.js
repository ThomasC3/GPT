import moment from 'moment-timezone';
import csv from 'csv';
import { Rides, Locations, ridesCancellationSources } from '../../../models';
import { RideNotFoundError, ApplicationError } from '../../../errors';
import { googleMaps } from '../../../services';
import { validator, RideSerializer } from '../../../utils';
import { adminErrorCatchHandler } from '..';
import { getRidePolylines } from '../../../utils/ride';
import { monthRangeLimitCheck } from '../../../utils/check';
import { rideCancelService, rideCompleteService } from '../../../services/driver/ride';

const getRidesParamsValidator = (req, options = {}) => validator.validate(
  validator.rules.object().keys({
    skip: validator.rules.number().integer().min(0),
    limit: options.csv ? validator.rules.number().integer().min(1).allow('') : validator.rules.number().integer().min(1),
    location: validator.rules.string().allow(''),
    driver: validator.rules.string(),
    rider: validator.rules.string(),
    status: validator.rules.array().items(validator.rules.number()),
    isADA: validator.rules.boolean().truthy(1).falsy(0).allow(''),
    ratingForRider: validator.rules.number().allow(''),
    ratingForDriver: validator.rules.number().allow(''),
    createdTimestamp: validator.rules.object().keys({
      start: validator.rules.string().allow(''),
      end: validator.rules.string().allow('')
    })
  }),
  req.query
);

const getRides = async (req, res) => {
  try {
    const filterParams = getRidesParamsValidator(req);
    monthRangeLimitCheck(filterParams);

    const rides = await Rides.getRides(filterParams);

    rides.items = RideSerializer.adminRidesToJson(rides.items);

    res.json(rides);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getCsvRides = async (req, res) => {
  try {
    const filterParams = getRidesParamsValidator(req, { csv: true });
    monthRangeLimitCheck(filterParams);

    const locationTimezone = filterParams.location
      ? (await Locations.findById(filterParams.location))?.timezone
      : null;

    const cursor = Rides.getRidesCursor(filterParams, locationTimezone);
    const transformer = RideSerializer.adminRideToCsv;

    res.setHeader('Content-Disposition', `attachment; filename="download-${Date.now()}.csv"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    res.writeHead(200, { 'Content-Type': 'text/csv' });
    res.flushHeaders();

    const columns = RideSerializer.csvColumns();

    cursor
      .pipe(csv.transform(transformer))
      .pipe(csv.stringify({
        header: true,
        columns,
        cast: {
          boolean: (value, context) => {
            if (context.column === 'index') {
              return String(context.records + 1);
            }
            return value ? 'True' : 'False';
          }
        }
      }))
      .pipe(res);
  } catch (error) {
    adminErrorCatchHandler(res, error, {});
  }
};

const getCsvRideFeedback = async (req, res) => {
  try {
    const filterParams = getRidesParamsValidator(req, { csv: true });
    monthRangeLimitCheck(filterParams);

    const locationTimezone = filterParams.location
      ? (await Locations.findById(filterParams.location))?.timezone
      : null;

    const cursor = Rides.getRidesCursor({
      ...filterParams,
      feedbackText: true
    }, locationTimezone);
    const transformer = RideSerializer.adminRideToCsv;

    res.setHeader('Content-Disposition', `attachment; filename="download-${Date.now()}.csv"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    res.writeHead(200, { 'Content-Type': 'text/csv' });
    res.flushHeaders();

    const columns = [
      'index', 'ratingForRider', 'feedbackForRider',
      'ratingForDriver', 'feedbackForDriver',
      'createdTimestamp', 'date',
      'driverFirstName', 'driverLastName',
      'riderFirstName', 'riderLastName',
      'riderEmail', 'riderDob',
      'locationName', 'rideID'
    ];
    cursor
      .pipe(csv.transform(transformer))
      .pipe(csv.stringify({
        header: true,
        columns,
        cast: {
          boolean: (value, context) => {
            if (context.column === 'index') {
              return String(context.records + 1);
            }
            return value ? 'True' : 'False';
          }
        }
      }))
      .pipe(res);
  } catch (error) {
    adminErrorCatchHandler(res, error, {});
  }
};

const getRide = async (req, res) => {
  try {
    const { id } = req.params;
    const ride = await Rides.getRide({ _id: id });

    if (!ride) { throw new RideNotFoundError(); }

    const polylines = await getRidePolylines(ride);

    ride.createdTimestamp = moment(ride.createdTimestamp).tz(ride.location.timezone).format('lll');
    if (ride.dropoffTimestamp) {
      ride.dropoffTimestamp = moment(ride.dropoffTimestamp).tz(ride.location.timezone).format('lll');
    }
    if (ride.pickupTimestamp) {
      ride.pickupTimestamp = moment(ride.pickupTimestamp, 'x').tz(ride.location.timezone).format('lll');
    }

    if (ride.request && ride.request.requestTimestamp) {
      ride.request.requestTimestamp = moment(ride.request.requestTimestamp).tz(ride.location.timezone).format('lll');
    }
    if (ride.cancelTimestamp) {
      ride.cancelTimestamp = moment(ride.cancelTimestamp).tz(ride.location.timezone).format('lll');
    }
    if (ride.tips?.length) {
      ride.tips[0].createdTimestamp = moment(ride.tips[0].createdTimestamp).tz(ride.location.timezone).format('lll');
    }

    if (!ride.rider) {
      ride.pickupTimestamp = ride.pickupTimestamp || ride.createdTimestamp;
    }

    if (ride.requestMessages) {
      ride.requestMessages.forEach((msg) => {
        if (msg.createdTimestamp && msg.createdTimestamp) {
          // eslint-disable-next-line no-param-reassign
          msg.createdTimestamp = moment(msg.createdTimestamp).tz(ride.location.timezone).format('lll');
        }
      });
    }
    res.status(200).json({ ...ride, polylines });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};


const getPolyline = async (req, res) => {
  try {
    const { id: rideId } = validator.validate(
      validator.rules.object().keys({
        id: validator.rules.string().required()
      }),
      req.params,
    );

    const ride = await Rides.findById(rideId).populate('driver');
    if (!ride) { throw new RideNotFoundError(); }

    let polyline = null;
    if ([202, 203, 300].includes(ride.status)) {
      let destination = false;

      // eslint-disable-next-line
      switch (ride.status) {
      case 202:
      case 203:
        destination = `${ride.pickupLatitude},${ride.pickupLongitude}`;
        break;
      case 300:
        destination = `${ride.dropoffLatitude},${ride.dropoffLongitude}`;
        break;
      }

      const googleMapsResult = await googleMaps.client.directions({
        origin: `${ride.driver.currentLocation.coordinates[1]},${ride.driver.currentLocation.coordinates[0]}`,
        destination,
        units: 'imperial'
      }).asPromise();

      if (googleMapsResult.status === 200 && googleMapsResult.json
        && googleMapsResult.json.status === 'OK' && googleMapsResult.json.routes.length) {
        polyline = googleMapsResult.json.routes[0].overview_polyline.points;
      }
    }

    res.json({ polyline });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const cancelRide = async (req, res) => {
  try {
    const { id } = req.params;
    const ride = await Rides.findOne({ _id: id });

    if (!ride) { throw new RideNotFoundError(); }
    const { success, error } = await rideCancelService(ride, {}, ridesCancellationSources.ADMIN);
    if (!success) {
      throw new ApplicationError(error?.message || 'Something went wrong', 400);
    }

    return await getRide(req, res);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }

  return null;
};

const completeRide = async (req, res) => {
  try {
    const { id } = req.params;
    const ride = await Rides.findOne({ _id: id });
    if (!ride) { throw new RideNotFoundError(); }

    const { success, error } = await rideCompleteService(ride);
    if (!success) {
      throw new ApplicationError(error?.message, 400);
    }

    return await getRide(req, res);
  } catch (error) {
    adminErrorCatchHandler(
      res, error,
      req.user, 'We were unable to complete this ride at this time.'
    );
  }

  return null;
};

export default {
  getRides,
  getRide,
  getPolyline,
  completeRide,
  getCsvRides,
  getCsvRideFeedback,
  cancelRide
};
