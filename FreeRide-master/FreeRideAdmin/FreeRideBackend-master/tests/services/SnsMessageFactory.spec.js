/* eslint-disable no-new */
import sinon from 'sinon';
import { SnsMessage } from '../../services/SnsMessage';
import { buildTranslator } from '../../utils/translation';

let snsMessageObject;

describe('SnsMessage', () => {
  describe('has no drivers available notification', () => {
    it('returns a message', async () => {
      const snsMessage = new SnsMessage('noDriversAvailable', {}, await buildTranslator());
      sinon.assert.match(snsMessage.message.title, 'All Drivers Are Busy');
    });
  });

  describe('has no "unknown" message', () => {
    it('throws an error when notification is not found', async () => {
      let errorMsg;
      try {
        new SnsMessage('Unknown', {}, await buildTranslator());
      } catch (err) {
        errorMsg = err.message;
      } finally {
        sinon.assert.match(!!errorMsg, true);
      }
    });
  });

  describe('incorporates parameters correctly', () => {
    it('returns title and body with rider\'s first and last name', async () => {
      const snsMessage = new SnsMessage(
        'riderRequestedCall',
        {
          riderFirstName: 'RiderFN',
          riderLastName: 'RiderLN'
        },
        await buildTranslator()
      );
      sinon.assert.match(snsMessage.message.title, 'RiderFN RiderLN Requested Call');
      return sinon.assert.match(snsMessage.message.body, 'RiderFN RiderLN is asking you to call them.');
    });
  });

  describe('maps according to mobile OS', () => {
    before(async () => {
      snsMessageObject = new SnsMessage('noDriversAvailable', {}, await buildTranslator());
    });
    it('has \'GCM\' key for android mapping', () => {
      const androidSnsMessage = snsMessageObject.mapNotificationToPlatform('android', 'debug');
      sinon.assert.match(Object.keys(JSON.parse(androidSnsMessage.Message)), ['GCM']);
    });

    it('has \'APNS_SANDBOX\' key for ios mapping', () => {
      const iosSnsMessage = snsMessageObject.mapNotificationToPlatform('ios', 'debug');
      sinon.assert.match(Object.keys(JSON.parse(iosSnsMessage.Message)), ['APNS_SANDBOX']);
    });
  });
});
