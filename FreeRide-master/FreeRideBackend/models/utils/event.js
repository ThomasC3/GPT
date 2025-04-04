import mongoose from 'mongoose';
import { lookupBuilder } from './common';

export const buildGetEventsPipeline = (findQuery, sort, skip, limit) => {
  // Any filtering that can be applied on the fields in the schema
  const match1 = {};
  if (findQuery.eventType) match1.eventType = findQuery.eventType;
  if (findQuery.eventData) match1.eventData = findQuery.eventData;

  const eventDataKeys = Object.keys(findQuery).filter(k => k.includes('eventData.'));
  if (eventDataKeys) eventDataKeys.forEach((k) => { match1[k] = findQuery[k]; });
  if (findQuery.createdTimestamp) match1.createdTimestamp = findQuery.createdTimestamp;

  if (findQuery.or) {
    if (findQuery.sourceId) {
      match1.$or = [
        { sourceId: findQuery.sourceId },
        { targetId: findQuery.sourceId }
      ];

      if (mongoose.Types.ObjectId.isValid(findQuery.sourceId)) {
        match1.$or.push(
          { sourceId: new mongoose.Types.ObjectId(findQuery.sourceId) },
          { targetId: new mongoose.Types.ObjectId(findQuery.sourceId) }
        );
      }
    } else if (findQuery.targetId) {
      match1.$or = [
        { sourceId: findQuery.targetId },
        { targetId: findQuery.targetId }
      ];

      if (mongoose.Types.ObjectId.isValid(findQuery.targetId)) {
        match1.$or.push(
          { sourceId: new mongoose.Types.ObjectId(findQuery.targetId) },
          { targetId: new mongoose.Types.ObjectId(findQuery.targetId) }
        );
      }
    }
  } else {
    if (findQuery.sourceId) {
      match1.$or = [{ sourceId: findQuery.sourceId }];
      if (mongoose.Types.ObjectId.isValid(findQuery.sourceId)) {
        match1.$or.push({ sourceId: new mongoose.Types.ObjectId(findQuery.sourceId) });
      }
    }
    if (findQuery.targetId) {
      match1.$or = [{ targetId: findQuery.targetId }];
      if (mongoose.Types.ObjectId.isValid(findQuery.targetId)) {
        match1.$or.push({ targetId: new mongoose.Types.ObjectId(findQuery.targetId) });
      }
    }
  }

  // Base matches and sorts
  const stageGroup1 = [
    { $match: match1 },
    { $sort: sort }
  ];

  const paginationQuery = limit ? [
    { $skip: skip },
    { $limit: limit }
  ] : [
    { $skip: skip }
  ];

  // Apply pagination and populate source/target info
  // TODO: Remove lookups when all 'recent' events have sourceNames
  const stageGroup2 = [
    ...paginationQuery,
    lookupBuilder('Driver', 'sourceId'),
    lookupBuilder('Rider', 'sourceId'),
    lookupBuilder('Vehicle', 'sourceId', { name: 1 }),
    {
      $addFields: {
        source: {
          $cond: {
            if: { $ifNull: ['$sourceName', false] },
            then: { id: '$sourceId', name: '$sourceName' },
            else: {
              $switch: {
                branches: [
                  { case: { $eq: ['$sourceType', 'Rider'] }, then: { $ifNull: [{ $arrayElemAt: ['$rider', 0] }, { id: '$sourceId', name: 'Unknown' }] } },
                  { case: { $eq: ['$sourceType', 'Driver'] }, then: { $ifNull: [{ $arrayElemAt: ['$driver', 0] }, { id: '$sourceId', name: 'Unknown' }] } },
                  { case: { $eq: ['$sourceType', 'Vehicle'] }, then: { $ifNull: [{ $arrayElemAt: ['$vehicle', 0] }, { id: '$sourceId', name: 'Unknown' }] } },
                  { case: { $eq: ['$sourceType', 'Admin'] }, then: { id: '$sourceId', name: 'Unknown' } }
                ],
                default: { id: '$sourceId', name: 'Unknown' }
              }
            }
          }
        }
      }
    },
    {
      $project: {
        rider: 0,
        driver: 0,
        vehicle: 0
      }
    },
    lookupBuilder('Driver', 'targetId'),
    lookupBuilder('Rider', 'targetId'),
    lookupBuilder('Vehicle', 'targetId', { name: 1 }),
    {
      $addFields: {
        target: {
          $cond: {
            if: { $ifNull: ['$targetName', false] },
            then: { id: '$targetId', name: '$targetName' },
            else: {
              $switch: {
                branches: [
                  { case: { $eq: ['$targetType', 'Rider'] }, then: { $ifNull: [{ $arrayElemAt: ['$rider', 0] }, { id: '$targetId', name: 'Unknown' }] } },
                  { case: { $eq: ['$targetType', 'Driver'] }, then: { $ifNull: [{ $arrayElemAt: ['$driver', 0] }, { id: '$targetId', name: 'Unknown' }] } },
                  { case: { $eq: ['$targetType', 'Vehicle'] }, then: { $ifNull: [{ $arrayElemAt: ['$vehicle', 0] }, { id: '$targetId', name: 'Unknown' }] } },
                  { case: { $eq: ['$targetType', 'Admin'] }, then: { id: '$targetId', name: 'Unknown' } }
                ],
                default: { id: '$targetId', name: 'Unknown' }
              }
            }
          }
        }
      }
    },
    {
      $project: {
        rider: 0,
        driver: 0,
        vehicle: 0
      }
    }
  ];

  // Apply meta info for pagination
  const metadataFacetStage = [
    {
      $facet: {
        metadata: [
          {
            $group: {
              _id: null,
              targets: { $addToSet: '$targetId' },
              sources: { $addToSet: '$sourceId' },
              total: { $sum: 1 }
            }
          },
          { $addFields: { skip, limit } },
          { $project: { _id: 0 } }
        ],
        items: stageGroup2,
        data: [
          ...stageGroup2,
          {
            $group: {
              _id: null,
              targetData: { $addToSet: '$target' },
              sourceData: { $addToSet: '$source' }
            }
          },
          { $project: { _id: 0 } }
        ]
      }
    },
    {
      // convert metadata: [{skip,limit}], items: [] => metadata: {skip,limit}, items: []
      $addFields: {
        metadata: {
          $arrayElemAt: ['$metadata', 0]
        },
        data: {
          $arrayElemAt: ['$data', 0]
        }
      }
    },
    {
      // convert metadata: {skip,limit}, items: [] => skip: <>, limit: <>, items: []
      $replaceRoot: { newRoot: { $mergeObjects: ['$metadata', '$data', '$$ROOT'] } }
    },
    // removing metadata field
    { $project: { metadata: 0, data: 0 } }
  ];

  return [...stageGroup1, ...metadataFacetStage];
};

export default { buildGetEventsPipeline };
