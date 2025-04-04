import * as React from 'react';
import {
  Card, Col, Form, Spin, message
} from 'antd';
import { Formik, Field } from 'formik';
import axios from 'axios';
import { Row } from '../elements';
import { InputField } from '../components';
import { schemas } from '../utils';

const { ProfileSchema } = schemas;
class Profile extends React.Component {
  save = data => axios({
    method: 'PUT',
    url: '/v1/admin',
    data
  })

  render() {
    const {
      fetching, firstName, lastName,
      email
    } = this.props;

    return (
      <Card title="My Info">
        <Spin spinning={fetching}>
          <Formik
            enableReinitialize
            initialValues={{
              firstName, lastName, email
            }}
            validationSchema={ProfileSchema}
            validateOnChange={false}
            onSubmit={(values, actions) => {
              this.save({ ...values }).then(() => {
                message.success('Profile Updated');
                actions.setSubmitting(false);
              }).catch((err) => {
                const errorMessage = err.response && err.response.data
                  ? err.response.data.message
                  : null;

                message.error(errorMessage || 'An Error Occurred');
              }).finally(() => {
                actions.setSubmitting(false);
              });
            }}
            render={formProps => (
              <Form onSubmit={formProps.handleSubmit}>

                <Row gutter={15}>
                  <Col xs={24} sm={12}>
                    <Field label="First Name" name="firstName" component={InputField} disabled />
                  </Col>

                  <Col xs={24} sm={12}>
                    <Field label="Last Name" name="lastName" component={InputField} disabled />
                  </Col>
                </Row>

                <Row gutter={15}>
                  <Col xs={24} sm={12}>
                    <Field label="Email" name="email" component={InputField} disabled />
                  </Col>
                </Row>
              </Form>
            )}
          />
        </Spin>
      </Card>
    );
  }
}

export default Profile;
