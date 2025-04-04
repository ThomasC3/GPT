import {
  Drivers, Requests, Rides
} from '../../../models';
import { validator } from '../../../utils';
import { adminErrorCatchHandler } from '..';
import { googleMaps, mongodb } from '../../../services';
import { RequestNotFoundError, RideNotFoundError } from '../../../errors';
import {
  dumpDriverForActivityMap, dumpRequestForAdmin, dumpRequestsForDashboard,
  dumpRideForDashboard, dumpRidesForDashboard
} from '../../../utils/dump';
import { actionRideCount, getRidePolylines } from '../../../utils/ride';
import { locationValidator } from '../utils/location';

const getRequests = async (req, res) => {
  try {
    const filterParams = validator.validate(
      validator.rules.object().keys({
        location: validator.rules.string().required(),
        status: validator.rules.array().items(validator.rules.number()).required(),
        waitingPaymentConfirmation: validator.rules.boolean()
      }),
      req.query,
    );

    await locationValidator(filterParams.location, req.user);
    if (!filterParams.waitingPaymentConfirmation) {
      filterParams.waitingPaymentConfirmation = { $ne: true };
    }
    const requests = await Requests.find(filterParams)
      .sort({ requestTimestamp: -1 });

    res.json(dumpRequestsForDashboard(requests));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getRequest = async (req, res) => {
  try {
    const { id } = req.params;
    let polyline = null;

    const request = (await Requests
      .findById(id)
      .populate([
        { path: 'rider', select: 'id firstName lastName' }
      ])).toJSON();

    if (!request) {
      throw new RequestNotFoundError('We were unable to fetch the ride information.');
    }

    const googleMapsResult = await googleMaps.client.directions({
      origin: `${request.pickupLatitude},${request.pickupLongitude}`,
      destination: `${request.dropoffLatitude},${request.dropoffLongitude}`,
      units: 'imperial'
    }).asPromise();

    if (googleMapsResult.status === 200 && googleMapsResult.json
      && googleMapsResult.json.status === 'OK' && googleMapsResult.json.routes.length) {
      polyline = googleMapsResult.json.routes[0].overview_polyline.points;
    }

    request.polyline = polyline;

    res.status(200).json(dumpRequestForAdmin(request, req.user.role));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getRides = async (req, res) => {
  try {
    const filterParams = validator.validate(
      validator.rules.object().keys({
        location: validator.rules.string().required(),
        status: validator.rules.array().items(validator.rules.number()).required()
      }),
      req.query
    );
    await locationValidator(filterParams.location, req.user);
    const rides = await Rides.find(filterParams);
    res.json(rides.map(ride => dumpRidesForDashboard(ride)));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getRide = async (req, res) => {
  try {
    const { id } = req.params;
    const ride = await Rides.getRide({ _id: id });
    if (!ride) { throw new RideNotFoundError(); }
    ride.polylines = await getRidePolylines(ride);

    res.json(dumpRideForDashboard(ride, req.user.role));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getDrivers = async (req, res) => {
  try {
    const filterParams = validator.validate(
      validator.rules.object().keys({
        isOnline: validator.rules.boolean().truthy(1).falsy(0),
        isAvailable: validator.rules.boolean().truthy(1).falsy(0),
        locations: validator.rules.array().items(validator.rules.string()),
        activeLocation: validator.rules.string().required()
      }),
      req.query
    );
    await locationValidator(filterParams.activeLocation, req.user);
    if (filterParams.locations) {
      filterParams.locations = {
        $in: filterParams.locations.map(i => new mongodb.Types.ObjectId(i))
      };
    }

    const drivers = await Drivers.find(filterParams).populate(
      { path: 'driverRideList.rideId', model: 'Ride' }
    );

    res.json(drivers.map(actionRideCount).map(dumpDriverForActivityMap));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

export default {
  getRequests,
  getRequest,
  getDrivers,
  getRides,
  getRide
};
