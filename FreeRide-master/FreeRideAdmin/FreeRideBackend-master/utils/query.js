import { validator, transformations } from '.';
import {
  Rides, Requests, Tips
} from '../models';

export const buildGroupByCityQuery = (
  filterOptions, projectVars, groupOptions, addOptions = null, preGroupSort = null
) => {
  let query = [
    {
      $match: {
        ...filterOptions
      }
    }
  ];

  if (preGroupSort) {
    query = query.concat([
      { $sort: preGroupSort }
    ]);
  }

  query = query.concat([
    {
      $lookup: {
        from: 'Locations',
        localField: 'location',
        foreignField: '_id',
        as: 'locationInfo'
      }
    },
    {
      $project: {
        locationName: { $arrayElemAt: ['$locationInfo.name', 0] },
        locationId: { $arrayElemAt: ['$locationInfo._id', 0] },
        _id: 1,
        ...projectVars
      }
    },
    {
      $group: {
        _id: {
          locationName: '$locationName',
          locationId: '$locationId'
        },
        ...groupOptions
      }
    }
  ]);
  if (addOptions) {
    query.push(addOptions);
  }
  return query;
};

export const buildGroupByCityRiderQuery = (
  filterOptions, projectVars, groupOptions, addOptions = null, preGroupSort = null
) => {
  let query = [
    {
      $match: {
        ...filterOptions
      }
    }
  ];

  if (preGroupSort) {
    query = query.concat([
      { $sort: preGroupSort }
    ]);
  }

  query = query.concat([
    {
      $lookup: {
        from: 'Locations',
        localField: 'location',
        foreignField: '_id',
        as: 'locationInfo'
      }
    },
    {
      $project: {
        locationName: { $arrayElemAt: ['$locationInfo.name', 0] },
        locationId: { $arrayElemAt: ['$locationInfo._id', 0] },
        _id: 1,
        ...projectVars
      }
    },
    {
      $group: {
        _id: {
          locationName: '$locationName',
          locationId: '$locationId',
          riderId: '$rider'
        },
        ...groupOptions
      }
    }
  ]);
  if (addOptions) {
    query = query.concat(addOptions);
  }
  return query;
};

export const buildGroupByPoolingCityQuery = (
  filterOptions, projectVars, groupOptions, addOptions = null, preGroupSort = null
) => {
  let query = [
    {
      $match: {
        ...filterOptions
      }
    }
  ];

  if (preGroupSort) {
    query = query.concat([
      { $sort: preGroupSort }
    ]);
  }

  query = query.concat([
    {
      $lookup: {
        from: 'Locations',
        localField: 'location',
        foreignField: '_id',
        as: 'locationInfo'
      }
    },
    {
      $addFields: {
        poolingEnabled: '$locationInfo.poolingEnabled'
      }
    },
    {
      $match: {
        poolingEnabled: true
      }
    },
    {
      $project: {
        locationName: { $arrayElemAt: ['$locationInfo.name', 0] },
        locationId: { $arrayElemAt: ['$locationInfo._id', 0] },
        _id: 1,
        ...projectVars
      }
    },
    {
      $group: {
        _id: {
          locationName: '$locationName',
          locationId: '$locationId'
        },
        ...groupOptions
      }
    }
  ]);
  if (addOptions) {
    query = query.concat(addOptions);
  }
  return query;
};

export const timeDiffSeconds = (endDate, startDate) => (
  {
    $divide: [
      {
        $subtract: [
          { $toDate: { $toDouble: endDate } },
          startDate
        ]
      },
      1000
    ]
  }
);

export const noAvailabilityRequestQuery = (filterOptions) => {
  let query = [
    {
      $match: {
        ...filterOptions,
        cancelledBy: 'NO_AVAILABILITY'
      }
    }
  ];

  query = query.concat([
    {
      $lookup: {
        from: 'Locations',
        localField: 'location',
        foreignField: '_id',
        as: 'locationInfo'
      }
    },
    {
      $lookup: {
        from: 'Rides',
        localField: '_id',
        foreignField: 'request',
        as: 'rides'
      }
    },
    {
      $project: {
        status: 1,
        rideCount: { $size: '$rides' },
        rides: 1,
        locationName: { $arrayElemAt: ['$locationInfo.name', 0] },
        locationId: { $arrayElemAt: ['$locationInfo._id', 0] }
      }
    },
    {
      $match: {
        rideCount: 0
      }
    },
    {
      $group: {
        _id: {
          locationName: '$locationName',
          locationId: '$locationId'
        },
        requestCount: {
          $sum: 1
        }
      }
    }
  ]);
  return query;
};

