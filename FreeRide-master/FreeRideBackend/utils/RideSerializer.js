import moment from 'moment-timezone';
import {
  convertDate, dateDifference, secondsToTime,
  DATE_FORMAT
} from './time';

class RideSerializer {
  static adminRideToCsv(ride) {
    const mappedRide = ride.toJSON();

    mappedRide.index = true;

    mappedRide.rides = 1;
    mappedRide.rider = mappedRide.rider || {};
    mappedRide.driver = mappedRide.driver || {};
    mappedRide.location = mappedRide.location || {};
    mappedRide.request = mappedRide.request || {};
    mappedRide.rideID = mappedRide._id;

    const request = mappedRide.request || {};
    const paymentInformation = request.paymentInformation || {};
    const tip = (mappedRide.tips && mappedRide.tips.length) ? mappedRide.tips[0] : {};
    const timezone = mappedRide.location?.timezone;

    // timestamps
    const {
      createdTimestamp,
      driverArrivingTimestamp,
      driverArrivedTimestamp,
      pickupTimestamp,
      dropoffTimestamp,
      cancelTimestamp,
      initialEta
    } = mappedRide;

    // timestamps
    mappedRide.requestTimestamp = request.requestTimestamp ? moment(request.requestTimestamp).tz(timezone).format(DATE_FORMAT) : '';
    mappedRide.createdTimestamp = moment(createdTimestamp).tz(timezone).format(DATE_FORMAT);
    mappedRide.driverArrivingTimestamp = driverArrivingTimestamp ? moment(driverArrivingTimestamp).tz(timezone).format(DATE_FORMAT) : '';
    mappedRide.driverArrivedTimestamp = driverArrivedTimestamp ? moment(driverArrivedTimestamp).tz(timezone).format(DATE_FORMAT) : '';
    mappedRide.pickupTimestamp = pickupTimestamp ? moment.unix(pickupTimestamp / 1000).tz(timezone).format(DATE_FORMAT) : '';
    mappedRide.dropoffTimestamp = dropoffTimestamp ? moment(dropoffTimestamp).tz(timezone).format(DATE_FORMAT) : '';
    mappedRide.cancelTimestamp = cancelTimestamp ? moment(cancelTimestamp).tz(timezone).format(DATE_FORMAT) : '';

    // times
    mappedRide.waitTime = driverArrivedTimestamp && request.requestTimestamp
      ? secondsToTime(
        dateDifference(request.requestTimestamp, driverArrivedTimestamp, 'seconds')
      ) : '';
    mappedRide.totalTime = pickupTimestamp && dropoffTimestamp
      ? secondsToTime(
        dateDifference(moment.unix(pickupTimestamp / 1000), dropoffTimestamp, 'seconds')
      ) : '';

    // cancelledBy
    mappedRide.riderCancelled = mappedRide.cancelledBy === 'RIDER' ? 1 : 0;
    mappedRide.driverCancelled = mappedRide.cancelledBy === 'DRIVER' ? 1 : 0;

    // initialEta
    if (initialEta < 10000) {
      mappedRide.initialEta = initialEta ? moment(createdTimestamp).add(initialEta, 'minutes').tz(timezone).format(DATE_FORMAT) : '';
    } else {
      mappedRide.initialEta = initialEta ? moment.unix(initialEta).tz(timezone).format(DATE_FORMAT) : '';
    }

    // driver
    mappedRide.driverFirstName = mappedRide.driver.firstName;
    mappedRide.driverLastName = mappedRide.driver.lastName;

    // rider
    mappedRide.riderFirstName = mappedRide.rider.firstName;
    mappedRide.riderLastName = mappedRide.rider.lastName;
    mappedRide.riderEmail = mappedRide.rider.email;
    mappedRide.riderDob = mappedRide.rider?.dob ? convertDate(mappedRide.rider.dob, 'MM/DD/YYYY') : '';
    mappedRide.appRequest = mappedRide.rider?.email ? 1 : 0;
    mappedRide.flagDown = mappedRide.rider?.email ? 0 : 1;

    // location
    mappedRide.locationName = mappedRide.location.name;

    // paymentInformation
    mappedRide.ridePrice = paymentInformation.ridePrice;
    mappedRide.pricePerHead = paymentInformation.pricePerHead;
    mappedRide.totalPrice = paymentInformation.totalPrice;
    mappedRide.currency = paymentInformation.currency;

    // tip information
    mappedRide.tipCreatedTimestamp = tip.createdTimestamp ? moment(tip.createdTimestamp).tz(timezone).format(DATE_FORMAT) : '';
    mappedRide.tipTotal = tip.total;
    mappedRide.tipNet = tip.net;
    mappedRide.tipFee = tip.fee;
    mappedRide.tipCurrency = tip.currency;

    // boolean
    mappedRide.isOldRecord = !!mappedRide.isOldRecord;
    mappedRide.poolingLocation = !!mappedRide.poolingLocation;
    mappedRide.isADA = !!mappedRide.isADA;
    mappedRide.poolingTag = !!mappedRide.poolingTag;

    // hailed ride coordinates
    mappedRide.pickupLatitude = mappedRide.pickupLatitude || mappedRide.hailedPickupLatitude;
    mappedRide.pickupLongitude = mappedRide.pickupLongitude || mappedRide.hailedPickupLongitude;
    mappedRide.dropoffLatitude = mappedRide.dropoffLatitude || mappedRide.hailedDropoffLatitude;
    mappedRide.dropoffLongitude = mappedRide.dropoffLongitude || mappedRide.hailedDropoffLongitude;

    const hailedRide = !mappedRide.rider || Object.keys(mappedRide.rider).length === 0;
    if (hailedRide) {
      mappedRide.pickupTimestamp = mappedRide.pickupTimestamp || mappedRide.createdTimestamp;
      mappedRide.totalTime = secondsToTime(dateDifference(moment(createdTimestamp), dropoffTimestamp, 'seconds'));
    }

    delete mappedRide.rider;
    delete mappedRide.driver;
    delete mappedRide.location;
    delete mappedRide._id;
    delete mappedRide.requestMessages;
    delete mappedRide.eta;
    delete mappedRide.request;
    delete mappedRide.id;
    // eslint-disable-next-line no-underscore-dangle
    delete mappedRide.__v;

    return mappedRide;
  }

