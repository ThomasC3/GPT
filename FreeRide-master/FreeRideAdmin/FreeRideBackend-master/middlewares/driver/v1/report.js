import { Rides, Reports } from '../../../models';
import { validator, dump, errorCatchHandler } from '../../../utils';
import { ApplicationError } from '../../../errors';

const create = async (req, res) => {
  try {
    const { reason, ride: rideId, feedback } = validator.validate(
      validator.rules.object().keys({
        feedback: validator.rules.string().optional(),
        reason: validator.rules.string().required(),
        ride: validator.rules.string().required()
      }),
      req.body,
    );

    const { _id: driverId } = req.user;
    const ride = await Rides.findById(rideId);

    if (!ride) {
      throw new ApplicationError(`Ride with specified id of ${rideId} not found`);
    }

    if (!ride.rider) {
      throw new ApplicationError('This ride doesn\'t have rider');
    }

    if (driverId !== ride.driver.toString()) {
      throw new ApplicationError('Invalid ride being reported');
    }

    const report = await Reports.createByDriver({
      reason,
      feedback,
      ride: ride._id,
      reporter: ride.driver,
      reportee: ride.rider
    });

    res.json(dump.dumpRideReport(report));
  } catch (err) {
    errorCatchHandler(res, err, err.message || 'We are unable to report this Rider at this time.');
  }
};

export default {
  create
};
