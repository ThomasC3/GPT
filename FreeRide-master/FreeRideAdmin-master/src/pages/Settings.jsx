import React, { Component } from 'react';

import {
  Card, Col, Button, Form, message, Spin
} from 'antd';
import { Formik, Field } from 'formik';
import axios from 'axios';
import { Row } from '../elements';
import { CheckboxField, InputField } from '../components';

class Settings extends Component {
  state={
    rideriOS: '',
    riderAndroid: '',
    driverAndroid: '',
    blockNumberPatterns: '',
    fetching: true,
    smsDisabled: false,
    isDynamicRideSearch: false,
    hideFlux: false,
    hideTripAlternativeSurvey: false
  }

  componentDidMount() {
    this.fetch();
  }

  fetch = async () => {
    try {
      const data = await axios.get('/v1/global-settings').then(res => res.data);
      this.setState({ ...data, fetching: false });
    } catch (e) {
      message.error('A error occured fetching settings');
    }
  }

  save = data => axios({
    method: 'PUT',
    url: '/v1/global-settings',
    data
  })

  render() {
    const {
      rideriOS, riderAndroid, driverAndroid,
      fetching, blockNumberPatterns, smsDisabled,
      isDynamicRideSearch,
      hideFlux, hideTripAlternativeSurvey
    } = this.state;
    return (
      <Row gutter={16}>
        <Col xs={24} sm={24} lg={12}>
          <Card title="App minimum versions">
            {fetching ? (
              <Spin spinning={fetching} />
            ) : (
              <Formik
                initialValues={{
                  riderAndroid,
                  rideriOS,
                  driverAndroid,
                  blockNumberPatterns,
                  smsDisabled,
                  isDynamicRideSearch,
                  hideFlux,
                  hideTripAlternativeSurvey
                }}
                onSubmit={(values, actions) => {
                  this.save(values).then(() => {
                    message.success('Saved');
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
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Field label="Rider (android)" name="riderAndroid" component={InputField} />
                      </Col>
                      <Col xs={24} sm={12}>
                        <Field label="Rider (iOS)" name="rideriOS" component={InputField} />
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Field label="Driver (Android)" name="driverAndroid" component={InputField} />
                      </Col>
                      <Col xs={24} sm={12}>
                        <Field label="Phone Bocklist Regex (sep by ',')" name="blockNumberPatterns" component={InputField} />
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Field name="smsDisabled" label="SMS Disabled" component={CheckboxField} />
                      </Col>
                      <Col xs={24} sm={12}>
                        <Field name="isDynamicRideSearch" label="Dynamic Ride Search" component={CheckboxField} />
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Field name="hideFlux" label="Hide Flux" component={CheckboxField} />
                      </Col>
                      <Col xs={24} sm={12}>
                        <Field name="hideTripAlternativeSurvey" label="Hide Trip Alternative Survey" component={CheckboxField} />
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col xs={24}>
                        <Button type="primary" size="small" htmlType="submit" loading={formProps.isSubmitting} disabled={formProps.isSubmitting}>Save</Button>
                      </Col>
                    </Row>
                  </Form>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    );
  }
}

export default Settings;
