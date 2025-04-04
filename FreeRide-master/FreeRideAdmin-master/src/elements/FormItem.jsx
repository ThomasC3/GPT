import { Form } from 'antd';
import styled from 'styled-components';

const FormItem = styled(Form.Item)`
  && {
    margin-bottom: 5px;
  }

  .ant-form-item-label {
    line-height: 20px;
  }
`;


export default FormItem;
