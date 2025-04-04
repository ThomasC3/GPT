import * as Sentry from '@sentry/node';

import {
  Rides, PaymentStatus, Tips, Riders, Locations
} from '../../../models';
import { validator, errorCatchHandler, responseHandler } from '../../../utils';
import { isTipValueValid } from '../../../utils/location';
import {
  confirmTipPayment, captureTipPayment, cancelTipPayment,
  checkTipsAssociatedAndCancelPending
} from '../../../utils/tip';
import { dumpTipPayment } from '../../../utils/dump';
import { ApplicationError } from '../../../errors';
import logger from '../../../logger';
import { stripe, SendGridMailer } from '../../../services';

const createTip = async (req, res) => {
  try {
    const {
      rideId,
      tipAmount
    } = validator.validate(
      validator.rules.object().keys({
        rideId: validator.rules.string().required(),
        tipAmount: validator.rules.number().integer().min(1).required()
      }),
      req.body
    );

    // Validate rideId
    const ride = await Rides.findById(rideId).populate('location rider driver');
    if (!ride) {
      throw new ApplicationError(`Ride with specified id of ${rideId} not found`, 500, 'ride.notFound', { rideId });
    }
    const { location, rider, driver } = ride;

    // Validate tip value according to location
    const validTipValue = isTipValueValid(location, tipAmount);
    if (!location.tipEnabled || !validTipValue) {
      throw new ApplicationError('Invalid driver tip', 400, 'tip.invalid', { rideId });
    }

    // Check if there are succeeded tips associated and cancel pending
    await checkTipsAssociatedAndCancelPending({ rideId });

    // Create tip and paymentIntent
    let tip = {};
    try {
      tip = await Tips.createTip({
        stripeCustomerId: rider.stripeCustomerId,
        tipAmount,
        currency: location.tipInformation.currency,
        statetement: 'Driver tip',
        ride,
        rider,
        driver,
        location
      });
    } catch (error) {
      throw new ApplicationError(
        `Could not create payment intent for ${rider.stripeCustomerId}`,
        500,
        'stripe.paymentIntentFail',
        { stripeCustomerId: rider.stripeCustomerId }
      );
    }

    // Dump tip payment information
    responseHandler(dumpTipPayment(tip), res);
  } catch (error) {
    errorCatchHandler(
      res,
      error,
      error.message || 'We were unable to process your tip request at this time.',
      req.t,
      error.keyError ? error.keyError : 'tip.fail'
    );
  }
};

const confirmTip = async (req, res) => {
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
      throw new ApplicationError('Unable to tip at this time', 409, 'tip.fail');
    }

    const tip = await confirmTipPayment(paymentIntentId, paymentIntentMessageStatus);
    if (!tip) {
      throw new ApplicationError('Tip not found', 500, 'tip.notFound');
    }

    const [, rider, location] = await Promise.all([
      captureTipPayment(tip._id),
      Riders.findById(tip.riderId),
      Locations.findById(tip.locationId)
    ]);

    try {
      await SendGridMailer.sendTipReceipt({
        tip, rider, location, locale: rider.locale
      });
    } catch (error) {
      Sentry.captureException(error);
    }

    responseHandler(
      {
        successMessage: 'We\'ve confirmed and captured your tip successfully.'
      },
      res,
      'We\'ve confirmed and captured your tip successfully.',
      req.t,
      'tip.success'
    );
  } catch (error) {
    logger.log(error);
    errorCatchHandler(res, error, 'Something went wrong. Please try again.', req.t, 'genericFailure');
  }
};

const cancelTip = async (req, res) => {
  try {
    const {
      paymentIntentId
    } = validator.validate(
      validator.rules.object().keys({
        paymentIntentId: validator.rules.string().required()
      }),
      req.body
    );

    let cancelledTip = await Tips.findOne({ paymentIntentId });
    if (cancelledTip) {
      cancelledTip = await cancelTipPayment(cancelledTip._id);
    } else {
      throw new ApplicationError('Tip not found', 500, 'tip.notFound');
    }

    responseHandler(
      {
        successMessage: 'We\'ve cancelled your tip successfully.'
      },
      res,
      'We\'ve cancelled your tip successfully.',
      req.t,
      'tip.cancelSuccess'
    );
  } catch (error) {
    errorCatchHandler(res, error, 'Something went wrong. Please try again.', req.t, 'genericFailure');
  }
};

export default {
  createTip,
  confirmTip,
  cancelTip
};
