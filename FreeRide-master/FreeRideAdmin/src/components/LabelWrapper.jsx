import React from 'react';
import PropTypes from 'prop-types';

const LabelWrapper = ({ label, children }) => (
  <div style={{ marginBottom: '12px' }}>
    <p style={{ display: 'block', marginBottom: '8px' }}>
      {`${label} :`}
    </p>
    {children}
  </div>
);

LabelWrapper.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired
};

export default LabelWrapper;
