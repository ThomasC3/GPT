import moment from 'moment-timezone';
import { Types } from 'mongoose';
import { buildJobCode, dayToNumber } from './transformations';
import { moneyFormat } from './money';
import { getVehicleCapacity } from './vehicle';
import { DATE_FORMAT_SHORT } from './time';
import { checkRunning } from './check';

export function dumpPaymentInformation(paymentInformation) {
  const result = {
    ridePrice: paymentInformation.ridePrice,
    pricePerHead: paymentInformation.pricePerHead,
    capEnabled: paymentInformation.capEnabled,
    priceCap: paymentInformation.priceCap,
    status: paymentInformation.status,
    totalPrice: paymentInformation.totalPrice,
    currency: paymentInformation.currency,
    clientSecret: paymentInformation.clientSecret,
    paymentIntentId: paymentInformation.paymentIntentId
  };
  if (paymentInformation.pwywValue) {
    result.ridePrice = paymentInformation.pwywValue;
    result.pricePerHead = 0;
  }
  if (paymentInformation.promocodeId) {
    const {
      promocodeCode,
      promocodeName,
      isPromocodeValid,
      promocodeInvalidMessage,
      totalWithoutDiscount,
      discount,
      promocodeUsesLeft,
      promocodeUsesMax,
      promocodeExpiryDate
    } = paymentInformation;

    if (isPromocodeValid) {
      result.totalWithoutDiscount = totalWithoutDiscount;
      result.discount = discount;
    }
    result.promocodeCode = promocodeCode;
    result.promocodeName = promocodeName;
    result.isPromocodeValid = isPromocodeValid;
    result.promocodeInvalidMessage = promocodeInvalidMessage;
    result.promocodeUsesLeft = promocodeUsesLeft;
    result.promocodeUsesMax = promocodeUsesMax;
    result.promocodeExpiryDate = promocodeExpiryDate;
  }
  return result;
}

export function dumpRideForDriver(ride) {
  const name = ride.rider ? `${ride.rider.firstName} ${ride.rider.lastName}` : 'Hailed Rider';
  const phone = ride.rider ? ride.rider.phone : '';

  return {
    ride: ride._id,
    rider: {
      name,
      phone
    },
    origin: {
      address: ride.pickupAddress,
      latitude: ride.pickupLatitude,
      longitude: ride.pickupLongitude
    },
    destination: {
      address: ride.dropoffAddress,
      latitude: ride.dropoffLatitude,
      longitude: ride.dropoffLongitude
    },
    isADA: ride.isADA,
    passengers: ride.passengers,
    status: ride.status,
    createdTimestamp: ride.createdTimestamp
  };
}

export function dumpRidesForDashboard(ride) {
  return {
    id: ride.id,
    isADA: ride.isADA,
    isDropoffFixedStop: ride.isDropoffFixedStop,
    dropOffEta: ride.dropOffEta,
    dropoffAddress: ride.dropoffAddress,
    dropoffLatitude: ride.dropoffLatitude,
    dropoffLongitude: ride.dropoffLongitude,
    dropoffZone: ride.dropoffZone,
    isPickupFixedStop: ride.isPickupFixedStop,
    pickupAddress: ride.pickupAddress,
    pickupLatitude: ride.pickupLatitude,
    pickupLongitude: ride.pickupLongitude,
    pickupZone: ride.pickupZone,
    passengers: ride.passengers,
    status: ride.status,
    createdTimestamp: ride.createdTimestamp,
    eta: ride.eta,
    vehicle: ride.vehicle
  };
}

export function dumpRideForDashboard(ride, adminRole) {
  const rider = ride.rider && adminRole > 6
    ? { firstName: 'Anon', lastName: 'Anon', id: 'xyz' }
    : ride.rider;
  return {
    id: ride.id,
    isADA: ride.isADA,
    driver: ride.driver,
    rider,
    isDropoffFixedStop: ride.isDropoffFixedStop,
    dropOffEta: ride.dropOffEta,
    dropoffAddress: ride.dropoffAddress,
    dropoffLatitude: ride.dropoffLatitude,
    dropoffLongitude: ride.dropoffLongitude,
    dropoffZone: ride.dropoffZone,
    isPickupFixedStop: ride.isPickupFixedStop,
    pickupAddress: ride.pickupAddress,
    pickupLatitude: ride.pickupLatitude,
    pickupLongitude: ride.pickupLongitude,
    pickupZone: ride.pickupZone,
    passengers: ride.passengers,
    status: ride.status,
    createdTimestamp: ride.createdTimestamp,
    eta: ride.eta,
    polylines: ride.polylines,
    vehicle: ride.vehicle
  };
}

export function dumpRideForRider(ride) {
  const tipInfo = {};
  if (ride.tips?.length) {
    tipInfo.tipCurrency = ride.tips[0].currency;
    tipInfo.tipTotal = ride.tips[0].total;
  }

  const paymentInformation = ride.paymentInformation || ride.request?.paymentInformation;

  return {
    id: ride._id,
    isADA: ride.isADA,
    driverName: ride.driver.displayName,
    driverPhoto: ride.driverProfilePicture,
    licensePlate: ride.vehicle?.licensePlate,
    eta: ride.eta,
    createdTimestamp: ride.createdTimestamp,
    origin: {
      address: ride.pickupAddress || null,
      latitude: ride.pickupLatitude || null,
      longitude: ride.pickupLongitude || null,
      fixedStopId: ride.pickupFixedStopId,
      isFixedStop: ride.isPickupFixedStop || false
    },
    destination: {
      address: ride.dropoffAddress || null,
      latitude: ride.dropoffLatitude || null,
      longitude: ride.dropoffLongitude || null,
      fixedStopId: ride.dropoffFixedStopId,
      isFixedStop: ride.isDropoffFixedStop || false
    },
    status: ride.status,
    passengers: ride.passengers,
    rating: ride.ratingForDriver,
    requestMessages: ride.requestMessages,
    totalPrice: paymentInformation?.totalPrice,
    totalWithoutDiscount: paymentInformation?.totalWithoutDiscount,
    discount: paymentInformation?.discount,
    paymentStatus: paymentInformation?.status,
    currency: paymentInformation?.currency,
    driverArrivedTimestamp: ride.driverArrivedTimestamp,
    ...tipInfo
  };
}

