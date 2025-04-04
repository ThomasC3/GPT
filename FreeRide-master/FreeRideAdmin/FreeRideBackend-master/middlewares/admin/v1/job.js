import { Jobs } from '../../../models';
import { adminErrorCatchHandler } from '..';
import { ApplicationError } from '../../../errors';
import { dumpJob } from '../../../utils/dump';
import { validator } from '../../../utils';
import { handleJobUpdateOnVehicle, handleJobDeleteOnVehicle } from '../../../utils/vehicle';
import { handleJobUpdate, handleJobDelete } from '../../../utils/job';

const validateJob = jobData => validator.validate(
  validator.rules.object().keys({
    code: validator.rules.string().required(),
    location: validator.rules.string().allow('', null),
    locationCode: validator.rules.string().allow('').required(),
    clientCode: validator.rules.string().required(),
    typeCode: validator.rules.string().required(),
    active: validator.rules.bool()
  }),
  jobData,
);

const validateUpdateJob = jobData => validator.validate(
  validator.rules.object().keys({
    code: validator.rules.string(),
    location: validator.rules.string().allow('', null),
    locationCode: validator.rules.string().allow(''),
    clientCode: validator.rules.string(),
    typeCode: validator.rules.string(),
    active: validator.rules.bool()
  }),
  jobData,
);

const getJobs = async (req, res) => {
  try {
    const filterParams = validator.validate(
      validator.rules.object().keys({
        location: validator.rules.string(),
        active: validator.rules.bool()
      }),
      req.query,
    );

    const jobs = await Jobs.getJobs({ ...filterParams });
    if (!jobs) { throw new ApplicationError('No Jobs available!'); }

    res.status(200).json({ jobs: jobs.map(dumpJob) });
  } catch (error) {
    adminErrorCatchHandler(res, error, req,
      error.message || 'We were unable to fetch Jobs at this time.');
  }
};

const getJob = async (req, res) => {
  try {
    const {
      params: { id: jobId }
    } = req;

    const job = await Jobs.getJob({ _id: jobId }, 'location');
    if (!job) { throw new ApplicationError('Job not available!'); }

    res.status(200).json(dumpJob(job));
  } catch (error) {
    adminErrorCatchHandler(res, error, req,
      error.message || 'We were unable to fetch Jobs at this time.');
  }
};


const createJob = async (req, res) => {
  try {
    const {
      body: jobData
    } = req;

    const validatedJobData = validateJob(jobData);

    const job = await Jobs.createJob(validatedJobData);

    if (job.active) {
      await handleJobUpdate({ active: false }, job);
    }

    res.status(200).json(dumpJob(job));
  } catch (error) {
    adminErrorCatchHandler(res, error, req,
      error.message || 'We were unable to add the Job at this time.');
  }
};

const updateJob = async (req, res) => {
  try {
    const {
      params: { id: jobId },
      body: jobData
    } = req;

    const validatedJobData = validateUpdateJob(jobData);

    const originalJob = await Jobs.getJob({ _id: jobId }, 'location');
    const job = await Jobs.updateJobById(jobId, validatedJobData, 'location');

    await handleJobUpdate(originalJob, job);
    await handleJobUpdateOnVehicle(originalJob, job);

    res.status(200).json(dumpJob(job));
  } catch (error) {
    adminErrorCatchHandler(res, error, req,
      error.message || 'We were unable to update the Job at this time.');
  }
};

const removeJob = async (req, res) => {
  try {
    const {
      params: { id: jobId }
    } = req;

    const job = await Jobs.deleteJob(jobId);

    await handleJobDelete(job);
    await handleJobDeleteOnVehicle(job);

    res.status(200).json({ message: 'Successfully removed Job' });
  } catch (error) {
    adminErrorCatchHandler(res, error, req,
      error.message || 'We were unable to remove the Job at this time.');
  }
};

export default {
  getJobs,
  getJob,
  createJob,
  updateJob,
  removeJob
};
