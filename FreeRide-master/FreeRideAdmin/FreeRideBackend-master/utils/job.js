import { Events } from '../models';

export const handleJobUpdate = async (originalJob, job) => {
  const activeStatusChange = originalJob.active !== job.active;
  if (activeStatusChange) {
    await Events.createByJob({ job, eventType: job.active ? 'ACTIVE' : 'INACTIVE' });
  }
};

export const handleJobDelete = async job => Events.createByJob({ job, eventType: 'DELETED' });

export default {
  handleJobUpdate,
  handleJobDelete
};