export function dumpRideFetchDriver(ride) {
  return {
    id: ride._id,
    riderName: `${ride.rider.firstName} ${ride.rider.lastName}`,
    origin: {
      address: ride.pickupAddress,
      latitude: ride.pickupLatitude,
      longitude: ride.pickupLongitude,
      timestamp: null
    },
    destination: {
      address: ride.dropoffAddress,
      latitude: ride.dropoffLatitude,
      longitude: ride.dropoffLongitude,
      timestamp: null
    },
    status: ride.status,
    passengers: ride.passengers,
    rating: ride.ratingForRider,
    savingsValue1: null,
    savingsValue2: null,
    requestMessages: ride.requestMessages
  };
}

export function dumpAdmin(admin) {
  return {
    ...admin,
    id: admin._id,
    _id: undefined,
    password: undefined
  };
}

export function dumpDriverForAdmin(driver, timezone = null) {
  return {
    ...driver,
    loggedOutTimestamp:
      driver.loggedOutTimestamp
        && moment(driver.loggedOutTimestamp).utc().tz(timezone || 'America/New_York').format('MM/DD/YYYY HH:mm:ss'),
    currentLocation: {
      latitude: driver.currentLocation ? driver.currentLocation.coordinates[1] : null,
      longitude: driver.currentLocation ? driver.currentLocation.coordinates[0] : null
    },
    password: undefined
  };
}

export function dumpRider(rider) {
  return {
    ...rider,
    id: rider._id,
    _id: undefined,
    password: undefined
  };
}

export function dumpTimeSlot(timeSlot) {
  return {
    day: timeSlot.day,
    openTime: timeSlot.openTime,
    closeTime: timeSlot.closeTime,
    closed: !!timeSlot.closed
  };
}

export function dumpServiceArea(serviceArea) {
  return serviceArea?.coordinates[0].map(coordinates => ({
    latitude: coordinates[1],
    longitude: coordinates[0]
  }));
}

export function dumpMediaItemForRider(media) {
  if (!media?.sourceUrl) return null;
  return {
    id: media._id || media.id,
    sourceUrl: media.sourceUrl,
    url: media.advertisement.url,
    advertiserId: media.advertisement.advertiserId,
    advertisementId: media.advertisement.advertisementId,
    campaignId: media.campaignId,
    featured: media.featured
  };
}

// these defaults need to be according to location model defaults
export function dumpLocationCore(location) {
  return {
    id: location._id,
    isOpen: location.isOpen,
    isActive: location.isActive,
    isSuspended: location.isSuspended || false,
    hasAppService: [true, false].includes(location.hasAppService) ? location.hasAppService : true,
    isADA: location.isADA,
    isUsingServiceTimes: location.isUsingServiceTimes,
    poolingEnabled: location.poolingEnabled,
    arrivedRangeFeet: location.arrivedRangeFeet,
    inversionRangeFeet: location.inversionRangeFeet,
    name: location.name,
    timezone: location.timezone,
    serviceHours:
    location.serviceHours
      .sort((a, b) => dayToNumber(a.day) - dayToNumber(b.day))
      .map(dumpTimeSlot),
    serviceArea: dumpServiceArea(location.serviceArea),
    advertisement: {},
    cancelTime: location.cancelTime,
    queueTimeLimit: location.queueTimeLimit,
    showAlert: location.showAlert === undefined ? false : location.showAlert,
    etaIncreaseLimit: location.etaIncreaseLimit,
    passengerLimit: location.passengerLimit,
    concurrentRideLimit: location.concurrentRideLimit,
    // payment info
    paymentEnabled: location.paymentEnabled || false,
    paymentInformation: location.paymentInformation || {},
    // fixed stop info
    fixedStopEnabled: location.fixedStopEnabled || false,
    // pwyw info
    pwywEnabled: location.pwywEnabled || false,
    pwywInformation: location.pwywInformation,
    // tip info
    tipEnabled: location.tipEnabled || false,
    tipInformation: location.tipInformation,
    // directions
    riderPickupDirections: location.riderPickupDirections || false,
    riderAgeRequirement: location.riderAgeRequirement,
    meetsAgeRequirement: location.meetsAgeRequirement,
    // driver moved settings
    driverLocationUpdateInterval: location.driverLocationUpdateInterval || 10,
    blockLiveDriverLocation: location.blockLiveDriverLocation || false,
    fleetEnabled: location.fleetEnabled || false,
    breakDurations: (location.breakDurations || []).sort((a, b) => a - b),
    // data query helpers
    locationCode: location.locationCode,
    stateCode: location.stateCode,
    // free ride age restriction
    freeRideAgeRestrictionEnabled: location.freeRideAgeRestrictionEnabled || false,
    freeRideAgeRestrictionInterval: location.freeRideAgeRestrictionInterval,
    poweredBy: location.poweredBy,
    // flux
    hideFlux: location.hideFlux || false
  };
}

export function dumpLocationLocale(location, locale = null) {
  const copy = (locale && location.copyData?.find(el => el.locale === locale)) || {};

  return {
    alert: {
      title: copy?.alert?.title || location?.alert?.title || '',
      copy: copy?.alert?.copy || location?.alert?.copy || ''
    },
    closedCopy: copy?.closedCopy || location.closedCopy,
    inactiveCopy: location.inactiveCopy, // legacy
    suspendedCopy: copy?.suspendedCopy || location.suspendedCopy || null,
    suspendedTitle: copy?.suspendedTitle || location.suspendedTitle || null,
    pwywCopy: copy?.pwywCopy || location.pwywCopy || 'How much do you want to pay for this ride?',
    failedAgeRequirementAlert: {
      title: copy?.failedAgeRequirementAlert?.title || location?.failedAgeRequirementAlert?.title || '',
      copy: copy?.failedAgeRequirementAlert?.copy || location?.failedAgeRequirementAlert?.copy || ''
    },
    ridesFareCopy: copy?.ridesFareCopy || location.ridesFareCopy || ''
  };
}

