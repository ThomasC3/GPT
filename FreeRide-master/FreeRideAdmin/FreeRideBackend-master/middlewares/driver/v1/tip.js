import moment from 'moment-timezone';
import { dump, errorCatchHandler, validator } from '../../../utils';
import { mapDateSearchAggregate } from '../../../utils/transformations';
import { groupTipsMonthly, expandTips } from '../../../utils/tip';
import { getLastMonthsAndCurrent, getMonthYearList } from '../../../utils/time';

const getTips = async (req, res) => {
  try {
    const { refDate } = validator.validate(
      validator.rules.object().keys({
        refDate: validator.rules.string().allow('')
      }),
      req.query
    );

    const { _id: driverId } = req.user;

    // Get current date in NY timezone
    const now = refDate ? moment.tz(refDate, 'America/New_York') : moment.tz('America/New_York');

    // Get span from start of previous month til end of current month
    const span = getLastMonthsAndCurrent(1, now);
    const createdTimestampFilter = mapDateSearchAggregate(span);

    // Group USD tips per month in NY timezone
    const currency = 'usd';
    let tips = await groupTipsMonthly(createdTimestampFilter, 'America/New_York', driverId, currency);
    // Filter per usd currency
    tips = tips.length ? tips : [{ currency, driverId, tips: [] }];

    // Fill months in span that did not have tips with 0 sum
    const monthsInSpan = getMonthYearList(span.start, span.end);
    const expandedTips = expandTips(tips, monthsInSpan.reverse(), currency);

    res.json(expandedTips[0].tips.map(dump.dumpTipsForDriver));
  } catch (err) {
    errorCatchHandler(res, err, err.message || 'We are unable to get tips for this driver at this time.');
  }
};

export default {
  getTips
};
