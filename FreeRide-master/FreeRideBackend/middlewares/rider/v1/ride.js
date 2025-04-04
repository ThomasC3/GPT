import moment from 'moment-timezone';
import {
  Rides,
  Requests,
  PaymentStatus,
  Riders,
  Locations
} from '../../../models';
import RequestStatus from '../../../models/RequestStatus';
import RideStatus from '../../../models/RideStatus';
import {
  validator,
  errorCatchHandler,
  responseHandler
} from '../../../utils';
import {
  dumpPaymentIntent,
  dumpRequestForRider,
  dumpRideForRider
} from '../../../utils/dump';
import { websocket, stripe } from '../../../services';
import {
  isPoolingEnabled, fixAndUpdateEtas, setNonPoolingEtas, poolingRideTag,
  stopsBeforePickupCount
} from '../../../utils/ride';
import { cancelRequestPayment, createPaymentIntentForRequest } from '../../../utils/request';
import { addPromocodeStatus } from '../../../utils/promocode';
import { RideNotFoundError, ApplicationError } from '../../../errors';
import RequestFactory from '../../../services/RequestFactory';
import { translator } from '../../../utils/translation';

const ACTIVE_NO_PICKUP_STATUS = [
  RideStatus.RideInQueue,
  RideStatus.NextInQueue,
  RideStatus.DriverEnRoute,
  RideStatus.DriverArrived
];

const ACTIVE_STATUS = [
  ...ACTIVE_NO_PICKUP_STATUS,
  RideStatus.RideInProgress
];

const PAYMENT_SUCCEEDED_STATUS = PaymentStatus.properties[PaymentStatus.succeeded].name;

const request = async (req, res) => {
  try {
    const { _id: riderId } = req.user;

    const { skipPaymentIntentCreation = false, ...requestBody } = req.body;
    const requestFactory = new RequestFactory(
      riderId,
      requestBody,
      req,
      !skipPaymentIntentCreation
    );

    await requestFactory.createRequest();

    const requestInfo = await addPromocodeStatus(
      requestFactory.request, requestFactory.promocodeStatus
    );

    responseHandler(
      dumpRequestForRider(requestInfo),
      res
    );
  } catch (error) {
    errorCatchHandler(
      res,
      error,
      error.message || 'We were unable to process your ride request at this time.',
      req.t,
      error.keyError ? error.keyError : 'request.fail'
    );
  }
};

const approveRequestPayment = async (req, res) => {
  try {
    const { _id: riderId } = req.user;

    const rider = await Riders.findOne({ _id: riderId });

    const requestInfo = await Requests.findOne({
      rider: riderId,
      status: RequestStatus.RideRequested
    });
    if (!requestInfo) {
      throw new ApplicationError(
        'No active request found',
        404,
        'request.notFound'
      );
    }

    if (
      requestInfo.paymentInformation
      && requestInfo.paymentInformation.paymentIntentId
    ) {
      return responseHandler(dumpRequestForRider(requestInfo), res);
    }

    const location = await Locations.findOne({ _id: requestInfo.location });
    const paymentIntent = await createPaymentIntentForRequest({
      rider,
      location,
      requestInfo
    });

    const paymentIntentInfo = dumpPaymentIntent(paymentIntent);

    const updatedRequest = await Requests.updateRequest(
      { _id: requestInfo._id },
      {
        $set: {
          paymentInformation: {
            ...requestInfo.paymentInformation.toObject(),
            ...paymentIntentInfo
          }
        }
      }
    );

    return responseHandler(dumpRequestForRider(updatedRequest), res);
  } catch (error) {
    return errorCatchHandler(res, error, 'Something went wrong. Please try again.', req.t, 'genericFailure');
  }
};