export function dumpLocation(location, locale = null) {
  return {
    ...dumpLocationCore(location),
    ...dumpLocationLocale(location, locale)
  };
}

export function dumpZoneForAdmin(zone) {
  return {
    id: zone.id,
    name: zone.name,
    serviceArea: dumpServiceArea(zone.serviceArea),
    code: zone.code,
    polygonFeatureId: zone.polygonFeatureId,
    description: zone.description,
    isDefault: zone.isDefault,
    paymentEnabled: zone.paymentEnabled || false,
    paymentInformation: zone.paymentInformation || {},
    pwywEnabled: zone.pwywEnabled || false,
    pwywInformation: zone.pwywInformation,
    poweredBy: zone.poweredBy,
    fixedStopEnabled: zone.fixedStopEnabled || false
  };
}

export function dumpPaymentPoliciesForAdmin(paymentPolicies) {
  return paymentPolicies.map(policy => ({
    id: policy._id,
    originZone: policy.originZone,
    destinationZone: policy.destinationZone,
    value: policy.value
  }));
}

export function dumpLocationForAdmin(location) {
  return {
    ...dumpLocation(location),
    copyData: location.copyData,
    zones: location.zones.map(zone => dumpZoneForAdmin(zone)),
    routingArea: dumpServiceArea(location.routingArea)
  };
}

export function dumpAddress(address) {
  return {
    address: address.formatted_address || `${address.name}, ${address.vicinity}`,
    latitude: address.geometry.location.lat,
    longitude: address.geometry.location.lng
  };
}

export function dumpMessage(message) {
  return {
    id: message._id,
    message: message.message,
    owner: message.owner,
    ride: message.ride,
    sender: message.sender
  };
}

export function dumpRequestForRider(request) {
  return {
    passengers: request.passengers,
    isADA: request.isADA,
    location: request.location,
    requestTimestamp: request.requestTimestamp,
    status: request.status,
    origin: {
      address: request.pickupAddress,
      latitude: request.pickupLatitude,
      longitude: request.pickupLongitude,
      fixedStopId: request.pickupFixedStopId,
      isFixedStop: request.isPickupFixedStop || false
    },
    destination: {
      address: request.dropoffAddress,
      latitude: request.dropoffLatitude,
      longitude: request.dropoffLongitude,
      fixedStopId: request.dropoffFixedStopId,
      isFixedStop: request.isDropoffFixedStop || false
    },
    waitingPaymentConfirmation: request.waitingPaymentConfirmation || false,
    paymentInformation: request.paymentInformation ? dumpPaymentInformation(
      request.paymentInformation
    ) : null
  };
}

export function dumpRequestsForDashboard(requests) {
  return requests.map(requestInfo => ({
    id: requestInfo.id,
    location: requestInfo.location,
    passengers: requestInfo.passengers,
    isADA: !!requestInfo.isADA,
    pickupAddress: requestInfo.pickupAddress,
    pickupLatitude: requestInfo.pickupLatitude,
    pickupLongitude: requestInfo.pickupLongitude,
    dropoffLatitude: requestInfo.dropoffLatitude,
    dropoffLongitude: requestInfo.dropoffLongitude,
    dropoffAddress: requestInfo.dropoffAddress,
    pickupFixedStopId: requestInfo.pickupFixedStopId,
    dropoffFixedStopId: requestInfo.dropoffFixedStopId,
    request: requestInfo.request,
    processing: requestInfo.processing,
    status: requestInfo.status,
    waitingPaymentConfirmation: requestInfo.waitingPaymentConfirmation
  }));
}


export function dumpRequestForAdmin(requestInfo, adminRole) {
  const rider = requestInfo.rider && adminRole > 6
    ? { firstName: 'Anon', lastName: 'Anon', id: 'xyz' }
    : requestInfo.rider;
  return {
    id: requestInfo.id,
    driver: requestInfo.driver,
    rider,
    location: requestInfo.location,
    passengers: requestInfo.passengers,
    isADA: !!requestInfo.isADA,
    pickupAddress: requestInfo.pickupAddress,
    pickupLatitude: requestInfo.pickupLatitude,
    pickupLongitude: requestInfo.pickupLongitude,
    dropoffLatitude: requestInfo.dropoffLatitude,
    dropoffLongitude: requestInfo.dropoffLongitude,
    dropoffAddress: requestInfo.dropoffAddress,
    pickupFixedStopId: requestInfo.pickupFixedStopId,
    dropoffFixedStopId: requestInfo.dropoffFixedStopId,
    request: requestInfo.request,
    processing: requestInfo.processing,
    status: requestInfo.status,
    waitingPaymentConfirmation: requestInfo.waitingPaymentConfirmation,
    polyline: requestInfo.polyline
  };
}


export function dumpRideHistoryForDriver(ride) {
  let result = {
    id: ride._id,
    rider: {
      name: (ride.rider && `${ride.rider.firstName} ${ride.rider.lastName}`) || null,
      phone: (ride.rider && ride.rider.phone) || null
    },
    origin: {
      address: ride.pickupAddress || null,
      latitude: ride.pickupLatitude || null,
      longitude: ride.pickupLongitude || null
    },
    destination: {
      address: ride.dropoffAddress || null,
      latitude: ride.dropoffLatitude || null,
      longitude: ride.dropoffLongitude || null
    },
    isADA: ride.isADA,
    status: ride.status,
    passengers: ride.passengers,
    createdTimestamp: ride.createdTimestamp,
    driverArrivingTimestamp: ride.driverArrivingTimestamp || null,
    driverArrivedTimestamp: ride.driverArrivedTimestamp || null,
    rating: ride.ratingForRider || null,
    requestMessages: ride.requestMessages
  };
  if (ride.route && ride.route.activeRideId) {
    result = { ...result, current: String(ride.route.activeRideId) === String(ride._id) };
  }
  return result;
}

