/* eslint-disable no-new */
import sinon from 'sinon';
import stripe from 'stripe';

import { stripe as stripeConfig } from '../../config';
import { Requests, Settings } from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { createRefundWebhookEvent } from '../utils/webhook';

describe('paymentEventsProcessor', () => {
  let sandbox;
  let header;
  let payloadString;

  const refundEventPayload = {
    created: 1326853478,
    livemode: false,
    id: 'evt_00000000000000',
    type: 'charge.refunded',
    object: 'event',
    request: null,
    pending_webhooks: 1,
    api_version: null,
    data: {
      object: {
        id: 'ch_00000000000000',
        object: 'charge',
        amount: 100,
        amount_refunded: 100,
        application: null,
        application_fee: null,
        application_fee_amount: null,
        balance_transaction: 'txn_00000000000000',
        billing_details: {
          address: {
            city: null,
            country: null,
            line1: null,
            line2: null,
            postal_code: null,
            state: null
          },
          email: null,
          name: null,
          phone: null
        },
        calculated_statement_descriptor: null,
        captured: true,
        created: 1588788328,
        currency: 'usd',
        customer: 'cus_00000000000000',
        description: null,
        disputed: false,
        failure_code: 'card_declined',
        failure_message: 'O seu cartão foi recusado.',
        fraud_details: {
          stripe_report: 'fraudulent'
        },
        invoice: null,
        livemode: false,
        metadata: {
        },
        on_behalf_of: null,
        order: null,
        outcome: {
          network_status: 'not_sent_to_network',
          reason: 'merchant_blacklist',
          risk_level: 'highest',
          risk_score: 80,
          seller_message: 'Stripe blocked this payment.',
          type: 'blocked'
        },
        paid: true,
        payment_intent: 'pi_00000000000000',
        payment_method: 'pm_00000000000000',
        payment_method_details: {
          card: {
            brand: 'visa',
            checks: {
              address_line1_check: null,
              address_postal_code_check: null,
              cvc_check: 'unavailable'
            },
            country: 'US',
            exp_month: 5,
            exp_year: 2055,
            fingerprint: '9rMB0zzAat3ZDC5v',
            funding: 'credit',
            installments: null,
            last4: '0019',
            network: 'visa',
            three_d_secure: null,
            wallet: null
          },
          type: 'card'
        },
        receipt_email: 'jnogueira@whitesmith.co',
        receipt_number: null,
        receipt_url: null,
        refunded: true,
        refunds: {
          object: 'list',
          data: [
            {
              id: 're_00000000000000',
              object: 'refund',
              amount: 100,
              balance_transaction: 'txn_00000000000000',
              charge: 'ch_00000000000000',
              created: 1589470243,
              currency: 'usd',
              metadata: {
              },
              payment_intent: 'pi_00000000000000',
              reason: null,
              receipt_number: '1421-1119',
              source_transfer_reversal: null,
              status: 'succeeded',
              transfer_reversal: null
            }
          ],
          has_more: false,
          url: '/v1/charges/ch_1GfrcaAqHrg9L9br7GFb1QGD/refunds'
        },
        review: null,
        shipping: null,
        source_transfer: null,
        statement_descriptor: 'Circuit ride',
        statement_descriptor_suffix: null,
        status: 'succeeded',
        transfer_data: null,
        transfer_group: null,
        fee: 0
      }
    }
  };

  before(async () => {
    sandbox = sinon.createSandbox();
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
  });

  beforeEach(async () => {
    sandbox.restore();
    await Requests.deleteMany();
  });

  describe('on charge.refunded', () => {
    beforeEach(async () => {
      payloadString = JSON.stringify(refundEventPayload, null, 2);
      header = stripe.webhooks.generateTestHeaderString({
        payload: payloadString, secret: stripeConfig.signing_secret
      });
    });

    describe('execute', () => {
      it('updates request refund info and throws no signature issue', async () => {
        let request = await Requests.create({
          dropoffAddress: '178 Broadway, Brooklyn, NY 11211, USA',
          dropoffLatitude: 40.709924,
          dropoffLongitude: -73.962413,
          isADA: false,
          location: '5d41eb558f144230ac51e29d',
          passengers: 1,
          pickupAddress: '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA',
          pickupLatitude: 40.683619,
          pickupLongitude: -73.907704,
          rider: '5d41eb558f144230ac51e29d',
          status: 102,
          paymentInformation: {
            paymentIntentId: 'pi_00000000000000'
          },
          pickupZone: {
            id: '5d41eb558f144230ac51e29d',
            name: 'Pickup Zone'
          },
          dropoffZone: {
            id: '5d41eb558f144230ac51e29d',
            name: 'Dropoff Zone'
          }
        });

        await createRefundWebhookEvent(header, payloadString);

        request = await Requests.findById(request.id);

        sinon.assert.match(
          request.paymentInformation.amountRefunded, refundEventPayload.data.object.amount_refunded
        );
      });

      it('Throws signature issue', async () => {
        header = stripe.webhooks.generateTestHeaderString({
          payload: payloadString, secret: 'fakeSecret'
        });

        const response = await createRefundWebhookEvent(header, payloadString);
        sinon.assert.match(response.status, 400);
      });
    });
  });
});
