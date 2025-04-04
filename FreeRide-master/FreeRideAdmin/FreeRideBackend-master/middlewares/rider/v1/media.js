import { Locations, Riders } from '../../../models';
import {
  validator, dump,
  errorCatchHandler,
  responseHandler
} from '../../../utils';
import { LocationNotFoundError } from '../../../errors';
import { fetchAllowedAdsForRider } from '../../../utils/digitalAds';


const getMedia = async (req, res) => {
  const { location: locationId } = validator.validate(
    validator.rules.object().keys({
      location: validator.rules.string().required()
    }),
    req.query,
  );
  const { _id: riderId } = req.user;

  try {
    const rider = await Riders.findById(riderId);

    const location = await Locations.findOne({
      _id: locationId,
      $or: [
        { organization: rider.organization },
        { organization: null }
      ]
    });

    if (!location) {
      throw new LocationNotFoundError('We were unable to fetch this location information.', 'location.fetchLocationInfoLocationIdNotFound');
    }

    const mediaList = await fetchAllowedAdsForRider(location, rider);

    responseHandler(
      { mediaList: mediaList.map(dump.dumpMediaItemForRider) },
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
  getMedia
};
