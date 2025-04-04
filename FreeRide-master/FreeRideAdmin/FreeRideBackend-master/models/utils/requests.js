import { mongodb } from '../../services';
import { transformations } from '../../utils';
import { Requests } from '..';

const { Types } = mongodb;

export const buildGetRequestsQuery = (filterParams, locationTimezone) => {
  const findQuery = {};

  const serviceKeys = ['skip', 'limit', 'sort', 'order'];
  const skip = parseInt(filterParams.skip, 10) || 0;
  const limit = filterParams.noLimit ? undefined : (parseInt(filterParams.limit, 10) || 30);
  const sort = {
    [filterParams.sort ? filterParams.sort : 'requestTimestamp']: filterParams.order ? parseInt(filterParams.order, 10) : -1
  };

  Object.keys(filterParams).forEach((key) => {
    if (!serviceKeys.includes(key) && filterParams[key]) {
      findQuery[key] = filterParams[key];
    }
  });

  if (findQuery.requestTimestamp) {
    if (findQuery.requestTimestamp.start && findQuery.requestTimestamp.end) {
      findQuery.requestTimestamp = transformations.mapDateSearch(
        findQuery.requestTimestamp, locationTimezone
      );
    } else {
      delete findQuery.requestTimestamp;
    }
  }
  if (findQuery.status) findQuery.status = { $in: findQuery.status };
  if (findQuery.location) findQuery.location = new Types.ObjectId(findQuery.location);
  if (findQuery.noLimit) delete findQuery.noLimit;

  const query = Requests.find(findQuery)
    .populate({
      path: 'location',
      select: 'name timezone'
    })
    .populate({
      path: 'rider',
      select: 'firstName lastName email dob'
    })
    .sort(sort);

  return {
    query, sort, skip, limit
  };
};

export default {
  buildGetRequestsQuery
};
