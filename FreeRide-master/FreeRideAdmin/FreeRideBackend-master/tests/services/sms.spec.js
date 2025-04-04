import { expect } from 'chai';
import sinon from 'sinon';
// eslint-disable-next-line no-unused-vars
import { websocket } from '../../services';
import { Settings } from '../../models';
import SMSService from '../../services/sms';

let sandbox;

describe('SMSService', () => {
  let sendStub;
  let getSettingsStub;
  let SMS;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sendStub = sandbox.stub().yields(null, { sid: 'test_sid' });
    getSettingsStub = sandbox.stub(Settings, 'getSettings').resolves({ smsDisabled: false });

    // Create the mocked Twilio client and inject it into the SMSService instance.
    const twilioClientMock = { messages: { create: sendStub } };
    SMS = new SMSService(twilioClientMock);
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('should send an SMS message successfully', async () => {
    getSettingsStub.resolves({ smsDisabled: false });
    sendStub.yields(null, { sid: 'test_sid' });

    const result = await SMS.send('toNumber', 'testBody');

    expect(result).to.equal('test_sid');
  });

  it('should throw an error if SMS is disabled', async () => {
    getSettingsStub.resolves({ smsDisabled: true });

    try {
      await SMS.send('toNumber', 'testBody');
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal('This feature is unavailable at this time.');
    }
  });

  it('should return false if the Twilio API call fails', async () => {
    getSettingsStub.resolves({ smsDisabled: false });
    sendStub.yields(new Error('Twilio error'), null);

    const result = await SMS.send('toNumber', 'testBody');

    expect(result).to.equal(false);
  });
});
