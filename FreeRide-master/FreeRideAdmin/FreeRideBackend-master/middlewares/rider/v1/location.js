import GoogleMapsClient from '@google/maps';
import {
  Locations, Riders, FareTypes
} from '../../../models';
import {
  validator, dump,
  errorCatchHandler,
  responseHandler
} from '../../../utils';
import {
  meetsAgeRequirement,
  meetsFreeRideAgeRequirement
} from '../../../utils/check';
import { google } from '../../../config';
import {
  LocationNotFoundError,
  RiderNotFoundError,
  GoogleMapsError
} from '../../../errors';
import { determinePaymentSourceForRideRequest } from '../../../utils/ride';
import { translator } from '../../../utils/translation';


const googleMapsClient = GoogleMapsClient.createClient({
  key: google.apiKey,
  Promise
});

const getLocationById = async (req, res) => {
  const {
    params: { id }
  } = req;
  const { _id: riderId } = req.user;

  try {
    const rider = await Riders.findById(riderId);

    const location = await Locations.findOne({
      _id: id,
      $or: [
        { organization: rider.organization },
        { organization: null }
      ]
    });

    if (!location) {
      throw new LocationNotFoundError('We were unable to fetch this location information.', 'location.fetchLocationInfoLocationIdNotFound');
    }

    responseHandler(
      dump.dumpLocation({
        ...location.toJSON(),
        _id: location._id,
        meetsAgeRequirement: meetsAgeRequirement(location, rider)
      }, req.language),
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

const getLocations = async (req, res) => {
  try {
    const { _id: riderId } = req.user;

    const filterParams = validator.validate(
      validator.rules.object().keys({
        latitude: validator.rules.number().unsafe().min(-90).max(90),
        longitude: validator.rules.number().unsafe().min(-180).max(180)
      }).and('latitude', 'longitude'),
      req.query
    );

    const rider = await Riders.findById(riderId);

    if (!rider) {
      throw new RiderNotFoundError(`Rider with id of ${riderId} not found`, 'rider.notFound', { riderId });
    }

    if (!filterParams.latitude || !filterParams.longitude) {
      const response = await googleMapsClient.geocode({
        address: rider.zip
      }).asPromise();


      if (response.json.results.length === 0) {
        throw new GoogleMapsError('Failed to retrieve lat and lng from users zip', 'googleMapsClient.locationFromZipFail');
      }

      filterParams.latitude = response.json.results[0].geometry.location.lat;
      filterParams.longitude = response.json.results[0].geometry.location.lng;
    }

    const activeLocationsFilter = {
      isActive: true,
      $or: [
        { organization: rider.organization },
        { organization: null }
      ]
    };

    const locations = await Locations.getNearest(filterParams, activeLocationsFilter);

    responseHandler(
      locations.map(
        location => dump.dumpLocation({
          ...location,
          meetsAgeRequirement: meetsAgeRequirement(location, rider)
        }, req.language)
      ),
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

const getPaymentOptions = async (req, res) => {
  const {
    params: { id: locationId },
    user: { _id: riderId }
  } = req;
  try {
    const filterParams = validator.validate(
      validator.rules.object().keys({
        originLatitude: validator.rules.number().unsafe().min(-90).max(90)
          .required(),
        originLongitude: validator.rules.number().unsafe().min(-180).max(180)
          .required(),
        destinationLatitude: validator.rules.number().unsafe().min(-90).max(90)
          .required(),
        destinationLongitude: validator.rules.number().unsafe().min(-180).max(180)
          .required()
      }),
      req.query,
    );
    const location = await Locations.findOne({ _id: locationId });
    const locationInfo = dump.dumpLocation(location.toJSON(), req.language);

    const rider = await Riders.findOne({ _id: riderId });

    const paymentSource = await determinePaymentSourceForRideRequest({
      locationId,
      origin: {
        latitude: filterParams.originLatitude,
        longitude: filterParams.originLongitude
      },
      destination: {
        latitude: filterParams.destinationLatitude,
        longitude: filterParams.destinationLongitude
      }
    });

    const poweredByCopy = paymentSource.poweredBy
      ? translator(req.t, 'poweredBy.copy', { poweredBy: paymentSource.poweredBy })
      : '';

    let chargeInformation = {
      ...FareTypes.paymentDisabled,
      paymentInformation: null,
      poweredByCopy
    };

    if (paymentSource.pwywEnabled || paymentSource.paymentEnabled) {
      const freeRide = meetsFreeRideAgeRequirement(locationInfo, rider);

      chargeInformation = {
        ...FareTypes.freeAgeRestriction,
        paymentInformation: null,
        poweredByCopy
      };

      if (!freeRide) {
        const { pwywInformation } = paymentSource.toJSON();
        chargeInformation = (
          paymentSource.pwywEnabled ? {
            ...FareTypes.pwyw,
            poweredByCopy,
            paymentInformation: {
              ...pwywInformation,
              pwywCopy: locationInfo.pwywCopy
            }
          } : {
            ...FareTypes.fixedPayment,
            poweredByCopy,
            paymentInformation: paymentSource.paymentInformation
          }
        );
      }
    }

    responseHandler(chargeInformation, res);
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
  getLocationById,
  getLocations,
  getPaymentOptions
};
