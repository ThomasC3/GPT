import { expect } from 'chai';
import sinon from 'sinon';
import { isEmailBlacklisted } from '../../middlewares/rider/utils/email';
import { Settings } from '../../models';

let sandbox;

describe('isEmailBlacklisted', () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('should return true if email domain is blacklisted', async () => {
    const blacklistedDomains = 'example.com,example.org';
    const email = 'user@example.com';

    sandbox.stub(Settings, 'getSettings').resolves({
      blacklistedEmailDomains: blacklistedDomains
    });

    const result = await isEmailBlacklisted(email);

    expect(result).to.be.equal(true);
  });

  it('should return false if email domain is not blacklisted', async () => {
    const blacklistedDomains = 'example.com,example.org';
    const email = 'user@notblacklisted.com';

    sandbox.stub(Settings, 'getSettings').resolves({
      blacklistedEmailDomains: blacklistedDomains
    });

    const result = await isEmailBlacklisted(email);

    expect(result).to.be.equal(false);
  });

  it('should return false if settings are not available', async () => {
    const email = 'user@example.com';

    sandbox.stub(Settings, 'getSettings').resolves(null);

    const result = await isEmailBlacklisted(email);

    expect(result).to.be.equal(false);
  });

  it('should return false if an error occurs', async () => {
    const email = 'user@example.com';

    sandbox.stub(Settings, 'getSettings').rejects(new Error('Some error'));

    const result = await isEmailBlacklisted(email);

    expect(result).to.be.equal(false);
  });
});
