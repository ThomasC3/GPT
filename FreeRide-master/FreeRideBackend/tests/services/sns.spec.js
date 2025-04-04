/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import sinon from 'sinon';
import mongoose from 'mongoose';
import { sns as snsService } from '../../services';
import { SnsArns } from '../../models';

describe('SNS Service', () => {
  let sandbox;
  let createPlatformEndpointStub;
  let findStub;
  let publishStub;
  let deleteEndpointByDeviceTokenStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    createPlatformEndpointStub = sandbox.stub(
      snsService.sns,
      'createPlatformEndpoint'
    );
    findStub = sandbox.stub(SnsArns, 'find');
    publishStub = sandbox.stub(snsService.sns, 'publish');
    deleteEndpointByDeviceTokenStub = sandbox.stub(snsService, 'deleteEndpointByDeviceToken');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('createSnsEndpoint', () => {
    it('should generate correct PlatformApplicationArn for different combinations', async () => {
      const combinations = [
        {
          platform: 'ios',
          type: 'rider',
          env: 'debug',
          expectedArn:
            'arn:aws:sns:us-east-1:123456789012:app/APNS_SANDBOX/ios_rider_debug'
        },
        {
          platform: 'ios',
          type: 'rider',
          env: 'release',
          expectedArn:
            'arn:aws:sns:us-east-1:123456789012:app/APNS_SANDBOX/ios_rider_release'
        },
        {
          platform: 'ios',
          type: 'driver',
          env: 'release',
          expectedArn:
            'arn:aws:sns:us-east-1:123456789012:app/APNS_SANDBOX/ios_driver_release'
        },
        {
          platform: 'ios',
          type: 'driver',
          env: 'debug',
          expectedArn:
            'arn:aws:sns:us-east-1:123456789012:app/APNS_SANDBOX/ios_driver_debug'
        },
        {
          platform: 'android',
          type: 'rider',
          env: 'release',
          expectedArn:
            'arn:aws:sns:us-east-1:123456789012:app/GCM/android_rider_release'
        },
        {
          platform: 'android',
          type: 'rider',
          env: 'release_2',
          expectedArn:
            'arn:aws:sns:us-east-1:123456789012:app/GCM/android_rider_release_2'
        },
        {
          platform: 'android',
          type: 'rider',
          env: 'debug',
          expectedArn:
            'arn:aws:sns:us-east-1:123456789012:app/GCM/android_rider_debug'
        },
        {
          platform: 'android',
          type: 'rider',
          env: 'staging',
          expectedArn:
            'arn:aws:sns:us-east-1:123456789012:app/GCM/android_rider_staging'
        },
        {
          platform: 'android',
          type: 'rider',
          env: 'release_3',
          expectedArn:
            'arn:aws:sns:us-east-1:123456789012:app/GCM/android_rider_release_3'
        }
      ];

      for (const {
        platform, type, env, expectedArn
      } of combinations) {
        createPlatformEndpointStub.returns({
          promise: () => Promise.resolve({
            EndpointArn: 'expectedArnEndpoint'
          })
        });

        await snsService.createSnsEndpoint(
          type,
          new mongoose.Types.ObjectId(),
          'deviceToken',
          platform,
          env
        );

        sinon.assert.calledWithMatch(createPlatformEndpointStub, {
          PlatformApplicationArn: expectedArn,
          Token: 'deviceToken'
        });
      }
    });
  });
  describe('send', () => {
    it('should call publish with correct parameters and handle EndpointDisabled error', async () => {
      const userArns = [
        {
          userType: 'rider',
          userId: new mongoose.Types.ObjectId(),
          platform: 'ios',
          env: 'debug',
          endpointArn: 'arn:aws:sns:us-east-1:123456789012:endpoint/APNS_SANDBOX/ios_rider_debug/123',
          deviceToken: 'deviceToken1'
        }
      ];

      findStub.returns(Promise.resolve(userArns));

      publishStub.onFirstCall().returns({
        // eslint-disable-next-line prefer-promise-reject-errors
        promise: () => Promise.reject({ code: 'EndpointDisabled', message: 'Endpoint is disabled.' })
      });

      const SnsMessageObject = {
        mapNotificationToPlatform: sinon.stub().returns({
          Message: JSON.stringify({ default: 'Test message' }),
          MessageStructure: 'json',
          TargetArn: userArns[0].endpointArn
        })
      };

      await snsService.send('rider', userArns[0].userId, SnsMessageObject);

      sinon.assert.calledOnceWithExactly(SnsMessageObject.mapNotificationToPlatform, 'ios', 'debug');
      sinon.assert.calledOnceWithExactly(publishStub, {
        Message: JSON.stringify({ default: 'Test message' }),
        MessageStructure: 'json',
        TargetArn: userArns[0].endpointArn
      });
      sinon.assert.calledOnceWithExactly(deleteEndpointByDeviceTokenStub, 'deviceToken1');
    });
  });
});
