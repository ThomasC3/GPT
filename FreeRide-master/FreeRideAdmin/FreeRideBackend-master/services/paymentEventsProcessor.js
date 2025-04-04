/* eslint-disable class-methods-use-this */
import logger from '../logger';
import { PaymentStatus, Requests, Tips } from '../models';

const REFUNDED_STATUS = PaymentStatus.properties[PaymentStatus.refunded].name;

export default class PaymentEventsProcessor {
  constructor(event) {
    this.event = event;
    this.object = event.data.object;
  }

  async execute() {
    switch (this.event.type) {
    case 'charge.refunded':
      logger.info('Charge Refund Event');
      await this.handleChargeRefund(
        this.object.payment_intent, this.object.amount_refunded,
        this.object.captured, this.object.refunded, this.object.metadata
      );
      break;
    default:
      throw new Error(`Invalid payment event type "${this.event.type}"`);
    }

    return null;
  }

  async handleChargeRefund(paymentIntentId, amountRefunded, captured, refunded, metadata) {
    const wasCapturedAndRefunded = captured && (refunded || amountRefunded > 0);
    if (!wasCapturedAndRefunded) {
      return true;
    }

    if (metadata.paymentIntentType === 'tip') {
      return this.handleTipChargeRefund(paymentIntentId, amountRefunded);
    }

    return this.handlePaymentChargeRefund(paymentIntentId, amountRefunded);
  }

  async handlePaymentChargeRefund(paymentIntentId, amountRefunded) {
    return Requests.findOneAndUpdate(
      { 'paymentInformation.paymentIntentId': paymentIntentId },
      {
        $set: {
          'paymentInformation.amountRefunded': amountRefunded,
          'paymentInformation.status': REFUNDED_STATUS
        }
      }
    );
  }

  async handleTipChargeRefund(paymentIntentId, amountRefunded) {
    return Tips.findOneAndUpdate(
      { paymentIntentId },
      { $set: { amountRefunded, status: REFUNDED_STATUS } }
    );
  }
}
