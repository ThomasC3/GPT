import * as React from 'react';
import { Tag } from 'antd';

const RideStatusTag = ({ status }) => {
  let text; let
    color;
  switch (status) {
    case 100:
      text = 'Ride Requested';
      color = 'yellow';
      break;
    case 101:
      text = 'Request Cancelled';
      color = 'red';
      break;
    case 102:
      text = 'Request Accepted';
      color = 'green';
      break;
    case 200:
      text = 'Rider in Queue';
      color = 'blue';
      break;
    case 201:
      text = 'Next in Queue';
      color = 'gold';
      break;
    case 202:
      text = 'Driver en Route';
      color = 'geekblue';
      break;
    case 203:
      text = 'Driver Arrived';
      color = 'green';
      break;
    case 204:
      text = 'Cancelled in Queue';
      color = 'cyan';
      break;
    case 205:
      text = 'Cancelled en Route';
      color = 'red';
      break;
    case 206:
      text = 'Cancelled No Show';
      color = 'red';
      break;
    case 207:
      text = 'Cancelled Not Able';
      color = 'purple';
      break;
    case 300:
      text = 'Ride in Progress';
      color = 'geekblue';
      break;
    case 700:
      text = 'Ride Complete';
      color = 'green';
      break;
    case 701:
      text = 'Random Ride Complete';
      color = 'green';
      break;
    default:
      text = 'Unknown status';
      color = 'grey';
      break;
  }
  return <Tag color={color}>{text}</Tag>;
};

export default RideStatusTag;
