import moment from 'moment';
import { adminErrorCatchHandler } from '..';
import { getCurrentHistoricReading, buildChart } from '../../../services/timeseries';
import { latestTimeIndex } from '../../../utils/timeseries';
import { validator } from '../../../utils';
import { DATE_FORMAT_ALT } from '../../../utils/time';
import { dumpTagForAdmin } from '../../../utils/dump';

const getReadingParamsValidator = req => validator.validate(
  validator.rules.object().keys({
    timestamp: validator.rules.string().allow(''),
    location: validator.rules.string()
  }),
  req.query
);

const getReadingsParamsValidator = req => validator.validate(
  validator.rules.object().keys({
    timestamp: validator.rules.object().keys({
      start: validator.rules.string().allow(''),
      end: validator.rules.string().allow('')
    }),
    location: validator.rules.string()
  }),
  req.query
);

const getMetric = async (req, res) => {
  try {
    const { location, timestamp } = getReadingParamsValidator(req);
    const timestampDate = (timestamp && moment.utc(timestamp, DATE_FORMAT_ALT).isValid())
      ? moment.utc(timestamp, DATE_FORMAT_ALT) : moment().utc();
    const historicReading = await getCurrentHistoricReading(location, timestampDate);
    res.status(200).json(historicReading ? dumpTagForAdmin(historicReading) : null);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getChart = async (req, res) => {
  try {
    const {
      location,
      timestamp: {
        start: startTimestamp,
        end: endTimestamp
      }
    } = getReadingsParamsValidator(req);
    const start = (startTimestamp && moment.utc(startTimestamp, DATE_FORMAT_ALT).isValid())
      ? moment.utc(startTimestamp, DATE_FORMAT_ALT) : null;
    const end = (endTimestamp && moment.utc(endTimestamp, DATE_FORMAT_ALT).isValid())
      ? moment.utc(endTimestamp, DATE_FORMAT_ALT) : null;
    let range = { start: latestTimeIndex(start), end: latestTimeIndex(end) };
    if (!start || !end) {
      const now = latestTimeIndex(moment.utc());
      range = {
        start: now,
        end: now.clone().subtract('days', 21)
      };
    }
    const chartData = await buildChart(location, range);
    res.status(200).json(chartData);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

export default {
  getMetric,
  getChart
};
