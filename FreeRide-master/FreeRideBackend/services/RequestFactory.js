/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
import moment from 'moment';
import { promocodeValidity, meetsAgeRequirement, meetsFreeRideAgeRequirement } from '../utils/check';
import { Quote, stripe } from '.';
import { dumpPaymentIntent } from '../utils/dump';
import { validator, location as locationUtil } from '../utils';
import { translator } from '../utils/translation';
import { getTimeLeft } from '../utils/time';
import { cancelRequestPayment, createPaymentIntentForRequest } from '../utils/request';

import {
  Riders, Locations, Requests,
  PaymentStatus, FixedStops,
  Messages, Zones
} from '../models';

import {
  ApplicationError, LocationError,
  RequestValidationError, CancelCooldownError, FixedStopNotFoundError
} from '../errors';
import { determinePaymentSourceForRideRequest } from '../utils/ride';

class RequestFactory {
  constructor(riderId, requestBody, req, createPaymentIntent = false) {
    this.riderId = riderId;
    this.requestBody = requestBody;
    this.createPaymentIntent = createPaymentIntent;

    this.location = null;
    this.rider = null;
    this.message = null;
    this.request = {};
    this.promocodeStatus = {};
    this.paymentSource = null;

    this.lng = req.lng;
    this.t = req.t;
  }

  async createRequest() {
    this.rider = await Riders.findOne({ _id: this.riderId }).populate('promocode');
    const locationId = this._getLocationId();
    this.location = await Locations.findById(locationId);
    const params = await this._paramsValidator();
    const {
      passengers, isADA, message,
      origin, destination
    } = params;

    await this._baseChecks(params);
    const { originZone, destinationZone } = await this._stopChecks(params);

    let requestInfo = {
      rider: this.riderId,
      riderFirstName: this.rider.firstName,
      riderLastName: this.rider.lastName,
      location: locationId,
      passengers,
      isADA,
      pickupAddress: origin.address,
      pickupLatitude: origin.latitude,
      pickupLongitude: origin.longitude,
      pickupZone: {
        id: originZone._id,
        name: originZone.name
      },
      dropoffAddress: destination.address,
      dropoffLatitude: destination.latitude,
      dropoffLongitude: destination.longitude,
      dropoffZone: {
        id: destinationZone._id,
        name: destinationZone.name
      },
      pickupFixedStopId: origin.fixedStopId,
      pickupFixedStopName: origin.fixedStopName,
      dropoffFixedStopId: destination.fixedStopId,
      dropoffFixedStopName: destination.fixedStopName
    };

    this.paymentSource = await determinePaymentSourceForRideRequest({
      locationId,
      origin,
      destination
    });

    if (this.paymentSource.paymentEnabled || this.paymentSource.pwywEnabled) {
      const freeRide = this.location.freeRideAgeRestrictionEnabled
        && meetsFreeRideAgeRequirement(this.location, this.rider);

      if (!freeRide) {
        if (this.paymentSource.pwywEnabled) {
          requestInfo.pwywValue = await this._pwywValidator();
        }
        const paymentRequestInfo = await this._paymentProcessor(requestInfo);
        requestInfo = { ...requestInfo, ...paymentRequestInfo };
      }
    }

    this.message = await this._createMessage(message);

    delete requestInfo.pwywValue;
    this.request = await Requests.createRequest(requestInfo, this.message);
  }

