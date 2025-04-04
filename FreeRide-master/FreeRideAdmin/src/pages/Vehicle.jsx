import PropTypes from 'prop-types';
import {
  message, Col, Row, Card, Button
} from 'antd';
import Axios from 'axios';
import { withRouter } from 'react-router-dom';
import { Formik } from 'formik';
import React, { Component, Fragment } from 'react';
import { EventList, DeleteModal } from '../components';
import {
  VehicleInfoForm,
  VehicleTypeCapacityForm,
  VehicleInspectionForm
} from '../components/VehicleForm';
import { AUTH0_RESOURCE_TYPES } from '../utils/constants';
import { allowView } from '../utils/auth';

class Vehicle extends Component {
  state = {
    data: null,
    questions: [],
    vehicleTypes: [],
    matchingRules: []
  };

  vehicleInfoFormRef = React.createRef();

  vehicleTypeCapacityFormRef = React.createRef();

  componentDidMount() {
    const { match } = this.props;
    const fetchVehicle = async () => {
      const response = await Axios({
        method: 'GET',
        url: `/v1/vehicles/${match.params.id}`
      }).then(res => res.data);

      this.setState({ data: response });
    };
    const fetchVehicleTypes = async () => {
      const response = await Axios({
        method: 'GET',
        url: '/v1/vehicles/types'
      }).then(res => res.data);

      this.setState({ vehicleTypes: response });
    };

    const fetchInspectionQuestions = async () => {
      const requiredQuestions = ['battery', 'mileage', 'pluggedIn'];
      const response = await Axios({
        method: 'GET',
        url: '/v1/questions'
      })
        .then(res => res.data.items)
        .then(res => res.filter(item => requiredQuestions.includes(item.questionKey)));

      this.setState({ questions: response });
    };

    const fetchMatchingRules = async () => {
      const response = await Axios({
        method: 'GET',
        url: '/v1/matching-rules'
      }).then(res => res.data);

      this.setState({ matchingRules: response });
    };

    if (match.params.id) {
      fetchVehicle();
      fetchInspectionQuestions();
    }
    fetchVehicleTypes();
    fetchMatchingRules();
  }

  mergeVehicleFormData = () => ({
    ...this.vehicleInfoFormRef.current.values,
    ...this.vehicleTypeCapacityFormRef.current.values
  });

  updateVehicle = async (data) => {
    const transformedData = { ...data };
    const { match, history, permissions } = this.props;
    const { data: stateData } = this.state;

    delete transformedData.driver;

    const originalLocation = stateData && stateData.location && stateData.location.id;
    const sameLocation = `${transformedData && transformedData.location}` === `${originalLocation}`;
    if (!allowView(AUTH0_RESOURCE_TYPES.JOBS, permissions) && sameLocation) {
      delete transformedData.jobs;
    }
    await Axios({
      method: 'PUT',
      url: `/v1/vehicles/${match.params.id}`,
      data: transformedData
    }).then((result) => {
      this.setState({ data: result.data });
      history.replace(`/vehicles/${result.data.id}`);
      message.success('Updated');
    }).catch((error) => {
      const errorMessage = error.response && error.response.data
        ? error.response.data.message : null;
      message.error(errorMessage || 'Error updating Vehicle');
    });
  };

  createVehicle = async (data) => {
    const { history } = this.props;
    const transformedData = { ...data };
    delete transformedData.id;
    delete transformedData.driver;
    if (!transformedData.setCustomADACapacity) {
      delete transformedData.adaCapacity;
    }
    if (!transformedData.setCustomPassengerCapacity) {
      delete transformedData.passengerCapacity;
    }
    delete transformedData.setCustomADACapacity;
    delete transformedData.setCustomPassengerCapacity;
    try {
      const result = await Axios({
        method: 'POST',
        url: '/v1/vehicles',
        data: transformedData
      });
      this.setState({ data: result.data });
      history.replace(`/vehicles/${result.data.id}`);
      message.success('Created');
    } catch (error) {
      const errorMessage = error.response && error.response.data
        ? error.response.data.message : null;
      message.error(errorMessage || 'Error creating Vehicle');
    }
  };

  deleteHandler = async (vehicleId) => {
    try {
      await Axios({
        method: 'DELETE',
        url: `/v1/vehicles/${vehicleId}`
      });
    } catch (error) {
      const errorMessage = error.response && error.response.data
        ? error.response.data.message
        : null;
      message.error(errorMessage || 'Error deleting vehicle');
    }
  }

  submitInspection = async (responses) => {
    const { match } = this.props;
    await Axios({
      method: 'POST',
      url: `/v1/vehicles/${match.params.id}/inspection`,
      data: { responses }
    }).then(() => {
      message.success('Submitted Vehicle Inspection');
    }).catch((error) => {
      const errorMessage = error.response && error.response.data
        ? error.response.data.message : null;
      message.error(errorMessage || 'Error updating vehicle attribute');
    });
  }

