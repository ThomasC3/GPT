import React from 'react';
import PropTypes from 'prop-types';
import { Select } from 'antd';
import { FormItem } from '../../elements';

const SelectField = ({
  field: { onChange, ...field },
  form: {
    touched, errors, setFieldValue, setFieldTouched
  }, // also values, setXXXX, handleXXXX, dirty, isValid, status, etc.
  label,
  ...props
}) => {
  const errorMsg = touched[field.name] && errors[field.name];

  const Comp = Select;
  const { options, onChange: handleChange = () => {} } = props;

  return (
    <FormItem
      label={label}
      help={errorMsg}
      validateStatus={errorMsg ? 'error' : undefined}
    >
      <Comp
        {...field}
        {...props}
        onChange={(newValue) => {
          setFieldValue(field.name, newValue);
          handleChange(newValue);
        }}
        onBlur={() => setFieldTouched(field.name)}
      >
        {options.map((i, index) => (
          <Select.Option key={i.id || i.value || index} value={i.value}>
            {i.name}
          </Select.Option>
        ))}
      </Comp>
    </FormItem>
  );
};

SelectField.propTypes = {
  label: PropTypes.string,
  size: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.bool
      ]).isRequired
    })
  ).isRequired
};

SelectField.defaultProps = {
  size: 'small',
  label: 'Select'
};

export default SelectField;
