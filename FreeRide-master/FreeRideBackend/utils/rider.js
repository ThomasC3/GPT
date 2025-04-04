import momentTimezone from 'moment-timezone';
import { Riders } from '../models';
import { sns, stripe } from '../services';

export const riderDeleteHelper = async (rider) => {
  const { subscriptions, _id } = rider;

  subscriptions.receipt = false;

  const deletedRider = await Riders.findOneAndUpdate(
    { _id },
    {
      isDeleted: true,
      email: `${_id}_${rider.email}`,
      phone: `${_id}_${rider.phone}`,
      google: rider.google ? `${_id}_${rider.google}` : undefined,
      apple: rider.apple ? `${_id}_${rider.apple}` : undefined,
      subscriptions
    },
    { new: true, upsert: false }
  );

  if (rider.stripeCustomerId) {
    await stripe.deleteCustomer(rider.stripeCustomerId);
  }

  await sns.deleteEndpointsByUser('RIDER', rider._id);

  return deletedRider;
};

export const emailVerificationDeadline = () => momentTimezone().add(7, 'days');

export default {
  riderDeleteHelper,
  emailVerificationDeadline
};