export const riderCancelledRequestQuery = (filterOptions) => {
  let query = [
    {
      $match: {
        ...filterOptions,
        cancelledBy: {
          $in: [
            'RIDER_ON_REQUEST',
            'DUPLICATE_REQUEST', null, // [LEGACY] null === DUPLICATE_REQUEST
            'ADMIN'
          ]
        }
      }
    }
  ];

  query = query.concat([
    {
      $lookup: {
        from: 'Locations',
        localField: 'location',
        foreignField: '_id',
        as: 'locationInfo'
      }
    },
    {
      $lookup: {
        from: 'Rides',
        localField: '_id',
        foreignField: 'request',
        as: 'rides'
      }
    },
    {
      $project: {
        status: 1,
        rideCount: { $size: '$rides' },
        rides: 1,
        locationName: { $arrayElemAt: ['$locationInfo.name', 0] },
        locationId: { $arrayElemAt: ['$locationInfo._id', 0] }
      }
    },
    {
      $match: {
        rideCount: 0
      }
    },
    {
      $group: {
        _id: {
          locationName: '$locationName',
          locationId: '$locationId'
        },
        requestCount: {
          $sum: 1
        }
      }
    }
  ]);
  return query;
};

export const buildRatingQuery = (userType, userId, limit = null) => {
  let params = [
    {
      $match: {
        [userType]: userId,
        status: 700
      }
    }
  ];
  if (limit) {
    params = params.concat([
      { $sort: { createdTimestamp: -1 } },
      { $limit: limit }
    ]);
  }
  return params;
};

export const paymentRequestQuery = (filterOptions, projectVars, groupOptions) => {
  let query = [
    {
      $match: {
        ...filterOptions,
        paymentInformation: { $exists: true }
      }
    }
  ];

  query = query.concat([
    {
      $lookup: {
        from: 'Locations',
        localField: 'location',
        foreignField: '_id',
        as: 'locationInfo'
      }
    },
    {
      $lookup: {
        from: 'Rides',
        localField: '_id',
        foreignField: 'request',
        as: 'rides'
      }
    },
    {
      $project: {
        status: 1,
        ride: { $arrayElemAt: ['$rides', 0] },
        locationName: { $arrayElemAt: ['$locationInfo.name', 0] },
        locationId: { $arrayElemAt: ['$locationInfo._id', 0] },
        paymentInformation: 1,
        locationInfo: 1
      }
    },
    {
      $project: {
        requesStatus: 1,
        rideStatus: '$ride.status',
        rideCancelledBy: '$ride.cancelledBy',
        rideDriver: '$ride.driver',
        rideRider: '$ride.rider',
        locationName: 1,
        locationId: 1,
        totalPayment: 1,
        ...projectVars
      }
    },
    {
      $group: {
        _id: {
          locationName: '$locationName',
          locationId: '$locationId'
        },
        ...groupOptions
      }
    }
  ]);
  return query;
};

export const promocodeQuery = (filterOptions, projectVars, groupOptions) => {
  let query = [
    {
      $match: {
        ...filterOptions
      }
    }
  ];

  query = query.concat([
    {
      $lookup: {
        from: 'Locations',
        localField: 'location',
        foreignField: '_id',
        as: 'locationInfo'
      }
    },
    {
      $project: {
        locationName: { $arrayElemAt: ['$locationInfo.name', 0] },
        locationId: { $arrayElemAt: ['$locationInfo._id', 0] },
        paymentInformation: 1,
        requestTimestamp: 1,
        ...projectVars
      }
    },
    {
      $group: {
        _id: {
          locationName: '$locationName',
          locationId: '$locationId',
          promocodeId: '$promocodeId',
          promocodeCode: '$promocodeCode'
        },
        timestamps: { $push: '$requestTimestamp' },
        ...groupOptions
      }
    }
  ]);
  return Requests.aggregate(query);
};

export const promocodeGroupedByCity = filterOptions => [
  {
    $match: {
      ...filterOptions,
      isDeleted: { $ne: true }
    }
  },
  {
    $lookup: {
      from: 'Locations',
      localField: 'location',
      foreignField: '_id',
      as: 'locationInfo'
    }
  },
  {
    $project: {
      locationName: { $arrayElemAt: ['$locationInfo.name', 0] },
      locationId: { $arrayElemAt: ['$locationInfo._id', 0] },
      promocodeCode: '$code',
      promocodeId: '$_id'
    }
  },
  {
    $sort: {
      requestTimestamp: 1
    }
  },
  {
    $group: {
      _id: {
        locationName: '$locationName',
        locationId: '$locationId',
        promocodeId: '$promocodeId'
      },
      promocodeCode: { $push: '$promocodeCode' }
    }
  },
  {
    $sort: {
      '_id.locationName': 1,
      '_id.promocodeId': 1
    }
  }
];

