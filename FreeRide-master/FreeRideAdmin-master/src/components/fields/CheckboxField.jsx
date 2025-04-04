import * as React from 'react';
import PropTypes from 'prop-types';
import { Input } from 'antd';

const CheckboxField = ({
  field,
  form: { setFieldValue }, // also values, setXXXX, handleXXXX, dirty, isValid, status, etc.
  label,
  ...props
}) => (
    <>
      <Input
        {...props}
        {...field}
        checked={field.value || false}
        onBlur={null}
        type="checkbox"
        onInput={(e) => {
          setFieldValue(field.name, e.target.checked);
        }}
      />
      &nbsp;
      <label>{label}</label>
    </>
);

CheckboxField.propTypes = {
  label: PropTypes.string
};


export default CheckboxField;
