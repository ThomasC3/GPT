import * as Sentry from '@sentry/node';
import { Riders, Locations, Promocodes } from '../../../models';
import {
  errorCatchHandler,
  dump, validator,
  responseHandler
} from '../../../utils';
import { promocodeValidity } from '../../../utils/check';
import {
  RiderNotFoundError,
  StripeCustomerError,
  StripeSetupError,
  StripePaymentMethodError,
  LocationNotFoundError,
  LocationError,
  InvalidPromocodeError
} from '../../../errors';
import { stripe, Quote } from '../../../services';
import { translator } from '../../../utils/translation';
import { determinePaymentSourceForRideRequest } from '../../../utils/ride';

const setStripeCustomerId = async (riderInfo) => {
  let rider = riderInfo;
  if (!rider.stripeCustomerId) {
    let stripeCustomerId;
    try {
      stripeCustomerId = await stripe.createCustomer(rider);
    } catch (error) {
      Sentry.captureException(error);
      throw new StripeCustomerError('Could not create Stripe customer', 'stripe.createCustomerFail');
    }
    rider = await Riders.updateRider(rider._id, { stripeCustomerId });
  }
  return rider;
};

const getPaymentSettings = async (req, res) => {
  try {
    const { _id: riderId } = req.user;
    const { locationId } = validator.validate(
      validator.rules.object().keys({
        locationId: validator.rules.string().required()
      }),
      req.query
    );

    let rider = await Riders.findById(riderId).populate('promocode');

    if (!rider) {
      throw new RiderNotFoundError(`Rider with id of ${riderId} not found`, 'rider.notFound', { riderId });
    }

    await setStripeCustomerId(rider);
    rider = await Riders.findById(riderId).populate('promocode');
    const { promocode } = rider;

    const paymentMethodList = await stripe.getPaymentMethods(rider.stripeCustomerId);

    const stripePaymentMethods = paymentMethodList.map(dump.dumpPaymentMethod);

    const promocodeStatus = await promocodeValidity(promocode?._id, locationId, riderId);
    if (promocodeStatus?.message) {
      promocodeStatus.message = translator(
        req.t,
        `PromocodeStatus.${promocodeStatus.statusType}`
      ) || promocodeStatus.message;
    }

    responseHandler(
      dump.dumpPaymentSettings(rider, stripePaymentMethods, promocodeStatus),
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

const setupPaymentMethod = async (req, res) => {
  try {
    const { _id: riderId } = req.user;

    let rider = await Riders.findById(riderId);

    if (!rider) {
      throw new RiderNotFoundError(`Rider with id of ${riderId} not found`, 'rider.notFound', { riderId });
    }

    rider = await setStripeCustomerId(rider);

    await stripe.clearPaymentMethods(rider.stripeCustomerId);

    const setupIntent = await stripe.createSetupIntent(rider.stripeCustomerId);
    if (!setupIntent?.client_secret) {
      throw new StripeSetupError(
        `Could not create setup intent for ${rider.stripeCustomerId}`,
        'stripe.setupIntentFail',
        { stripeCustomerId: rider.stripeCustomerId }
      );
    }
    responseHandler(
      { clientSecret: setupIntent.client_secret },
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

const getQuote = async (req, res) => {
  try {
    const { _id: riderId } = req.user;

    const {
      locationId, passengers, pwywValue, ...filterParams
    } = validator.validate(
      validator.rules.object().keys({
        locationId: validator.rules.string().required(),
        passengers: validator.rules.number().required(),
        originLatitude: validator.rules.number().unsafe().min(-90).max(90)
          .required(),
        originLongitude: validator.rules.number().unsafe().min(-180).max(180)
          .required(),
        destinationLatitude: validator.rules.number().unsafe().min(-90).max(90)
          .required(),
        destinationLongitude: validator.rules.number().unsafe().min(-180).max(180)
          .required(),
        pwywValue: validator.rules.number()
      }),
      req.query
    );

    const rider = await Riders.findById(riderId).populate('promocode');

    if (!rider) {
      throw new RiderNotFoundError(`Rider with id of ${riderId} not found`, 'rider.notFound', { riderId });
    }

    const location = await Locations.findById(locationId);

    if (!location) {
      throw new LocationNotFoundError('Location not found.', 'location.notFound', { locationId });
    }

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

    if (!paymentSource.paymentEnabled && !paymentSource.pwywEnabled) {
      throw new LocationError(
        `Could not retrieve quote for Location ${location.name}`,
        'quote.locationNotFound',
        { locationName: location.name }
      );
    }

    const riderHasPromocode = rider.promocode;
    const usePromocode = !paymentSource.pwywEnabled || pwywValue === paymentSource.pwywBasePrice;
    let promocodeStatus;
    if (usePromocode && riderHasPromocode) {
      promocodeStatus = await promocodeValidity(rider.promocode._id, location._id, rider._id);
      if (promocodeStatus?.message) {
        promocodeStatus.message = translator(
          req.t,
          `PromocodeStatus.${promocodeStatus.statusType}`
        ) || promocodeStatus.message;
      }
    }

    const chargeInformation = paymentSource.pwywEnabled ? paymentSource.pwywInformation : paymentSource.paymentInformation;
    const paymentType = paymentSource.pwywEnabled ? 'pwyw' : 'fixedPrice';
    const quote = new Quote(
      {
        ...chargeInformation.toJSON(),
        heads: passengers,
        promocode: promocodeStatus?.valid ? rider.promocode : null,
        paymentType,
        // PWYW specific
        pwywValue: paymentSource.pwywEnabled ? pwywValue : null
      }
    );

    let quoteResult = {
      totalPrice: quote.totalPrice,
      ridePrice: chargeInformation.ridePrice,
      pricePerHead: chargeInformation.pricePerHead,
      capEnabled: chargeInformation.capEnabled,
      priceCap: chargeInformation.priceCap,
      currency: chargeInformation.currency
    };

    if (usePromocode && riderHasPromocode) {
      const {
        valid: isPromocodeValid,
        message: promocodeInvalidMessage,
        promocodeUsesLeft,
        promocodeUsesMax,
        promocodeExpiryDate
      } = promocodeStatus;

      quoteResult = {
        ...quoteResult,
        totalWithoutDiscount: isPromocodeValid ? quote.totalCapped : null,
        discount: isPromocodeValid ? quote.discountValue : null,
        promocodeCode: rider.promocode.code,
        promocodeName: rider.promocode.name,
        promocodeId: rider.promocode._id,
        isPromocodeValid,
        promocodeInvalidMessage,
        promocodeUsesLeft,
        promocodeUsesMax,
        promocodeExpiryDate,
        pwywValue
      };
    }

    responseHandler(
      dump.dumpPaymentInformation(quoteResult),
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

const removePaymentMethod = async (req, res) => {
  try {
    const { _id: riderId } = req.user;
    const { locationId } = validator.validate(
      validator.rules.object().keys({
        locationId: validator.rules.string().required()
      }),
      req.query
    );

    let rider = await Riders.findById(riderId).populate('promocode');

    if (!rider) {
      throw new RiderNotFoundError(`Rider with id of ${riderId} not found`, 'rider.notFound', { riderId });
    }

    await setStripeCustomerId(rider);
    rider = await Riders.findById(riderId).populate('promocode');
    const promocodeCode = rider.promocode ? rider.promocode.code : null;

    await stripe.clearPaymentMethods(rider.stripeCustomerId);

    const paymentMethodList = await stripe.getPaymentMethods(rider.stripeCustomerId);
    if (paymentMethodList.length > 0) {
      throw new StripePaymentMethodError('Could not remove payment method', 'stripe.removePaymentMethodFail');
    }

    const stripePaymentMethods = paymentMethodList.map(dump.dumpPaymentMethod);

    const promocodeStatus = await promocodeValidity(promocodeCode?._id, locationId, riderId);
    if (promocodeStatus?.message) {
      promocodeStatus.message = translator(
        req.t,
        `PromocodeStatus.${promocodeStatus.statusType}`
      ) || promocodeStatus.message;
    }

    responseHandler(
      dump.dumpPaymentSettings(rider, stripePaymentMethods, promocodeStatus),
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

const setupPromocode = async (req, res) => {
  try {
    const { _id: riderId } = req.user;

    const {
      locationId,
      promocode
    } = validator.validate(
      validator.rules.object().keys({
        locationId: validator.rules.string().required(),
        promocode: validator.rules.string().required()
      }),
      req.body
    );

    let rider = await Riders.findById(riderId);

    if (!rider) {
      throw new RiderNotFoundError(`Rider with id of ${riderId} not found`, 'rider.notFound', { riderId });
    }

    await setStripeCustomerId(rider);
    rider = await Riders.findById(riderId).populate('promocode');

    const existingPromocode = await Promocodes.exists(promocode, locationId);
    const promocodeStatus = await promocodeValidity(existingPromocode?._id, locationId, riderId);

    if (!promocodeStatus.valid) {
      throw new InvalidPromocodeError(promocodeStatus.message, `PromocodeStatus.${promocodeStatus.statusType}`);
    }

    rider = await Riders.findByIdAndUpdate(riderId, { promocode: promocodeStatus.promocodeId }, { new: true }).populate('promocode');

    const paymentMethodList = await stripe.getPaymentMethods(rider.stripeCustomerId);
    const stripePaymentMethods = paymentMethodList.map(dump.dumpPaymentMethod);

    responseHandler(
      dump.dumpPaymentSettings(rider, stripePaymentMethods, promocodeStatus),
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

const removePromocode = async (req, res) => {
  try {
    const { _id: riderId } = req.user;

    let rider = await Riders.findById(riderId);

    if (!rider) {
      throw new RiderNotFoundError(`Rider with id of ${riderId} not found`, 'rider.notFound', { riderId });
    }

    await setStripeCustomerId(rider);
    rider = await Riders.findByIdAndUpdate(riderId, { promocode: null }, { new: true }).populate('promocode');

    const paymentMethodList = await stripe.getPaymentMethods(rider.stripeCustomerId);
    const stripePaymentMethods = paymentMethodList.map(dump.dumpPaymentMethod);

    responseHandler(
      {
        stripeCustomerId: rider.stripeCustomerId,
        stripePaymentMethods,
        promocode: rider.promocode ? dump.dumpPromocodeStatus(rider.promocode) : null
      },
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
  getPaymentSettings,
  setupPaymentMethod,
  removePaymentMethod,
  getQuote,
  setupPromocode,
  removePromocode
};
