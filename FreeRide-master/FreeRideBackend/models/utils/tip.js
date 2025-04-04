import { mongodb } from '../../services';
import { transformations } from '../../utils';
import { Tips } from '..';

const { Types } = mongodb;

export const buildGetTipsPipeline = (findQuery, sort, skip, limit) => {
  // Any filtering that can be applied on the fields in the schema
  const match1 = {};
  if (findQuery.locationId) match1.locationId = new Types.ObjectId(findQuery.locationId);
  if (findQuery.driverId) match1.driverId = new Types.ObjectId(findQuery.driverId);
  if (findQuery.riderId) match1.riderId = new Types.ObjectId(findQuery.riderId);
  if (findQuery.status) match1.status = findQuery.status;
  if (findQuery.createdTimestamp) match1.createdTimestamp = findQuery.createdTimestamp;

  // Base matches and sorts
  const stageGroup1 = [
    { $match: match1 },
    { $sort: sort }
  ];

  // Apply pagination
  //  & populate source info
  const stageGroup2 = [
    { $skip: skip },
    { $limit: limit }
  ];

  // Apply meta info for pagination
  const metadataFacetStage = [
    {
      $facet: {
        totals: [
          {
            $match: { status: 'succeeded' }
          },
          {
            $group: {
              _id: '$driverId',
              total: { $push: '$total' },
              netTotal: { $push: '$net' },
              feeTotal: { $push: '$fee' },
              status: { $push: '$status' },
              driverFirstName: { $last: '$driverFirstName' },
              driverLastName: { $last: '$driverLastName' }
            }
          }
        ],
        metadata: [
          {
            $count: 'total'
          },
          {
            $addFields: { skip, limit }
          }
        ],
        items: stageGroup2
      }
    },
    {
      // convert metadata: [{skip,limit}], items: [] => metadata: {skip,limit}, items: []
      $addFields: {
        metadata: {
          $arrayElemAt: ['$metadata', 0]
        }
      }
    },
    {
      // convert metadata: {skip,limit}, items: [] => skip: <>, limit: <>, items: []
      $replaceRoot: { newRoot: { $mergeObjects: ['$metadata', '$$ROOT'] } }
    },
    // removing metadata field
    { $project: { metadata: 0 } }
  ];

  return [...stageGroup1, ...metadataFacetStage];
};

export const buildGetTipsQuery = (filterParams, locationTimezone) => {
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
  if (findQuery.status) findQuery.status = findQuery.status;
  if (findQuery.riderId) findQuery.riderId = new Types.ObjectId(findQuery.riderId);
  if (findQuery.driverId) findQuery.driverId = new Types.ObjectId(findQuery.driverId);
  if (findQuery.locationId) findQuery.locationId = new Types.ObjectId(findQuery.locationId);
  if (findQuery.noLimit) delete findQuery.noLimit;

  const query = Tips.find(findQuery).sort(sort);

  return {
    query, sort, skip, limit
  };
};

export default { buildGetTipsPipeline };
