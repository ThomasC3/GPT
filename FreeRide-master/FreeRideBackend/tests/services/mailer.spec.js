import { expect } from 'chai';
import sinon from 'sinon';
import { SesMailer } from '../../services';
import { Rides } from '../../models';
import { dump } from '../../utils';
import { domain } from '../../config';
import { auth0ClientInstance } from '../../middlewares/admin/utils/Auth0Client';
import { AdminRoles } from '../utils/admin';

describe('SesMailer', () => {
  describe('sendNewRiderReport', () => {
    let sesMailerInstance;
    let sendStub;
    let rideMock;
    let auth0ClientMock;
    let dumpStub;

    beforeEach(() => {
      sesMailerInstance = SesMailer;
      sendStub = sinon.stub(sesMailerInstance, 'send').resolves(true);
      rideMock = sinon.stub(Rides, 'findById').returns({
        populate: sinon.stub().returnsThis(),
        location: { _id: 'locationId' }
      });
      auth0ClientMock = sinon.stub(auth0ClientInstance, 'getAdminsByRoleAndLocation').resolves([
        { email: 'manager@mail.com', role: AdminRoles.LOCATION_MANAGER },
        { email: 'viewer@mail.com', role: AdminRoles.LOCATION_VIEWER }
      ]);
      dumpStub = sinon.stub(dump, 'dumpEmailReportData').returns({});
    });

    afterEach(() => {
      sendStub.restore();
      rideMock.restore();
      auth0ClientMock.restore();
      dumpStub.restore();
    });

    it('should send a new rider report email', async () => {
      const report = { ride: { id: 'rideId' } };
      await sesMailerInstance.sendNewRiderReport(report);

      expect(rideMock.calledWith(report.ride.id)).to.equal(true);
      expect(auth0ClientMock.called).to.equal(true);
      expect(dumpStub.calledWith({
        ride: rideMock.returnValues[0],
        report,
        domain: domain.admin
      })).to.equal(true);
      expect(sendStub.called).to.equal(true);
      expect(sendStub.firstCall.args[1]).to.deep.equal(['manager@mail.com', 'viewer@mail.com']);
    });
  });
});
