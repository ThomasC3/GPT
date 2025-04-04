// eslint-disable-next-line no-unused-vars
import { websocket } from '../services';
import { MatchingRules } from '../models';

const createMatchingRules = async () => {
  console.log('Creating matching rules...');
  await MatchingRules.bulkWrite([
    {
      insertOne: {
        document: {
          key: 'shared',
          title: 'Shared',
          description: 'Designated for all requests across all zones'
        }
      }
    },
    {
      insertOne: {
        document: {
          key: 'priority',
          title: 'Priority',
          description: 'Designated for requests to or from specific zones but available for all requests if needed'
        }
      }
    },
    {
      insertOne: {
        document: {
          key: 'exclusive',
          title: 'Exclusive',
          description: 'Only designated for requests to or from specific zones'
        }
      }
    },
    {
      insertOne: {
        document: {
          key: 'locked',
          title: 'Locked',
          description: 'Only designated for requests that begin and end inside specific zones'
        }
      }
    }
  ]);
  console.log('Created matching rules');
  process.exit(0);
};

createMatchingRules();
