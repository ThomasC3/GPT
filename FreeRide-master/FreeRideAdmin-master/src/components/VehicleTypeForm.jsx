import {
  Button, Card, Col, Form, Row
} from 'antd';
import { Field } from 'formik';
import React from 'react';
import { DeleteModal, InputField, InspectionFormDropdown } from '.';
import { AUTH0_RESOURCE_TYPES } from '../utils/constants';

const VehicleTypeForm = ({
  isUpdate, formProps, isDeleted, deleteHandler, history, allowDelete
}) => (
  <Form onSubmit={formProps.handleSubmit}>
    <Row gutter={16}>
      <Col xs={24} sm={24} md={12}>
        <Card title="Vehicle Type Info">
          <Row gutter={16}>
            <Col sm={12}>
              <Field label="Name" name="type" component={InputField} />
            </Col>
          </Row>
          <Row>
            <Col sm={12}>
              <Field
                label="Passenger Capacity"
                name="passengerCapacity"
                component={InputField}
                useNumberComponent
                style={{ width: '90%' }}
              />
            </Col>
            <Col sm={12}>
              <Field
                label="ADA Capacity"
                name="adaCapacity"
                component={InputField}
                useNumberComponent
                style={{ width: '90%' }}
              />
            </Col>
          </Row>
        </Card>
        {
          allowDelete
          && (
            <Row style={{ marginTop: '1rem' }}>
              {
                !isDeleted && isUpdate
                && (
                <Col md={12}>
                  <DeleteModal deleteHandler={deleteHandler} onSuccess={() => history.push('/fleet', { tab: 'vehicle_types' })} resourceType={AUTH0_RESOURCE_TYPES.FLEET} />
                </Col>
                )
              }
              <Col md={12}>
                <Button
                  type="primary"
                  htmlType="submit"
                  color="primary"
                  size="small"
                  loading={formProps.isSubmitting}
                >
                  {isUpdate ? 'Update' : 'Create'}
                </Button>
              </Col>
            </Row>
          )
        }
      </Col>
      <Col xs={24} sm={24} md={12}>
        <Card title="Inspection form details">
          <Row gutter={16}>
            <Col sm={12}>
              Check-out:
              <InspectionFormDropdown
                inspectionType="check-out"
                value={formProps.values.checkOutForm}
                onChange={selection => formProps.setFieldValue('checkOutForm', selection)}
              />
            </Col>

          </Row>
          <Row gutter={16} style={{ marginTop: '1rem' }}>
            <Col sm={12}>
              Check-in:
              <InspectionFormDropdown
                inspectionType="check-in"
                value={formProps.values.checkInForm}
                onChange={selection => formProps.setFieldValue('checkInForm', selection)}
              />
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>
  </Form>
);

export default VehicleTypeForm;