  static adminRideFeedbackToCsv(ride) {
    const mappedRide = ride.toJSON();

    mappedRide.index = true;

    mappedRide.rider = mappedRide.rider || {};
    mappedRide.driver = mappedRide.driver || {};
    mappedRide.location = mappedRide.location || {};
    mappedRide.rideID = mappedRide._id;

    const timezone = mappedRide.location?.timezone;

    // timestamps
    const {
      createdTimestamp
    } = mappedRide;

    // timestamps
    mappedRide.createdTimestamp = moment(createdTimestamp).tz(timezone).format(DATE_FORMAT);

    // driver
    mappedRide.driverFirstName = mappedRide.driver.firstName;
    mappedRide.driverLastName = mappedRide.driver.lastName;

    // rider
    mappedRide.riderFirstName = mappedRide.rider.firstName;
    mappedRide.riderLastName = mappedRide.rider.lastName;
    mappedRide.riderEmail = mappedRide.rider.email;
    mappedRide.riderDob = mappedRide.rider?.dob ? convertDate(mappedRide.rider.dob, 'MM/DD/YYYY') : '';

    // location
    mappedRide.locationName = mappedRide.location.name;

    delete mappedRide.rider;
    delete mappedRide.driver;
    delete mappedRide.location;
    delete mappedRide._id;
    delete mappedRide.requestMessages;
    delete mappedRide.eta;
    delete mappedRide.request;
    delete mappedRide.id;
    // eslint-disable-next-line no-underscore-dangle
    delete mappedRide.__v;

    return mappedRide;
  }

