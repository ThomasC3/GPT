import React, { Component, Fragment } from 'react';
import { withRouter, Link } from 'react-router-dom';
import {
  Row, Col, Button, Spin, Form, message, Input, Divider
} from 'antd';
import { Formik, FieldArray, Field } from 'formik';
import axios from 'axios';
import { FormItem, Image } from '../elements';
import {
  InputField, CheckboxField, LocationsSelector,
  DeleteModal, DetachVehicleModal
} from '.';
import { schemas, common } from '../utils';
import ProfilePictureUpload from './ProfilePictureUpload';
import { AUTH0_RESOURCE_TYPES } from '../utils/constants';

const { DriverSchema, DriverSchemaNew, PasswordSchema } = schemas;
const { ERROR_STATE_GENERATOR } = common;

class DriverInfo extends Component {
  state = {
    firstName: '',
    lastName: '',
    displayName: '',
    email: '',
    locations: [],
    password: '',
    isBanned: false,
    isADA: false,
    isDeleted: false,
    fetching: true,
    saving: false,
    vehicle: null,
    errors: {},
    allTimeRating: null,
    last10Rating: null,
    allTimeGivenRating: null,
    employeeId: '',
    profilePicture: null
  }

  componentDidMount() {
    const { id } = this.props;
    if (id) {
      this.fetch(id);
    } else {
      this.setState({ fetching: false });
    }
  }

