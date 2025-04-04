import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Col, Form, Row, Divider
} from 'antd';
import { Field, FieldArray, ErrorMessage } from 'formik';
import { Link } from 'react-router-dom';
import {
  CheckboxField, InputField, JobSelector, SelectField, ZonesSelector
} from '.';
import { FormItem } from '../elements';
import { AUTH0_RESOURCE_TYPES } from '../utils/constants';
import { allowView } from '../utils/auth';

export const VehicleInspectionForm = ({ formProps }) => {
  const { handleSubmit } = formProps;
  return (
    <Form onSubmit={handleSubmit}>
      <Row gutter={16}>
        <Col sm={12}>
          <Field label="Battery" name="battery" component={InputField} />
        </Col>
        <Col sm={12} xs={24}>
          <Field label="Mileage" name="mileage" component={InputField} />
        </Col>
      </Row>
      <Row gutter={16}>
        <Col>
          <Col sm={12} style={{ marginTop: '1rem' }}>
            <Field
              type="checkbox"
              name="pluggedIn"
              label="Is the car Plugged In?"
              component={CheckboxField}
            />
          </Col>
        </Col>
      </Row>
      <Row style={{ float: 'right', marginTop: '1rem' }}>
        <Col sm={12}>
          <Button
            htmlType="submit"
            color="primary"
            size="small"
          >
              Submit Inspection
          </Button>
        </Col>
      </Row>
    </Form>
  );
};