export function dumpCardsForDriver(card) {
  const result = {
    stopType: card.stopType,
    eta: card.cost,
    id: card._id,
    rider: {
      name: (card.rider && `${card.rider.firstName} ${card.rider.lastName}`) || null,
      phone: (card.rider && card.rider.phone) || null
    },
    origin: {
      address: card.pickupAddress || null,
      latitude: card.pickupLatitude || null,
      longitude: card.pickupLongitude || null
    },
    destination: {
      address: card.dropoffAddress || null,
      latitude: card.dropoffLatitude || null,
      longitude: card.dropoffLongitude || null
    },
    isADA: card.isADA,
    status: card.status,
    passengers: card.passengers,
    createdTimestamp: card.createdTimestamp,
    driverArrivingTimestamp: card.driverArrivingTimestamp || null,
    driverArrivedTimestamp: card.driverArrivedTimestamp || null,
    rating: card.ratingForRider || null,
    requestMessages: card.requestMessages,
    current: card.current,
    hailed: !card.rider,
    fixedStopId: card.fixedStopId,
    fixedStopName: card.fixedStopName
  };
  return result;
}

export function dumpRideReport(report) {
  return {
    reason: report.reason,
    reporter: report.reporter,
    reportee: report.reportee,
    ride: report.ride
  };
}

export function dumpPaymentMethod(paymentMethod) {
  return {
    paymentMethodId: paymentMethod.id,
    last4digits: paymentMethod.card.last4,
    cardType: paymentMethod.card.brand
  };
}

export function dumpPromocodeStatus(promocodeStatus) {
  return {
    code: promocodeStatus.promocodeCode,
    name: promocodeStatus.promocodeName,
    type: promocodeStatus.promocodeType,
    value: promocodeStatus.promocodeValue,
    promocodeUsesLeft: promocodeStatus.promocodeUsesLeft,
    promocodeUsesMax: promocodeStatus.promocodeUsesMax,
    promocodeExpiryDate: promocodeStatus.promocodeExpiryDate,
    isPromocodeValid: promocodeStatus.valid,
    promocodeInvalidMessage: promocodeStatus.message
  };
}

export function dumpPaymentIntent(paymentIntent) {
  return {
    paymentIntentId: paymentIntent.id || null,
    clientSecret: paymentIntent.client_secret || null,
    status: paymentIntent.status || null
  };
}

export function dumpTipPayment(tip) {
  return {
    paymentIntentId: tip.paymentIntentId || null,
    clientSecret: tip.clientSecret || null,
    status: tip.status || null
  };
}

export function dumpPaymentSettings(rider, stripePaymentMethods, promocodeStatus) {
  return {
    stripeCustomerId: rider.stripeCustomerId,
    stripePaymentMethods,
    promocode: rider.promocode ? dumpPromocodeStatus(promocodeStatus) : null
  };
}

export function dumpRideUpdateEvent(ride) {
  const rideData = {
    ride: ride._id.toString(),
    status: ride.status,
    message: null,
    driverArrivedTimestamp: ride.driverArrivedTimestamp
  };
  if (ride.status === 700 && ride.request?.paymentInformation) {
    rideData.paymentStatus = ride.request.paymentInformation.status;
    rideData.totalPrice = ride.request.paymentInformation.totalPrice;
    if (ride.request.paymentInformation.isPromocodeValid) {
      rideData.totalWithoutDiscount = ride.request.paymentInformation.totalWithoutDiscount;
      rideData.discount = ride.request.paymentInformation.discount;
    }
    rideData.currency = ride.request.paymentInformation.currency;
  }
  return rideData;
}

function dumpFixedStop(fixedStop, abbreviated = true) {
  const fixedStopObject = {
    name: fixedStop.name,
    status: fixedStop.status,
    businessName: fixedStop.businessName,
    address: fixedStop.address,
    isDeleted: fixedStop.isDeleted,
    id: fixedStop.id || fixedStop._id
  };

  const [longitude, latitude] = fixedStop.mapLocation.coordinates;
  if (abbreviated) {
    fixedStopObject.lat = latitude;
    fixedStopObject.lng = longitude;
  } else {
    fixedStopObject.latitude = latitude;
    fixedStopObject.longitude = longitude;
  }
  return fixedStopObject;
}

export function dumpAdminFixedStop(fixedStop) {
  return dumpFixedStop(fixedStop, true);
}

export function dumpRiderFixedStop(fixedStop) {
  return dumpFixedStop(fixedStop, false);
}

export function dumpMediaItemForEmail(media) {
  if (!media) {
    return {
      adImg: null,
      adUrl: null,
      showAd: false
    };
  }
  return {
    adImg: media.sourceUrl,
    adUrl: media.advertisement?.url,
    showAd: !!media.sourceUrl
  };
}

