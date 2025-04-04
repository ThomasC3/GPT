import request from 'supertest-promised';
import { expect } from 'chai';
import app from '../../server';
import { domain } from '../../config';
import {
  Jobs, Locations, Vehicles
} from '../../models';
import { emptyAllCollections, emptyCollection } from '../utils/helper';
import { createAdminLogin, adminEndpoint } from '../utils/admin';
import { createGEMVehicle } from '../utils/vehicle';

let developerToken;

let loc1;
let loc2;
let jobId1;
let jobId2;
let jobId3;
let jobId4;
let vehicle1;
let vehicle2;

describe('Job management', () => {
  before('Given a developer role admin, 2 locations and 4 jobs', async () => {
    await emptyAllCollections();

    loc1 = await Locations.createLocation({ name: 'Location #1', locationCode: 'LC001' });
    loc2 = await Locations.createLocation({ name: 'Location #2', locationCode: 'LC002' });

    ({ _id: jobId1 } = await Jobs.createJob({
      code: 'LC001-ABCT', location: `${loc1._id}`, locationCode: loc1.locationCode, clientCode: 'ABC', typeCode: 'T', active: true
    }));
    ({ _id: jobId2 } = await Jobs.createJob({
      code: 'LC001-DEFT', location: `${loc1._id}`, locationCode: loc1.locationCode, clientCode: 'DEF', typeCode: 'T', active: false
    }));
    ({ _id: jobId3 } = await Jobs.createJob({
      code: 'LC001-GHIT', location: `${loc1._id}`, locationCode: loc1.locationCode, clientCode: 'GHI', typeCode: 'T', active: true
    }));
    await Jobs.createJob({
      code: 'LC001-JKLT', location: `${loc1._id}`, locationCode: loc1.locationCode, clientCode: 'JKL', typeCode: 'T', active: true, isDeleted: true
    });
    ({ _id: jobId4 } = await Jobs.createJob({
      code: 'LC002-ABCT', location: `${loc2._id}`, locationCode: loc2.locationCode, clientCode: 'ABC', typeCode: 'T', active: true
    }));

    vehicle1 = await createGEMVehicle(false, loc1._id, { jobs: [jobId3] });
    vehicle2 = await createGEMVehicle(false, loc1._id, { jobs: [jobId4] });

    ({ adminToken: developerToken } = await createAdminLogin());
  });

  beforeEach('Given no events', async () => {
    await emptyCollection('Events');
  });

  describe('When calling POST /v1/jobs/', () => {
    it('Should create job', async () => {
      const jobData = {
        code: 'LC001-MNOT', location: `${loc1._id}`, locationCode: loc1.locationCode, clientCode: 'MNO', typeCode: 'T', active: true
      };
      const { status, body: job } = await adminEndpoint('/v1/jobs/', 'post', developerToken, app, request, domain, jobData);

      expect(status).to.equal(200);
      expect(job).to.have.property('id');
      expect(job).to.have.property('code', 'LC001-MNOT');
      expect(job).to.have.property('locationId', `${loc1._id}`);
      expect(job).to.have.property('locationCode', loc1.locationCode);
      expect(job).to.have.property('clientCode', 'MNO');
      expect(job).to.have.property('typeCode', 'T');
      expect(job).to.have.property('active', true);
      expect(job).to.have.property('isDeleted', false);
    });
    it('Should not create job with duplicate code', async () => {
      const jobData = {
        code: 'LC001-ABCT', location: `${loc1._id}`, locationCode: loc1.locationCode, clientCode: 'ABC', typeCode: 'T', active: true
      };
      const { status, body: { message } } = await adminEndpoint('/v1/jobs/', 'post', developerToken, app, request, domain, jobData);

      expect(status).to.equal(409);
      expect(message).to.equal('Job with code LC001-ABCT already exists');
    });
  });
  describe('When calling GET /v1/jobs/', () => {
    it('Should get a list of non-deleted jobs', async () => {
      const { status, body: { jobs } } = await adminEndpoint('/v1/jobs/', 'get', developerToken, app, request, domain);

      expect(status).to.equal(200);
      expect(jobs).to.have.length.above(2);
      expect(jobs).to.have.length.below(6);

      const deletedJobs = jobs.filter(j => j.isDeleted);
      expect(deletedJobs).to.have.lengthOf(0);

      const inactiveJobs = jobs.filter(j => !j.active);
      expect(inactiveJobs).to.have.lengthOf(1);
      expect(inactiveJobs[0]).to.have.property('id', `${jobId2}`);

      const job = jobs.find(j => j.id === `${jobId1}`);
      expect(job).to.have.property('code', 'LC001-ABCT');
      expect(job).to.have.property('locationId', `${loc1._id}`);
      expect(job).to.have.property('locationCode', loc1.locationCode);
      expect(job).to.have.property('clientCode', 'ABC');
      expect(job).to.have.property('typeCode', 'T');
      expect(job).to.have.property('active', true);
      expect(job).to.have.property('isDeleted', false);
    });
  });
  describe('When calling GET /v1/jobs?active=true', () => {
    it('Should get a list of non-deleted active jobs', async () => {
      const { status, body: { jobs } } = await adminEndpoint('/v1/jobs?active=true', 'get', developerToken, app, request, domain);

      expect(status).to.equal(200);
      expect(jobs).to.have.length.above(1);
      expect(jobs).to.have.length.below(5);

      const deletedJobs = jobs.filter(j => j.isDeleted);
      expect(deletedJobs).to.have.lengthOf(0);

      const inactiveJob = jobs.filter(j => !j.active);
      expect(inactiveJob).to.have.lengthOf(0);
    });
  });
  describe('When calling GET /v1/jobs/:id', () => {
    it('Should get individual job info', async () => {
      const { status, body: job } = await adminEndpoint(`/v1/jobs/${jobId1}`, 'get', developerToken, app, request, domain);

      expect(status).to.equal(200);
      expect(job).to.have.property('code', 'LC001-ABCT');
      expect(job).to.have.property('locationId', `${loc1._id}`);
      expect(job).to.have.property('locationCode', loc1.locationCode);
      expect(job).to.have.property('locationName', loc1.name);
      expect(job).to.have.property('clientCode', 'ABC');
      expect(job).to.have.property('typeCode', 'T');
      expect(job).to.have.property('isDeleted', false);
    });
  });
  describe('When calling PUT /v1/jobs/', () => {
    it('Should update job', async () => {
      const updateJobData = { code: 'LC001-XYZP', clientCode: 'XYZ', typeCode: 'P' };
      const { status, body: job } = await adminEndpoint(`/v1/jobs/${jobId2}`, 'put', developerToken, app, request, domain, updateJobData);

      expect(status).to.equal(200);
      expect(job).to.have.property('id');
      expect(job).to.have.property('code', 'LC001-XYZP');
      expect(job).to.have.property('locationId', `${loc1._id}`);
      expect(job).to.have.property('locationCode', loc1.locationCode);
      expect(job).to.have.property('clientCode', 'XYZ');
      expect(job).to.have.property('typeCode', 'P');
      expect(job).to.have.property('active', false);
      expect(job).to.have.property('isDeleted', false);
    });
  });
  describe('When calling DELETE /v1/jobs/', () => {
    it('Should delete job and trigger event creation', async () => {
      const originalVehicle = await Vehicles.findOne({ _id: vehicle1.vehicleId });
      expect(originalVehicle.jobs).to.have.lengthOf(1);

      const { status, body } = await adminEndpoint(`/v1/jobs/${jobId3}`, 'delete', developerToken, app, request, domain);
      expect(status).to.equal(200);
      expect(body).to.have.property('message', 'Successfully removed Job');

      const deletedJob = await Jobs.findOne({ _id: jobId3 });
      expect(deletedJob).to.have.property('isDeleted', true);

      const { body: { items: jobEvents } } = await adminEndpoint(
        `/v1/events?targetId=${jobId3}&targetType=Job&or=true`, 'get', developerToken, app, request, domain
      );
      expect(jobEvents).to.have.lengthOf(2);
      expect(jobEvents[0].eventType).to.equal('JOB_DELETED');
      expect(jobEvents[1].eventType).to.equal('DELETED');

      const { body: { items: vehicleEvents } } = await adminEndpoint(
        `/v1/events?targetId=${vehicle1.vehicleId}&targetType=Vehicle&or=true`, 'get', developerToken, app, request, domain
      );
      expect(vehicleEvents).to.have.lengthOf(1);
      expect(vehicleEvents[0].eventType).to.equal('JOB_DELETED');

      const updatedVehicle = await Vehicles.findOne({ _id: vehicle1.vehicleId });
      expect(updatedVehicle.jobs).to.have.lengthOf(0);
    });
  });
  describe('When calling PUT /v1/locations/:id for locationCode update', () => {
    it('Should update jobs for updated location', async () => {
      const { status, body: job } = await adminEndpoint(`/v1/jobs/${jobId4}`, 'get', developerToken, app, request, domain);

      expect(status).to.equal(200);
      expect(job).to.have.property('code', 'LC002-ABCT');
      expect(job).to.have.property('locationId', `${loc2._id}`);
      expect(job).to.have.property('locationCode', `${loc2.locationCode}`);

      await adminEndpoint(`/v1/locations/${loc2._id}`, 'put', developerToken, app, request, domain, { locationCode: 'LC003' });

      const { body: updatedJob } = await adminEndpoint(`/v1/jobs/${jobId4}`, 'get', developerToken, app, request, domain);

      expect(updatedJob).to.have.property('code', 'LC003-ABCT');
      expect(updatedJob).to.have.property('locationCode', 'LC003');
    });
  });
  describe('When inactivating a job', () => {
    it('Should remove job from vehicle and trigger event creation', async () => {
      const { jobs: originalJobsAssigned } = await Vehicles.findOne({ _id: vehicle2.vehicleId });
      expect(originalJobsAssigned).to.have.lengthOf(1);

      await adminEndpoint(`/v1/jobs/${jobId4}`, 'put', developerToken, app, request, domain, { active: false });
      const { body: { items: jobEvents } } = await adminEndpoint(
        `/v1/events?targetId=${jobId4}&targetType=Job&or=true`, 'get', developerToken, app, request, domain
      );
      expect(jobEvents).to.have.lengthOf(2);
      expect(jobEvents[0].eventType).to.equal('JOB_INACTIVE');
      expect(jobEvents[1].eventType).to.equal('INACTIVE');


      const { jobs: updatedJobsAssigned } = await Vehicles.findOne({ _id: vehicle2.vehicleId });
      expect(updatedJobsAssigned).to.have.lengthOf(0);

      const { body: { items: vehicleEvents } } = await adminEndpoint(
        `/v1/events?targetId=${vehicle2.vehicleId}&targetType=Job&or=true`, 'get', developerToken, app, request, domain
      );
      expect(vehicleEvents).to.have.lengthOf(1);
      expect(vehicleEvents[0].eventType).to.equal('JOB_INACTIVE');
    });
  });
});
