import * as React from 'react';

import Styled from 'styled-components';

const Body = Styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-family: 'lato', sans-serif;
`;
const Container = Styled.div`
  border-radius: 5px;
  width: 350px;
  display: flex;
  flex-direction: column;
`;
const LogoContainer = Styled.div`
  font-size: 20px;Ò
  text-align: center;
  padding: 20px 20px 0;
  margin-bottom: 30px;
`;
const InputGroup = Styled.div`
  margin-bottom: 10px;
`;
const LabelContainer = Styled.div`
  margin-bottom: 5px;
`;
const Label = Styled.label`
  font-size: 12px;
  letter-spacing: 1.71px;
  color: #00CC99;
`;
const Input = Styled.input`
  border: 2px solid #00CC99;
  width: 100%;
  font-size: 12px;
  color: #3366FF;
  letter-spacing: 1.71px;
  margin: 0;
  outline: 0;
  padding: 10px 0px 10px 5px;
  -webkit-transition: background-color .3s;
  transition: background-color .3s;
`;
const Button = Styled.button`
  display: block;
  width: 100px;
  padding: 15px 0px;
  margin: 0 auto;
  background: #3366FF;
  font-family: .AppleSystemUIFont;
  font-size: 14px;
  color: #FFFFFF;
  letter-spacing: 0;
  text-align: center;
`;
const Error = Styled.div`
  color: red;
`;

const DropzoneContainer = Styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border-width: 2px;
  border-radius: 2px;
  border-color: #eeeeee;
  border-style: dashed;
  background-color: #fafafa;
  color: #bdbdbd;
  outline: none;
  transition: border .24s ease-in-out;
`;

const InputComponent = ({
  field, // { name, value, onChange, onBlur }
  form: { touched, errors }, // also values, setXXXX, handleXXXX, dirty, isValid, status, etc.
  ...props
}) => (
  <div>
    <Input type="text" {...field} {...props} />
    {touched[field.name]
      && errors[field.name] && <Error>{errors[field.name]}</Error>}
  </div>
);


export default {
  Body,
  Container,
  DropzoneContainer,
  LogoContainer,
  InputGroup,
  LabelContainer,
  Label,
  Input,
  Button,
  Error,
  InputComponent
};