export function dumpEmailReceiptData(ride, request, rider, driver, location, specifiedDomain, locale = 'en', promocode = null) {
  const encodedRiderEmail = encodeURIComponent(rider.email);
  const {
    currency, totalPrice, discount, totalWithoutDiscount
  } = request.paymentInformation || {};

  const paymentEnabled = totalPrice != null;
  const ridePrice = paymentEnabled ? moneyFormat(totalPrice / 100, { currency }) : null;

  const hasDiscount = discount > 0;
  const rideDiscount = hasDiscount ? moneyFormat(discount / 100, { currency }) : null;
  const rideWithoutDiscount = hasDiscount
    ? moneyFormat(totalWithoutDiscount / 100, { currency }) : null;

  const promocodeName = promocode && hasDiscount ? promocode.name : null;

  const { isPickupFixedStop, isDropoffFixedStop } = ride;
  const rideInfo = {
    pickupInfo: isPickupFixedStop ? ride.pickupFixedStopName : ride.pickupAddress,
    dropoffInfo: isDropoffFixedStop ? ride.dropoffFixedStopName : ride.dropoffAddress
  };

  const { adUrl, adImg, showAd } = dumpMediaItemForEmail(location.advertisement);

  return {
    locationId: location._id || location.id,
    locationName: location.name,
    riderFirstName: rider.firstName,
    requestTime: moment(ride.createdTimestamp).utc().tz(location.timezone)
      .locale(locale)
      .format('lll'),
    passengerNumber: ride.passengers,
    driverDisplayName: driver.displayName,
    ...rideInfo,
    pickupTime: moment.unix(ride.pickupTimestamp / 1000).utc().tz(location.timezone)
      .locale(locale)
      .format('lll'),
    dropoffTime: moment(ride.dropoffTimestamp).utc().tz(location.timezone)
      .locale(locale)
      .format('lll'),
    adUrl,
    adImg,
    showAd,
    paymentEnabled,
    ridePrice,
    hasDiscount,
    hasPromocode: !!promocodeName,
    promocodeName,
    rideDiscount,
    rideWithoutDiscount,
    unsubscribeUrl: `https://${specifiedDomain}/v1/unsubscribe?unsubscribe=receipt&email=${encodedRiderEmail}`
  };
}

export function dumpEmailChargeHoldData(
  paymentInformation, confirmationTimestamp, rider, request, location, advertisement, locale
) {
  // Template requirements (across all):
  // riderFirstName, ridePrice, confirmationTime, ridePrice, passengerNumber,
  // pickupInfo, dropoffInfo, paymentEnabled, hasDiscount, rideWithoutDiscount,
  // hasPromocode, promocodeName, rideDiscount, ridePrice, showAd, adUrl, adImg
  const {
    currency, totalWithoutDiscount, totalPrice, discount,
    promocodeName
  } = paymentInformation;
  const ridePrice = moneyFormat(totalPrice / 100, { currency });

  const hasDiscount = discount > 0;
  const rideDiscount = hasDiscount ? moneyFormat(discount / 100, { currency }) : null;
  const rideWithoutDiscount = hasDiscount
    ? moneyFormat(totalWithoutDiscount / 100, { currency }) : null;

  const promocodeUsed = !!(promocodeName && hasDiscount);

  const { isPickupFixedStop, isDropoffFixedStop } = request;
  const requestInfo = {
    pickupInfo: isPickupFixedStop ? request.pickupFixedStopName : request.pickupAddress,
    dropoffInfo: isDropoffFixedStop ? request.dropoffFixedStopName : request.dropoffAddress
  };

  const { adUrl, adImg, showAd } = dumpMediaItemForEmail(advertisement);

  return {
    riderFirstName: rider.firstName,

    confirmationTime: moment(confirmationTimestamp * 1000).utc().tz(location.timezone)
      .locale(locale)
      .format('lll'),
    passengerNumber: request.passengers,
    ...requestInfo,
    pickupAddress: request.pickupAddress,
    dropoffAddress: request.dropoffAddress,

    paymentEnabled: location.paymentEnabled || location.pwywEnabled || false,
    ridePrice,
    hasDiscount,
    hasPromocode: promocodeUsed,
    promocodeName,
    rideDiscount,
    rideWithoutDiscount,
    showAd,
    adUrl,
    adImg
  };
}

export function dumpEmailTipData(tip, rider, advertisement, language, specifiedDomain) {
  // Template requirements (across all):
  // riderFirstName, locationName, requestTime, passengerNumber, total,
  // driverDisplayName, showAd, adUrl, adImg, unsubscribeUrl
  const encodedRiderEmail = encodeURIComponent(rider.email);

  const total = tip.total
    ? moneyFormat(tip.total / 100, { currency: tip.currency })
    : null;

  const { adUrl, adImg, showAd } = dumpMediaItemForEmail(advertisement);

  return {
    driverDisplayName: tip.driverDisplayName,
    riderFirstName: tip.riderFirstName,
    riderLastName: tip.riderLastName,
    locationName: tip.locationName,
    requestTime: moment(tip.createdTimestamp).utc().tz(tip.timezone)
      .locale(language)
      .format('lll'),
    passengerNumber: tip.ridePassengers,
    total,
    showAd,
    adImg: adImg || '',
    adUrl: adUrl || '',
    unsubscribeUrl: `https://${specifiedDomain}/v1/unsubscribe?unsubscribe=receipt&email=${encodedRiderEmail}`
  };
}

export function dumpEmailReportData({
  ride, report, domain
}) {
  return {
    locationName: ride.location.name,
    riderFirstName: report.reportee.firstName,
    riderLastName: report.reportee.lastName,
    requestTime: moment(ride.createdTimestamp).tz(ride.location.timezone).format('lll'),
    passengerNumber: ride.passengers,
    driverFirstName: report.reporter.firstName,
    driverLastName: report.reporter.lastName,
    pickupAddress: ride.pickupAddress,
    dropoffAddress: ride.dropoffAddress,
    pickupTime: moment.unix(ride.pickupTimestamp / 1000).tz(ride.location.timezone).format('lll'),
    dropoffTime: moment(ride.dropoffTimestamp).tz(ride.location.timezone).format('lll'),
    rating: report.rating,
    reason: report.reason,
    feedback: report.feedback,
    showAd: false,
    reviewReportUrl: `https://${domain}/v1/reports/${report._id}`
  };
}