  async _paymentProcessor(requestInfo) {
    const { rider, location, paymentSource } = this;

    const riderHasPromocode = rider.promocode;
    const pwywDiscountable = (
      requestInfo.pwywValue === paymentSource.pwywBasePrice && requestInfo.pwywValue !== 0
    );
    const usePromocode = !paymentSource.pwywEnabled || pwywDiscountable;
    if (usePromocode && riderHasPromocode) {
      // Assigning promocode status
      this.promocodeStatus = await promocodeValidity(
        rider.promocode._id, location._id, rider._id
      );
      if (this.promocodeStatus?.message) {
        this.promocodeStatus.message = translator(
          this.t,
          `PromocodeStatus.${this.promocodeStatus.statusType}`
        ) || this.promocodeStatus.message;
      }
    }

    const chargeInformation = (
      paymentSource.pwywEnabled ? paymentSource.pwywInformation : paymentSource.paymentInformation
    ).toJSON();

    const paymentType = paymentSource.pwywEnabled ? 'pwyw' : 'fixedPrice';

    const quote = new Quote(
      {
        ...chargeInformation,
        heads: requestInfo.passengers,
        promocode: this.promocodeStatus?.valid ? rider.promocode : null,
        paymentType,
        // PWYW specific
        pwywValue: paymentSource.pwywEnabled ? requestInfo.pwywValue : null
      }
    );

    const isPaidRide = quote.totalPrice;

    let paymentIntent = {};
    if (!isPaidRide && isPaidRide !== 0) {
      throw new ApplicationError('We were unable to process your ride request at this time.', 500, 'request.fail');
    }

    requestInfo.paymentInformation = {
      totalPrice: quote.totalPrice,
      currency: chargeInformation.currency,
      ...chargeInformation
    };

    if (usePromocode && riderHasPromocode) {
      const {
        promocodeId,
        promocodeCode,
        valid: isPromocodeValid,
        message: promocodeInvalidMessage,
        promocodeName
      } = this.promocodeStatus;

      requestInfo.paymentInformation = {
        ...requestInfo.paymentInformation,
        promocodeId,
        promocodeCode,
        isPromocodeValid,
        promocodeInvalidMessage,
        promocodeUsed: false,
        totalWithoutDiscount: isPromocodeValid ? quote.totalCapped : null,
        discount: isPromocodeValid ? quote.discountValue : null,
        paymentType,
        promocodeName
      };
    }

    if (isPaidRide) {
      const paymentMethodList = await stripe.getPaymentMethods(rider.stripeCustomerId);

      if (paymentMethodList.length === 0) {
        throw new ApplicationError('Please attach a valid payment method to your account', 400, 'request.paymentMethodMissing');
      }

      requestInfo.waitingPaymentConfirmation = true;
      if (this.createPaymentIntent) {
        paymentIntent = await createPaymentIntentForRequest({
          rider,
          location,
          requestInfo
        });
      }
    } else if (isPaidRide === 0) {
      requestInfo.waitingPaymentConfirmation = false;
      paymentIntent.status = PaymentStatus.properties[PaymentStatus.requires_capture].name;
    }

    const paymentIntentInfo = dumpPaymentIntent(paymentIntent);

    requestInfo.paymentInformation = {
      ...requestInfo.paymentInformation,
      ...paymentIntentInfo
    };

    return requestInfo;
  }

  async _baseChecks(params) {
    const { passengers } = params;

    const timeNow = moment();

    if (this.rider.isPastEmailVerificationDeadline()) {
      throw new ApplicationError('The email associated with your account has not been verified. Verify your email address to ride.', 400, 'request.unVerifiedEmail');
    }

    if (this.rider.isUnderCoolDown(timeNow)) {
      const timeString = getTimeLeft(timeNow, this.rider.coolDownTimestamp(), this.lng);
      throw new CancelCooldownError(`Please try requesting again ${timeString}`, 'request.cancelCooldown', { timeString });
    }

    const isExistRequest = await Requests.findOne({ rider: this.riderId, status: 100 });
    if (isExistRequest) {
      await Requests.updateRequest(
        { _id: isExistRequest._id }, { $set: { status: 101, processing: false, cancelledBy: 'DUPLICATE_REQUEST' } }
      );
      await cancelRequestPayment(isExistRequest._id);
    }

    if (
      (this.location.passengerLimit || this.location.passengerLimit === 0)
      && (passengers > this.location.passengerLimit)
    ) {
      throw new RequestValidationError(
        `To help keep our drivers and riders safe our passenger maximum has been reduced to ${this.location.passengerLimit}. Please revise your request. Thank you for your help & stay safe during social distancing`,
        'request.passengerLimit',
        { passengerLimit: this.location.passengerLimit }
      );
    }

    if (!this.location.isActive) {
      throw new LocationError(this.location.suspendedCopy || 'Location is currently closed');
    } else if (
      this.location.isUsingServiceTimes && locationUtil.isLocationClosed(this.location)
    ) {
      throw new LocationError(this.location.closedCopy || 'Location is currently closed');
    }

    if (!meetsAgeRequirement(this.location, this.rider)) {
      throw new LocationError(this.location.failedAgeRequirementAlert.copy || 'Location has an age requirement that is not met', 'request.riderAgeRequirement');
    }
  }

