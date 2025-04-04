import React, { Component } from 'react';
import {
  Col, Button, Form, message
} from 'antd';
import { Formik, Field } from 'formik';
import axios from 'axios';
import moment from 'moment-timezone';
import { Row } from '../elements';
import { InputField, SelectField, DateField } from '.';

const INIT = {
  id: null,
  value: null,
  name: '',
  code: '',
  type: '',
  usageLimit: '',
  expiryDate: '',
  isEnabled: '',
  isDeleted: '',
  createdTimestamp: '',
  fetching: true
};

class PromocodeInfo extends Component {
  state = {
    ...INIT
  }

  componentDidMount() {
    this.fetch();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.fetching && !prevState.fetching) {
      this.fetch();
    }
  }

  fetch = async () => {
    const id = this.state.id || this.props.id;
    if (!id) {
      this.setState({ fetching: false });
      return;
    }

    await axios({
      url: `/v1/promocodes/${id}`
    })
      .then((res) => {
        this.setState({ fetching: false, ...res.data });
      }).catch((err) => {
        console.log(err);
        message.error('A error occured');
        this.setState({ fetching: false });
      });
  }

  save = (data, actions) => {
    const { locationId, id } = this.props;

    const saveData = { ...data };
    saveData.location = locationId;

    return axios({
      method: id ? 'PUT' : 'POST',
      url: `/v1/promocodes/${id || ''}`,
      data: saveData
    }).then((_res) => {
      message.success('Successfully Saved');

      if (this.props.updateListCallback) {
        this.props.updateListCallback();
      }
    }).catch((err) => {
      const errorMessage = err.response && err.response.data
        ? err.response.data.message
        : null;

      message.error(errorMessage || 'An Error Occurred');
    }).finally(() => {
      if (actions) { actions.setSubmitting(false); }
      this.setState({ fetching: false });
    });
  }

  render() {
    const {
      name, code, type, usageLimit, expiryDate,
      isEnabled, isDeleted, value, id
    } = this.state;
    const { timezone } = this.props;

    return (
      <Formik
        enableReinitialize
        initialValues={{
          name,
          code,
          type,
          usageLimit,
          isEnabled,
          isDeleted,
          value,
          expiryDate: moment(expiryDate).tz(timezone)
        }}
        onSubmit={(values, actions) => {
          this.save({ ...values }, actions);
        }}
      >
        { formProps => (
          <Form onSubmit={formProps.handleSubmit}>
            <Row gutter={15} spacing={15}>
              <Col xs={24} sm={12}>
                <Field placeholder="Name" name="name" component={InputField} />
              </Col>

              <Col xs={24} sm={12}>
                <Field placeholder="Code" name="code" component={InputField} />
              </Col>
            </Row>

            <Row gutter={15}>
              <Col xs={24} sm={12}>
                <Field
                  label="Type"
                  name="type"
                  options={[
                    { name: '', value: '' },
                    { name: 'Percentage', value: 'percentage' },
                    { name: 'Value', value: 'value' },
                    { name: 'Full', value: 'full' }
                  ]}
                  component={SelectField}
                />
              </Col>

              <Col xs={24} sm={12}>
                <Field label="Value" name="value" component={InputField} />
              </Col>

            </Row>

            <Row gutter={15}>
              <Col xs={24} sm={12}>
                <Field label="Usage Limit" name="usageLimit" component={InputField} />
              </Col>
            </Row>

            <Row gutter={15}>
              <Col xs={24} sm={12}>
                <Field
                  label="Enabled?"
                  name="isEnabled"
                  options={[
                    { name: '', value: '' },
                    { name: 'Yes', value: true },
                    { name: 'Not', value: false }
                  ]}
                  component={SelectField}
                />
              </Col>

              <Col xs={24} sm={12}>
                <Field
                  label="Expiry Date"
                  name="expiryDate"
                  timezone={timezone}
                  format="YYYY-MM-DD"
                  value={formProps.values.expiryDate ? moment(formProps.values.expiryDate, 'YYYY-MM-DD') : null}
                  component={DateField}
                />
              </Col>
            </Row>

            <Row gutter={15}>
              <Col>
                <Button
                  loading={this.state.fetching}
                  type="primary"
                  size="small"
                  htmlType="submit"
                >
                  {id ? 'Update' : 'Create'}
                </Button>
              </Col>
            </Row>

          </Form>
        )}
      </Formik>
    );
  }
}

export default PromocodeInfo;