  render() {
    const {
      data, vehicleTypes, questions, matchingRules
    } = this.state;
    const {
      history, permissions, locations, match, activeLocation
    } = this.props;
    const isUpdate = !!match.params.id || false;
    const { isDeleted = false, id: vehicleId = null } = data || {};

    return (
      <Fragment>
        <Row>
          <Col xs={24} sm={24} md={24} lg={24}>
            <Row style={{ marginTop: '1rem', float: 'right' }}>
              {
                !isDeleted && isUpdate
                && (
                <Col md={12}>
                  <DeleteModal url={`/v1/vehicles/${vehicleId}`} onSuccess={() => history.replace('/fleet', { tab: 'vehicle' })} resourceType={AUTH0_RESOURCE_TYPES.FLEET} />
                </Col>
                )
              }
              <Col md={12}>
                <Button
                  type="primary"
                  htmlType="submit"
                  color="primary"
                  size="small"
                  // loading={isSubmitting}
                  onClick={() => {
                    if (isUpdate) {
                      this.updateVehicle(this.mergeVehicleFormData());
                    } else {
                      this.createVehicle(this.mergeVehicleFormData());
                    }
                  }}
                >
                  {isUpdate ? 'Update' : 'Create'}
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
        <br />
        <Row gutter={16}>
          <Col sm={12}>
            <Card title="Vehicle Info">
              { (!isUpdate || data) && (
                <Formik
                  innerRef={this.vehicleInfoFormRef}
                  initialValues={{
                    name: data ? data.name : '',
                    publicId: data ? data.publicId : '',
                    licensePlate: data ? data.licensePlate : '',
                    driver: data ? data.driver : null,
                    location: data && data.location ? data.location.id : activeLocation,
                    isReady: data ? data.isReady : false,
                    matchingRule: data && data.matchingRule ? data.matchingRule : '',
                    zones: data && data.zones ? data.zones : [],
                    jobs: data && data.jobs ? data.jobs : []
                  }}
                  onSubmit={async (values) => {
                    try {
                      await this.updateVehicle(values);
                    } catch (error) {
                      message.error('Error updating vehicle');
                    }
                  }}
                >
                  {formProps => (
                    <VehicleInfoForm
                      locations={locations}
                      vehicleTypes={vehicleTypes}
                      matchingRules={matchingRules}
                      formProps={formProps}
                      isUpdate={!!match.params.id}
                      isDeleted={data ? data.isDeleted : false}
                      vehicleId={data ? data.id : null}
                      permissions={permissions}
                      history={history}
                    />
                  )}
                </Formik>
              )}
            </Card>
          </Col>
          <Col sm={12}>
            <Row gutter={16}>
              <Card title="Vehicle Type">
                { (!isUpdate || data) && (
                  <Formik
                    innerRef={this.vehicleTypeCapacityFormRef}
                    initialValues={{
                      passengerCapacity: data ? data.passengerCapacity : 0,
                      adaCapacity: data ? data.adaCapacity : 0,
                      vehicleType: data && data.vehicleType ? data.vehicleType.id : '',
                      isADAOnly: data ? data.isADAOnly : false,
                      setCustomADACapacity:
                        !(!data || [undefined, null].includes(data.adaCapacity)),
                      setCustomPassengerCapacity:
                        !(!data || [undefined, null].includes(data.passengerCapacity))
                    }}
                    onSubmit={async (values) => {
                      try {
                        await this.updateVehicle(values);
                      } catch (error) {
                        message.error('Error updating vehicle');
                      }
                    }}
                  >
                    {formProps => (
                      <VehicleTypeCapacityForm
                        locations={locations}
                        vehicleTypes={vehicleTypes}
                        formProps={formProps}
                        isUpdate={!!match.params.id}
                        isDeleted={data ? data.isDeleted : false}
                        vehicleId={data ? data.id : false}
                        permissions={permissions}
                        history={history}
                      />
                    )}
                  </Formik>
                )}
              </Card>
            </Row>
            <br />
            { data && (
              <Row gutter={16}>
                <Card title="Vehicle Inspection">
                  <Formik
                    initialValues={{
                      battery: data.battery || 0,
                      mileage: data.mileage || 0,
                      pluggedIn: data.pluggedIn || false
                    }}
                    onSubmit={async (values) => {
                      try {
                        const updatedFields = Object.entries(values)
                          .filter(item => data[item[0]] !== item[1]);
                        const mergedData = updatedFields.reduce((prev, curr) => {
                          const questionObj = questions.find(ques => ques.questionKey === curr[0]);
                          if (questionObj) {
                            return prev.concat({
                              questionId: questionObj.id,
                              response: `${curr[1]}`
                            });
                          }
                          return prev;
                        }, []);
                        await this.submitInspection(mergedData);
                      } catch (error) {
                        message.error('Error submitting inspection');
                      }
                    }}
                  >
                    {formProps => (
                      <VehicleInspectionForm formProps={formProps} questions={questions} />
                    )}
                  </Formik>
                </Card>
              </Row>
            )}
          </Col>
        </Row>
        { data && data.id && (
          <Row>
            <br />
            <Col>
              <Card title="Event Timeline">
                <EventList
                  vehicle={data.id}
                  location={activeLocation}
                  hours={['VEHICLE']}
                />
              </Card>
            </Col>
          </Row>
        )}
      </Fragment>
    );
  }
}

Vehicle.propTypes = {
  match: PropTypes.shape().isRequired,
  history: PropTypes.shape().isRequired,
  role: PropTypes.number.isRequired,
  locations: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    id: PropTypes.string
  })).isRequired,
  activeLocation: PropTypes.string
};

Vehicle.defaultProps = {
  activeLocation: ''
};


export default withRouter(Vehicle);
