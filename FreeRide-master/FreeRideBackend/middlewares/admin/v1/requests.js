import csv from 'csv';
import { Requests, Locations } from '../../../models';
import { googleMaps } from '../../../services';
import { validator } from '../../../utils';
import { monthRangeLimitCheck } from '../../../utils/check';
import { adminErrorCatchHandler } from '..';
import { RequestNotFoundError } from '../../../errors';
import RequestSerializer from '../utils/RequestSerializer';

const getRequestsParamsValidator = (req, options = {}) => validator.validate(
  validator.rules.object().keys({
    skip: validator.rules.number().integer().min(0),
    limit: options.csv ? validator.rules.number().integer().min(1).allow('') : validator.rules.number().integer().min(1),
    location: validator.rules.string().allow(''),
    status: validator.rules.array().items(validator.rules.number()),
    requestTimestamp: validator.rules.object().keys({
      start: validator.rules.string().allow(''),
      end: validator.rules.string().allow('')
    })
  }),
  req.query
);

const getRequests = async (req, res) => {
  try {
    const filterParams = validator.validate(
      validator.rules.object().keys({
        skip: validator.rules.number().integer().min(0),
        limit: validator.rules.number().integer().min(1),
        location: validator.rules.string(),
        status: validator.rules.array().items(validator.rules.number()),
        createdTimestamp: validator.rules.object().keys({
          start: validator.rules.string().isoDate().allow(''),
          end: validator.rules.string().isoDate().allow('')
        })
      }),
      req.query,
    );

    const rides = await Requests.getRequests(filterParams);
    res.json(rides);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getRequest = async (req, res) => {
  try {
    const { id } = req.params;
    let polyline = null;

    const request = await Requests.getRequest({ _id: id });

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

    res.status(200).json({ ...request, polyline });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getZombieRequests = async (req, res) => {
  try {
    const { location } = validator.validate(
      validator.rules.object().keys({
        location: validator.rules.string()
      }),
      req.query
    );

    const requests = await Requests.zombiesInCity(location);

    res.status(200).json(requests);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const cleanZombieRequests = async (req, res) => {
  try {
    const { location } = validator.validate(
      validator.rules.object().keys({
        location: validator.rules.string()
      }),
      req.body
    );

    const requests = await Requests.cleanZombiesInLocation(location);

    res.status(200).json(requests);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getCsvRequests = async (req, res) => {
  try {
    const filterParams = getRequestsParamsValidator(req, { csv: true });
    monthRangeLimitCheck(filterParams, 'requestTimestamp');

    const locationTimezone = filterParams.location
      ? (await Locations.findById(filterParams.location))?.timezone
      : null;

    const cursor = Requests.getRequestsCursor(filterParams, locationTimezone);
    const transformer = RequestSerializer.adminRequestToCsv;

    res.setHeader('Content-Disposition', `attachment; filename="download-${Date.now()}.csv"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    res.writeHead(200, { 'Content-Type': 'text/csv' });
    res.flushHeaders();

    const columns = [
      'index', 'passengers', 'isADA', 'waitingPaymentConfirmation',
      'pickupAddress', 'pickupLatitude', 'pickupLongitude',
      'dropoffAddress', 'dropoffLatitude', 'dropoffLongitude',
      'status', 'cancelledBy', 'riderCancelled', 'adminCancelled',
      'unavailabilityCancelled', 'requestTimestamp',
      'cancelTimestamp', 'lastRetryTimestamp', 'processingTime',
      'cancelTime', 'riderFirstName', 'riderLastName', 'riderEmail',
      'riderDob', 'locationName', 'ridePrice', 'pricePerHead',
      'totalPrice', 'currency'
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

export default {
  getRequests,
  getRequest,
  getZombieRequests,
  cleanZombieRequests,
  getCsvRequests
};
