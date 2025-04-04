import * as React from 'react';

import { Link } from 'react-router-dom';
import { Formik, Field, Form } from 'formik';
import { message } from 'antd';
import axios from 'axios';
import Components from './Login/components';
import { Image } from '../elements';
import Logo from '../assets/images/logo.png';


import { schemas } from '../utils';

const { ForgotPasswordSchema, VerifyCodeSchema } = schemas;

const {
  Body,
  Container,
  LogoContainer,
  InputGroup,
  LabelContainer,
  Label,
  Button,
  InputComponent
} = Components;


class ForgotPassword extends React.PureComponent {
  state = {
    step: 0,
    email: ''
  }

  forgotPassword = async ({ email }, actions) => {
    try {
      await axios.post('/v1/forgot-password', { email }).then(() => {
        this.setState({ step: 1, email });
      }).catch((error) => {
        const errorMessage = error.response && error.response.data
          ? error.response.data.message : null;
        message.error(errorMessage || 'An error occurred');
        actions.setStatus(403);
      });
    } catch (e) {
      actions.setStatus(403);
    } finally {
      actions.setSubmitting(false);
    }
  }

  verifyPincode = async ({ code }, actions) => {
    try {
      const { email } = this.state;
      await axios.post('/v1/email-verify', { code, email }).then((res) => {
        message.success('Email verified!');
        localStorage.setItem('accessToken', res.data.accessToken);
        window.location.href = '/';
      }).catch((error) => {
        const errorMessage = error.response && error.response.data
          ? error.response.data.message : null;
        message.error(errorMessage || 'Error verifying email');
        actions.setStatus(403);
      });
    } catch (e) {
      actions.setStatus(403);
    } finally {
      actions.setSubmitting(false);
    }
  }

  render() {
    const { step } = this.state;
    return (
      <Body>
        <Container>
          <LogoContainer>
            <Image src={Logo} alt="Logo" width="100%" />
          </LogoContainer>

          <Container>
            {step === 0 && (
              <Formik
                validationSchema={ForgotPasswordSchema}
                initialValues={{ email: '' }}
                onSubmit={this.forgotPassword}
                render={formProps => (
                  <Form onSubmit={formProps.handleSubmit}>
                    <InputGroup>
                      <LabelContainer>
                        <Label htmlFor="email">Email</Label>
                      </LabelContainer>
                      <Field type="email" placeholder="EMAIL" name="email" component={InputComponent} />
                    </InputGroup>

                    <Button type="submit" disabled={formProps.submitting}>Reset Password</Button>
                  </Form>
                )
              }
              />
            )}

            {step === 1 && (
              <Formik
                validationSchema={VerifyCodeSchema}
                initialValues={{ code: '' }}
                onSubmit={this.verifyPincode}
                render={formProps => (
                  <Form onSubmit={formProps.handleSubmit}>
                    <InputGroup>
                      <LabelContainer>
                        <Label htmlFor="code">Enter Pincode</Label>
                      </LabelContainer>
                      <Field style={{ WebkitTextSecurity: 'disc' }} placeholder="Check your email for verification code." name="code" component={InputComponent} />
                    </InputGroup>
                    <Button type="submit" disabled={formProps.submitting}>Verify</Button>
                  </Form>
                )
              }
              />
            )}
          </Container>

          <Container>
            <Link to="/">Login</Link>
          </Container>

        </Container>
      </Body>
    );
  }
}

export default ForgotPassword;