  static adminRidesToJson(items) {
    return items.map((ride) => {
      const mappedRide = ride.toJSON();
      mappedRide.createdTimestamp = moment(mappedRide.createdTimestamp).tz(mappedRide.location.timezone).format('lll');
      mappedRide.dropoffTimestamp = moment(mappedRide.dropoffTimestamp).tz(mappedRide.location.timezone).format('lll');
      if (mappedRide.requestTimestamp) {
        mappedRide.requestTimestamp = moment(mappedRide.requestTimestamp).tz(mappedRide.location.timezone).format('lll');
      }
      if (mappedRide.cancelTimestamp) {
        mappedRide.cancelTimestamp = moment(mappedRide.cancelTimestamp).tz(mappedRide.location.timezone).format('lll');
      }
      if (mappedRide.pickupTimestamp) {
        mappedRide.pickupTimestamp = moment.unix(mappedRide.pickupTimestamp / 1000).tz(mappedRide.location.timezone).format('lll');
      }

      if (!mappedRide.rider) {
        mappedRide.rider = {};
        mappedRide.pickupTimestamp = mappedRide.pickupTimestamp || mappedRide.createdTimestamp;
      }
      mappedRide.driver = mappedRide.driver || {};
      mappedRide.location = mappedRide.location || {};
      mappedRide.request = mappedRide.request || {};

      return mappedRide;
    });
  }

  static csvColumns() {
    return [
      { key: 'index', header: 'Index' },

      { key: 'ratingForRider', header: 'Rider Rating' },
      { key: 'feedbackForRider', header: 'Feedback for Rider' },
      { key: 'ratingForDriver', header: 'Driver Rating' },
      { key: 'feedbackForDriver', header: 'Feedback for Driver' },
      { key: 'rides', header: 'Rides' },
      { key: 'passengers', header: 'Riders' },
      { key: 'appRequest', header: 'App' },
      { key: 'flagDown', header: 'Flag' },
      { key: 'pickupAddress', header: 'Pickup Address' },
      { key: 'pickupLatitude', header: 'pickupLatitude' },
      { key: 'pickupLongitude', header: 'pickupLongitude' },
      { key: 'dropoffAddress', header: 'Dropoff Address' },
      { key: 'dropoffLatitude', header: 'dropoffLatitude' },
      { key: 'dropoffLongitude', header: 'dropoffLongitude' },
      { key: 'status', header: 'status' },
      { key: 'createdTimestamp', header: 'createdTimestamp' },
      { key: 'cancelledBy', header: 'cancelledBy' },
      { key: 'riderCancelled', header: 'Rider Cancelled' },
      { key: 'driverCancelled', header: 'Driver Cancelled' },
      { key: 'requestTimestamp', header: 'requestTimestamp' },
      { key: 'driverArrivingTimestamp', header: 'driverArrivingTimestamp' },
      { key: 'driverArrivedTimestamp', header: 'driverArrivedTimestamp' },
      { key: 'pickupTimestamp', header: 'pickupTimestamp' },
      { key: 'dropoffTimestamp', header: 'dropoffTimestamp' },
      { key: 'totalTime', header: 'Ride Time' },
      { key: 'waitTime', header: 'Wait Time' },
      { key: 'driverFirstName', header: 'driverFirstName' },
      { key: 'driverLastName', header: 'driverLastName' },
      { key: 'riderFirstName', header: 'riderFirstName' },
      { key: 'riderLastName', header: 'riderLastName' },
      { key: 'riderEmail', header: 'riderEmail' },
      { key: 'riderDob', header: 'riderDob' },

      { key: 'stopsBeforeDropoff', header: 'stopsBeforeDropoff' },
      { key: 'poolingTag', header: 'poolingTag' },
      { key: 'poolingLocation', header: 'poolingLocation' },
      { key: 'initialEta', header: 'initialEta' },
      { key: 'cancelTimestamp', header: 'cancelTimestamp' },
      { key: 'isADA', header: 'isADA' },
      { key: 'locationName', header: 'locationName' },
      { key: 'ridePrice', header: 'ridePrice' },
      { key: 'pricePerHead', header: 'pricePerHead' },
      { key: 'totalPrice', header: 'totalPrice' },
      { key: 'currency', header: 'currency' },
      { key: 'tipCreatedTimestamp', header: 'tipCreatedTimestamp' },
      { key: 'tipTotal', header: 'tipTotal' },
      { key: 'tipNet', header: 'tipNet' },
      { key: 'tipFee', header: 'tipFee' },
      { key: 'tipCurrency', header: 'tipCurrency' },
      { key: 'rideID', header: 'rideID' }
    ];
  }
}

export default RideSerializer;
