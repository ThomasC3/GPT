import * as React from 'react';
import PropTypes from 'prop-types';
import { Select } from 'antd';
import { FormItem } from '../../elements';

const MultiSelectField = ({
  field: { onChange, ...field },
  form: {
    touched, errors, setFieldValue, setFieldTouched
  }, // also values, setXXXX, handleXXXX, dirty, isValid, status, etc.
  label,
  ...props
}) => {
  const errorMsg = touched[field.name] && errors[field.name];

  const Comp = Select;

  return (
    <FormItem
      label={label}
      help={errorMsg}
      validateStatus={errorMsg ? 'error' : undefined}
    >
      <Comp
        {...field}
        {...props}
        mode="multiple"
        onDeselect={(value) => {
          const newValue = field.value.filter(i => i !== value);
          setFieldValue(field.name, newValue);
        }}
        onSelect={(value) => {
          const newValue = [...field.value, value];
          setFieldValue(field.name, newValue);
        }}
        onBlur={newValue => setFieldTouched(field.name)}
      >
        {props.options.map((i, index) => <Select.Option key={index} value={i.value}>{i.name}</Select.Option>)}
      </Comp>
    </FormItem>
  );
};

MultiSelectField.propTypes = {
  label: PropTypes.string,
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

MultiSelectField.defaultProps = {
  size: 'small'
};

export default MultiSelectField;
