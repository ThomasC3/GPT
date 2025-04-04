import React, { Component } from 'react';
import {
  Row, Col, Button, Spin, Tag,
  Form, DatePicker, message
} from 'antd';
import { Formik, Field } from 'formik';
import moment from 'moment';
import axios from 'axios';
import { FormItem } from '../elements';
import {
  InputField, SelectField, CheckboxField, DeleteModal
} from '.';
import Profile from './providers/Profile';

import { schemas, common } from '../utils';
import { allowUpdate } from '../utils/auth';
import { AUTH0_RESOURCE_TYPES } from '../utils/constants';

const { ERROR_STATE } = common;
const { RiderSchema } = schemas;

class RiderInfo extends Component {
  static contextType = Profile.ProfileContext;

  state = {
    firstName: '',
    lastName: '',
    email: '',
    gender: '',
    dob: null,
    phone: '',
    zip: '',
    google: false,
    facebook: false,
    isPhoneVerified: false,
    isEmailVerified: false,
    fetching: true,
    isBanned: false,
    isDeleted: false,
    subscriptions: {
      receipt: true
    },
    allTimeRating: null,
    last10Rating: null,
    allTimeGivenRating: null
  }

  componentDidMount() {
    if (this.props.id) {
      this.fetch(this.props.id);
    } else {
      this.setState({ fetching: false });
    }
  }

  fetch = async (id) => {
    this.setState({ fetching: true });
    try {
      const data = await axios({
        url: `/v1/riders/${id}`
      }).then(res => res.data);
      this.setState({ fetching: false, ...data });
    } catch (e) {
      message.error('A error occured');
      this.setState({ fetching: false });
    }
  }

  save = (data) => {
    const { id } = this.props;
    return axios({
      method: id ? 'PUT' : 'POST',
      url: `/v1/riders/${id || ''}`,
      data
    });
  }

