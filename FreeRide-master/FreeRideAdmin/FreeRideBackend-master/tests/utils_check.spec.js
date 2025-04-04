import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import mongoose from 'mongoose';
import sinon from 'sinon';
import moment from 'moment';
import { emptyAllCollections } from './utils/helper';
import {
  Locations, MatchingRules, Zones, Vehicles, Reports, Rides
} from '../models';
import {
  validateMatchingRule, checkMatchingRule,
  checkVehicleAvailability, verifyEqualIdArray,
  checkRunning
} from '../utils/check';
import { createZone } from './utils/location';
import { createGEMVehicle } from './utils/vehicle';
import { ApplicationError } from '../errors';
import { checkStrikeStatus } from '../utils/report';
import { isFreeRideAgeRestrictionValid } from '../utils/location';

chai.use(chaiAsPromised);
const { expect } = chai;

const matchingRuleShared = {
  key: 'shared',
  title: 'Shared',
  description: 'Designated for all requests across all zones'
};
const matchingRulePriority = {
  key: 'priority',
  title: 'Priority',
  description: 'Designated for requests to or from specific zones but available for all requests if needed'
};

const serviceArea = [
  { longitude: -73.978573, latitude: 40.721239 },
  { longitude: -73.882936, latitude: 40.698337 },
  { longitude: -73.918642, latitude: 40.629585 },
  { longitude: -73.978573, latitude: 40.660845 },
  { longitude: -73.978573, latitude: 40.721239 }
];

const locationInfo = {
  isADA: false,
  isUsingServiceTimes: false,
  isActive: true,
  poolingEnabled: true,
  serviceArea
};
let locationId1;
let locationId2;
let zoneA;
let zoneB;
let location1Zones;
let vehicle;

let sandbox;

