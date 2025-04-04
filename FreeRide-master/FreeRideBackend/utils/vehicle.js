import _ from 'lodash';
import { ApplicationError } from '../errors';
import {
  Questions, Vehicles, Events, Jobs
} from '../models';
import { typeConverter } from './string';

export const deriveVehicleService = (vehicle, availableServices) => {
  const { adaCapacity, passengerCapacity, isADAOnly } = vehicle;
  const vehicleServices = [];
  availableServices.forEach((item) => {
    if (item.key === 'ada_only') {
      if (adaCapacity > 0) {
        vehicleServices.push(item);
      }
    }

    if (item.key === 'passenger_only') {
      const adaOnly = adaCapacity > 0 && isADAOnly;
      if (passengerCapacity > 0 && !adaOnly) {
        vehicleServices.push(item);
      }
    }

    if (item.key === 'mixed_service') {
      if (passengerCapacity > 0 && adaCapacity > 0 && !isADAOnly) {
        vehicleServices.push(item);
      }
    }
  });
  return vehicleServices;
};

export const getVehicleCapacity = vehicle => ({
  adaCapacity: vehicle.adaCapacity ?? vehicle.vehicleType?.adaCapacity,
  passengerCapacity: vehicle.passengerCapacity ?? vehicle.vehicleType?.passengerCapacity
});

export const getAttributesFromInspection = (inspectionResponses = []) => {
  const requiredAttributes = ['battery', 'mileage', 'pluggedIn'];
  return inspectionResponses.reduce((prev, curr) => {
    const { questionKey, response } = curr;
    if (requiredAttributes.includes(questionKey)) {
      return {
        ...prev,
        [questionKey]: response
      };
    }
    return prev;
  }, {});
};

export const validateVehicleInspectionResponses = async (responses) => {
  const validate = async (data) => {
    const { response, questionId } = data;
    const question = await Questions.getQuestion({ _id: questionId });
    if (!question) throw new ApplicationError('Invalid questionId', 404, 'question.notFound');
    const { responseType, questionKey } = question;
    let castedResponse;
    try {
      castedResponse = typeConverter(String(response), responseType);
      // eslint-disable-next-line valid-typeof
      if (typeof castedResponse !== responseType) {
        throw new Error('Invalid response');
      }
    } catch (error) {
      throw new ApplicationError(error.message, 400, 'response.invalid');
    }
    return {
      response: castedResponse,
      responseType,
      questionId,
      questionKey
    };
  };

  return Promise.all(responses.map(validate));
};

export const addVehicleZonesMatchingRuleData = (vehicleInfo, zones, matchingRules) => {
  const zoneIds = zones.map(zone => zone._id);

  const vehicleZones = vehicleInfo.zones
    .filter(vehicleZone => !zoneIds.includes(vehicleZone))
    .map(vehicleZone => zones.find(zone => zone._id.equals(vehicleZone)));

  const vehicleMatchingRule = matchingRules.find(
    matchingRule => matchingRule.key === vehicleInfo.matchingRule
  );

  return {
    ...vehicleInfo,
    zones: vehicleZones,
    matchingRule: vehicleMatchingRule
  };
};

export const handleJobDeleteOnVehicle = async (job) => {
  const vehicles = await Vehicles.find({ jobs: job._id });
  await Promise.all([
    Vehicles.updateMany({ jobs: job._id }, { $pull: { jobs: job._id } }),
    ...vehicles.map(vehicle => Events.createByJobOnVehicle({ vehicle, job, eventType: 'JOB_DELETED' }))
  ]);
};

export const handleJobUpdateOnVehicle = async (originalJob, job) => {
  const locationChanged = `${originalJob.location?._id}` !== `${job.location?._id}`;
  const jobInactivated = !job.active;
  if (locationChanged || jobInactivated) {
    const vehicles = await Vehicles.find({ jobs: originalJob._id });
    const eventBody = {
      job,
      eventType: !job.active ? 'JOB_INACTIVE' : 'JOB_LOCATION_CHANGE',
      eventData: {
        changes: {
          code: {
            previous: originalJob.code,
            current: job.code
          },
          location: {
            previous: { value: originalJob.location?.name, id: originalJob.location?._id },
            current: { value: job.location?.name, id: job.location?._id }
          }
        }
      }
    };
    if (vehicles.length) {
      await Promise.all([
        Vehicles.updateMany({ jobs: originalJob._id }, { $pull: { jobs: originalJob._id } }),
        ...vehicles.map(vehicle => Events.createByJobOnVehicle({ vehicle, ...eventBody }))
      ]);
    }
  }
};

export const handleVehicleUpdate = async (originalVehicle, vehicle) => {
  const originalJobs = originalVehicle.jobs.map(job => `${job}`);
  const currentJobs = vehicle.jobs.map(job => `${job}`);
  const removedJobs = _.difference(originalJobs, currentJobs);
  const addedJobs = _.difference(currentJobs, originalJobs);

  const jobs = await Jobs.find({ _id: { $in: [...removedJobs, ...addedJobs] } });

  if (addedJobs.length || removedJobs.length) {
    await Promise.all([
      ...addedJobs.map(job => Events.createByVehicleOnJob({
        vehicle, job: jobs.find(j => `${j._id}` === `${job}`), eventType: 'ASSIGNED_JOB'
      })),
      ...removedJobs.map(job => Events.createByVehicleOnJob({
        vehicle, job: jobs.find(j => `${j._id}` === `${job}`), eventType: 'REMOVED_JOB'
      }))
    ]);
  }
};

export default {
  deriveVehicleService,
  getVehicleCapacity,
  getAttributesFromInspection,
  validateVehicleInspectionResponses,
  addVehicleZonesMatchingRuleData,
  handleJobUpdateOnVehicle,
  handleVehicleUpdate
};
