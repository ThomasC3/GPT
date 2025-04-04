import React, { Component } from 'react';
import {
  Col, Button, Collapse,
  Input, Table, TimePicker,
  Divider
} from 'antd';
import { Field, ErrorMessage } from 'formik';
import moment from 'moment';
import { Row, Modal2 as Modal, SmallCard } from '../../elements';
import { InputField, SelectField, CheckboxField } from '..';
import { common } from '../../utils';
import SubmitLocation from './SubmitLocation';
import { TIMEZONES } from '../../utils/constants';

import DrawableMap from '../googleMaps/DrawableMap';

const { ENSURE_CLOCKWISE_POLYGON } = common;

class LocationInfo extends Component {
  render() {
    const { formProps, locationIdParam: id } = this.props;

    return (
      <>
        <SubmitLocation id={id} formProps={formProps} />
        <Row gutter={15} spacing={15}>
          <Col xs={24} sm={24} md={24} lg={12}>
            <SmallCard title="Basic Information">
              <Row gutter={15}>
                <Col xs={8} sm={8}>
                  <Field label="Name" name="name" component={InputField} />
                </Col>
                <Col xs={8} sm={8}>
                  <Field label="State" name="stateCode" component={InputField} />
                </Col>
                <Col xs={8} sm={8}>
                  <Field label="Code" name="locationCode" component={InputField} />
                </Col>
              </Row>
              <Row spacing={15} gutter={15}>
                <Col sm={12}>
                  <Field
                    label="Timezone"
                    name="timezone"
                    options={TIMEZONES}
                    component={SelectField}
                  />
                </Col>
              </Row>
              <Row spacing={15}>
                <Col>
                  <Collapse>
                    <Collapse.Panel header="Operating Hours">
                      <Table size="small" dataSource={formProps.values.serviceHours} rowKey={record => `${record.day}`} pagination={false}>
                        <Table.Column title="Day" dataIndex="day" key="day" />
                        <Table.Column
                          title="Opens"
                          dataIndex="openTime"
                          key="openTime"
                          render={(val, record, index) => (
                            <>
                              <TimePicker
                                size="small"
                                format="HH:mm"
                                value={val ? moment(val, 'HH:mm') : null}
                                onChange={(m, text) => formProps.setFieldValue(`serviceHours[${index}].openTime`, text)}
                              />
                              <div>
                                <ErrorMessage name={`serviceHours[${index}].openTime`} />
                              </div>
                            </>
                          )}
                        />
                        <Table.Column
                          title="Closes"
                          dataIndex="closeTime"
                          key="closeTime"
                          render={(val, record, index) => (
                              <>
                                <TimePicker
                                  size="small"
                                  format="HH:mm"
                                  value={val ? moment(val, 'HH:mm') : null}
                                  onChange={(m, text) => {
                                    formProps.setFieldValue(`serviceHours[${index}].closeTime`, text);
                                  }}
                                />
                                <div>
                                  <ErrorMessage name={`serviceHours[${index}].closeTime`} />
                                </div>
                              </>
                          )}
                        />
                        <Table.Column
                          title=""
                          dataIndex="closed"
                          key="closed"
                          render={(val, record, index) => (
                              <>
                                <Field name={`serviceHours[${index}].closed`} label="Closed" component={CheckboxField} />
                                <div>
                                  <ErrorMessage name={`serviceHours[${index}].closed`} />
                                </div>
                              </>
                          )}
                        />
                      </Table>
                    </Collapse.Panel>
                  </Collapse>
                </Col>
              </Row>
            </SmallCard>
          </Col>
          <Col xs={24} sm={24} md={24} lg={12}>
            <SmallCard size="small" title="Basic Information">
              <div>
                <DrawableMap
                  title={formProps.values.name}
                  region={formProps.values.serviceArea}
                  routingArea={formProps.values.routingArea}
                  onChangeRegion={(path) => {
                    formProps.setFieldValue('serviceArea', path);
                  }}
                  onChangeRoutingLayer={(path) => {
                    formProps.setFieldValue('routingArea', path);
                  }}
                  loadingElement={<div style={{ height: '100%' }} />}
                  containerElement={<div style={{ height: '400px' }} />}
                  mapElement={<div style={{ height: '100%' }} />}
                />
              </div>
              <Parser onSuccess={(path) => {
                formProps.setFieldValue('serviceArea', path);
              }}
              />
              <div style={{ clear: 'clear', color: '#f5222d' }}>
                <ErrorMessage name="serviceArea" />
              </div>
            </SmallCard>
          </Col>
        </Row>
        <Row gutter={15} spacing={15}>
          <Col xs={24} sm={24} md={24} lg={12}>
            <SmallCard title="Location Control">
              <Row gutter={15} spacing={15}>
                <h4> General settings </h4>
                <Col xs={24} sm={12}>
                  <Field name="isActive" label="Active" component={CheckboxField} />
                </Col>
                <Col xs={24} sm={12}>
                  <Field name="showAlert" label="Show Alert" component={CheckboxField} />
                </Col>
                <Col xs={24} sm={12}>
                  <Field name="isSuspended" label="Suspended" component={CheckboxField} />
                </Col>
                <Col xs={24} sm={12}>
                  <Field name="hasAppService" label="Has App Service" component={CheckboxField} />
                </Col>
                <Col xs={24} sm={12}>
                  <Field name="isADA" label="ADA" component={CheckboxField} />
                </Col>
                <Col xs={24} sm={12}>
                  <Field name="isUsingServiceTimes" label="Enforce service time" component={CheckboxField} />
                </Col>
              </Row>

              <Divider />

              <Row gutter={15} spacing={15}>
                <h4> Features</h4>
                <Col xs={24} sm={12}>
                  <Field name="poolingEnabled" label="Pooling Enabled" component={CheckboxField} />
                </Col>
                <Col xs={24} sm={12}>
                  <Field name="fixedStopEnabled" label="Fixed Stops Enabled" component={CheckboxField} />
                </Col>
                <Col xs={24} sm={12}>
                  <Field name="riderPickupDirections" label="Rider Pickup Directions" component={CheckboxField} />
                </Col>
                <Col xs={24} sm={12}>
                  <Field name="fleetEnabled" label="Fleet Enabled" component={CheckboxField} />
                </Col>
                <Col xs={24} sm={12}>
                  <Field name="hideFlux" label="Hide Flux" component={CheckboxField} />
                </Col>
              </Row>
            </SmallCard>
            <SmallCard title="Location Rider Rules" style={{ marginTop: '1rem' }}>
              <Row gutter={15} spacing={15}>
                <Col xs={24} sm={12}>
                  <Field name="riderAgeRequirement" label="Age requirement" component={InputField} />
                </Col>
              </Row>
            </SmallCard>
          </Col>
          <Col xs={24} sm={24} md={24} lg={12}>
            <SmallCard title="Location Driver Rules">
              <Row gutter={15} spacing={15}>
                <Col xs={24} sm={12}>
                  <Field name="cancelTime" label="Wait limit" component={InputField} />
                </Col>
                <Col xs={24} sm={12}>
                  <Field name="arrivedRangeFeet" label="Driver arrived range (feet)" component={InputField} />
                </Col>
                <Col xs={24} sm={12}>
                  <Field name="inversionRangeFeet" label="Inversion range (feet)" component={InputField} />
                </Col>
                <Col xs={24} sm={12}>
                  <Field name="queueTimeLimit" label="Maximum queue time (minutes)" component={InputField} />
                </Col>
                <Col xs={24} sm={12}>
                  <Field name="etaIncreaseLimit" label="ETA increase limit (minutes)" component={InputField} />
                </Col>
                <Col xs={24} sm={12}>
                  <Field name="passengerLimit" label="Passenger limit" component={InputField} />
                </Col>
                <Col xs={24} sm={12}>
                  <Field name="concurrentRideLimit" label="Concurrent ride limit (pooling)" component={InputField} />
                </Col>
                <Col xs={24} sm={24}>
                  <Field
                    name="breakDurations"
                    label="Break durations (in minutes and separated by commas)"
                    placeholder="5,10,15"
                    component={InputField}
                  />
                </Col>
              </Row>
            </SmallCard>
          </Col>
        </Row>
        <SubmitLocation id={id} formProps={formProps} />
      </>
    );
  }
}

const Parser = (props) => {
  const [value, setValue] = React.useState('');

  const onChange = (e) => {
    setValue(e.target.value);
  };
  const onParse = (options) => {
    const regex = /LatLng\(([^)]+)\)/i;
    let t = value;
    t = t.split(/\n/);
    t = t.filter(i => /LatLng/i.test(i));
    t = t.map((i) => {
      const [lat, lng] = i.split(regex)[1].split(',');
      return { lat: parseFloat(lat), lng: parseFloat(lng) };
    });

    if (t.length) { props.onSuccess(ENSURE_CLOCKWISE_POLYGON(t)); }
    options.onClose();
  };

  return (
    <Modal
      button={<Button size="small">Geo Parser</Button>}
      title="Google Geo Parser"
      destroyOnClose
      style={{ top: 20 }}
      onOk={onParse}
    >
      <Input.TextArea
        rows={15}
        value={value}
        onChange={onChange}
      />
    </Modal>
  );
};

export default LocationInfo;
