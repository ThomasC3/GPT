import { mongodb } from '../../services';

const { Types } = mongodb;

export const buildGetReportsPipeline = (findQuery, sort, skip, limit) => {
  // Any filtering that can be applied on the fields in the schema
  const match1 = {};
  if (findQuery.reason) match1.reason = findQuery.reason;
  if (findQuery.reporter) match1['reporter.id'] = new Types.ObjectId(findQuery.reporter);
  if (findQuery.reportee) match1['reportee.id'] = new Types.ObjectId(findQuery.reportee);
  if (findQuery.createdTimestamp) match1.createdTimestamp = findQuery.createdTimestamp;
  if (findQuery.isDeleted !== undefined) match1.isDeleted = findQuery.isDeleted;
  if (findQuery.ride) match1['ride.id'] = new Types.ObjectId(findQuery.ride);
  if (findQuery.location) match1['ride.location'] = new Types.ObjectId(findQuery.location);

  // Base matches and sorts
  const stageGroup1 = [
    { $match: match1 },
    { $sort: sort }
  ];

  // Apply meta info for pagination
  const metadataFacetStage = [
    {
      $facet: {
        metadata: [{ $count: 'total' }, { $addFields: { skip, limit } }],
        items: [
          { $skip: skip },
          { $limit: limit }
        ]
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

export default { buildGetReportsPipeline };
