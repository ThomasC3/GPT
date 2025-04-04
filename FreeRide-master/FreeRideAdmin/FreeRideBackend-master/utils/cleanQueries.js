import {
  Rides, RideStatus,
  RequestStatus, Requests
} from '../models';

export const cleanRequestsAndRidesLoadTestData = async () => {
  const rides = await Rides.updateOne(
    { pickupAddress: 'LoadTestPickUp' },
    {
      $set: {
        cancelledBy: 'ADMIN',
        status: RideStatus.RequestCancelled,
        cancelTimestamp: Date.now()
      }
    }
  );
  console.log(rides);

  const requests = await Requests.updateOne(
    { pickupAddress: 'LoadTestPickUp', driver: null },
    {
      $set: {
        cancelledBy: 'ADMIN',
        status: RequestStatus.RequestCancelled,
        cancelTimestamp: Date.now()
      }
    }
  );
  console.log(requests);
};

export default cleanRequestsAndRidesLoadTestData;
