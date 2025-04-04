import { validator } from '../../../utils';
import { getAdminLocations } from '../utils/location';
import { vehicleAttributeStats, eventHour, mergeDriverHourData } from '../../../utils/events';
import { adminErrorCatchHandler } from '..';

const getDriverParamsValidator = req => validator.validate(
  validator.rules.object().keys({
    targetType: validator.rules.string().valid('Driver'),
    createdTimestamp: validator.rules.object().keys({
      start: validator.rules.string().allow(''),
      end: validator.rules.string().allow('')
    })
  }),
  req.query
);

const getVehicleParamsValidator = req => validator.validate(
  validator.rules.object().keys({
    targetType: validator.rules.string().valid('Vehicle'),
    createdTimestamp: validator.rules.object().keys({
      start: validator.rules.string().allow(''),
      end: validator.rules.string().allow('')
    })
  }),
  req.query
);

const getDriverHourStats = async (req, res) => {
  try {
    const filterParams = getDriverParamsValidator(req);

    const locations = await getAdminLocations(req.user);

    const {
      locationHours: loginHours
    } = await eventHour({ ...filterParams, locations: locations.map(loc => loc._id) }, ['LOCATION SET'], ['LOGOUT']);

    const {
      locationHours: availableHours
    } = await eventHour({ ...filterParams, locations: locations.map(loc => loc._id) }, ['AVAILABLE'], ['UNAVAILABLE']);

    const driverHours = mergeDriverHourData(locations, loginHours, availableHours);
    res.status(200).json({
      driverHours
    });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getVehicleStats = async (req, res) => {
  try {
    const filterParams = getVehicleParamsValidator(req);

    const locations = await getAdminLocations(req.user);

    filterParams.targetType = 'Vehicle';

    const vehicleStats = await vehicleAttributeStats(
      { ...filterParams, locations: locations.map(loc => loc._id) }
    );

    res.status(200).json({ vehicleStats });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

export default {
  getDriverHourStats,
  getVehicleStats
};