export function dumpEvents(event, location) {
  return {
    createdTimestamp: moment(event.createdTimestamp).tz(location?.timezone || 'America/New_York').format('MM/DD/YYYY HH:mm:ss'),
    eventType: event.eventType,
    eventData: event.eventData,
    source: {
      type: event.sourceType,
      id: event.sourceId,
      name: event.sourceName || event.source.name || `${event.source.firstName} ${event.source.lastName}`
    },
    target: {
      type: event.targetType,
      id: event.targetId,
      name: event.targetName || event.target.name || `${event.target.firstName} ${event.target.lastName}`
    }
  };
}

export function dumpTipsForDriver(tip) {
  return {
    month: tip.monthName,
    year: tip.year,
    value: tip.total,
    fee: tip.fee,
    net: tip.net,
    currency: tip.currency
  };
}

export function dumpTipsForAdmin(tip, location) {
  return {
    createdTimestamp: moment(tip.createdTimestamp).tz(location?.timezone || 'America/New_York').format('MM/DD/YYYY HH:mm:ss'),
    total: tip.total,
    fee: tip.fee,
    net: tip.net,
    currency: tip.currency,
    status: tip.status,
    driverFirstName: tip.driverFirstName,
    driverLastName: tip.driverLastName,
    driverId: tip.driverId,
    riderFirstName: tip.riderFirstName,
    riderLastName: tip.riderLastName,
    riderId: tip.riderId,
    rideId: tip.rideId
  };
}

export function dumpRequestForRide(requestInfo) {
  return {
    requestTimestamp: requestInfo.requestTimestamp,
    rider: requestInfo.rider,
    riderFirstName: requestInfo.riderFirstName,
    riderLastName: requestInfo.riderLastName,
    location: requestInfo.location,
    passengers: requestInfo.passengers,
    isADA: !!requestInfo.isADA,
    pickupAddress: requestInfo.pickupAddress,
    pickupLatitude: requestInfo.pickupLatitude,
    pickupLongitude: requestInfo.pickupLongitude,
    pickupZone: requestInfo.pickupZone,
    dropoffAddress: requestInfo.dropoffAddress,
    dropoffLatitude: requestInfo.dropoffLatitude,
    dropoffLongitude: requestInfo.dropoffLongitude,
    dropoffZone: requestInfo.dropoffZone,
    isFixedStop: requestInfo.isFixedStop,
    isPickupFixedStop: requestInfo.isPickupFixedStop,
    pickupFixedStopId: requestInfo.pickupFixedStopId,
    pickupFixedStopName: requestInfo.pickupFixedStopName,
    isDropoffFixedStop: requestInfo.isDropoffFixedStop,
    dropoffFixedStopId: requestInfo.dropoffFixedStopId,
    dropoffFixedStopName: requestInfo.dropoffFixedStopName,
    request: requestInfo.request
  };
}

export function dumpVehicleTypeForAdmin(vehicleType) {
  return {
    id: vehicleType._id,
    type: vehicleType.type,
    adaCapacity: vehicleType.adaCapacity,
    passengerCapacity: vehicleType.passengerCapacity,
    checkInForm: vehicleType.checkInForm,
    checkOutForm: vehicleType.checkOutForm,
    isDeleted: vehicleType.isDeleted
  };
}

export function dumpMatchingRuleZonesForDriver(matchingRule, zones) {
  return {
    matchingRule: matchingRule ? {
      key: matchingRule.key,
      title: matchingRule.title
    } : null,
    zones: zones ? zones.map(zone => ({ id: zone._id || zone.id, name: zone.name })) : []
  };
}

export function dumpVehiclesForDriver(vehicle) {
  const { adaCapacity, passengerCapacity } = getVehicleCapacity(vehicle);
  return {
    id: vehicle._id || vehicle.id || vehicle.vehicleId,
    name: vehicle.vehicleName || vehicle.name,
    publicId: vehicle.publicId,
    licensePlate: vehicle.licensePlate,
    isADAOnly: vehicle.isADAOnly,
    adaCapacity,
    passengerCapacity,
    type: vehicle.vehicleType?.type,
    service: vehicle.service,
    ...dumpMatchingRuleZonesForDriver(
      vehicle.matchingRuleInfo || vehicle.matchingRule, vehicle.zones
    )
  };
}

export function dumpDriverForActivityMap(driverInfo) {
  return {
    id: driverInfo._id || driverInfo.id,
    currentLocation: driverInfo.currentLocation,
    firstName: driverInfo.firstName,
    lastName: driverInfo.lastName,
    isAvailable: driverInfo.isAvailable,
    status: driverInfo.status,
    vehicle: driverInfo.vehicle ? dumpVehiclesForDriver(driverInfo.vehicle) : null,
    rideCount: driverInfo.rideCount,
    actionCount: driverInfo.actionCount
  };
}

export function dumpVehicleForAdmin(vehicle) {
  return {
    id: vehicle._id,
    name: vehicle.name,
    driver:
      vehicle.driverId
        ? dumpDriverForActivityMap({ ...vehicle.driverId.toJSON(), vehicle: null })
        : null,
    publicId: vehicle.publicId,
    licensePlate: vehicle.licensePlate,
    isADAOnly: vehicle.isADAOnly,
    adaCapacity: vehicle.adaCapacity,
    isReady: vehicle.isReady,
    passengerCapacity: vehicle.passengerCapacity,
    isCustomized: vehicle.isCustomized,
    isDeleted: vehicle.isDeleted,
    location: vehicle.location,
    battery: vehicle.battery,
    mileage: vehicle.mileage,
    pluggedIn: vehicle.pluggedIn,
    vehicleType: {
      id: vehicle.vehicleType._id,
      type: vehicle.vehicleType.type,
      adaCapacity: vehicle.vehicleType.adaCapacity,
      passengerCapacity: vehicle.vehicleType.passengerCapacity
    },
    matchingRule: vehicle.matchingRule,
    zones: vehicle.zones,
    jobs: vehicle.jobs
  };
}