export const tipsQuery = filterOptions => [
  {
    $match: filterOptions
  },
  {
    $project: {
      locationId: 1,
      total: '$total',
      rideId: '$rideId'
    }
  },
  {
    $group: {
      _id: {
        locationId: '$locationId'
      },
      tipList: { $push: '$total' }
    }
  },
  {
    $addFields: {
      tipCount: { $size: '$tipList' },
      tipTotal: { $sum: '$tipList' }
    }
  }
];

const rideTimelineQuery = filterOptions => [
  {
    $match: filterOptions
  },
  {
    $group: {
      _id: {
        locationId: '$location'
      },
      rideCount: { $sum: 1 }
    }
  }
];

export const validateFilters = (req, locationTz = null) => {
  const filterParams = validator.validate(
    validator.rules.object().keys({
      filters: validator.rules.object().keys({
        start: validator.rules.string().isoDate(),
        end: validator.rules.string().isoDate(),
        locations: validator.rules.array().items(validator.rules.string())
      })
    }),
    req.query
  );

  if (filterParams && filterParams.filters) {
    if (filterParams.filters.start && filterParams.filters.end) {
      filterParams.filters = transformations
        .mapDateSearchAggregate(filterParams.filters, locationTz);
      return filterParams.filters;
    }
  }
  return null;
};

const groupLocationByTimezone = locations => locations.reduce((locGroups, loc) => {
  const locationGroups = locGroups;
  (locationGroups[loc.timezone] = locationGroups[loc.timezone] || []).push(loc);
  return locGroups;
}, {});

export const repeatQueryLocation = async (req, locations, defaultJson, filterOptionsInput, projectVars, groupOptions, collection = 'Rides', queryBuild = 'cityGroup', preGroupSort = {}, addOptions = {}) => {
  const filterOptions = filterOptionsInput;
  let filterTimestamp = {};
  let query;
  let queryResult;
  let locationResult;
  const result = [];

  const locGroups = groupLocationByTimezone(locations);
  const timezoneGroups = Object.keys(locGroups);
  let timezone;
  let location;
  for (let i = 0; i < timezoneGroups.length; i += 1) {
    timezone = timezoneGroups[i];
    const locationKey = collection === 'Tips' ? 'locationId' : 'location';
    filterOptions[locationKey] = { $in: locGroups[timezone].map(loc => loc._id) };

    filterTimestamp = validateFilters(req, timezone);
    if (filterTimestamp) {
      switch (collection) {
      case 'Rides':
        filterOptions.createdTimestamp = filterTimestamp;
        break;
      case 'Tips':
        filterOptions.rideTimestamp = filterTimestamp;
        break;
      default:
        filterOptions.requestTimestamp = filterTimestamp;
      }
    }

    switch (queryBuild) {
    case 'cityGroup':
      query = buildGroupByCityQuery(filterOptions, projectVars, groupOptions);
      break;
    case 'poolingGroup':
      query = buildGroupByPoolingCityQuery(filterOptions, projectVars, groupOptions);
      break;
    case 'missed':
      query = noAvailabilityRequestQuery(filterOptions);
      break;
    case 'cancelledRequest':
      query = riderCancelledRequestQuery(filterOptions);
      break;
    case 'payment':
      query = paymentRequestQuery(filterOptions, projectVars, groupOptions);
      break;
    case 'tips':
      query = tipsQuery(filterOptions);
      break;
    case 'ridesTimeline':
      query = rideTimelineQuery(filterOptions);
      break;
    default:
      query = buildGroupByCityRiderQuery(
        filterOptions, projectVars, groupOptions, addOptions, preGroupSort
      );
    }

    switch (collection) {
    case 'Rides':
      // eslint-disable-next-line no-await-in-loop
      queryResult = await Rides.aggregate(query).read('secondaryPreferred');
      break;
    case 'Tips':
      // eslint-disable-next-line no-await-in-loop
      queryResult = await Tips.aggregate(query).read('secondaryPreferred');
      break;
    default:
      // eslint-disable-next-line no-await-in-loop
      queryResult = await Requests.aggregate(query).read('secondaryPreferred');
    }

    for (let g = 0; g < locGroups[timezone].length; g += 1) {
      location = locGroups[timezone][g];
      locationResult = queryResult.find(
        // eslint-disable-next-line no-loop-func
        item => String(item._id.locationId) === String(location._id)
      );
      if (locationResult) {
        locationResult._id.locationName = locationResult._id.locationName || location.name;
      }
      result.push(
        locationResult
        || { _id: { locationName: location.name, locationId: location._id }, ...defaultJson }
      );
    }
  }
  return result;
};

export default {
  buildGroupByCityQuery,
  buildGroupByCityRiderQuery,
  buildGroupByPoolingCityQuery,
  timeDiffSeconds,
  noAvailabilityRequestQuery,
  riderCancelledRequestQuery,
  validateFilters,
  buildRatingQuery,
  paymentRequestQuery,
  repeatQueryLocation,
  promocodeGroupedByCity,
  tipsQuery
};
