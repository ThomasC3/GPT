import moment from 'moment-timezone';
import {
  convertDate, dateDifference, secondsToTime,
  DATE_FORMAT
} from '../../../utils/time';

class RequestSerializer {
  static adminRequestToCsv(request) {
    const mappedRequest = request.toJSON();

    mappedRequest.index = true;

    mappedRequest.location = mappedRequest.location || {};
    mappedRequest.rider = mappedRequest.rider || {};

    const timezone = mappedRequest.location?.timezone;

    // timestamps
    const {
      requestTimestamp,
      lastRetryTimestamp,
      cancelTimestamp
    } = mappedRequest;

    // timestamps
    mappedRequest.requestTimestamp = moment(requestTimestamp).tz(timezone).format(DATE_FORMAT);
    mappedRequest.lastRetryTimestamp = lastRetryTimestamp ? moment(lastRetryTimestamp).tz(timezone).format(DATE_FORMAT) : '';
    mappedRequest.cancelTimestamp = cancelTimestamp ? moment(cancelTimestamp).tz(timezone).format(DATE_FORMAT) : '';

    // times
    mappedRequest.processingTime = lastRetryTimestamp
      ? secondsToTime(
        dateDifference(requestTimestamp, lastRetryTimestamp, 'seconds')
      ) : '';
    mappedRequest.cancelTime = cancelTimestamp
      ? secondsToTime(
        dateDifference(requestTimestamp, cancelTimestamp, 'seconds')
      ) : '';

    // cancelledBy
    mappedRequest.riderCancelled = mappedRequest.cancelledBy === 'RIDER'
      || mappedRequest.cancelledBy === 'RIDER_ON_REQUEST' ? 1 : 0;
    mappedRequest.adminCancelled = mappedRequest.cancelledBy === 'ADMIN' ? 1 : 0;
    mappedRequest.unavailabilityCancelled = mappedRequest.cancelledBy === 'NO_AVAILABILITY' ? 1 : 0;

    // rider
    mappedRequest.riderFirstName = mappedRequest.rider.firstName;
    mappedRequest.riderLastName = mappedRequest.rider.lastName;
    mappedRequest.riderEmail = mappedRequest.rider.email;
    mappedRequest.riderDob = mappedRequest.rider.dob ? convertDate(mappedRequest.rider.dob, 'MM/DD/YYYY') : '';

    // location
    mappedRequest.locationName = mappedRequest.location.name;

    // paymentInformation
    const paymentInformation = request.paymentInformation || {};
    mappedRequest.ridePrice = paymentInformation.ridePrice;
    mappedRequest.pricePerHead = paymentInformation.pricePerHead;
    mappedRequest.totalPrice = paymentInformation.totalPrice;
    mappedRequest.currency = paymentInformation.currency;

    // boolean
    mappedRequest.isADA = !!mappedRequest.isADA;
    mappedRequest.waitingPaymentConfirmation = !!mappedRequest.waitingPaymentConfirmation;

    delete mappedRequest.rider;
    delete mappedRequest.driver;
    delete mappedRequest.location;
    delete mappedRequest.paymentInformation;
    delete mappedRequest._id;
    delete mappedRequest.id;
    // eslint-disable-next-line no-underscore-dangle
    delete mappedRequest.__v;

    return mappedRequest;
  }
}

export default RequestSerializer;