export function dumpVehiclesForAdmin(vehicle) {
  const { adaCapacity, passengerCapacity } = getVehicleCapacity(vehicle);
  return {
    id: vehicle._id,
    name: vehicle.name,
    driver:
      vehicle.driverId
        ? dumpDriverForActivityMap({ ...vehicle.driverId.toJSON(), vehicle: null })
        : null,
    publicId: vehicle.publicId,
    isADAOnly: vehicle.isADAOnly,
    isReady: vehicle.isReady,
    adaCapacity,
    passengerCapacity,
    type: vehicle.vehicleType.type,
    vehicleTypeId: vehicle.vehicleType._id,
    isDeleted: vehicle.isDeleted,
    isCustomized: !!(vehicle.passengerCapacity || vehicle.adaCapacity),
    location: {
      id: vehicle.location._id,
      name: vehicle.location.name
    },
    matchingRule: vehicle.matchingRule,
    zones: vehicle.zones
  };
}

export function dumpQuestionsForAdmin(question) {
  return {
    id: question._id,
    questionString: question.questionString,
    questionKey: question.questionKey,
    responseType: question.responseType,
    optional: question.optional,
    isDeleted: question.isDeleted,
    createdTimestamp: question.createdTimestamp
  };
}

export function dumpInspectionFormsForAdmin(inspectionForm) {
  return {
    id: inspectionForm._id,
    inspectionType: inspectionForm.inspectionType,
    name: inspectionForm.name,
    questionList: inspectionForm.questionList,
    isDeleted: inspectionForm.isDeleted,
    createdTimestamp: inspectionForm.createdTimestamp
  };
}

export function dumpInspectionFormsWithQuestionsForAdmin(inspectionForm) {
  return {
    id: inspectionForm._id,
    inspectionType: inspectionForm.inspectionType,
    name: inspectionForm.name,
    questionList: inspectionForm.questionList.map(dumpQuestionsForAdmin),
    isDeleted: inspectionForm.isDeleted,
    createdTimestamp: inspectionForm.createdTimestamp
  };
}

export function dumpQuestionForDriver(question) {
  return {
    id: question._id,
    questionString: question.questionString,
    questionKey: question.questionKey,
    responseType: question.responseType,
    optional: question.optional
  };
}

export function dumpInspectionFormForDriver(inspectionForm) {
  return {
    id: inspectionForm.id,
    inspectionType: inspectionForm.inspectionType,
    name: inspectionForm.name,
    questions: inspectionForm
      .questionList
      .filter(question => !question.isDeleted)
      .map(question => dumpQuestionForDriver(question))
  };
}

export function dumpServiceForDriver(service) {
  return {
    id: service._id,
    key: service.key,
    title: service.title,
    desc: service.desc
  };
}

export function dumpConstantsForDriver(constant) {
  return constant?.values || [];
}

export function dumpDriverStatusVehicle(driverInfo, vehicleInfo, unavailabilityReasons) {
  return {
    isAvailable: driverInfo.isAvailable,
    vehicle: !vehicleInfo ? null : {
      ...dumpVehiclesForDriver(vehicleInfo),
      serviceKey: driverInfo.vehicle.service?.key,
      serviceTitle: driverInfo.vehicle.service?.title
    },
    unavailabilityReasons
  };
}

export function dumpDriver(driver) {
  return {
    id: driver.id,
    firstName: driver.firstName,
    lastName: driver.lastName,
    displayName: driver.displayName,
    isOnline: driver.isOnline,
    isAvailable: driver.isAvailable,
    status: driver.status,
    currentLocation: {
      latitude: driver.currentLocation ? driver.currentLocation.coordinates[1] : null,
      longitude: driver.currentLocation ? driver.currentLocation.coordinates[0] : null
    },
    vehicle: !driver.vehicle ? null : {
      ...dumpVehiclesForDriver(driver.vehicle),
      serviceKey: driver.serviceKey,
      serviceTitle: driver.serviceTitle,
      ...dumpMatchingRuleZonesForDriver(driver.vehicle.matchingRuleInfo, driver.vehicle.zones)
    },
    loggedOutTimestamp: driver.loggedOutTimestamp
  };
}

export function dumpDriverForDriver(driver) {
  return {
    id: driver._id,
    firstName: driver.firstName,
    lastName: driver.lastName,
    displayName: driver.displayName,
    email: driver.email,
    location: driver.locations,
    activeLocation: driver.activeLocation
  };
}

export function dumpVehicleAttributes(vehicle) {
  return {
    battery: vehicle.battery,
    mileage: vehicle.mileage,
    pluggedIn: vehicle.pluggedIn
  };
}

export function dumpHoursForAdmin(locationHours) {
  return {
    location: locationHours.location,
    totalHours: locationHours.totalHours,
    individualHours: locationHours.individualHours.map(
      item => ({ id: item.id, totalHours: item.totalHours })
    )
  };
}

export function dumpMatchingRuleForAdmin(matchingRule) {
  return {
    id: matchingRule._id,
    key: matchingRule.key,
    title: matchingRule.title,
    description: matchingRule.description
  };
}

export function dumpLocationForDriver(location, locale) {
  return {
    ...dumpLocation(location, locale),
    zones: location.zones.map(zone => ({
      id: zone.id,
      name: zone.name,
      serviceArea: dumpServiceArea(zone.serviceArea)
    }))
  };
}

export function dumpSettingsForRider(settings) {
  return {
    skipPhoneVerification: settings.smsDisabled || false,
    isDynamicRideSearch: settings.isDynamicRideSearch || false,
    flux: !settings.hideFlux,
    hideTripAlternativeSurvey: settings.hideTripAlternativeSurvey || false
  };
}

