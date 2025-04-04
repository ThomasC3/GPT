import stripe from 'stripe';
import { stripe as stripeConfig } from '../../../config';
import { PaymentEventsProcessor } from '../../../services';
import { AdminSentry } from '..';
import logger from '../../../logger';

const paymentEvents = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const endpointSecret = stripeConfig.signing_secret;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, signature, endpointSecret);
  } catch (error) {
    logger.error(error);
    AdminSentry.captureAdminException(error);
    res.status(400).send();
    return null;
  }

  try {
    const eventProcessor = new PaymentEventsProcessor(event);
    await eventProcessor.execute();

    res.json({ received: true });
  } catch (error) {
    logger.error(error);
    AdminSentry.captureAdminException(error);
    res.status(400).end();
  }

  return null;
};

export default { paymentEvents };
