import * as React from 'react';
import PropTypes from 'prop-types';
import { Select } from 'antd';

const LocationDropdown = ({
  locations, onLocationChange, placeholder, value, width
}) => (
  <Select
    menuPlacement="auto"
    menuPosition="fixed"
    size="small"
    onChange={(e) => {
      onLocationChange(e);
    }}
    value={value}
    style={{ width }}
  >
    <Select.Option value="">{placeholder}</Select.Option>
    {locations.map(i => <Select.Option key={i.id} value={i.id}>{i.name}</Select.Option>)}
  </Select>
);

LocationDropdown.propTypes = {
  locations: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired
  })).isRequired,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  width: PropTypes.string,
  onLocationChange: PropTypes.func.isRequired
};

LocationDropdown.defaultProps = {
  width: '250px',
  placeholder: 'Select Location To Manage',
  value: ''
};

export default LocationDropdown;
