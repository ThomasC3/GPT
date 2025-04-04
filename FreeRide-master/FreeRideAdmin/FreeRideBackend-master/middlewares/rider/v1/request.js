import { Requests, RequestStatus } from '../../../models';
import { validator, errorCatchHandler, responseHandler } from '../../../utils';
import { dumpRequestForRider } from '../../../utils/dump';
import { addPromocodeStatus } from '../../../utils/promocode';

const getRequests = async (req, res) => {
  try {
    const { _id: riderId } = req.user;

    const filterParams = validator.validate(
      validator.rules.object().keys({
        status: validator.rules.number()
          .min(RequestStatus.RideRequested).max(RequestStatus.RequestAccepted),
        passengers: validator.rules.number(),
        id: validator.rules.string(),
        driver: validator.rules.string()
      }),
      req.query
    );

    const requests = await Requests.getRequests({ ...filterParams, rider: riderId });
    const promises = requests.items.map(addPromocodeStatus);
    const requestsList = await Promise.all(promises);

    responseHandler(
      requestsList.map(dumpRequestForRider),
      res
    );
  } catch (err) {
    errorCatchHandler(
      res,
      err,
      'Something went wrong. Please try again.',
      req.t,
      'genericFailure'
    );
  }
};

export default {
  getRequests
};
