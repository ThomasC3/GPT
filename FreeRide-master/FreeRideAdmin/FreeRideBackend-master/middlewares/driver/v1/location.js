import { Locations, Drivers, Zones } from '../../../models';
import { validator, errorCatchHandler } from '../../../utils';
import { dumpLocationForDriver } from '../../../utils/dump';
import {
  LocationNotFoundError
} from '../../../errors';


const getLocationById = async (req, res) => {
  const {
    params: { id }
  } = req;

  try {
    const result = await Locations.getLocation(id);
    if (!result) {
      throw new LocationNotFoundError();
    }
    const zones = await Zones.getZones({ location: result._id, isDefault: false });
    res.status(200).json(dumpLocationForDriver({ ...result.toObject(), zones }, req.language));
  } catch (err) {
    errorCatchHandler(res, err, 'We were unable to fetch this location information.');
  }
};

const getLocations = async (req, res) => {
  try {
    const { _id } = req.user;
    const driver = await Drivers.getDriver({ _id });

    const filterParams = validator.validate(
      validator.rules.object().keys({
        latitude: validator.rules.number().unsafe().min(-90).max(90),
        longitude: validator.rules.number().unsafe().min(-180).max(180)
      }).and('latitude', 'longitude'),
      req.query,
    );

    const activeLocationsFilter = { _id: { $in: driver.locations }, isActive: true };
    let locations = await Locations.getNearest(filterParams, activeLocationsFilter);

    locations = await Promise.all(locations.map(async (location) => {
      const zones = await Zones.getZones({ location: location._id, isDefault: false });
      return { ...location, zones };
    }));

    if (!locations || locations.length === 0) {
      throw new LocationNotFoundError();
    }

    res.status(200).json(
      locations.map(
        location => dumpLocationForDriver(location, req.language)
      )
    );
  } catch (err) {
    errorCatchHandler(res, err, 'We were unable to fetch any locations at this time.');
  }
};

export default {
  getLocationById,
  getLocations
};