describe('utils/check', () => {
  describe('validateMatchingRule', () => {
    before(async () => {
      await emptyAllCollections();

      ({ _id: locationId1 } = await Locations.createLocation({ name: 'Location 1', ...locationInfo }));
      ({ _id: locationId2 } = await Locations.createLocation({ name: 'Location 2', ...locationInfo }));

      ({ _id: zoneA } = await createZone({
        name: 'Zone A', description: 'Zone in Loc 1', serviceArea, location: locationId1
      }));
      ({ _id: zoneB } = await createZone({
        name: 'Zone B', description: 'Zone in Loc 2', serviceArea, location: locationId2
      }));

      location1Zones = await Zones.getZones({ location: locationId1 });

      await MatchingRules.create(matchingRuleShared);
      await MatchingRules.create(matchingRulePriority);
    });
    describe('with a non-empty zones array', () => {
      ['priority', 'exclusive', 'locked'].forEach((matchingRule) => {
        it(`should validate for '${matchingRule}' matching rule`, () => {
          const vehicleInfo = { location: locationId1, zones: [zoneA], matchingRule };
          expect(() => validateMatchingRule(vehicleInfo, location1Zones)).to.not.throw();
        });
      });
      [undefined, null, '', 'shared'].forEach((matchingRule) => {
        it(`should throw error for '${matchingRule}' matching rule`, () => {
          const vehicleInfo = { location: locationId1, zones: [zoneA], matchingRule };
          expect(() => validateMatchingRule(vehicleInfo, location1Zones))
            .to.throw(ApplicationError, 'No zone may be attached for this routing policy');
        });
      });
    });
    describe('with zones from a different location', () => {
      [undefined, null, '', 'shared'].forEach((matchingRule) => {
        it(`should throw error for '${matchingRule}' matching rule`, async () => {
          const vehicleInfo = { location: locationId1, zones: [zoneB], matchingRule };
          expect(() => validateMatchingRule(vehicleInfo, location1Zones))
            .to.throw(ApplicationError, 'No zone may be attached for this routing policy');
        });
      });
      ['priority', 'exclusive', 'locked'].forEach((matchingRule) => {
        it(`should throw error for '${matchingRule}' matching rule`, async () => {
          const vehicleInfo = { location: locationId1, zones: [zoneB], matchingRule };
          expect(() => validateMatchingRule(vehicleInfo, location1Zones))
            .to.throw(ApplicationError, 'The selected zones may not be assigned within this location');
        });
      });
    });
    describe('with an empty zones array', () => {
      [undefined, null, '', 'shared'].forEach((matchingRule) => {
        it(`should validate for '${matchingRule}' matching rule`, async () => {
          const vehicleInfo = { location: locationId1, zones: [], matchingRule };
          expect(() => validateMatchingRule(vehicleInfo, location1Zones)).to.not.throw();
        });
      });
      ['priority', 'exclusive', 'locked'].forEach((matchingRule) => {
        it(`should throw error for '${matchingRule}' matching rule`, async () => {
          const vehicleInfo = { location: locationId1, zones: [], matchingRule };
          expect(() => validateMatchingRule(vehicleInfo, location1Zones))
            .to.throw(ApplicationError, 'This routing policy requires at least one zone assigned');
        });
      });
    });
  });

  describe('checkMatchingRule', () => {
    before(async () => {
      await emptyAllCollections();

      ({ _id: locationId1 } = await Locations.createLocation({ name: 'Location 1', ...locationInfo }));
      ({ _id: locationId2 } = await Locations.createLocation({ name: 'Location 2', ...locationInfo }));

      ({ _id: zoneA } = await createZone({
        name: 'Zone A', description: 'Zone in Loc 1', serviceArea, location: locationId1
      }));
      ({ _id: zoneB } = await createZone({
        name: 'Zone B', description: 'Zone in Loc 2', serviceArea, location: locationId2
      }));

      location1Zones = await Zones.getZones({ location: locationId1 });

      await MatchingRules.create(matchingRuleShared);
      await MatchingRules.create(matchingRulePriority);
    });
    ['priority', 'exclusive', 'locked'].forEach((matchingRule) => {
      it(`should validate for '${matchingRule}' matching rule`, async () => {
        const vehicleInfo = { location: locationId1, zones: [zoneA], matchingRule };
        expect(() => checkMatchingRule(vehicleInfo, location1Zones)).to.not.throw();
      });
    });
    it('should validate for \'shared\' matching rule', async () => {
      const vehicleInfo = { location: locationId1, zones: [], matchingRule: 'shared' };
      expect(() => checkMatchingRule(vehicleInfo, location1Zones)).to.not.throw();
    });
    [undefined, null, ''].forEach((matchingRule) => {
      it(`should throw error for '${matchingRule}' matching rule`, async () => {
        const vehicleInfo = { location: locationId1, zones: [], matchingRule };
        expect(() => checkMatchingRule(vehicleInfo, location1Zones))
          .to.throw(
            ApplicationError, 'Unknown matching rule'
          );
      });
    });
  });
  describe('checkVehicleAvailability', () => {
    before(async () => {
      await emptyAllCollections();

      ({ _id: locationId1 } = await Locations.createLocation({ name: 'Location 1', ...locationInfo }));

      ({ _id: zoneA } = await createZone({
        name: 'Zone A', description: 'Zone in Loc 1', serviceArea, location: locationId1
      }));

      location1Zones = await Zones.getZones({ location: locationId1 });

      await MatchingRules.create(matchingRulePriority);

      vehicle = await createGEMVehicle(
        false, locationId1, { matchingRule: 'priority', zones: [zoneA._id] }
      );
    });
    it('should validate vehicle as available without explicit zone input', async () => {
      await expect(checkVehicleAvailability(vehicle.vehicleId)).to.not.be.rejected;
    });
    it('should validate vehicle as available with explicit zone input', async () => {
      await expect(checkVehicleAvailability(vehicle.vehicleId, location1Zones)).to.not.be.rejected;
    });
    it('should not validate vehicle as available with wrong zones assigned', async () => {
      await expect(checkVehicleAvailability(vehicle.vehicleId, []))
        .to.be.rejectedWith(
          ApplicationError, 'The selected zones may not be assigned within this location'
        );
    });
    it('should not validate vehicle as available with driver attached', async () => {
      await Vehicles.findOneAndUpdate(
        { _id: vehicle.vehicleId },
        { $set: { driverId: new mongoose.Types.ObjectId() } }
      );
      await expect(checkVehicleAvailability(vehicle.vehicleId, []))
        .to.be.rejectedWith(
          ApplicationError, 'Vehicle is unavailable.'
        );
    });
  });
  describe('verifyEqualIdArray', () => {
    it('should verify same arrays as equal', async () => {
      const id1 = new mongoose.Types.ObjectId();
      const id2 = new mongoose.Types.ObjectId();
      expect(verifyEqualIdArray([id1, id2], [id1, id2])).to.equal(true);
      expect(verifyEqualIdArray([id1, id2], [id2, id1])).to.equal(true);
      expect(verifyEqualIdArray([id2, id1], [id1, id2])).to.equal(true);
      expect(verifyEqualIdArray([], [])).to.equal(true);
    });
    it('should verify that different sized arrays are not equal', async () => {
      const id1 = new mongoose.Types.ObjectId();
      const id2 = new mongoose.Types.ObjectId();
      expect(verifyEqualIdArray([id1, id2], [])).to.equal(false);
      expect(verifyEqualIdArray([], [id1, id2])).to.equal(false);
      expect(verifyEqualIdArray([id1, id2], [id1])).to.equal(false);
      expect(verifyEqualIdArray([id1], [id1, id2])).to.equal(false);
    });
    it('should verify that same sized arrays with different items are not equal', async () => {
      const id1 = new mongoose.Types.ObjectId();
      const id2 = new mongoose.Types.ObjectId();
      const id3 = new mongoose.Types.ObjectId();
      expect(verifyEqualIdArray([id1], [id2])).to.equal(false);
      expect(verifyEqualIdArray([id1, id3], [id1, id2])).to.equal(false);
    });
  });

  describe('checkStrikeStatus', () => {
    before(() => {
      sandbox = sinon.createSandbox();
    });
    afterEach(() => {
      sandbox.restore();
    });

    it('should ban user if they have a serious strike', async () => {
      sandbox.stub(Reports, 'find').resolves([
        {
          receiver: 'Rider', reportee: { id: '1' }, status: 'Confirmed', isDeleted: false, reason: 'Minor issue'
        },
        {
          receiver: 'Rider', reportee: { id: '1' }, status: 'Confirmed', isDeleted: false, reason: 'Physically assaulted a driver, Circuit staff-member or fellow rider'
        }
      ]);
      sandbox.stub(Rides, 'getRatingReceivedFor').resolves([{ avgRating: 4 }]);

      const result = await checkStrikeStatus('Rider', '1');

      expect(result.toBan).to.be.equal(true);
      expect(result.seriousStrike).to.be.equal(true);
    });

    it('should ban user if they have a serious strike of being below 16', async () => {
      sandbox.stub(Reports, 'find').resolves([
        {
          receiver: 'Rider', reportee: { id: '1' }, status: 'Confirmed', isDeleted: false, reason: 'Under the age of 16'
        }
      ]);
      sandbox.stub(Rides, 'getRatingReceivedFor').resolves([{ avgRating: 4 }]);

      const result = await checkStrikeStatus('Rider', '1');

      expect(result.toBan).to.be.equal(true);
      expect(result.seriousStrike).to.be.equal(true);
    });

    it('should not ban user if they have no strikes', async () => {
      sandbox.stub(Reports, 'find').resolves([]);

      const result = await checkStrikeStatus('Rider', '2');

      expect(result.toBan).to.be.equal(false);
    });

    it('should ban user if they have more than 2 strikes', async () => {
      sandbox.stub(Reports, 'find').resolves([
        {
          receiver: 'Rider', reportee: { id: '1' }, status: 'Confirmed', isDeleted: false, reason: 'Minor issue'
        },
        {
          receiver: 'Rider', reportee: { id: '1' }, status: 'Confirmed', isDeleted: false, reason: 'Another Minor issue'
        },
        {
          receiver: 'Rider', reportee: { id: '1' }, status: 'Confirmed', isDeleted: false, reason: 'Yet another Minor issue'
        }
      ]);

      const result = await checkStrikeStatus('Rider', '1');

      expect(result.toBan).to.be.equal(true);
      expect(result.strikeCount).to.equal(3);
    });

    it('should ban user if they have more than 1 strike and a low rating', async () => {
      sandbox.stub(Reports, 'find').resolves([
        {
          receiver: 'Rider', reportee: { id: '1' }, status: 'Confirmed', isDeleted: false, reason: 'Minor issue'
        },
        {
          receiver: 'Rider', reportee: { id: '1' }, status: 'Confirmed', isDeleted: false, reason: 'Another Minor issue'
        }
      ]);
      sandbox.stub(Rides, 'getRatingReceivedFor').resolves([{ avgRating: 2.5 }]);

      const result = await checkStrikeStatus('Rider', '1');

      expect(result.toBan).to.be.equal(true);
      expect(result.ratingStrike).to.be.equal(true);
      expect(result.strikeCount).to.equal(2);
    });
  });

  describe('isFreeRideAgeRestrictionValid', () => {
    it('should return true if no age restriction is provided', () => {
      const locationData = { };
      const result = isFreeRideAgeRestrictionValid(locationData);
      expect(result).to.be.equal(true);
    });

    it('should throw an error if the minimum age is below 16', () => {
      const locationData = { freeRideAgeRestrictionInterval: { min: 15 } };
      expect(() => isFreeRideAgeRestrictionValid(locationData)).to.throw('Invalid minimum age: 15 is below 16.');
    });

    it('should throw an error if the maximum age is below 16', () => {
      const locationData = { freeRideAgeRestrictionInterval: { max: 15 } };
      expect(() => isFreeRideAgeRestrictionValid(locationData)).to.throw('Invalid maximum age: 15 is below 16.');
    });

    it('should throw an error if the maximum age is below the minimum age', () => {
      const locationData = { freeRideAgeRestrictionInterval: { min: 18, max: 16 } };
      expect(() => isFreeRideAgeRestrictionValid(locationData)).to.throw('Invalid age interval: 16 is below 18.');
    });

    it('should return true if the age restriction is valid', () => {
      const locationData = { freeRideAgeRestrictionInterval: { min: 16, max: 18 } };
      const result = isFreeRideAgeRestrictionValid(locationData);
      expect(result).to.be.equal(true);
    });
  });
  describe('checkRunning', () => {
    it('should return false if campaign is deleted', () => {
      const campaignData = { isDeleted: true };
      const result = checkRunning(campaignData);
      expect(result).to.equal(false);
    });
    it('should return false if campaignStart is invalid', () => {
      const campaignData = { campaignStart: null };
      const result = checkRunning(campaignData);
      expect(result).to.equal(false);
    });
    it('should return false if campaignEnd is invalid', () => {
      const campaignData = { campaignEnd: null };
      const result = checkRunning(campaignData);
      expect(result).to.equal(false);
    });
    it('should return true for an enabled campaign if now is between campaign start and end dates', () => {
      const campaignStart = moment().subtract(1, 'day').startOf('day');
      const campaignEnd = moment().add(1, 'day').endOf('day');
      const campaignData = { campaignStart, campaignEnd, isEnabled: true };
      const result = checkRunning(campaignData);
      expect(result).to.equal(true);
    });
    it('should return false for a disabled campaign even if now is between campaign start and end dates', () => {
      const campaignStart = moment().subtract(1, 'day').startOf('day');
      const campaignEnd = moment().add(1, 'day').endOf('day');
      const campaignData = { campaignStart, campaignEnd, isEnabled: false };
      const result = checkRunning(campaignData);
      expect(result).to.equal(false);
    });
    it('should return false for an enabled campaign if now is not between campaign start and end dates', () => {
      const campaignStart = moment().subtract(2, 'day').startOf('day');
      const campaignEnd = moment().subtract(2, 'day').endOf('day');
      const campaignData = { campaignStart, campaignEnd, isEnabled: true };
      const result = checkRunning(campaignData);
      expect(result).to.equal(false);
    });
  });
});