  async _stopChecks(params) {
    const { origin, destination } = params;

    const pickupCheck = await Locations.withinServiceArea(
      [origin.longitude, origin.latitude], this.location._id
    );
    const originZone = await Zones.detectZone(
      this.location,
      { longitude: origin.longitude, latitude: origin.latitude }
    );

    const isPickupZoneFixedStopEnabled = (
      originZone?.isDefault ? this.location.fixedStopEnabled : originZone?.fixedStopEnabled
    );
    const mismatchedPickupStopType = !!origin.fixedStopId !== isPickupZoneFixedStopEnabled;

    if (!pickupCheck || !originZone || mismatchedPickupStopType) {
      throw new LocationError(
        `Pick up is not within service area of ${this.location.name}`,
        'request.pickupOutsideArea',
        { locationName: this.location.name }
      );
    }

    const dropoffCheck = await Locations.withinServiceArea(
      [destination.longitude, destination.latitude], this.location._id
    );

    const destinationZone = await Zones.detectZone(
      this.location,
      { longitude: destination.longitude, latitude: destination.latitude }
    );

    const isDropoffZoneFixedStopEnabled = (
      destinationZone?.isDefault
        ? this.location.fixedStopEnabled : destinationZone?.fixedStopEnabled
    );
    const mismatchedDropoffStopType = (
      !!destination.fixedStopId !== isDropoffZoneFixedStopEnabled
    );

    if (!dropoffCheck || !destinationZone || mismatchedDropoffStopType) {
      throw new LocationError(
        `Drop off is not within service area of ${this.location.name}`,
        'request.dropoffOutsideArea',
        { locationName: this.location.name }
      );
    }

    return {
      originZone,
      destinationZone
    };
  }

  async _createMessage(message) {
    return message
      ? Messages.createByRider({ message, owner: this.rider._id })
      : null;
  }

  async _paramsValidator() {
    const {
      passengers, isADA, message
    } = validator.partialValidate(
      validator.rules.object().keys({
        passengers: validator.rules.number().integer().min(1).required(),
        isADA: validator.rules.boolean().required(),
        message: validator.rules.string().allow(null)
      }),
      this.requestBody
    );

    return {
      passengers,
      isADA,
      message,
      origin: await this._originValidator(),
      destination: await this._destinationValidator()
    };
  }

  async _pwywValidator() {
    const {
      pwywValue
    } = validator.partialValidate(
      validator.rules.object().keys({
        pwywValue: validator.rules.number().integer().min(0).required()
      }),
      this.requestBody
    );

    return pwywValue;
  }

  async _originValidator() {
    const { origin } = validator.partialValidate(
      validator.rules.object().keys({
        origin: this.requestBody.origin.fixedStopId
          ? validator.rules.object().keys({
            fixedStopId: validator.rules.string().required()
          })
          : validator.rules.object().keys({
            address: validator.rules.string(),
            latitude: validator.rules.number().min(-90).max(90),
            longitude: validator.rules.number().min(-180).max(180)
          })
      }),
      this.requestBody
    );

    if (origin.fixedStopId) {
      const fs = await FixedStops.findOne({ _id: origin.fixedStopId, location: this.location._id });
      if (!fs) {
        throw new FixedStopNotFoundError(
          'Stop not found.', 'request.stopOutsideArea', { locationName: this.location.name }
        );
      }
      origin.fixedStopId = fs._id;
      origin.latitude = fs.latitude;
      origin.longitude = fs.longitude;
      origin.fixedStopName = fs.name;
    }

    return origin;
  }

  async _destinationValidator() {
    const { destination } = validator.partialValidate(
      validator.rules.object().keys({
        destination: this.requestBody.destination.fixedStopId
          ? validator.rules.object().keys({
            fixedStopId: validator.rules.string().required()
          })
          : validator.rules.object().keys({
            address: validator.rules.string(),
            latitude: validator.rules.number().min(-90).max(90),
            longitude: validator.rules.number().min(-180).max(180)
          })
      }),
      this.requestBody
    );

    if (destination.fixedStopId) {
      const fs = await FixedStops.findOne({
        _id: destination.fixedStopId, location: this.location._id
      });
      if (!fs) {
        throw new FixedStopNotFoundError(
          'Stop not found.', 'request.stopOutsideArea', { locationName: this.location.name }
        );
      }
      destination.fixedStopId = fs._id;
      destination.fixedStopName = fs.name;
      destination.latitude = fs.latitude;
      destination.longitude = fs.longitude;
    }

    return destination;
  }

  _getLocationId() {
    const { location } = validator.partialValidate(
      validator.rules.object().keys({
        location: validator.rules.string().required()
      }),
      this.requestBody
    );

    return location;
  }
}

export default RequestFactory;
