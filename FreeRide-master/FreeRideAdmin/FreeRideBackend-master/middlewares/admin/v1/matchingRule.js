import { adminErrorCatchHandler } from '..';
import { ApplicationError } from '../../../errors';
import { MatchingRules } from '../../../models';
import { dumpMatchingRuleForAdmin } from '../../../utils/dump';

const getMatchingRules = async (req, res) => {
  try {
    const matchingRules = await MatchingRules.getMatchingRules(req.query);
    res.status(200).json(matchingRules.map(item => dumpMatchingRuleForAdmin(item)));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getMatchingRule = async (req, res) => {
  try {
    const matchingRule = await MatchingRules.getMatchingRuleById(req.params.id);
    if (!matchingRule) throw new ApplicationError('Unable to find matching policy', 404);
    res.status(200).json(dumpMatchingRuleForAdmin(matchingRule));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

export default {
  getMatchingRules,
  getMatchingRule
};
