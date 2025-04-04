// eslint-disable-next-line no-unused-vars
import { websocket } from '../services';
import { Services } from '../models';

const createServices = async () => {
  console.log('Creating services...');
  await Services.bulkWrite([
    {
      insertOne: {
        document: {
          key: 'ada_only',
          title: 'ADA Only',
          desc: 'Service for ADA passengers only'
        }
      }
    },
    {
      insertOne: {
        document: {
          key: 'passenger_only',
          title: 'Regular Service',
          desc: 'Service for regular passengers'
        }
      }
    },
    {
      insertOne: {
        document: {
          key: 'mixed_service',
          title: 'Mixed Service',
          desc: 'Service for both regular and ADA passengers'
        }
      }
    }
  ]);
  console.log('Created services');
  process.exit(0);
};

createServices();
