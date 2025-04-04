// eslint-disable-next-line no-unused-vars
import app from '../../server';
import {
  Drivers, Locations, Zones
} from '../../models';
import mongodb from '../../services/mongodb';

export const syncIndexes = async () => Promise.all([
  Drivers.syncIndexes(),
  Locations.syncIndexes(),
  Zones.syncIndexes()
]);

export const emptyAllCollections = async () => {
  const collections = await mongodb.connection.collections;
  return Promise.all(Object.values(collections).map(collection => collection.deleteMany({})));
};

export const emptyCollection = async (collectionName) => {
  const collections = await mongodb.connection.collections;
  return Object.values(collections).find(
    col => collectionName === col.collectionName
  ).deleteMany({});
};

export const emptyCollectionList = async collectionNames => (
  collectionNames.map(collection => emptyCollection(collection))
);

export default {
  syncIndexes,
  emptyAllCollections,
  emptyCollection,
  emptyCollectionList
};
