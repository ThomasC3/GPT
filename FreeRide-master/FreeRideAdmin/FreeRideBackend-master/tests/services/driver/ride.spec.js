import request from 'supertest-promised';
import io from 'socket.io-client';
import sinon from 'sinon';
import { expect } from 'chai';
import mongoose from 'mongoose';
import { driverArrivedService, ridePickUpService } from '../../../services/driver/ride';
import {
  Rides, Drivers, Settings
} from '../../../models';
import { createScenarioLocation, listScenarioPoints } from '../../utils/location';
import { emptyAllCollections, emptyCollectionList } from '../../utils/helper';
import app from '../../../server';
import driverSearcher from '../../../services/driverSearch';
import { port, domain } from '../../../config';
import { createDriverLogin, pickUp } from '../../utils/driver';
import { createWebsockets } from '../../utils/websockets';
import { createScenarioRiders, createRequest } from '../../utils/rider';
import sns from '../../../services/sns';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

const points = listScenarioPoints('Brooklyn');
let driver;
let rider;
let location;

let sandbox;

describe('Driver Ride Services', () => {
  before(async () => {
    sandbox = sinon.createSandbox();
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await createScenarioLocation('Brooklyn');

    const driverInfo = {
      email: 'some@mail.com',
      locations: [location._id],
      currentLocation: {
        coordinates: points[0],
        type: 'Point'
      }
    };

    driver = await createDriverLogin(
      driverInfo,
      app,
      request,
      domain,
      io.connect(`http://localhost:${port}`, ioOptions)
    );

    const riderSockets = createWebsockets(1);
    [rider] = await createScenarioRiders(1, { app, request, domain }, [
      { firstName: 'Rider', riderSocket: riderSockets[0] }
    ]);
  });

  beforeEach(async () => {
    await emptyCollectionList(['Requests', 'Rides', 'Routes']);
    await Drivers.updateOne({}, { $set: { driverRideList: [] } });
  });

  describe('driverArrivedService', () => {
    it('should update ride when driver arrives', async () => {
      await createRequest(
        rider.riderToken, points[0].slice().reverse(), points[1].slice().reverse(),
        location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      const ride1 = await Rides.findOne({ rider: rider.rider._id });
      expect(String(ride1.driver)).to.equal(String(driver.driver._id));

      const result = await driverArrivedService(ride1);
      expect(result.success).to.equal(true);
      expect(result.ride.driverArrivedTimestamp).to.be.instanceOf(Date);
    });
    it('should throw error when ride status is not in PRE Pickup state', async () => {
      await createRequest(
        rider.riderToken, points[0].slice().reverse(), points[1].slice().reverse(),
        location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      let ride = await Rides.findOne({ rider: rider.rider._id });
      expect(String(ride.driver)).to.equal(String(driver.driver._id));
      await pickUp(driver.driverToken, ride, app, request, domain);

      ride = await Rides.findOne({ rider: rider.rider._id });
      expect(ride.status).to.equal(300);

      const result = await driverArrivedService(ride);
      expect(result.success).to.equal(false);
      expect(result.error.message).to.equal('Driver arrived is not allowed');
    });
    it('should throw error when ride status is already in arrived state', async () => {
      await createRequest(
        rider.riderToken, points[0].slice().reverse(), points[1].slice().reverse(),
        location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      let ride = await Rides.findOne({ rider: rider.rider._id });
      expect(String(ride.driver)).to.equal(String(driver.driver._id));
      await driverArrivedService(ride);

      ride = await Rides.findOne({ rider: rider.rider._id });
      expect(ride.status).to.equal(203);

      const result = await driverArrivedService(ride);
      expect(result.success).to.equal(false);
      expect(result.error.message).to.equal('Driver arrived is not allowed');
    });
    it('should send SNS message when driver arrives', async () => {
      const ride = {
        _id: 'rideId',
        isAllowedDriverArrived: () => true,
        driver: 'driverId',
        rider: new mongoose.Types.ObjectId()
      };

      const updatedRide = { ...ride, driverArrivedTimestamp: Date.now() };
      sandbox.stub(Rides, 'driverArrived').resolves(updatedRide);
      sandbox.stub(Drivers, 'findOne').resolves({ displayName: 'Driver Name' });
      sandbox.stub(sns, 'send').resolves(true);

      const result = await driverArrivedService(ride);

      expect(result.success).to.equal(true);
      sinon.assert.calledOnce(sns.send);

      const [userType, riderId] = sns.send.getCall(0).args;
      expect(userType).to.equal('RIDER');
      expect(riderId).to.equal(ride.rider.toString());

      // Restore the stubs
      sandbox.restore();
    });
  });
  describe('ridePickupService', () => {
    it('should throw error when ride status is not in PRE Pickup state', async () => {
      await createRequest(
        rider.riderToken, points[0].slice().reverse(), points[1].slice().reverse(),
        location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      let ride = await Rides.findOne({ rider: rider.rider._id });
      expect(String(ride.driver)).to.equal(String(driver.driver._id));
      await ridePickUpService(ride);

      ride = await Rides.findOne({ rider: rider.rider._id });
      expect(ride.status).to.equal(300);

      const result = await ridePickUpService(ride);
      expect(result.success).to.equal(false);
      expect(result.error.message).to.equal('Ride pick up is not allowed');
    });
    it('should update ride when ride status is in PRE Pickup state', async () => {
      await createRequest(
        rider.riderToken, points[0].slice().reverse(), points[1].slice().reverse(),
        location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      const ride = await Rides.findOne({ rider: rider.rider._id });
      expect(String(ride.driver)).to.equal(String(driver.driver._id));

      const now = Date.now();
      const result = await ridePickUpService(ride);
      expect(result.success).to.equal(true);
      expect(Number(result.ride.pickupTimestamp)).to.be.greaterThan(now);
      expect(result.ride.status).to.equal(300);
    });
  });
});
