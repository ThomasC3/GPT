import * as React from 'react';
import { Tag } from 'antd';
import {
  PAYMENT_STATUS_TAG_CONFIG,
  PAYMENT_STATUS_TAG_DEFAULT_CONFIG
} from '../utils/constants';

const PaymentStatusTag = ({ status }) => {
  const { color, text } = PAYMENT_STATUS_TAG_CONFIG[status] || PAYMENT_STATUS_TAG_DEFAULT_CONFIG;
  return <Tag color={color}>{text}</Tag>;
};

export default PaymentStatusTag;
