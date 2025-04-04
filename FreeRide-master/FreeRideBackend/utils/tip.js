import _ from 'lodash';
import * as Sentry from '@sentry/node';
import { ApplicationError } from '../errors';
import logger from '../logger';
import { Tips, PaymentStatus } from '../models';
import { mongodb, stripe } from '../services';
import { dumpPaymentIntent } from './dump';

const REQUIRES_CONFIRMATION_STATE = PaymentStatus
  .properties[PaymentStatus.requires_confirmation].name;
const REQUIRES_CAPTURE_STATE = PaymentStatus.properties[PaymentStatus.requires_capture].name;
const CANCEL_STATE = PaymentStatus.properties[PaymentStatus.canceled].name;
const SUCCEEDED_STATUS = PaymentStatus.properties[PaymentStatus.succeeded].name;

export const createTipPayment = async (
  stripeCustomerId, tipAmount, currency, statetement, metadata
) => {
  const paymentIntent = await stripe.createPaymentIntent(
    stripeCustomerId,
    tipAmount,
    currency,
    statetement,
    metadata
  );
  return dumpPaymentIntent(paymentIntent);
};

export const confirmTipPayment = async (paymentIntentId, paymentIntentStatus) => {
  let updatedTip = await Tips.updateTip(
    {
      paymentIntentId,
      status: REQUIRES_CONFIRMATION_STATE
    },
    {
      status: paymentIntentStatus,
      waitingPaymentConfirmation: false
    }
  );
  if (!updatedTip) {
    updatedTip = await Tips.findOne(
      {
        paymentIntentId,
        status: REQUIRES_CAPTURE_STATE
      }
    );
  }
  return updatedTip;
};

export const captureTipPayment = async (tipId) => {
  let capturedTip = await Tips.findOne({ _id: tipId });

  if (capturedTip?.paymentIntentId && capturedTip?.status === REQUIRES_CAPTURE_STATE) {
    const paymentIntent = await stripe.captureFunds(capturedTip.paymentIntentId);
    let balanceTransactionId = null;

    if (paymentIntent?.charges?.object === 'list' && paymentIntent?.charges?.data[0]) {
      if (paymentIntent.charges.data.length > 1) {
        throw new ApplicationError(`More than one charge for Tip paymentIntentId '${paymentIntent.id}'`);
      }
      balanceTransactionId = paymentIntent.charges.data[0].balance_transaction;
      if (!balanceTransactionId) {
        throw new ApplicationError(`No charges for Tip paymentIntentId '${paymentIntent.id}'`);
      }
    }

    capturedTip = await Tips.updateTip(
      { paymentIntentId: paymentIntent.id },
      {
        status: paymentIntent.status,
        balanceTransactionId
      }
    );

    // TODO move this to async worker / later cron
    stripe.getBalanceTransaction(balanceTransactionId).then(
      (balanceTransaction) => {
        Tips.updateTip(
          { paymentIntentId: paymentIntent.id },
          {
            status: paymentIntent.status,
            balanceTransactionId: balanceTransaction.Id,
            fee: balanceTransaction.fee,
            net: balanceTransaction.net
          }
        );
      }
    ).catch((error) => {
      logger.error(error);
      Sentry.captureException(error);
    });
  }

  return capturedTip;
};

export const cancelTipPayment = async (tipId) => {
  let cancelledTip = await Tips.findOne({ _id: tipId });
  if (cancelledTip?.paymentIntentId && cancelledTip?.status !== CANCEL_STATE) {
    const paymentIntent = await stripe.cancelPaymentIntent(cancelledTip.paymentIntentId);
    cancelledTip = await Tips.updateTip(
      { paymentIntentId: paymentIntent.id },
      { status: paymentIntent.status }
    );
  }
  return cancelledTip;
};

