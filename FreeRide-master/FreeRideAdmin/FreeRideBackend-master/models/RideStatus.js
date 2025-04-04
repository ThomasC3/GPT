const RideStatus = {
  RequestCancelled: 101,
  RideInQueue: 200,
  NextInQueue: 201,
  DriverEnRoute: 202,
  DriverArrived: 203,
  CancelledInQueue: 204,
  CancelledEnRoute: 205,
  CancelledNoShow: 206,
  CancelledNotAble: 207,
  RideInProgress: 300,
  RideComplete: 700,
  RandomRideComplete: 701
};

Object.freeze(RideStatus);

export default RideStatus;