  render() {
    const {
      firstName, lastName, email,
      gender, dob, phone, zip,
      google, facebook, apple,
      isPhoneVerified,
      isEmailVerified, isBanned,
      isDeleted, subscriptions, fetching,
      allTimeRating, last10Rating, allTimeGivenRating,
      stripeCustomerId,
      emailVerificationDeadline
    } = this.state;

    const { id } = this.props;
    const { permissions } = this.context;

    return (
      <Spin spinning={fetching}>
        <Formik
          enableReinitialize
          initialValues={{
            firstName,
            lastName,
            email,
            gender,
            dob,
            phone,
            zip,
            google,
            facebook,
            apple,
            isPhoneVerified,
            isEmailVerified,
            isBanned,
            subscriptions,
            allTimeRating,
            last10Rating,
            allTimeGivenRating,
            stripeCustomerId
          }}
          validationSchema={RiderSchema}
          onSubmit={(values, actions) => {
            this.save({ ...values }).then((res) => {
              this.setState({ ...res.data });
              message.success('Updated');
              actions.setSubmitting(false);
            }).catch((error) => {
              const errorMessage = error.response
              && error.response.data
              && error.response.data.message;

              actions.setSubmitting(false);
              message.error(errorMessage || 'An error occurred');
            });
          }}
          render={formProps => (
            <Form onSubmit={formProps.handleSubmit}>
              <Row gutter={15}>
                <Col xs={24}>

                  <Row gutter={15}>
                    <Col xs={24} sm={12}>
                      <Field disabled label="First Name" name="firstName" component={InputField} />
                    </Col>

                    <Col xs={24} sm={12}>
                      <Field disabled label="Last Name" name="lastName" component={InputField} />
                    </Col>
                  </Row>


                  <Row gutter={15}>
                    <Col xs={24} sm={12}>

                      <Field
                        disabled
                        label="Gender"
                        name="gender"
                        options={[
                          { name: '', value: '' },
                          { name: 'Male', value: 'male' },
                          { name: 'Female', value: 'female' },
                          { name: 'Other', value: 'other' }
                        ]}
                        component={SelectField}
                      />

                    </Col>
                    <Col xs={24} sm={12}>
                      <FormItem label="DOB" {...ERROR_STATE('dob')}>
                        <DatePicker
                          disabled={!allowUpdate(AUTH0_RESOURCE_TYPES.RIDERS, permissions)}
                          allowClear={false}
                          size="small"
                          defaultValue={null}
                          format="YYYY-MM-DD"
                          onOpenChange={() => formProps.setFieldTouched('dob')}
                          value={formProps.values.dob ? moment(formProps.values.dob, 'YYYY-MM-DD') : null}
                          onChange={date => formProps.setFieldValue('dob', date.format('YYYY-MM-DD'))}
                        />
                      </FormItem>
                    </Col>
                  </Row>

                  <Row gutter={15}>
                    <Col xs={24} sm={12}>
                      <Field disabled label="Zip" name="zip" component={InputField} />
                    </Col>

                    <Col xs={24} sm={12}>
                      <Field disabled label="Phone" name="phone" component={InputField} />
                    </Col>
                  </Row>

                  <Row gutter={15}>
                    <Col xs={24} sm={12}>
                      <Field disabled label="Email" name="email" component={InputField} />
                    </Col>

                    <Col xs={24} sm={12}>
                      <Field disabled name="allTimeGivenRating" label="All Time Given Rating" component={InputField} value={allTimeGivenRating && `${parseFloat(allTimeGivenRating).toFixed(2)} ★`} />
                    </Col>
                  </Row>

                  <Row gutter={15}>
                    <Col xs={24} sm={12}>
                      <Field disabled name="allTimeRating" label="All Time Rating" component={InputField} value={allTimeRating && `${parseFloat(allTimeRating).toFixed(2)} ★`} />
                    </Col>

                    <Col xs={24} sm={12}>
                      <Field disabled name="last10Rating" label="Last 10 Ratings" component={InputField} value={last10Rating && `${parseFloat(last10Rating).toFixed(2)} ★`} />
                    </Col>
                  </Row>

                  <Row gutter={15}>
                    { stripeCustomerId
                      && (
                      <Col xs={24} sm={12}>
                        Stripe Customer Id:
                        <a href={`https://dashboard.stripe.com/${process.env.REACT_APP_STRIPE_LIVEMODE ? '' : 'test/'}customers/${stripeCustomerId}`} target="_blank" rel="noopener noreferrer">
                          {stripeCustomerId}
                        </a>
                      </Col>
                      )
                    }
                    { !stripeCustomerId
                      && (
                      <Col xs={24} sm={12}>
                          Stripe Customer Id:
                        {' '}
                        <b>No account yet</b>
                      </Col>
                      )
                    }
                  </Row>

                  <Row gutter={15}>
                    <Col xs={24} sm={12}>
                      <FormItem label="Details">
                        {google && <Tag>Google</Tag>}
                        {facebook && <Tag>Facebook</Tag>}
                        {apple && <Tag>Apple</Tag>}
                        {isPhoneVerified && <Tag>Phone Verified</Tag>}
                        {isEmailVerified && <Tag>Email Verified</Tag>}
                        {!isEmailVerified && emailVerificationDeadline && (
                        <Tag>
                          {`Email Verification Deadline - ${moment(emailVerificationDeadline).format('MM/DD/YYYY')}`}
                        </Tag>
                        )}
                      </FormItem>
                    </Col>
                  </Row>

                  <Row gutter={15}>
                    <Col xs={24} sm={12}>
                      <Field name="isBanned" label="Banned" component={CheckboxField} />
                    </Col>
                    <Col xs={24} sm={12}>
                      <Field name="isPhoneVerified" label="Phone verified" component={CheckboxField} />
                    </Col>
                    <Col xs={24} sm={12}>
                      <Field name="isEmailVerified" label="Email verified" component={CheckboxField} />
                    </Col>
                    <Col xs={24} sm={12}>
                      <Field name="subscriptions.receipt" label="Subscribed to Receipt" component={CheckboxField} />
                    </Col>
                  </Row>
                </Col>
              </Row>

              <Row>
                <Col>
                  {(id && !isDeleted) && <DeleteModal url={`/v1/riders/${id}`} onSuccess={() => this.props.history.replace('/riders')} resourceType={AUTH0_RESOURCE_TYPES.RIDERS} /> }
                  <Button size="small" style={{ float: 'right' }} type="primary" htmlType="submit" disabled={formProps.isSubmitting}>{id ? 'Update' : 'Create'}</Button>
                </Col>
              </Row>
            </Form>
          )}
        />
      </Spin>
    );
  }
}

export default RiderInfo;
