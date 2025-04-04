import moment from 'moment';
// eslint-disable-next-line no-unused-vars
import { websocket } from '../services';
import { Locations } from '../models';
import { latestTimeIndex } from './timeseries';
import { addReadingsForHistory } from '../services/timeseries';
import logger from '../logger';

export const addMetricHistory = async () => {
  let end = latestTimeIndex(moment(process.env.npm_config_range_end, '%Y-%M-%D %H:%m'));
  if (!end.isValid()) {
    end = latestTimeIndex(moment.utc());
  }
  // Required granularity readings will be added for last intantaneous and historic window
  // present in the range, including granularity value indexed to range start
  const start = end.clone().subtract(21, 'days').subtract(15, 'minutes');
  const range = { start, end };
  console.log(`Creating metrics for range ${range.start.toISOString()} - ${range.end.toISOString()}`);
  const locations = await Locations.find({});
  for (let i = 0; i < locations.length; i += 1) {
    console.log(`\tAdding metrics for ${locations[i].name}...`);
    const {
      granularityReadings,
      instantaneousReadings,
      historicReadings
      // eslint-disable-next-line no-await-in-loop
    } = await addReadingsForHistory(range, locations[i]._id);
    logger.info(`Metrics for ${locations[i].name} (${range.start.format()}, ${range.end.format()}): ${granularityReadings.length}, ${instantaneousReadings.length}, ${historicReadings.length}`);
    console.log('\t\tDone');
  }
  console.log('Created metrics!');
};

export default { addMetricHistory };
