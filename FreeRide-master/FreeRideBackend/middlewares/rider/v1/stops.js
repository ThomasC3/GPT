import { Locations, FixedStopStatus, Zones } from '../../../models';
import {
  validator,
  errorCatchHandler,
  responseHandler
} from '../../../utils';
import { dumpRiderFixedStop, dumpStopForRider } from '../../../utils/dump';
import { LocationNotFoundError, LocationError } from '../../../errors';

const getFixedStops = async (req, res) => {
  try {
    const filterParams = validator.validate(
      validator.rules.object().keys({
        latitude: validator.rules.number().unsafe().min(-90).max(90),
        longitude: validator.rules.number().unsafe().min(-180).max(180),
        locationId: validator.rules.string(),
        fixedStops: validator.rules.string(),
        fixedStopNumber: validator.rules.number().min(1).max(3)
      }).and('latitude', 'longitude', 'locationId'),
      req.query
    );

    const { locationId } = filterParams;

    const locationExists = await Locations.getLocation(locationId);
    if (!locationExists) {
      throw new LocationNotFoundError('We were unable to fetch this location\'s information.', 'LocationNotFoundError.fixedStopSearch');
    }

    filterParams.status = FixedStopStatus.enabled;
    filterParams.sort = 'distanceFromRider';
    filterParams.order = 1;
    filterParams.limit = filterParams.fixedStopNumber || 1;
    delete filterParams.fixedStopNumber;
    if (filterParams.fixedStops) {
      filterParams.fixedStops = filterParams.fixedStops.split(',').filter(Boolean);
    }

    const { items: fixedStops } = await Locations.getFixedStops(locationExists._id, filterParams);

    responseHandler(
      fixedStops.map(dumpRiderFixedStop),
      res
    );
  } catch (err) {
    errorCatchHandler(
      res,
      err,
      'Something went wrong. Please try again.',
      req.t,
      'genericFailure'
    );
  }
};

const getStop = async (req, res) => {
  try {
    const queryParams = validator.validate(
      validator.rules.object().keys({
        latitude: validator.rules.number().unsafe().min(-90).max(90),
        longitude: validator.rules.number().unsafe().min(-180).max(180),
        locationId: validator.rules.string(),
        selectedStop: validator.rules.string()
      }).and('latitude', 'longitude', 'locationId'),
      req.query
    );

    const {
      locationId, latitude, longitude, selectedStop
    } = queryParams;

    const location = await Locations.getLocation(locationId);
    if (!location) {
      throw new LocationNotFoundError('We were unable to fetch this location\'s information.', 'LocationNotFoundError.fixedStopSearch');
    }

    const stopCheck = await Locations.withinServiceArea([longitude, latitude], location._id);
    const detectedZone = await Zones.detectZone(location, { longitude, latitude });

    let stop = dumpStopForRider(queryParams);

    if (!stopCheck || !detectedZone) {
      // Stop is not within service area
      return responseHandler({}, res);
    }

    const isFixedStop = (
      detectedZone.isDefault && location.fixedStopEnabled
    ) || detectedZone.fixedStopEnabled;

    if (isFixedStop) {
      const fixedStop = await Zones.getClosestFixedStop(
        detectedZone._id, { longitude, latitude }, selectedStop
      );
      stop = dumpStopForRider(fixedStop);
    }

    responseHandler(
      stop,
      res
    );
  } catch (err) {
    errorCatchHandler(
      res,
      err,
      'Something went wrong. Please try again.',
      req.t,
      'genericFailure'
    );
  }
};

export default {
  getFixedStops,
  getStop
};
