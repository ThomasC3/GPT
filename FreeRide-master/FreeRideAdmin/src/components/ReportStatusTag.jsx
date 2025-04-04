import * as React from 'react';
import { Tag } from 'antd';

const ReportStatusTag = ({ status }) => {
  let text; let
    color;
  switch (status) {
    case 'Pending':
      text = 'Waiting';
      color = 'blue';
      break;
    case 'Denied':
      text = 'Dismissed';
      color = 'green';
      break;
    case 'Confirmed':
      text = 'Verified';
      color = 'red';
      break;
    default:
      text = 'Unknown status';
      color = 'grey';
      break;
  }
  return <Tag color={color}>{text}</Tag>;
};

export default ReportStatusTag;
