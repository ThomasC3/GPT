import { Rides, Reports } from '../../../models';
import {
  validator, dump,
  errorCatchHandler,
  responseHandler
} from '../../../utils';
import { RideNotFoundError, ApplicationError } from '../../../errors';

const create = async (req, res) => {
  try {
    const { reason, ride: rideId } = validator.validate(
      validator.rules.object().keys({
        reason: validator.rules.string().required(),
        feedback: validator.rules.string().optional(),
        ride: validator.rules.string().required()
      }),
      req.body
    );
    const { _id: riderId } = req.user;
    const ride = await Rides.findById(rideId);

    if (!ride) {
      throw new RideNotFoundError(`Ride with specified id of ${rideId} not found`, 'ride.notFound', { rideId });
    }

    if (!ride.rider) {
      throw new ApplicationError('This ride doesn\'t have rider', 500, 'ride.noRider');
    }

    if (riderId !== ride.rider.toString()) {
      throw new ApplicationError('Wrong ride id', 500, 'ride.wrongId');
    }

    const report = await Reports.createByRider({
      reason,
      ride: ride._id,
      reporter: ride.rider,
      reportee: ride.driver
    });

    responseHandler(
      dump.dumpRideReport(report),
      res
    );
  } catch (error) {
    errorCatchHandler(
      res,
      error,
      'We are unable to report this Driver at this time.',
      req.t,
      'reportByRider.driver'
    );
  }
};

export default {
  create
};
