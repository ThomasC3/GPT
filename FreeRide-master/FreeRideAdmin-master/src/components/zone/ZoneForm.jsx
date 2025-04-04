import React, { Component } from 'react';
import {
  Formik, Form, Field, ErrorMessage
} from 'formik';
import {
  Row, Col, Button, message
} from 'antd';
import Text from 'antd/lib/typography/Text';
import InputField from '../fields/InputField';
import CheckboxField from '../fields/CheckboxField';
import { SmallCard } from '../../elements';
import SelectField from '../fields/SelectField';

export default class ZoneForm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isDirty: false
    };
  }

  componentDidUpdate(prevProps) {
    const { currentFeatureCoord, selectedFeatureIndex } = this.props;
    if (
      prevProps.currentFeatureCoord
      && prevProps.currentFeatureCoord !== currentFeatureCoord
      && prevProps.selectedFeatureIndex === selectedFeatureIndex
    ) {
      this.handleFormChange(true);
    }
  }

  handleFormChange = (dirty) => {
    this.setState({ isDirty: dirty });
  };

  render() {
    const {
      save,
      zone: {
        name,
        description,
        code,
        paymentEnabled,
        pwywEnabled,
        paymentInformation = {},
        pwywInformation,
        poweredBy,
        fixedStopEnabled = false
      },
      cancelEdit
    } = this.props;
    const { isDirty } = this.state;
    return (
      <Formik
        enableReinitialize
        initialValues={{
          name,
          description,
          code,
          paymentEnabled,
          pwywEnabled,
          paymentInformation: {
            priceCap: paymentInformation.priceCap || 0,
            ridePrice: paymentInformation.ridePrice || 0,
            pricePerHead: paymentInformation.pricePerHead || 0,
            capEnabled: paymentInformation.capEnabled,
            currency: paymentInformation.currency || 'usd'
          },
          pwywInformation,
          poweredBy,
          fixedStopEnabled
        }}
        onSubmit={(values) => {
          save(values)
            .then(() => {
              message.success('Saved');
            })
            .catch((err) => {
              const errorMessage = err.response && err.response.data
                ? err.response.data.message
                : null;

              message.error(errorMessage || 'An Error Occurred');
            });
        }}
        render={formProps => (
          <Form
            onSubmit={formProps.handleSubmit}
            onChange={() => this.handleFormChange(formProps.dirty)}
          >
            <Row>
              <Col>
                <Field
                  label="Name"
                  name="name"
                  required
                  component={InputField}
                />
              </Col>
              <Col>
                <Field
                  label="Description"
                  name="description"
                  component={InputField}
                  type="textarea"
                />
              </Col>
              <Col>
                <Field
                  label="Internal Code"
                  name="code"
                  component={InputField}
                  type="textarea"
                  required
                />
              </Col>
              <Col>
                <Field
                  label="Fixed-stop enabled"
                  name="fixedStopEnabled"
                  component={CheckboxField}
                />
              </Col>
              <Col>
                <Field
                  label="Powered By"
                  name="poweredBy"
                  component={InputField}
                  type="textarea"
                />
              </Col>
              <Col>
                <SmallCard title="Payment details">
                  <Row gutter={15}>
                    <Col xs={8}>
                      <Field
                        label="PWYW Enabled"
                        name="pwywEnabled"
                        component={CheckboxField}
                        disabled={formProps.values.paymentEnabled}
                      />
                    </Col>
                    <Col xs={8}>
                      <Field
                        label="Payments Enabled"
                        name="paymentEnabled"
                        component={CheckboxField}
                        disabled={formProps.values.pwywEnabled}
                      />
                    </Col>
                  </Row>
                  {formProps.values.paymentEnabled && <PaymentEnabledForm />}
                  {formProps.values.pwywEnabled && <PwywEnabledForm />}
                </SmallCard>
              </Col>
              <Button
                type="primary"
                size="small"
                htmlType="button"
                onClick={cancelEdit}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                size="small"
                htmlType="submit"
                style={{ marginLeft: '10px' }}
              >
                Save
              </Button>
              {isDirty && (
                <Text style={{ marginLeft: '10px', color: 'red' }}>
                  Unsaved
                </Text>
              )}
            </Row>
          </Form>
        )}
      />
    );
  }
}


const PaymentEnabledForm = () => (
  <Row gutter={15}>
    <Col xs={24}>
      <Field
        label="Ride Price in Cents"
        name="paymentInformation.ridePrice"
        component={InputField}
      />
    </Col>
    <Col xs={24}>
      <Field
        label="Price Per Head in Cents"
        name="paymentInformation.pricePerHead"
        component={InputField}
      />
    </Col>
    <Col xs={24}>
      <Field
        label="Price Cap in Cents"
        name="paymentInformation.priceCap"
        component={InputField}
      />
    </Col>
    <Col xs={24}>
      <Field
        label="Cap Enabled"
        name="paymentInformation.capEnabled"
        component={CheckboxField}
      />
    </Col>
    <Col xs={24} sm={12} md={6}>
      <Field
        label="Currency"
        name="paymentInformation.currency"
        options={[{ name: 'USD', value: 'usd' }]}
        component={SelectField}
      />
    </Col>
  </Row>
);

const PwywEnabledForm = () => (
  <Row gutter={15}>
    <Col xs={24}>
      <Field
        label="Base Price in Cents"
        name="pwywInformation.pwywOptions[0]"
        component={InputField}
      />
    </Col>
    <Col xs={24}>
      <Field
        label="1st Value in Cents"
        name="pwywInformation.pwywOptions[1]"
        component={InputField}
      />
    </Col>
    <Col xs={24}>
      <Field
        label="2nd Value in Cents"
        name="pwywInformation.pwywOptions[2]"
        component={InputField}
      />
    </Col>
    <Col xs={24}>
      <div style={{ color: 'red' }}>
        <ErrorMessage name="pwywInformation.maxCustomValue" />
      </div>
      <Field
        label="Max Value in Cents"
        name="pwywInformation.maxCustomValue"
        component={InputField}
      />
    </Col>
    <Col xs={24} sm={12} md={6}>
      <Field
        label="Currency"
        name="pwywInformation.currency"
        options={[{ name: 'USD', value: 'usd' }]}
        component={SelectField}
      />
    </Col>
  </Row>
);
