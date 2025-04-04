import * as React from 'react';
import PropTypes from 'prop-types';
import { Tag } from 'antd';

const FluxTag = ({ tag }) => {
  let text;
  let color;
  switch (tag) {
    case -2:
      text = 'Not busy';
      color = 'green';
      break;
    case -1:
      text = 'Less busy';
      color = 'green';
      break;
    case 0:
      text = 'Normal';
      color = 'green';
      break;
    case 1:
      text = 'Busy';
      color = 'gold';
      break;
    case 2:
      text = 'Very busy';
      color = 'red';
      break;
    default:
      text = 'NA';
      color = 'grey';
      break;
  }
  return <Tag color={color}>{text}</Tag>;
};

FluxTag.propTypes = {
  tag: PropTypes.number
};

FluxTag.defaultProps = {
  tag: null
};

export default FluxTag;
