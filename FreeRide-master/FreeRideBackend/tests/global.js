import nock from 'nock';
import sinon from 'sinon';
import { aws as config } from '../config';
import { syncIndexes } from './utils/helper';
import { stripe as stripeService } from '../services';

let googleApiMock;
let awsSESMock;
let sendgridMock;

const generateRandomPaymentId = () => `pi_${Math.random().toString(36).slice(2, 9)}`;
const generateRandomCustomerId = () => `cus_${Math.random().toString(36).slice(2, 9)}`;

export const ORIGINAL_STRIPE_CLIENT = stripeService.stripeClient;

const mockStripeClient = {
  paymentIntents: {
    retrieve: sinon.stub().callsFake(paymentIntentId => Promise.resolve({
      id: paymentIntentId,
      status: 'requires_capture',
      amount: 1000,
      currency: 'usd',
      created: Date.now()
    })),
    create: sinon.stub().callsFake(() => Promise.resolve({
      id: generateRandomPaymentId(),
      client_secret: 'secret_mocked',
      created: Date.now(),
      status: 'requires_confirmation'
    })),
    confirm: sinon.stub().callsFake(paymentIntentId => Promise.resolve({
      id: paymentIntentId,
      status: 'requires_capture'
    })),
    cancel: sinon.stub().callsFake(paymentIntentId => Promise.resolve({
      id: paymentIntentId,
      status: 'canceled'
    })),
    capture: sinon.stub().callsFake(paymentIntentId => Promise.resolve({
      id: paymentIntentId,
      status: 'succeeded'
    }))
  },
  customers: {
    retrieve: sinon.stub().callsFake(() => Promise.resolve({ id: generateRandomCustomerId(), email: 'rider@mail.com' })),
    list: sinon.stub().callsFake(() => Promise.resolve({
      data: [{ id: generateRandomCustomerId() }]
    })),
    create: sinon.stub().callsFake(() => Promise.resolve({ id: generateRandomCustomerId() })),
    update: sinon.stub().callsFake(() => Promise.resolve({ id: generateRandomCustomerId() })),
    del: sinon.stub().callsFake(() => Promise.resolve({ id: generateRandomCustomerId() }))
  },
  paymentMethods: {
    list: sinon.stub().returns(Promise.resolve({
      data: [
        {
          id: 'pm_mockedId',
          card: {
            brand: 'visa',
            last4: '0019'
          },
          type: 'card'
        }
      ]
    })),
    attach: sinon.stub().returns(Promise.resolve()),
    detach: sinon.stub().returns(Promise.resolve())
  },
  setupIntents: {
    create: sinon.stub().returns(Promise.resolve({ client_secret: 'secret_mocked' }))
  },
  // TODO: Improve
  // Tips are required to have value of 1000
  balanceTransactions: {
    retrieve: sinon.stub().returns(Promise.resolve({
      Id: generateRandomPaymentId(),
      total: 1000,
      net: 941,
      fee: 59
    }))
  }
};

export const mockStripe = () => {
  sinon.stub(stripeService, 'stripeClient').value(mockStripeClient);
};

exports.mochaHooks = {
  async beforeAll() {
    // Google API
    const url = 'https://maps.googleapis.com';
    const dirEndpoint = '/maps/api/directions/json';
    const matEndpoint = '/maps/api/distancematrix/json';
    const geoEndpoint = '/maps/api/geocode/json';

    const dirResult = {
      status: 'OK',
      fake: true,
      routes: [
        {
          legs: [
            {
              duration: {
                value: 100
              }
            },
            {
              duration: {
                value: 20
              }
            }
          ],
          overview_polyline: {
            points: [
              [38.5, -120.2],
              [40.7, -120.95]
            ]
          }
        }
      ]
    };

    const matResult = {
      status: 'OK',
      fake: true,
      rows: [
        {
          elements: [
            {
              status: 'FAKE_RESULTS',
              distance: {
                value: 100
              }
            }
          ]
        }
      ]
    };

    const geoResult = {
      results: [],
      status: 'FAIL'
    };

    googleApiMock = nock(url)
      .defaultReplyHeaders({
        'Content-Type': 'application/json; charset=UTF-8'
      })
      .get(dirEndpoint)
      .query(true)
      .reply(200, dirResult)
      .get(matEndpoint)
      .query(true)
      .reply(200, matResult)
      .get(geoEndpoint)
      .query(true)
      .reply(400, geoResult)
      .persist();

    // AWS SES
    awsSESMock = nock(config.testSesEndpoint)
      .post('/').reply(200).persist();

    // Stripe
    mockStripe(sinon);

    // Sendgrid
    const sendgridUrl = 'https://api.sendgrid.com';
    sendgridMock = nock(sendgridUrl)
      .post('/v3/mail/send')
      .reply(200, { response: { message: 'Mock success' }, success: true, error: null })
      .persist();

    try {
      await syncIndexes();
    } catch (error) {
      console.log(error);
    }
  },
  afterAll(done) {
    // Restore the original methods
    sinon.restore();
    googleApiMock.interceptors.forEach(nock.removeInterceptor);
    awsSESMock.interceptors.forEach(nock.removeInterceptor);
    sendgridMock.interceptors.forEach(nock.removeInterceptor);
    done();
  }
};

// Bonus: global fixture, runs once before everything.
// exports.mochaGlobalSetup = async function () {
// };

// exports.mochaGlobalTeardown = async function () {
// };