const cancel = async (req, res) => {
  try {
    const { _id } = req.user;

    const ride = await Rides.findOne({ rider: _id, status: { $in: ACTIVE_NO_PICKUP_STATUS } });

    let findParams;
    let cancelledBy;
    if (ride) {
      await Rides.cancelByRider(ride.request, _id);
      findParams = { _id: ride.request };
      cancelledBy = 'RIDER';
    } else {
      findParams = { rider: _id, status: RequestStatus.RideRequested };
      cancelledBy = 'RIDER_ON_REQUEST';
    }
    const cancelledRequest = await Requests.updateRequest(
      findParams,
      {
        $set: {
          status: RequestStatus.RequestCancelled,
          processing: false,
          cancelTimestamp: Date.now(),
          cancelledBy
        }
      }
    );

    await cancelRequestPayment(cancelledRequest._id);

    if (cancelledRequest) {
      const paidRequest = !!cancelledRequest.paymentInformation;
      const paymentConfirmed = cancelledRequest.waitingPaymentConfirmation === false;
      if (!paidRequest || (paidRequest && paymentConfirmed)) {
        const socketIds = await websocket.getUserSocketIds(cancelledRequest.rider.toString(), 'rider');


        websocket.emitWebsocketEventToSocketIds(
          'request-completed',
          socketIds,
          { message: translator(req.t, 'request.cancel') || 'You\'ve chosen to cancel this request.' }
        );
      }

      responseHandler(
        {
          successMessage: 'We\'ve cancelled your request successfully.'
        },
        res,
        'We\'ve cancelled your request successfully.',
        req.t,
        'request.cancelSuccess'
      );
    }
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

const confirmPayment = async (req, res) => {
  try {
    const {
      paymentIntentId
    } = validator.validate(
      validator.rules.object().keys({
        paymentIntentId: validator.rules.string(),
        paymentIntentStatus: validator.rules.number()
      }),
      req.body
    );

    // TODO: Move to stripe service
    const paymentIntent = await stripe.stripeClient.paymentIntents.retrieve(
      paymentIntentId
    );
    const paymentIntentMessageStatus = paymentIntent.status;

    if (
      paymentIntentMessageStatus !== PaymentStatus.properties[PaymentStatus.requires_capture].name
    ) {
      throw new ApplicationError('Unable to request ride at this time', 409, 'request.fail');
    }

    const updatedRequest = await Requests.updateRequest(
      { 'paymentInformation.paymentIntentId': paymentIntentId },
      {
        $set: {
          'paymentInformation.status': paymentIntentMessageStatus,
          waitingPaymentConfirmation: false
        }
      }
    );

    if (paymentIntentId && !updatedRequest) {
      throw new ApplicationError('Request not found', 500, 'request.notFound');
    }

    responseHandler(
      {
        successMessage: 'We\'ve confirmed payment successfully.'
      },
      res,
      'We\'ve confirmed payment successfully.',
      req.t,
      'stripe.paymentConfirmSuccess'
    );
  } catch (error) {
    errorCatchHandler(res, error, 'Something went wrong. Please try again.', req.t, 'genericFailure');
  }
};

const rate = async (req, res) => {
  try {
    // If req.body.feedback isEmpty or isNull just delete this option to pass validator isString
    if (!req.body.feedback) delete req.body.feedback;
    const ride = validator.validate(
      validator.rules.object().keys({
        ride: validator.rules.string().required(),
        rating: validator.rules.number().integer().min(1).max(5)
          .required(),
        feedback: validator.rules.string()
      }),
      req.body
    );

    const result = await Rides.updateRide(
      ride.ride,
      {
        ratingForDriver: ride.rating,
        feedbackForDriver: ride.feedback
      }
    );

    responseHandler(
      {
        ride: result._id,
        feedback: result.feedbackForDriver,
        rating: result.ratingForDriver,
        successMessage: 'Thank you for your feedback!'
      },
      res,
      'Thank you for your feedback!',
      req.t,
      'feedbackByRider.success'
    );
  } catch (error) {
    errorCatchHandler(
      res,
      error,
      'We were unable to rate this ride at this time.',
      req.t,
      'feedbackByRider.fail'
    );
  }
};

const getDetails = async (req, res) => {
  try {
    const { id: rideId } = validator.validate(
      validator.rules.object().keys({
        id: validator.rules.string().required()
      }),
      req.params
    );

    const ride = await Rides.findOne({
      _id: rideId
    }).populate([
      { path: 'driver' },
      { path: 'requestMessages', model: 'Message' },
      { path: 'request', select: 'paymentInformation' },
      {
        path: 'tips',
        match: { status: PAYMENT_SUCCEEDED_STATUS },
        select: 'total currency'
      }
    ]);

    if (!ride) {
      throw new RideNotFoundError('Ride not found', 'ride.notFoundSimple');
    }

    responseHandler(
      dumpRideForRider(ride),
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

const getHistory = async (req, res) => {
  try {
    const filterParams = validator.validate(
      validator.rules.object().keys({
        sort: validator.rules.string(),
        order: validator.rules.string().regex(/^(asc|desc)$/),
        skip: validator.rules.number().integer().min(1),
        limit: validator.rules.number().integer().min(1)
      }),
      req.query
    );
    const { _id: riderId } = req.user;
    const rides = await Rides.getHistory({
      rider: riderId,
      limit: 10,
      status: RideStatus.RideComplete,
      order: 'desc',
      ...filterParams
    });

    responseHandler(
      rides.map(dumpRideForRider),
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

const getCurrentRide = async (req, res) => {
  try {
    const { _id: riderId } = req.user;

    const currentRide = await Rides
      .findOne({ rider: riderId, status: { $in: ACTIVE_STATUS } })
      .populate('driver')
      .populate({ path: 'requestMessages', model: 'Message' })
      .populate({ path: 'request', select: 'paymentInformation' })
      .populate({
        path: 'tips',
        match: { status: PAYMENT_SUCCEEDED_STATUS },
        select: 'total currency'
      });

    if (!currentRide) {
      // DO NOT TRANSLATE - FILTERED BY APP
      throw new RideNotFoundError(`There are no active rides for rider ${riderId}`, 'ride.noActiveRidesForRider', { riderId });
    }

    responseHandler(dumpRideForRider(currentRide), res);
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

const getContext = async (req, res) => {
  try {
    const { id: rideId } = validator.validate(
      validator.rules.object().keys({
        id: validator.rules.string().required()
      }),
      req.params
    );

    const ride = await Rides.findById(rideId);

    if (!ride) {
      throw new ApplicationError(`Ride with specified id of ${rideId} not found`, 500, 'ride.notFound', { rideId });
    }

    if (!ACTIVE_NO_PICKUP_STATUS.includes(ride.status)) {
      return responseHandler({}, res);
    }

    const etaResponse = {};
    const withPooling = await isPoolingEnabled(ride);
    if (withPooling) {
      fixAndUpdateEtas(ride.driver); // Will have updated by next call

      const pooling = await poolingRideTag(rideId);
      const eta = moment.utc(ride.eta * 1000).diff(moment.utc(), 'minutes');

      etaResponse.pooling = pooling;
      etaResponse.eta = eta < 0 ? 1 : eta + 1;
    } else {
      const { minutes: eta, timestamp: etaTimestamp } = await setNonPoolingEtas(ride._id);

      const hasInitialEta = ride.initialEta;
      if (!hasInitialEta) {
        ride.initialEta = etaTimestamp;
        await ride.save();
      }
      etaResponse.eta = (!eta || eta < 0) ? 1 : eta + 1;
    }

    const { stopCount } = await stopsBeforePickupCount(rideId);

    etaResponse.stops = stopCount;

    return responseHandler(etaResponse, res);
  } catch (error) {
    return errorCatchHandler(
      res,
      error,
      'Something went wrong. Please try again.',
      req.t,
      'genericFailure'
    );
  }
};

export default {
  request,
  cancel,
  rate,
  getDetails,
  getHistory,
  getContext,
  getCurrentRide,
  confirmPayment,
  approveRequestPayment
};
