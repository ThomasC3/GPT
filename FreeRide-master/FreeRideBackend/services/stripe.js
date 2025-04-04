import * as Sentry from '@sentry/node';
import stripe from 'stripe';
import { stripe as stripeConfig } from '../config';
import logger from '../logger';
import { ApplicationError } from '../errors';

const ALLOWED_CANCEL_STATUS = ['requires_payment_method', 'requires_capture', 'requires_confirmation', 'requires_action'];
const ALLOWED_CAPTURE_STATUS = ['requires_capture'];

export class StripeService {
  constructor(config) {
    this.config = config;

    this.stripeClient = stripe(stripeConfig.secret_key);
  }

  async createCustomer(rider) {
    const result = await this.stripeClient.customers.list({ email: rider.email });
    let customer = result.data[0];
    if (!customer) {
      customer = await this.stripeClient.customers.create({
        name: `${rider.firstName} ${rider.lastName}`,
        email: rider.email,
        phone: rider.phone,
        metadata: {
          riderId: String(rider._id)
        }
      });
    }
    return customer.id;
  }

  async updateCustomer(rider) {
    const customer = await this.stripeClient.customers.update(rider.stripeCustomerId, {
      email: rider.email
    });
    return customer;
  }

  async getCustomer(customerId) {
    try {
      const customer = await this.stripeClient.customers.retrieve(customerId);
      return customer;
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error);
      throw new ApplicationError(`Could not get Stripe customer info for ${customerId}`);
    }
  }

  async deleteCustomer(customerId) {
    try {
      const customer = await this.stripeClient.customers.del(customerId);
      return customer;
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error);
      throw new ApplicationError(`Could not delete Stripe customer ${customerId}`);
    }
  }

  async getPaymentMethods(customerId) {
    try {
      const paymentMethods = await this.stripeClient.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });
      return paymentMethods.data;
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error);
      throw new ApplicationError(`Could not get payment methods for ${customerId}`);
    }
  }

  async attachPaymentMethod(customerId, paymentMethodId) {
    try {
      await this.stripeClient.paymentMethods.attach(
        paymentMethodId,
        {
          customer: customerId
        }
      );
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error);
      throw new ApplicationError(`Could not attach ${paymentMethodId} to ${customerId}`);
    }
  }

  async clearPaymentMethods(customerId) {
    try {
      const paymentMethodList = await this.getPaymentMethods(customerId);
      const promises = [];
      let cardId;
      for (let i = 0; i < paymentMethodList.length; i += 1) {
        cardId = paymentMethodList[i].id;
        promises.push(
          this.stripeClient.paymentMethods.detach(cardId)
        );
      }
      await Promise.all(promises);
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error);
      throw new ApplicationError(`Could not clear payment methods for ${customerId}`);
    }
  }

  async createSetupIntent(customerId) {
    try {
      const setupIntent = await this.stripeClient.setupIntents.create({
        customer: customerId
      });
      return setupIntent;
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error);
      throw new ApplicationError(`Could not create setup intent for ${customerId}`);
    }
  }

  async createPaymentIntent(customerId, value, currency = 'usd', statement_descriptor = 'Circuit ride', metadata = {}) {
    try {
      const paymentMethodList = await this.getPaymentMethods(customerId);

      if (paymentMethodList.length === 0 || !paymentMethodList[0].id) {
        throw new ApplicationError(`User ${customerId} has no valid payment methods`);
      }

      const cardId = paymentMethodList[0].id;

      let paymentIntent = {};
      if (value > 0) {
        paymentIntent = await this.stripeClient.paymentIntents.create({
          amount: value,
          currency,
          customer: customerId,
          payment_method: cardId,
          capture_method: 'manual',
          statement_descriptor,
          metadata
        });
      }

      return paymentIntent;
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error);
      throw new ApplicationError(`Could not create payment intent for ${customerId}`);
    }
  }

  async confirmPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await this.stripeClient.paymentIntents.retrieve(
        paymentIntentId
      );
      if (paymentIntent.status === 'requires_capture') {
        return paymentIntent;
      }
      const confirmedPaymentIntent = await this.stripeClient.paymentIntents.confirm(
        paymentIntentId
      );

      return confirmedPaymentIntent;
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error);
      throw new ApplicationError(`Could not confirm ${paymentIntentId}`);
    }
  }

  async cancelPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await this.stripeClient.paymentIntents.retrieve(
        paymentIntentId
      );
      if (!(ALLOWED_CANCEL_STATUS.includes(paymentIntent.status))) {
        return paymentIntent;
      }
      const cancelledPaymentIntent = await this.stripeClient.paymentIntents.cancel(
        paymentIntentId
      );
      return cancelledPaymentIntent;
    } catch (error) {
      if (error?.payment_intent?.status === 'canceled') {
        return error.payment_intent;
      }
      logger.error(error);
      Sentry.captureException(error);

      throw new ApplicationError(`Could not cancel ${paymentIntentId}`);
    }
  }

  async captureFunds(paymentIntentId, value) {
    try {
      const paymentIntent = await this.stripeClient.paymentIntents.retrieve(
        paymentIntentId
      );
      if (!(ALLOWED_CAPTURE_STATUS.includes(paymentIntent.status))) {
        return paymentIntent;
      }
      const capturedPaymentIntent = await this.stripeClient.paymentIntents.capture(
        paymentIntentId,
        {
          amount_to_capture: value
        }
      );

      return capturedPaymentIntent;
    } catch (error) {
      if (error.payment_intent.status === 'succeeded') {
        return error.payment_intent;
      }
      logger.error(error);
      Sentry.captureException(error);
      throw new ApplicationError(`Could not capture ${paymentIntentId}`);
    }
  }

  async getBalanceTransaction(balanceTransactionId) {
    try {
      return this.stripeClient.balanceTransactions.retrieve(
        balanceTransactionId
      );
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error);

      throw new ApplicationError(`Could not get balanceTransactionId '${balanceTransactionId}'`);
    }
  }
}

export default new StripeService(stripeConfig);
