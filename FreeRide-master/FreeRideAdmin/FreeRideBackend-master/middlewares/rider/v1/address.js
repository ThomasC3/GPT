import {
  dump, validator,
  errorCatchHandler,
  responseHandler
} from '../../../utils';
import { googleMaps } from '../../../services';
import { Locations } from '../../../models';
import { LocationNotFoundError } from '../../../errors';

const search = async (req, res) => {
  try {
    if (req.query.latitude && req.query.longitude) {
      const precision = 1000000000;

      req.query.latitude = Math.round(parseFloat(req.query.latitude) * precision) / precision;
      req.query.longitude = Math.round(parseFloat(req.query.longitude) * precision) / precision;
    }

    const searchParams = validator.validate(
      validator.rules.object().keys({
        location: validator.rules.string().required(),
        name: validator.rules.string(),
        latitude: validator.rules.number().min(-90).max(90),
        longitude: validator.rules.number().min(-180).max(180)
      })
        .without('name', ['latitude', 'longitude'])
        .or('name', 'latitude')
        .or('name', 'longitude'),
      req.query,
    );

    const location = await Locations.findById(searchParams.location);

    if (!location) {
      throw new LocationNotFoundError('We were unable to find an available address for your location.', 'LocationNotFoundError.address');
    }

    let addresses = null;
    let coordinates = null;

    if (searchParams.latitude && searchParams.longitude) {
      coordinates = [searchParams.latitude, searchParams.longitude];
    } else {
      [[coordinates]] = location.serviceArea.coordinates;
      coordinates = [coordinates[1], coordinates[0]];
    }

    if (searchParams.name) {
      addresses = await googleMaps.client.placesNearby({
        location: coordinates,
        keyword: searchParams.name,
        rankby: 'distance'
      }).asPromise();
    } else {
      addresses = await googleMaps.client.reverseGeocode({
        latlng: coordinates
      }).asPromise();
    }

    addresses = addresses.json.results.map(dump.dumpAddress);

    addresses = await Promise.all(addresses.map(address => Locations.findOne({
      _id: searchParams.location,
      serviceArea: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [address.longitude, address.latitude]
          }
        }
      }
    })
      .then(locationExists => ({
        ...address,
        isValid: !!locationExists
      }))));


    responseHandler(
      addresses,
      res
    );
  } catch (error) {
    errorCatchHandler(
      res,
      error,
      'Something went wrong. Please try again.',
      req.t,
      'genericFailure'
    );
  }
};

export default {
  search
};
