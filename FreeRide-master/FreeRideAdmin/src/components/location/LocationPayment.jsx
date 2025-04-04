import React, { Component } from 'react';
import { Col } from 'antd';
import { ErrorMessage, Field } from 'formik';
import { Row, SmallCard } from '../../elements';
import {
  InputField, CheckboxField,
  SelectField
} from '..';
import SubmitLocation from './SubmitLocation';

class LocationPayment extends Component {
  render() {
    const { formProps} = this.props;
    const id = this.props.locationIdParam;

    return (
      <>
        <Row gutter={15} spacing={15}>
          <SubmitLocation id={id} formProps={formProps} />
          <Col xs={24} sm={24} md={24} lg={12}>
            <SmallCard title="Payment Details">
              <Row gutter={15}>
                <Col xs={24}>
                  <Field label="Payments Enabled" name="paymentEnabled" component={CheckboxField} disabled={this.props.formProps.values.pwywEnabled} />
                </Col>
              </Row>
              <Row gutter={15}>
                <Col xs={24}>
                  <Field label="Ride Price in Cents" name="paymentInformation.ridePrice" component={InputField} disabled={this.props.formProps.values.pwywEnabled} />
                </Col>
                <Col xs={24}>
                  <Field label="Price Per Head in Cents" name="paymentInformation.pricePerHead" component={InputField} disabled={this.props.formProps.values.pwywEnabled} />
                </Col>
                <Col xs={24}>
                  <Field label="Price Cap in Cents" name="paymentInformation.priceCap" component={InputField} disabled={this.props.formProps.values.pwywEnabled} />
                </Col>
                <Col xs={24}>
                  <Field label="Cap Enabled" name="paymentInformation.capEnabled" component={CheckboxField} disabled={this.props.formProps.values.pwywEnabled} />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Field
                    label="Currency"
                    name="paymentInformation.currency"
                    options={[
                      { name: 'USD', value: 'usd' }
                    ]}
                    component={SelectField}
                    disabled={this.props.formProps.values.pwywEnabled}
                  />
                </Col>
              </Row>
            </SmallCard>
          </Col>
          <Col xs={24} sm={24} md={24} lg={12}>
            <SmallCard title="PWYW Details">
              <Row gutter={15}>
                <Col xs={24}>
                  <Field label="PWYW Enabled" name="pwywEnabled" component={CheckboxField} disabled={this.props.formProps.values.paymentEnabled} />
                </Col>
              </Row>
              <Row gutter={15}>
                <Col xs={24}>
                  <Field label="Base Price in Cents" name="pwywInformation.pwywOptions[0]" component={InputField} disabled={this.props.formProps.values.paymentEnabled} />
                </Col>
                <Col xs={24}>
                  <Field label="1st Value in Cents" name="pwywInformation.pwywOptions[1]" component={InputField} disabled={this.props.formProps.values.paymentEnabled} />
                </Col>
                <Col xs={24}>
                  <Field label="2nd Value in Cents" name="pwywInformation.pwywOptions[2]" component={InputField} disabled={this.props.formProps.values.paymentEnabled} />
                </Col>
                <Col xs={24}>
                  <div style={{ color: 'red' }}>
                    <ErrorMessage name="pwywInformation.maxCustomValue" />
                  </div>
                  <Field label="Max Value in Cents" name="pwywInformation.maxCustomValue" component={InputField} disabled={this.props.formProps.values.paymentEnabled} />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Field
                    label="Currency"
                    name="pwywInformation.currency"
                    options={[
                      { name: 'USD', value: 'usd' }
                    ]}
                    component={SelectField}
                    disabled={this.props.formProps.values.paymentEnabled}
                  />
                </Col>
              </Row>
            </SmallCard>
          </Col>
        </Row>
        <Row gutter={15} spacing={15}>
          <Col xs={24} sm={24} md={24} lg={12}>
            <SmallCard title="Driver tip Details">
              <Row gutter={15}>
                <Col xs={24}>
                  <Field label="Driver tip Enabled" name="tipEnabled" component={CheckboxField} />
                </Col>
              </Row>
              <Row gutter={15}>
                <Col xs={24}>
                  <Field label="Minimum value in Cents" name="tipInformation.tipOptions[0]" component={InputField} />
                </Col>
                <Col xs={24}>
                  <Field label="1st Option in Cents" name="tipInformation.tipOptions[1]" component={InputField} />
                </Col>
                <Col xs={24}>
                  <Field label="2nd Option in Cents" name="tipInformation.tipOptions[2]" component={InputField} />
                </Col>
                <Col xs={24}>
                  <div style={{ color: 'red' }}>
                    <ErrorMessage name="tipInformation.maxCustomValue" />
                  </div>
                  <Field label="Max Value in Cents" name="tipInformation.maxCustomValue" component={InputField} />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Field
                    label="Currency"
                    name="tipInformation.currency"
                    options={[
                      { name: 'USD', value: 'usd' }
                    ]}
                    component={SelectField}
                  />
                </Col>
              </Row>
            </SmallCard>
          </Col>
          <Col xs={24} sm={24} md={24} lg={12}>
            <SmallCard title="Free ride details">
              <Row gutter={15}>
                <Col xs={8}>
                  <Field label="Age restricted free ride Enabled" name="freeRideAgeRestrictionEnabled" component={CheckboxField} />
                </Col>
              </Row>
              <Row gutter={15}>
                <Col xs={4}>
                  <Field label="Minimum age" name="freeRideAgeRestrictionInterval.min" component={InputField} />
                </Col>
                <Col xs={4}>
                  <Field label="Maximum age" name="freeRideAgeRestrictionInterval.max" component={InputField} />
                </Col>
              </Row>
            </SmallCard>
          </Col>
        </Row>
      </>
    );
  }
}

export default LocationPayment;