  fetch = async (id) => {
    this.setState({ fetching: true });
    try {
      const data = await axios({
        url: `/v1/drivers/${id}`
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
      url: `/v1/drivers/${id || ''}`,
      data
    });
  }

  updatePassword = () => {
    const { password, errors } = this.state;
    this.setState({ saving: true });
    PasswordSchema.validate(password).then(() => this.save({
      password
    })).then(() => {
      message.success('Password Updated');
    }).catch((e) => {
      this.setState({
        errors: {
          ...errors,
          password: e.errors
        }
      });
    })
      .finally(() => {
        this.setState({ saving: false });
      });
  }

  fixRoute = async () => {
    const { id } = this.props;
    try {
      const data = await axios({
        url: `/v1/drivers/${id}/fixroute`
      }).then(res => res.data);
      this.setState({ ...data });
    } catch (e) {
      message.error('A error occured');
    }
  }

  resetRoute = async () => {
    const { id } = this.props;
    try {
      const data = await axios({
        url: `/v1/drivers/${id}/resetroute`
      }).then(res => res.data);
      this.setState({ ...data });
    } catch (e) {
      message.error('A error occured');
    }
  }

  detachVehicle = async () => {
    const { id } = this.props;
    await axios({
      url: `/v1/drivers/${id}/vehicle/detach`,
      method: 'POST'
    });
  }

  removeProfilePicture = () => {
    this.setState({ fetching: true });

    const profilePicture = {
      imageUrl: null,
      submitTimestamp: new Date()
    };

    try {
      const data = this.save({ profilePicture }).then(res => res.data);
      this.setState({ ...data, fetching: false });
    } catch (error) {
      const errorMessage = error.response
      && error.response.data
      && error.response.data.message;
      message.error(errorMessage || 'An error occurred');
      this.setState({ fetching: false });
    }
  }

  setProfilePicture = (profilePicture) => {
    this.setState({ profilePicture });
  }

  onChange = (e) => {
    this.setState({ password: e.target.value });
  }

  render() {
    const {
      fetching, firstName, lastName, email, displayName,
      password, locations, isActive, isAvailable,
      isBanned, isADA, isDeleted, saving, errors,
      allTimeRating, last10Rating, allTimeGivenRating,
      lastActionTimestamp, activeRidesCount,
      minutesSinceRouteStart, waitingStopsCount,
      vehicle, isOnline, employeeId, profilePicture
    } = this.state;

    const { id, history } = this.props;

    return (
      <Spin spinning={fetching}>
        <Formik
          enableReinitialize
          initialValues={{
            firstName,
            lastName,
            displayName,
            email,
            locations,
            isActive,
            isOnline,
            isAvailable,
            isADA,
            isBanned,
            isDeleted,
            lastActionTimestamp,
            activeRidesCount,
            minutesSinceRouteStart,
            waitingStopsCount,
            allTimeRating,
            last10Rating,
            allTimeGivenRating,
            vehicle,
            employeeId,
            profilePicture
          }}
          validationSchema={id ? DriverSchema : DriverSchemaNew}
          validateOnChange={false}
          onSubmit={(values, actions) => {
            this.save(values).then((res) => {
              if (!id) {
                message.success('Created');
                history.push(`/drivers/${res.data.id}`);
              } else {
                message.success('Updated');
              }
            }).catch((error) => {
              const errorMessage = error.response
              && error.response.data
              && error.response.data.message;

              actions.setSubmitting(false);
              message.error(errorMessage || 'An error occurred');
            }).finally(() => {
              actions.setSubmitting(false);
            });
          }}
          render={(formProps) => {
            const ERROR_STATE = ERROR_STATE_GENERATOR(formProps.errors, formProps.touched);
            return (
              <Form onSubmit={formProps.handleSubmit}>
                <Row gutter={16}>
                  <h3>Profile</h3>
                  <Col xs={8}>
                    <Row>
                      <Image
                        src={
                          profilePicture && profilePicture.imageUrl ? profilePicture.imageUrl : null
                        }
                        width={200}
                      />
                    </Row>
                  </Col>
                  <Col xs={16} sm={16}>
                    <Row gutter={8}>
                      {id && (
                        <ProfilePictureUpload
                          driver={id}
                          showActions={!!id}
                          afterUpload={profileData => this.setProfilePicture(profileData)}
                          removeProfilePicture={this.removeProfilePicture}
                        />
                      )}
                    </Row>
                    <Divider />
                    <Row gutter={8}>
                      <Col xs={12} sm={12}>
                        <Field label="First Name" name="firstName" component={InputField} />
                      </Col>
                      <Col xs={12} sm={12}>
                        <Field label="Last Name" name="lastName" component={InputField} />
                      </Col>
                    </Row>
                    <Row gutter={8}>
                      <Col xs={12} sm={12}>
                        <Field label="Display Name" name="displayName" component={InputField} />
                      </Col>
                      <Col xs={12} sm={12}>
                        <Field label="Employee ID" name="employeeId" component={InputField} />
                      </Col>
                    </Row>
                    <Row gutter={12}>
                      <Col xs={12} sm={12}>
                        <Field label="Email" name="email" component={InputField} />
                      </Col>
                      <Col xs={12} sm={12}>
                        {id ? (
                          <FormItem label="Password" help={errors && errors.password}>
                            <Input.Password
                              size="small"
                              value={password}
                              onFocus={
                                () => this.setState({ errors: { ...errors, password: undefined } })
                              }
                              onPressEnter={e => e.preventDefault()}
                              onChange={this.onChange}
                              addonAfter={(
                                <Button
                                  style={{ border: 'none', height: '22px' }}
                                  size="small"
                                  loading={saving}
                                  onClick={this.updatePassword}
                                >
                                Update
                                </Button>
                              )}
                            />
                          </FormItem>
                        ) : (
                          <Field label="Password" name="password" type="password" component={InputField} />
                        )}
                      </Col>
                    </Row>
                  </Col>
                </Row>
                <Divider />
                <Row>
                  <h3>Account</h3>
                  {id && (
                    <Row gutter={15}>
                      <Col xs={24} sm={12}>
                        <Field name="isADA" label="ADA Vehicle" component={CheckboxField} />
                      </Col>
                      <Col xs={24} sm={12}>
                        <Field name="isBanned" label="Banned" component={CheckboxField} />
                      </Col>
                      <Col xs={24} sm={12}>
                        <Field name="isOnline" label="Logged In status" disabled component={CheckboxField} />
                      </Col>
                      <Col xs={24} sm={12}>
                        <Field name="isAvailable" label="Availability status" component={CheckboxField} />
                      </Col>
                    </Row>
                  )}
                </Row>
                <Divider />
                <Row>
                  <Col>
                    <FormItem label="Locations" {...ERROR_STATE('locations')}>
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
                    </FormItem>
                  </Col>
                </Row>
                <Row>
                  <Col style={{ float: 'right' }}>
                    {(id && !isDeleted) && <DeleteModal url={`/v1/drivers/${id}`} onSuccess={() => history.replace('/drivers')} resourceType={AUTH0_RESOURCE_TYPES.DRIVERS} /> }
                    &nbsp;
                    <Button size="small" style={{ float: 'right' }} type="primary" htmlType="submit" disabled={formProps.isSubmitting}>{id ? 'Update' : 'Create'}</Button>
                  </Col>
                </Row>
                { id && (
                  <Fragment>
                    <Divider />
                    <Row>
                      <Col>
                        <Row gutter={15}>
                          <h3>Route</h3>
                          <Col xs={24} sm={12}>
                            <Field disabled name="activeRidesCount" label="Current active rides count" component={InputField} />
                          </Col>
                          <Col xs={24} sm={12}>
                            <Field disabled name="waitingStopsCount" label="Number of unfinished stops" component={InputField} />
                          </Col>
                          <Col xs={24} sm={12}>
                            <Field disabled name="minutesSinceRouteStart" label="Time since route start" component={InputField} />
                          </Col>
                          <Col xs={24} sm={12}>
                            <Field disabled name="lastActionTimestamp" label="Last action timestamp" component={InputField} />
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                    <Row>
                      <Col>
                        <Button size="small" onClick={this.fixRoute}>Fix Route</Button>
                      </Col>
                    </Row>
                    <Divider />
                    <Row>
                      <Col>
                        <Row gutter={15}>
                          <h3>Rating</h3>
                          <Col xs={24} sm={12}>
                            <Field disabled name="allTimeRating" label="All Time Rating" component={InputField} value={allTimeRating && `${parseFloat(allTimeRating).toFixed(2)} ★`} />
                          </Col>
                          <Col xs={24} sm={12}>
                            <Field disabled name="last10Rating" label="Last 10 Ratings" component={InputField} value={last10Rating && `${parseFloat(last10Rating).toFixed(2)} ★`} />
                          </Col>
                          <Col xs={24} sm={12}>
                            <Field disabled name="allTimeGivenRating" label="All Time Given Rating" component={InputField} value={allTimeGivenRating && `${parseFloat(allTimeGivenRating).toFixed(2)} ★`} />
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                  </Fragment>
                )}
                { vehicle && (
                  <Row gutter={15}>
                    <Divider />
                    <h3>Vehicle</h3>
                    <Col xs={24} sm={12}>
                      <Row>
                        {'Name: '}
                        <Link to={`/vehicles/${vehicle.vehicleId}`}>
                          {`${vehicle.vehicleName} (${vehicle.publicId})`}
                        </Link>
                      </Row>
                      <Row>
                        {`Matching policy: ${vehicle.matchingRule && vehicle.matchingRule.title}`}
                      </Row>
                      <Row>
                        {`Zones: ${vehicle.zones && vehicle.zones.length && vehicle.zones.map(zone => zone.name).join(', ')}`}
                      </Row>
                      <Row style={{ marginTop: '1rem' }}>
                        <DetachVehicleModal
                          onSuccess={() => history.go(0)}
                          detachHandler={this.detachVehicle}
                        />
                      </Row>
                    </Col>
                  </Row>
                )}
              </Form>
            );
          }}
        />
      </Spin>
    );
  }
}

export default withRouter(DriverInfo);
