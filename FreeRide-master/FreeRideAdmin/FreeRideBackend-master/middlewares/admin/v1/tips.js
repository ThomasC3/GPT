import csv from 'csv';
import { Tips, PaymentStatus, Locations } from '../../../models';
import { dump, validator } from '../../../utils';
import { groupBy } from '../../../utils/tip';
import { TipSerializer } from '../utils/TipSerializer';
import { monthRangeLimitCheck } from '../../../utils/check';
import { adminErrorCatchHandler } from '..';

const SUCCEEDED_STATUS = PaymentStatus.properties[PaymentStatus.succeeded].name;

const getTipsParamsValidator = (req, options = {}) => validator.validate(
  validator.rules.object().keys({
    riderId: validator.rules.string().allow(''),
    driverId: validator.rules.string().allow(''),
    locationId: validator.rules.string().allow(''),
    status: validator.rules.string().allow(''),
    createdTimestamp: validator.rules.object().keys({
      start: validator.rules.string().allow(''),
      end: validator.rules.string().allow('')
    }),
    skip: validator.rules.number().integer().min(0),
    limit: options.csv ? validator.rules.number().integer().min(1).allow('') : validator.rules.number().integer().min(1),
    sort: validator.rules.string().valid('', 'createdTimestamp'),
    order: validator.rules.string().allow('')
  }),
  req.query
);

const getTips = async (req, res) => {
  try {
    const filterParams = getTipsParamsValidator(req);

    const tips = await Tips.getTips(filterParams);
    tips.items = tips.items.map(
      item => dump.dumpTipsForAdmin(item, { timezone: tips.locationTimezone })
    );

    const metadataKeys = ['driverId', 'driverFirstName', 'driverLastName'];
    const sumKeys = ['total', 'net', 'fee'];

    const succeededTips = tips.items.filter(item => item.status === SUCCEEDED_STATUS);
    const driverStats = groupBy(succeededTips, 'driverId', metadataKeys, sumKeys);

    const driverFilterList = tips.totals.map(driver => ({
      driverId: driver.driverId,
      driverFirstName: driver.driverFirstName,
      driverLastName: driver.driverLastName
    }));

    delete tips.locationTimezone;

    res.status(200).json({ ...tips, driverStats, driverFilterList });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getCsvTips = async (req, res) => {
  try {
    const filterParams = getTipsParamsValidator(req, { csv: true });
    monthRangeLimitCheck(filterParams);

    const locationTimezone = filterParams.locationId
      ? (await Locations.findById(filterParams.locationId))?.timezone
      : 'America/New_York';

    const cursor = Tips.getTipsCursor(filterParams, locationTimezone);
    const transformer = new TipSerializer(locationTimezone).adminTipToCsv;

    res.setHeader('Content-Disposition', `attachment; filename="download-${Date.now()}.csv"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    res.writeHead(200, { 'Content-Type': 'text/csv' });
    res.flushHeaders();

    const columns = [
      'index', 'status', 'driverFirstName', 'driverLastName',
      'driverId', 'createdTimestamp', 'total', 'net', 'fee',
      'currency', 'riderFirstName', 'riderLastName', 'riderId',
      'rideId'
    ];
    cursor
      .pipe(csv.transform(transformer))
      .pipe(csv.stringify({
        header: true,
        columns,
        cast: {
          boolean: (value, context) => (context.column === 'index' ? String(context.records + 1) : !!value)
        }
      }))
      .pipe(res);
  } catch (error) {
    adminErrorCatchHandler(res, error, {});
  }
};

export default {
  getTips,
  getCsvTips
};
