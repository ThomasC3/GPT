import { promocodeValidity } from './check';

export const addPromocodeStatus = async (request, promocodeStatus_ = null) => {
  const result = request.toJSON();
  let promocode;
  let promocodeStatus;
  if (request?.paymentInformation) {
    promocodeStatus = promocodeStatus_;
    if (promocodeStatus_ || request?.paymentInformation?.promocodeId) {
      if (!promocodeStatus_) {
        promocode = request?.paymentInformation?.promocodeId;
        promocodeStatus = await promocodeValidity(promocode._id, request.location, request.rider);
      }
      result.paymentInformation = {
        ...result.paymentInformation,
        ...promocodeStatus
      };
    }
  }
  return result;
};

export default {
  addPromocodeStatus
};
