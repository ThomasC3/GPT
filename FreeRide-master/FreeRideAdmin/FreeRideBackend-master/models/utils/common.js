export const lookupBuilder = (type, key, projectParams = { firstName: 1, lastName: 1 }) => (
  {
    $lookup: {
      from: `${type}s`,
      let: { key: `$${key}` },
      pipeline: [
        { $match: { $expr: { $eq: ['$$key', '$_id'] } } },
        {
          $project: {
            _id: 0, id: '$_id', ...projectParams
          }
        }
      ],
      as: type.toLowerCase()
    }
  }
);

export default { lookupBuilder };
