// eslint-disable-next-line no-unused-vars
import { websocket } from '../services';

import {
  Rides, RideStatus,
  RequestStatus, Requests
} from '../models';

export const cleanRequestsAndRidesLoadTestData = async () => {
  const rides = await Rides.updateMany(
    { pickupAddress: 'LoadTestPickUp' },
    {
      cancelledBy: 'ADMIN',
      status: RideStatus.RequestCancelled,
      cancelTimestamp: Date.now()
    }
  );
  console.log(rides);

  const requests = await Requests.updateMany(
    { pickupAddress: 'LoadTestPickUp', driver: null },
    {
      cancelledBy: 'ADMIN',
      status: RequestStatus.RequestCancelled,
      cancelTimestamp: Date.now()
    }
  );
  console.log(requests);
};

export const run = async () => {
  await cleanRequestsAndRidesLoadTestData();
  console.log('Cleaned!');
  process.exit(0);
};

run();

export default run;
