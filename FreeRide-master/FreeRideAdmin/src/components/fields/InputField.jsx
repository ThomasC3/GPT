import * as React from 'react';
import PropTypes from 'prop-types';
import { Input, InputNumber } from 'antd';
import { FormItem } from '../../elements';

const { TextArea, Password } = Input;

const InputField = ({
  field: { onChange, ...field },
  form: { touched, errors, setFieldValue }, // also values, setXXXX, handleXXXX, dirty, isValid, status, etc.
  label,
  useNumberComponent = false,
  type,
  ...props
}) => {
  const errorMsg = touched[field.name] && errors[field.name];

  let Comp = Input;
  if (useNumberComponent) {
    Comp = InputNumber;
  } else {
    switch (type) {
      case 'textarea': Comp = TextArea; break;
      case 'password': Comp = Password; break;
      default: Comp = Input;
    }
  }

  return (
    <FormItem
      label={label}
      help={errorMsg}
      validateStatus={errorMsg ? 'error' : undefined}
    >
      <Comp
        {...field}
        {...props}
        onChange={
          useNumberComponent
            ? newValue => setFieldValue(field.name, newValue)
            : onChange
        }
      />
    </FormItem>
  );
};

InputField.propTypes = {
  prefix: PropTypes.element,
  label: PropTypes.string,
  useNumberComponent: PropTypes.bool
};

InputField.defaultProps = {
  size: 'small'
};

export default InputField;
