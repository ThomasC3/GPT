import { mongodb } from '../../services';
import { transformations } from '../../utils';
import { Rides, PaymentStatus } from '..';

const { Types } = mongodb;

const PAYMENT_SUCCEEDED_STATUS = PaymentStatus.properties[PaymentStatus.succeeded].name;

export const buildGetRidesQuery = (filterParams, locationTimezone) => {
  const findQuery = {};

  const serviceKeys = ['skip', 'limit', 'sort', 'order'];
  const skip = parseInt(filterParams.skip, 10) || 0;
  const limit = filterParams.noLimit ? undefined : (parseInt(filterParams.limit, 10) || 30);
  const sort = {
    [filterParams.sort ? filterParams.sort : 'createdTimestamp']: filterParams.order ? parseInt(filterParams.order, 10) : -1
  };

  Object.keys(filterParams).forEach((key) => {
    if (!serviceKeys.includes(key) && filterParams[key]) {
      findQuery[key] = filterParams[key];
    }
  });

  if (findQuery.createdTimestamp) {
    if (findQuery.createdTimestamp.start && findQuery.createdTimestamp.end) {
      findQuery.createdTimestamp = transformations.mapDateSearch(
        findQuery.createdTimestamp, locationTimezone
      );
    } else {
      delete findQuery.createdTimestamp;
    }
  }
  if (findQuery.status) findQuery.status = { $in: findQuery.status };
  if (findQuery.rider) findQuery.rider = new Types.ObjectId(findQuery.rider);
  if (findQuery.driver) findQuery.driver = new Types.ObjectId(findQuery.driver);
  if (findQuery.location) findQuery.location = new Types.ObjectId(findQuery.location);
  if (findQuery.noLimit) delete findQuery.noLimit;
  if (findQuery.feedbackText) {
    findQuery.$or = [
      { feedbackForDriver: { $ne: null } },
      { feedbackForRider: { $ne: null } }
    ];
    delete findQuery.feedbackText;
  }

  let query;

  if (filterParams.feedbackText) {
    query = Rides.find(findQuery)
      .populate({
        path: 'location',
        select: 'name timezone'
      })
      .populate({
        path: 'driver',
        select: 'firstName lastName'
      })
      .populate({
        path: 'rider',
        select: 'firstName lastName email dob'
      })
      .sort(sort);
  } else {
    query = Rides.find(findQuery)
      .populate({
        path: 'location',
        select: 'name timezone'
      })
      .populate({
        path: 'driver',
        select: 'firstName lastName'
      })
      .populate({
        path: 'rider',
        select: 'firstName lastName email dob'
      })
      .populate({
        path: 'request',
        select: 'paymentInformation requestTimestamp'
      })
      .populate({
        path: 'tips',
        match: { status: PAYMENT_SUCCEEDED_STATUS }
      })
      .sort(sort);
  }

  return {
    query, sort, skip, limit
  };
};

export default {
  buildGetRidesQuery
};