export function dumpStopForRider(stopInfo) {
  const isFixedStop = !!stopInfo.id;
  return {
    isFixedStop,
    stop: {
      latitude: stopInfo.latitude,
      longitude: stopInfo.longitude,
      name: stopInfo.name,
      address: stopInfo.address,
      id: stopInfo.id
    }
  };
}

export function dumpTagForAdmin(tag) {
  return {
    measurement: tag.measurement,
    timestamp: tag.timestamp,
    type: tag.type,
    location: tag.metadata?.location,
    instantaneous: tag.metadata?.instantaneous,
    avg: tag.metadata?.intervals?.avg,
    p30: tag.metadata?.intervals?.p30,
    p40: tag.metadata?.intervals?.p40,
    p60: tag.metadata?.intervals?.p60,
    p70: tag.metadata?.intervals?.p70
  };
}

export function dumpFluxForRider(flux) {
  return {
    message: flux.message,
    status: flux.tag,
    color: flux.color,
    display: flux.display
  };
}

export function dumpReportForAdmin(report) {
  return {
    id: report._id,
    isDeleted: report.isDeleted,
    status: report.status,
    reporterReason: report.reporterReason,
    reason: report.reason,
    ride: report.ride,
    reporter: report.reporter,
    reportee: report.reportee,
    createdTimestamp: report.createdTimestamp,
    docs: report.docs,
    feedback: report.feedback,
    notes: report.notes
  };
}

export function dumpRideForDriverRideList(driverRide) {
  return {
    rideId: driverRide._id,
    passengers: driverRide.passengers,
    isADA: driverRide.isADA,
    dropoffLatitude: driverRide.dropoffLatitude || null,
    dropoffLongitude: driverRide.dropoffLongitude || null
  };
}

export function dumpJob(job) {
  return {
    id: job._id,
    code: buildJobCode(job),
    locationId: job.location?._id || job.location,
    locationName: job.location?.name,
    locationCode: job.location?.locationCode || job.locationCode,
    clientCode: job.clientCode,
    typeCode: job.typeCode,
    active: job.active,
    isDeleted: job.isDeleted
  };
}

export function dumpCampaignForAdmin(campaign) {
  if (campaign instanceof Types.ObjectId) return campaign;
  return {
    id: campaign._id || campaign.id,
    name: campaign.name,
    advertiserId: campaign.advertiserId,
    isEnabled: campaign.isEnabled,
    campaignStart: campaign.campaignStart
      ? moment(campaign.campaignStart).format(DATE_FORMAT_SHORT) : null,
    campaignEnd: campaign.campaignEnd
      ? moment(campaign.campaignEnd).format(DATE_FORMAT_SHORT) : null,
    isRunning: checkRunning(campaign),
    locations: campaign.locations,
    featuredMedia: campaign.featuredMedia,
    mediaList: campaign.mediaList,
    isDeleted: campaign.isDeleted
  };
}

export function dumpAdvertiserForAdmin(advertiser) {
  return {
    id: advertiser._id || advertiser.id,
    name: advertiser.name,
    clientId: advertiser.clientId,
    campaigns: advertiser.campaigns.map(dumpCampaignForAdmin)
  };
}

export function dumpMediaItemForAdmin(media) {
  return {
    id: media._id || media.id,
    filename: media.filename,
    filetype: media.filetype,
    sourceUrl: media.sourceUrl,
    sizeInKB: media.sizeInKB,
    visualInfo: media.visualInfo ? {
      width: media.visualInfo.width,
      height: media.visualInfo.height,
      ratio: media.visualInfo.ratio
    } : {},
    advertisement: media.advertisement ? {
      advertiserId: media.advertisement.advertiserId,
      advertisementId: media.advertisement.advertisementId,
      url: media.advertisement.url,
      ageRestriction: media.advertisement.ageRestriction
    } : {},
    isDeleted: media.isDeleted,
    purpose: media.purpose
  };
}

export default {
  dumpRideForDriver,
  dumpRideForRider,
  dumpAdmin,
  dumpDriverForAdmin,
  dumpRider,
  dumpLocation,
  dumpLocationForAdmin,
  dumpAddress,
  dumpMessage,
  dumpRequestForRider,
  dumpRideFetchDriver,
  dumpRideHistoryForDriver,
  dumpRideReport,
  dumpCardsForDriver,
  dumpPaymentMethod,
  dumpPromocodeStatus,
  dumpPaymentInformation,
  dumpPaymentIntent,
  dumpPaymentSettings,
  dumpRideUpdateEvent,
  dumpAdminFixedStop,
  dumpRiderFixedStop,
  dumpEmailReceiptData,
  dumpEmailReportData,
  dumpEmailTipData,
  dumpEvents,
  dumpTipPayment,
  dumpTipsForDriver,
  dumpTipsForAdmin,
  dumpRequestForRide,
  dumpVehicleTypeForAdmin,
  dumpVehicleForAdmin,
  dumpVehiclesForAdmin,
  dumpQuestionsForAdmin,
  dumpInspectionFormsForAdmin,
  dumpInspectionFormsWithQuestionsForAdmin,
  dumpInspectionFormForDriver,
  dumpVehiclesForDriver,
  dumpServiceForDriver,
  dumpConstantsForDriver,
  dumpDriverStatusVehicle,
  dumpDriver,
  dumpDriverForDriver,
  dumpVehicleAttributes,
  dumpRequestsForDashboard,
  dumpHoursForAdmin,
  dumpEmailChargeHoldData,
  dumpZoneForAdmin,
  dumpMatchingRuleForAdmin,
  dumpMatchingRuleZonesForDriver,
  dumpLocationForDriver,
  dumpPaymentPoliciesForAdmin,
  dumpStopForRider,
  dumpTagForAdmin,
  dumpFluxForRider,
  dumpReportForAdmin,
  dumpJob,
  dumpAdvertiserForAdmin,
  dumpCampaignForAdmin,
  dumpMediaItemForAdmin,
  dumpMediaItemForRider
};
