import sinon from 'sinon';
// eslint-disable-next-line no-unused-vars
import { websocket } from '../services';
import { Services } from '../models';
import { emptyAllCollections } from './utils/helper';
import { deriveVehicleService } from '../utils/vehicle';

let availableServices;
const vehicle = {
  name: 'vehicle 1',
  passengerCapacity: 4,
  adaCapacity: 1,
  isADAOnly: false
};
const vehicle2 = {
  name: 'vehicle 2',
  passengerCapacity: 4,
  adaCapacity: 0,
  isADAOnly: false
};
const vehicle3 = {
  name: 'vehicle 3',
  passengerCapacity: 4,
  adaCapacity: 0,
  isADAOnly: true
};
const vehicle4 = {
  name: 'vehicle 4',
  passengerCapacity: 0,
  adaCapacity: 1,
  isADAOnly: false
};
const vehicle5 = {
  name: 'vehicle 5',
  passengerCapacity: 0,
  adaCapacity: 1,
  isADAOnly: true
};
const vehicle6 = {
  name: 'vehicle 6',
  passengerCapacity: 4,
  adaCapacity: 1,
  isADAOnly: true
};


describe('Vehicle Services', () => {
  before(async () => {
    await emptyAllCollections();
    await Services.create({
      key: 'ada_only',
      title: 'ADA Only',
      desc: 'Ada Cap only'
    });
    await Services.create({
      key: 'passenger_only',
      title: 'Passenger Only',
      desc: 'Passenger Cap only'
    });
    await Services.create({
      key: 'mixed_service',
      title: 'Mixed Service',
      desc: 'Mixed service only'
    });
    availableServices = await Services.getServices({ isDeleted: false });
  });


  describe('Get correct services', () => {
    it('gets correct services for vehicle 1', async () => {
      const services = await deriveVehicleService(vehicle, availableServices);
      sinon.assert.match(services.length, 3);
    });
    it('gets correct services for vehicle 2', async () => {
      const services = await deriveVehicleService(vehicle2, availableServices);
      sinon.assert.match(services.length, 1);
      sinon.assert.match(services[0].key, 'passenger_only');
    });
    it('gets correct services for vehicle 3', async () => {
      const services = await deriveVehicleService(vehicle3, availableServices);
      sinon.assert.match(services.length, 1);
      sinon.assert.match(services[0].key, 'passenger_only');
    });
    it('gets correct services for vehicle 4', async () => {
      const services = await deriveVehicleService(vehicle4, availableServices);
      sinon.assert.match(services.length, 1);
      sinon.assert.match(services[0].key, 'ada_only');
    });
    it('gets correct services for vehicle 5', async () => {
      const services = await deriveVehicleService(vehicle5, availableServices);
      sinon.assert.match(services.length, 1);
      sinon.assert.match(services[0].key, 'ada_only');
    });
    it('gets correct services for vehicle 6', async () => {
      const services = await deriveVehicleService(vehicle6, availableServices);
      sinon.assert.match(services.length, 1);
      sinon.assert.match(services[0].key, 'ada_only');
    });
    it('doesnt return unavailable service', async () => {
      await Services.updateMany({ key: { $in: ['ada_only', 'mixed_service'] } }, { isDeleted: true });
      availableServices = await Services.getServices({ isDeleted: false });
      const services = await deriveVehicleService(vehicle, availableServices);
      sinon.assert.match(services.length, 1);
      sinon.assert.match(services[0].key, 'passenger_only');
    });
  });
});
