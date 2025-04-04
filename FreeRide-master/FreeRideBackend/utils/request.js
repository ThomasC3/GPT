import * as Sentry from '@sentry/node';
import logger from '../logger';
import {
  Requests, PaymentStatus, RequestStatus, Rides, RideStatus
} from '../models';
import { SendGridMailer, stripe } from '../services';
import { ApplicationError } from '../errors';

const CANCEL_STATE = PaymentStatus.properties[PaymentStatus.canceled].name;
const REQUIRES_CAPTURE_STATE = PaymentStatus.properties[PaymentStatus.requires_capture].name;
const CAPTURED_STATE = PaymentStatus.properties[PaymentStatus.succeeded].name;
const RIDE_ACTIVE_STATUS = [
  RideStatus.RideInQueue,
  RideStatus.NextInQueue,
  RideStatus.DriverEnRoute,
  RideStatus.DriverArrived,
  RideStatus.RideInProgress
];

export const cancelRequestPayment = async (requestId) => {
  let cancelledRideRequest = await Requests.findOne({ _id: requestId });

  if (cancelledRideRequest && cancelledRideRequest.paymentInformation) {
    const { paymentIntentId, status } = cancelledRideRequest.paymentInformation;
    if (status !== CANCEL_STATE) {
      if (paymentIntentId) {
        const paymentIntent = await stripe.cancelPaymentIntent(paymentIntentId);
        cancelledRideRequest = await Requests.updateRequest(
          { 'paymentInformation.paymentIntentId': paymentIntent.id },
          { $set: { 'paymentInformation.status': paymentIntent.status } }
        );
      } else {
        cancelledRideRequest = await Requests.updateRequest(
          { _id: requestId },
          { $set: { 'paymentInformation.status': CANCEL_STATE } }
        );
      }
    }
  }
  return cancelledRideRequest;
};

export const captureRequestPayment = async (requestId) => {
  let capturedRequest = await Requests.findOne({ _id: requestId });
  if (capturedRequest && capturedRequest.paymentInformation) {
    const { paymentIntentId, status } = capturedRequest.paymentInformation;
    if (status === REQUIRES_CAPTURE_STATE) {
      let addSet = {};
      if (capturedRequest.paymentInformation.isPromocodeValid) {
        addSet = { 'paymentInformation.promocodeUsed': true };
      }
      if (paymentIntentId) {
        const paymentIntent = await stripe.captureFunds(paymentIntentId);
        capturedRequest = await Requests.updateRequest(
          { 'paymentInformation.paymentIntentId': paymentIntent.id },
          { $set: { 'paymentInformation.status': paymentIntent.status, ...addSet } }
        );
      } else {
        capturedRequest = await Requests.updateRequest(
          { _id: requestId },
          { $set: { 'paymentInformation.status': CAPTURED_STATE, ...addSet } }
        );
      }
    }
  }
  return capturedRequest;
};

export const requestAlreadyProcessed = async (request_) => {
  let request = await Requests.findOne({ _id: request_._id });
  if (request.status !== 100 || request.processing) {
    return { alreadyProcessed: true, updatedRequest: request };
  }
  const requestHasRide = await Rides.findOne({ request: request_._id });
  if (requestHasRide) {
    request = await Requests.findOneAndUpdate(
      { _id: request_._id, status: RequestStatus.RideRequested },
      { $set: { status: RequestStatus.RequestAccepted, processing: false } },
      { new: true }
    );
    return { alreadyProcessed: true, updatedRequest: request };
  }
  const riderHasRide = await Rides.findOne(
    { rider: request_.rider, status: { $in: RIDE_ACTIVE_STATUS } }
  );
  if (riderHasRide) {
    request = await Requests.findOneAndUpdate(
      { _id: request_._id, status: RequestStatus.RideRequested },
      { $set: { status: RequestStatus.RequestCancelled, processing: false, cancelledBy: 'DUPLICATE_REQUEST' } },
      { new: true }
    );
    return { alreadyProcessed: true, updatedRequest: request };
  }
  request = await Requests.findOneAndUpdate(
    { _id: request._id },
    { $set: { processing: true } },
    { new: true, upsert: false }
  );
  return { alreadyProcessed: false, updatedRequest: request };
};

export const requestCancelled = async (request_) => {
  const request = await Requests.findOne({ _id: request_._id });
  if (!request) {
    return true;
  }
  return request.status === RequestStatus.RequestCancelled;
};

export const createPaymentIntentForRequest = async ({
  rider, location, requestInfo
}) => {
  try {
    const { paymentInformation } = requestInfo;
    const paymentIntent = await stripe.createPaymentIntent(
      rider.stripeCustomerId,
      paymentInformation.totalPrice,
      paymentInformation.currency
    );

    await SendGridMailer.sendChargeHold({
      paymentInformation,
      confirmationTimestamp: paymentIntent.created,
      rider,
      request: requestInfo,
      location: location.toJSON(),
      locale: rider.locale
    })
      .then((data) => {
        logger.info(data);
      })
      .catch((err) => {
        Sentry.captureException(err);
      });

    if (!paymentIntent?.id || !paymentIntent.client_secret) {
      throw new Error('Could not create payment intent');
    }

    return paymentIntent;
  } catch (error) {
    Sentry.captureException(error);
    throw new ApplicationError(
      `Could not create payment intent for ${rider.stripeCustomerId}`,
      500,
      'stripe.paymentIntentFail',
      { stripeCustomerId: rider.stripeCustomerId }
    );
  }
};

export default {
  cancelRequestPayment,
  captureRequestPayment,
  requestAlreadyProcessed,
  requestCancelled
};
