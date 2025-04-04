import { Locations, Settings } from '../../../models';
import { validator, errorCatchHandler, responseHandler } from '../../../utils';
import { LocationNotFoundError } from '../../../errors';
import { dumpFluxForRider } from '../../../utils/dump';
import { getCurrentHistoricReading } from '../../../services/timeseries';
import { processFluxService } from '../../../services/rider/metrics';

const getFlux = async (req, res) => {
  try {
    const { id: locationId } = validator.validate(
      validator.rules.object().keys({
        id: validator.rules.string().required()
      }),
      req.params
    );

    const location = await Locations.getLocation(locationId);
    if (!location) {
      throw new LocationNotFoundError('We were unable to fetch this location\'s information.', 'LocationNotFoundError.default');
    }

    const settings = await Settings.getSettings();

    const historicReading = await getCurrentHistoricReading(location._id);
    const flux = await processFluxService(historicReading, location, settings, req);

    responseHandler(dumpFluxForRider(flux), res);
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
  getFlux
};