export const groupTipsMonthly = async (createdTimestamp, timezone = 'America/New_York', driverId = null, currency = 'usd') => {
  // Group tips for each driver filtered per month
  const match1 = {
    createdTimestamp,
    currency,
    status: SUCCEEDED_STATUS
  };

  if (driverId) {
    match1.driverId = new mongodb.Types.ObjectId(driverId);
  }

  return Tips.aggregate([
    { $match: match1 },
    // Get month in timezone
    {
      $addFields: {
        month: {
          $month: {
            date: '$createdTimestamp',
            timezone
          }
        },
        year: {
          $year: {
            date: '$createdTimestamp',
            timezone
          }
        }
      }
    },
    // Get first driver match
    {
      $project: {
        driverId: 1,
        month: 1,
        year: 1,
        total: 1,
        fee: 1,
        net: 1,
        currency: 1
      }
    },
    // Group by driver+month and sum
    {
      $group: {
        _id: {
          driverId: '$driverId',
          month: '$month',
          year: '$year',
          firstName: '$driverFirstName',
          lastName: '$driverLastName'
        },
        totalMonthSum: {
          $sum: '$total'
        },
        feeMonthSum: {
          $sum: '$fee'
        },
        netMonthSum: {
          $sum: '$net'
        },
        currency: {
          $push: '$currency'
        }
      }
    },
    // Group by driver
    {
      $group: {
        _id: {
          driverId: '$_id.driverId',
          firstName: '$_id.firstName',
          lastName: '$_id.lastName'
        },
        tips: {
          $push: {
            month: '$_id.month',
            year: '$_id.year',
            total: '$totalMonthSum',
            net: '$netMonthSum',
            fee: '$feeMonthSum',
            currency: { $arrayElemAt: ['$currency', 0] }
          }
        }
      }
    },
    {
      $project: {
        driverId: '$_id.driverId',
        firstName: '$_id.firstName',
        lastName: '$_id.lastName',
        tips: 1
      }
    }
  ]);
};

export const expandTips = (tips_, monthsInSpan, currency = 'usd') => {
  // Expand tips to have either the tip sum for each monthsInSpan
  // or 0 if no tips for that period
  const tips = tips_;
  tips.forEach((item) => {
    item.tips = monthsInSpan.map(date => ({
      ...(
        item.tips.find(tip => tip.month === date.month && tip.year === date.year)
        || {
          ...date, total: 0, net: 0, fee: 0, currency
        }
      ),
      // Add name of month for display purposes
      monthName: date.monthName
    }));
  });
  return tips;
};

export const checkTipsAssociatedAndCancelPending = async (params) => {
  const alreadyHasTips = await Tips.find({
    ...params,
    status: { $ne: PaymentStatus.properties[PaymentStatus.canceled].name }
  });

  if (alreadyHasTips.length) {
    // Cancel pending tips
    const tipsPending = alreadyHasTips.filter(
      item => item.status !== PaymentStatus.properties[PaymentStatus.succeeded].name
    );
    let tipId;
    for (let i = 0; i < tipsPending.length; i += 1) {
      tipId = tipsPending[i]._id;
      try {
        // eslint-disable-next-line no-await-in-loop
        await cancelTipPayment(tipId);
      } catch (error) {
        Sentry.captureException(error);
        logger.error(`Could not cancel tip ${tipId}`);
      }
    }

    // Check if there is already succeded tip
    const tipSucceeded = alreadyHasTips.find(
      item => item.status === PaymentStatus.properties[PaymentStatus.succeeded].name
    );
    if (tipSucceeded) {
      throw new ApplicationError('A tip has already been processed successfully.', 409, 'tip.alreadySuccess');
    }
  }
};

export const groupBy = (tips, groupKey = '_id', metadataKeys = [], sumKeys = ['total']) => {
  const group = [];
  let key;
  tips.forEach((item) => {
    key = item[groupKey];
    if (group[key] === undefined) {
      group[key] = {};
      metadataKeys.forEach((addKey) => {
        group[key][addKey] = item[addKey];
      });
      sumKeys.forEach((addKey) => {
        group[key][addKey] = item[addKey];
        group[key][`${addKey}Count`] = (!item[addKey] && item[addKey] !== 0) ? 0 : 1;
      });
    } else {
      sumKeys.forEach((sumKey) => {
        group[key][sumKey] += (item[sumKey] || 0);
        group[key][`${sumKey}Count`] += (!item[sumKey] && item[sumKey] !== 0) ? 0 : 1;
      });
    }
  });
  return _.sortBy(Object.values(group), ['driverFirstName', 'driverLastName']);
};

export default {
  createTipPayment,
  captureTipPayment,
  cancelTipPayment,
  expandTips,
  checkTipsAssociatedAndCancelPending,
  groupBy
};
