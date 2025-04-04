import request from 'supertest-promised';
import app from '../../server';
import { domain } from '../../config';

export const createRefundWebhookEvent = async (stripeSignature, body) => request(app)
  .post('/v1/payments/webhook')
  .set('host', domain.admin)
  .set('Accept', 'application/json')
  .set('Content-Type', 'application/json')
  .set('stripe-signature', stripeSignature)
  .send(body);

export default {
  createRefundWebhookEvent
};