export const VehicleInfoForm = ({
  formProps, isUpdate, locations, matchingRules = [], permissions
}) => {
  const transformedLocations = locations.map(item => ({ name: item.name, value: item.id }));

  const transformedMatchingRules = matchingRules.map(item => ({
    name: item.title,
    value: item.key
  }));

  const {
    setFieldValue,
    values: {
      location,
      matchingRule,
      zones,
      driver
    }
  } = formProps;

  const handleLocationChange = () => {
    setFieldValue('matchingRule', '');
    setFieldValue('zones', []);
    setFieldValue('jobs', []);
    setFieldValue('isReady', false);
  };

  const resetMatchingRule = () => {
    setFieldValue('matchingRule', '');
    setFieldValue('zones', []);
    setFieldValue('isReady', false);
  };

  return (
    <Form>
      <Row>
        <Col>
          <Row gutter={16}>
            <Col sm={12} xs={24} md={12}>
              <Field label="Name" name="name" component={InputField} />
            </Col>
            <Col sm={12} xs={24} md={12}>
              <Field label="Public ID" name="publicId" component={InputField} />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col sm={12} xs={24} md={12}>
              <Field
                label="Location"
                name="location"
                options={[
                  { value: '', name: 'Select Location' },
                  ...transformedLocations
                ]}
                component={SelectField}
                onChange={handleLocationChange}
              />
            </Col>
            <Col sm={12} xs={24} md={12}>
              <Field label="License Plate" name="licensePlate" component={InputField} />
            </Col>
          </Row>
          <Row gutter={16}>
            {
              isUpdate
              && (
              <Col sm={12} style={{ marginTop: '1rem' }}>
                <Field
                  type="checkbox"
                  name="isReady"
                  label="Ready"
                  component={CheckboxField}
                />
              </Col>
              )
            }
          </Row>
          <Divider />
          <Row gutter={16}>
            <Col sm={8}>
              <Field
                label="Routing policy"
                name="matchingRule"
                location={location}
                options={[
                  { value: '', name: 'Select a policy' },
                  ...transformedMatchingRules
                ]}
                component={SelectField}
                onChange={(newValue) => {
                  if (newValue === '' || !newValue) {
                    setFieldValue('isReady', false);
                  }
                  setFieldValue('zones', []);
                }}
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col sm={24} xs={12}>
              <FormItem label="Zones">
                <FieldArray
                  name="zones"
                  render={arrayHelpers => (
                    <ZonesSelector
                      location={location}
                      disabled={['shared', ''].includes(matchingRule)}
                      values={zones}
                      onChange={(target, direction, moved) => {
                        if (direction === 'left') {
                          const popIndexes = [];
                          moved.forEach((i) => {
                            const index = zones.findIndex(
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
                <ErrorMessage name="zones" style={{ color: 'red' }} />
              </FormItem>
            </Col>
            <Col sm={24}>
              <div style={{ float: 'right', marginTop: '1rem' }}>
                <Button size="small" onClick={resetMatchingRule}>
                  {'Reset'}
                </Button>
              </div>
            </Col>
          </Row>
          { driver && (
            <Row>
              <Divider />
              <Col sm={12}>
                {'Driver: '}
                <Link to={`/drivers/${driver.id}`}>
                  {`${driver.firstName} ${driver.lastName}`}
                </Link>
              </Col>
            </Row>
          )}
          { (location && allowView(AUTH0_RESOURCE_TYPES.JOBS, permissions)) && (
            <Row>
              <Divider />
              <FormItem label="Jobs">
                <FieldArray
                  name="jobs"
                  render={arrayHelpers => (
                    <JobSelector
                      location={location}
                      values={formProps.values.jobs}
                      onChange={(target, direction, moved) => {
                        if (direction === 'left') {
                          const popIndexes = [];
                          moved.forEach((i) => {
                            const index = formProps.values.jobs.findIndex(
                              job => job === i
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
            </Row>
          )}
        </Col>
      </Row>
    </Form>
  );
};

export const VehicleTypeCapacityForm = ({ formProps, vehicleTypes = [] }) => {
  const transformedVehicleTypes = vehicleTypes.map(item => ({
    name: item.type,
    value: item.id
  }));

  const {
    setFieldValue,
    values: {
      vehicleType,
      setCustomADACapacity,
      setCustomPassengerCapacity
    }
  } = formProps;

  const resetCapacity = () => {
    setFieldValue('setCustomPassengerCapacity', false);
    setFieldValue('passengerCapacity', 0);
    setFieldValue('setCustomADACapacity', false);
    setFieldValue('adaCapacity', 0);
  };

  useEffect(() => {
    if (vehicleType && vehicleTypes.length > 0) {
      const selectedVehicleType = vehicleTypes.find(
        item => item.id === vehicleType
      );
      if (!setCustomADACapacity) {
        setFieldValue('adaCapacity', selectedVehicleType.adaCapacity);
      }
      if (!setCustomPassengerCapacity) {
        setFieldValue(
          'passengerCapacity',
          selectedVehicleType.passengerCapacity
        );
      }
    }
  }, [
    vehicleType,
    vehicleTypes,
    setCustomPassengerCapacity,
    setCustomADACapacity
  ]);

  return (
    <Form>
      <Row gutter={16}>
        <Col sm={12} xs={24} md={6}>
          <Field
            label="Vehicle Type"
            name="vehicleType"
            options={[
              { value: '', name: 'Select Vehicle Type' },
              ...transformedVehicleTypes
            ]}
            component={SelectField}
            onChange={() => { if (vehicleType) { resetCapacity(); } }}
          />
        </Col>
      </Row>
      <Row gutter={15}>
        <Col sm={12} xs={24}>
          <Field
            label="Passenger Capacity"
            useNumberComponent
            name="passengerCapacity"
            component={InputField}
            disabled={!setCustomPassengerCapacity}
          />
          <Field
            type="checkbox"
            name="setCustomPassengerCapacity"
            label="Custom Passenger Capacity"
            component={CheckboxField}
          />
        </Col>
        <Col sm={12} xs={24}>
          <Field
            label="ADA Capacity"
            name="adaCapacity"
            useNumberComponent
            component={InputField}
            disabled={!setCustomADACapacity}
          />
          <Field
            type="checkbox"
            name="setCustomADACapacity"
            label="Custom ADA Capacity"
            component={CheckboxField}
          />
          <Row>
            <Field
              type="checkbox"
              name="isADAOnly"
              label="ADA Only"
              component={CheckboxField}
            />
          </Row>
        </Col>
      </Row>
    </Form>
  );
};

VehicleInfoForm.propTypes = {
  formProps: PropTypes.shape({
    values: PropTypes.shape({
      // Vehicle info
      name: PropTypes.string,
      publicId: PropTypes.string,
      location: PropTypes.string,
      isReady: PropTypes.bool,
      jobs: PropTypes.arrayOf(PropTypes.string),
      // Matching rules
      matchingRule: PropTypes.string,
      zones: PropTypes.arrayOf(PropTypes.string),
      // Driver info
      driver: PropTypes.shape({
        id: PropTypes.string,
        firstName: PropTypes.string,
        lastName: PropTypes.string
      })
    }),
    setFieldValue: PropTypes.func
  }).isRequired,

  locations: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    id: PropTypes.string
  })).isRequired,
  matchingRules: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string,
    title: PropTypes.string
  })).isRequired,
  isUpdate: PropTypes.bool.isRequired
};

VehicleTypeCapacityForm.propTypes = {
  formProps: PropTypes.shape({
    values: PropTypes.shape({
      // Capacity
      vehicleType: PropTypes.string,
      passengerCapacity: PropTypes.number,
      setCustomPassengerCapacity: PropTypes.bool,
      adaCapacity: PropTypes.number,
      setCustomADACapacity: PropTypes.bool,
      isADAOnly: PropTypes.bool
    }),
    handleSubmit: PropTypes.func,
    setFieldValue: PropTypes.func
  }).isRequired,

  vehicleTypes: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string,
    id: PropTypes.string
  })).isRequired
};

VehicleInspectionForm.propTypes = {
  formProps: PropTypes.shape({
    values: PropTypes.shape({
      battery: PropTypes.number,
      mileage: PropTypes.number,
      pluggedIn: PropTypes.bool
    }),
    handleSubmit: PropTypes.func
  }).isRequired
};

export default {
  VehicleInfoForm,
  VehicleTypeCapacityForm,
  VehicleInspectionForm
};
