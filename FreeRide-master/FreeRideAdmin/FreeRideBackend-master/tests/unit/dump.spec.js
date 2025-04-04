import sinon from 'sinon';
import { Locations, Settings } from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { dumpLocation, dumpLocationForAdmin } from '../../utils/dump';

let sandbox;
let location;

describe('Pincode', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.create({
      name: 'Location',
      isUsingServiceTimes: false,
      isActive: true,
      serviceArea: [
        {
          latitude: 40.2246842,
          longitude: -8.4420742
        },
        {
          latitude: 40.2238472,
          longitude: -8.3978139
        },
        {
          latitude: 40.1860998,
          longitude: -8.3972703
        },
        {
          latitude: 40.189714,
          longitude: -8.430009
        },
        {
          latitude: 40.2246842,
          longitude: -8.4420742
        }
      ],
      closedCopy: 'closedCopy',
      suspendedCopy: 'suspendedCopy',
      suspendedTitle: 'suspendedTitle',
      alert: {
        title: 'alert.title',
        copy: 'alert.copy'
      },
      failedAgeRequirementAlert: {
        title: 'failedAgeRequirementAlertTitle',
        copy: 'failedAgeRequirementAlertCopy'
      },
      ridesFareCopy: 'ridesFareCopy',
      copyData: [
        {
          alert: {
            title: 't.alert.title',
            copy: 't.alert.copy'
          },
          locale: 't.locale',
          localeName: 't.localeName',
          closedCopy: 't.closedCopy',
          suspendedCopy: 't.suspendedCopy',
          suspendedTitle: 't.suspendedTitle',
          pwywCopy: 't.pwywCopy',
          failedAgeRequirementAlert: {
            title: 't.failedAgeRequirementAlertTitle',
            copy: 't.failedAgeRequirementAlertCopy'
          },
          ridesFareCopy: 't.ridesFareCopy'
        }
      ]
    });
  });

  beforeEach(async () => {
    sandbox.restore();
  });

  describe('Location dump', () => {
    it('Should translate if there is a translation', async () => {
      const testLocation = await Locations.findById(location._id);
      const dump = dumpLocation(testLocation, 't.locale');

      sinon.assert.match(dump.closedCopy, 't.closedCopy');
      sinon.assert.match(dump.suspendedCopy, 't.suspendedCopy');
      sinon.assert.match(dump.suspendedTitle, 't.suspendedTitle');
      sinon.assert.match(dump.pwywCopy, 't.pwywCopy');

      sinon.assert.match(dump.failedAgeRequirementAlert.title, 't.failedAgeRequirementAlertTitle');
      sinon.assert.match(dump.failedAgeRequirementAlert.copy, 't.failedAgeRequirementAlertCopy');
      sinon.assert.match(dump.ridesFareCopy, 't.ridesFareCopy');
      sinon.assert.match(dump.alert.title, 't.alert.title');
      return sinon.assert.match(dump.alert.copy, 't.alert.copy');
    });

    it('Should translate to default if there no translation', async () => {
      const testLocation = await Locations.findById(location._id);
      testLocation.copyData = [];
      const dump = dumpLocation(testLocation, 't.locale');

      sinon.assert.match(dump.closedCopy, 'closedCopy');
      sinon.assert.match(dump.suspendedCopy, 'suspendedCopy');
      sinon.assert.match(dump.suspendedTitle, 'suspendedTitle');

      sinon.assert.match(dump.failedAgeRequirementAlert.title, 'failedAgeRequirementAlertTitle');
      sinon.assert.match(dump.failedAgeRequirementAlert.copy, 'failedAgeRequirementAlertCopy');
      sinon.assert.match(dump.ridesFareCopy, 'ridesFareCopy');
      sinon.assert.match(dump.alert.title, 'alert.title');
      return sinon.assert.match(dump.alert.copy, 'alert.copy');
    });

    it('Should translate to default if translation is null', async () => {
      const testLocation = await Locations.findById(location._id);
      testLocation.copyData = [];
      const dump = dumpLocation(testLocation, 't.locale');

      sinon.assert.match(dump.closedCopy, 'closedCopy');
      sinon.assert.match(dump.suspendedCopy, 'suspendedCopy');
      sinon.assert.match(dump.suspendedTitle, 'suspendedTitle');

      sinon.assert.match(dump.alert.title, 'alert.title');
      return sinon.assert.match(dump.alert.copy, 'alert.copy');
    });

    it('Should translate to some defaults', async () => {
      const testLocation = await Locations.findById(location._id).lean();
      testLocation.copyData = [
        {
          alert: {
            title: 't.alert.title'
          },
          locale: 't.locale',
          closedCopy: 't.closedCopy'
        }
      ];

      const dump = dumpLocation(testLocation, 't.locale');

      sinon.assert.match(dump.closedCopy, 't.closedCopy');
      sinon.assert.match(dump.suspendedCopy, 'suspendedCopy');
      sinon.assert.match(dump.suspendedTitle, 'suspendedTitle');

      sinon.assert.match(dump.failedAgeRequirementAlert.title, 'failedAgeRequirementAlertTitle');
      sinon.assert.match(dump.failedAgeRequirementAlert.copy, 'failedAgeRequirementAlertCopy');
      sinon.assert.match(dump.alert.title, 't.alert.title');
      return sinon.assert.match(dump.alert.copy, 'alert.copy');
    });

    it('Should translate to default if translation not found', async () => {
      const testLocation = await Locations.findById(location._id);
      testLocation.copyData = [];
      const dump = dumpLocation(testLocation, 't.notfound');

      sinon.assert.match(dump.closedCopy, 'closedCopy');
      sinon.assert.match(dump.suspendedCopy, 'suspendedCopy');
      sinon.assert.match(dump.suspendedTitle, 'suspendedTitle');
      sinon.assert.match(dump.pwywCopy, 'How much do you want to pay for this ride?');
      sinon.assert.match(dump.failedAgeRequirementAlert.title, 'failedAgeRequirementAlertTitle');
      sinon.assert.match(dump.failedAgeRequirementAlert.copy, 'failedAgeRequirementAlertCopy');

      sinon.assert.match(dump.alert.title, 'alert.title');
      return sinon.assert.match(dump.alert.copy, 'alert.copy');
    });
  });

  describe('dumpLocationForAdmin', () => {
    it('Should translate if there is no translation', async () => {
      const testLocation = await Locations.findById(location._id);
      const dump = dumpLocationForAdmin(testLocation);

      sinon.assert.match(dump.closedCopy, 'closedCopy');
      sinon.assert.match(dump.suspendedCopy, 'suspendedCopy');
      sinon.assert.match(dump.suspendedTitle, 'suspendedTitle');

      sinon.assert.match(dump.failedAgeRequirementAlert.title, 'failedAgeRequirementAlertTitle');
      sinon.assert.match(dump.failedAgeRequirementAlert.copy, 'failedAgeRequirementAlertCopy');
      sinon.assert.match(dump.alert.title, 'alert.title');
      sinon.assert.match(dump.ridesFareCopy, 'ridesFareCopy');
      return sinon.assert.match(dump.alert.copy, 'alert.copy');
    });
  });
});
