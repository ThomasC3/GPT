import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import {
  Row, Col, Button, Spin, Form, message
} from 'antd';
import {
  Formik, FieldArray, Field, ErrorMessage
} from 'formik';
import axios from 'axios';
import { FormItem } from '../elements';
import {
  InputField, SelectField, LocationsSelector
} from '.';

import { schemas } from '../utils';

const { AdminSchema, AdminSchemaNew, PasswordSchema } = schemas;

class AdminInfo extends Component {
  state = {
    firstName: '',
    lastName: '',
    email: '',
    locations: [],
    role: '',
    connection: '',
    isSocial: false,
    roles: [],
    emailVerified: null,
    fetching: true
  }

  componentDidMount() {
    const { id } = this.props;
    this.fetchRoles();
    if (id) {
      this.fetch(id);
    } else {
      this.setState({ fetching: false });
    }
  }

  fetchRoles = async () => {
    const { data } = await axios({
      url: '/v1/roles'
    });
    this.setState({ roles: data });
  }

  fetch = async (id) => {
    this.setState({ fetching: true });
    try {
      const data = await axios({
        url: `/v1/admins/${id}`
      }).then(res => res.data);
      const currentIdentity = data.identities.find(identity => `${identity.provider}|${identity.user_id}` === data.user_id);
      this.setState({
        fetching: false,
        ...data,
        firstName: data.given_name,
        lastName: data.family_name,
        role: data.app_metadata && data.app_metadata.role,
        locations: data.app_metadata && data.app_metadata.locations && data.app_metadata.locations.map(i => i.id),
        connection: currentIdentity && currentIdentity.connection,
        isSocial: currentIdentity && currentIdentity.isSocial,
        emailVerified: data.email_verified
      });
    } catch (e) {
      message.error('An error occurred');
      this.setState({ fetching: false });
    }
  }

  save = (data) => {
    const { id } = this.props;
    const { role, email, isSocial } = this.state;
    const formattedData = {
      firstName: data.firstName,
      lastName: data.lastName,
      locations: data.locations,
      role: data.role,
      email: data.email
    };

    if (!id) {
      formattedData.password = data.password;
    }
    if (!isSocial && id && data.email && (data.email !== email)) {
      formattedData.verifyEmail = true;
    }

    if (id && (data.role !== role)) {
      formattedData.roleChanged = true;
    }

    return axios({
      method: id ? 'PUT' : 'POST',
      url: `/v1/admins/${id || ''}`,
      data: formattedData
    });
  }

  updatePassword = (password) => {
    const { id } = this.props;
    return axios({
      method: 'PUT',
      url: `/v1/admins/${id}/password`,
      data: { password }
    });
  }

  render() {
    const {
      fetching, firstName, lastName, email, role, locations,
      isSocial, connection, roles, emailVerified
    } = this.state;
    const { id, history } = this.props;
    return (
      <Spin spinning={fetching}>
        <Formik
          enableReinitialize
          initialValues={{
            firstName,
            lastName,
            email,
            role,
            locations,
            connection,
            password: ''
          }}
          validationSchema={id ? AdminSchema : AdminSchemaNew}
          validateOnChange={false}
          onSubmit={(values, actions) => {
            const submissionValues = { ...values };
            if (isSocial) {
              delete submissionValues.firstName;
              delete submissionValues.lastName;
              delete submissionValues.email;
            }
            this.save(submissionValues).then((res) => {
              message.success('Updated');
              actions.setSubmitting(false);
              if (!id) { history.push(`/admins/${res.data.user_id}`); }
            }).catch((err) => {
              const errorMessage = err.response && err.response.data
                ? err.response.data.message
                : null;

              message.error(errorMessage || 'An Error Occurred');
            }).finally(() => {
              actions.setSubmitting(false);
            });
          }}
        >
          {formProps => (
            <Form onSubmit={formProps.handleSubmit}>
              <Row gutter={15}>
                <Col xs={24} sm={12}>
                  <Field label="First Name" name="firstName" component={InputField} disabled={isSocial} />
                </Col>

                <Col xs={24} sm={12}>
                  <Field label="Last Name" name="lastName" component={InputField} disabled={isSocial} />
                </Col>

                <Col xs={24} sm={12}>
                  <Field label={`Email ${emailVerified ? '(Verified)' : '(Unverified)'}`} name="email" autoComplete="off" component={InputField} disabled={isSocial} />
                </Col>
                {!id && (
                  <Col xs={24} sm={12}>
                    <Field label="Password" name="password" type="password" component={InputField} />
                  </Col>
                )}
                { id && (
                  <Col xs={24} sm={12}>
                    <Field label="Connection" name="connection" component={InputField} disabled />
                  </Col>
                )}
              </Row>

              <Row gutter={15}>
                <Col xs={24} sm={12}>
                  <Field
                    label="Role"
                    name="role"
                    options={roles.map(r => ({ value: r.id, name: r.name }))}
                    component={SelectField}
                  />
                </Col>
              </Row>

              <Row gutter={15}>
                <Col xs={24}>
                  <FormItem label="Locations">
                    <FieldArray
                      name="locations"
                      render={arrayHelpers => (
                        <LocationsSelector
                          values={formProps.values.locations}
                          onChange={(target, direction, moved) => {
                            if (direction === 'left') {
                              const popIndexes = [];
                              moved.forEach((i) => {
                                const index = formProps.values.locations.findIndex(
                                  loc => loc === i
                                );
                                if (index !== -1) {
                                  popIndexes.push(index);
                                }
                              });
                              popIndexes.sort();
                              let change = 0;
                              popIndexes.forEach((i) => {
                                arrayHelpers.remove(i - change);
                                change += 1;
                              });
                            } else {
                              moved.forEach(i => arrayHelpers.push(i));
                            }
                          }}
                        />
                      )}
                    />
                    <ErrorMessage name="locations" style={{ color: 'red' }} />
                  </FormItem>
                </Col>
              </Row>

              <Row gutter={15}>
                <Col>
                  <Button size="small" style={{ float: 'right' }} type="primary" htmlType="submit" disabled={formProps.isSubmitting}>{id ? 'Update' : 'Create'}</Button>
                </Col>
              </Row>
            </Form>
          )}
        </Formik>

        {id && !isSocial && (
          <Formik
            initialValues={{ password: '' }}
            validationSchema={PasswordSchema}
            onSubmit={(values, actions) => {
              this.updatePassword(values.password).then(() => {
                message.success('Password updated successfully');
                actions.setSubmitting(false);
                actions.resetForm();
              }).catch((err) => {
                const errorMessage = err.response && err.response.data
                  ? err.response.data.message
                  : null;

                message.error(errorMessage || 'Failed to update password');
              }).finally(() => {
                actions.setSubmitting(false);
              });
            }}
          >
            {formProps => (
              <Form onSubmit={formProps.handleSubmit}>
                <Row gutter={15}>
                  <Col xs={24} sm={12}>
                    <Field label="New Password" name="password" type="password" component={InputField} />
                  </Col>
                </Row>
                <Row>
                  <Col xs={24} sm={12}>
                    <Button size="small" type="primary" htmlType="submit" disabled={formProps.isSubmitting}>Update Password</Button>
                  </Col>
                </Row>
              </Form>
            )}
          </Formik>
        )}
      </Spin>
    );
  }
}

export default withRouter(AdminInfo);
