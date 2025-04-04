import React from 'react';
import {
  Spin, Tabs, message
} from 'antd';
import { Formik, Form } from 'formik';
import { withRouter } from 'react-router-dom';

import axios from 'axios';
import {
  LocationInfo, LocationDetails, LocationPayment,
  LocationPromocodes, LocationFixedStops,
  ErrorListener
} from '../components';
import { common, schemas } from '../utils';
import ZoneTab from '../components/zone/ZoneTab';
import PaymentPolicy from '../components/zone/PaymentPolicy';

const { LocationSchema } = schemas;
const defaultTimes = { openTime: '17:50', closeTime: '18:00', closed: false };
const defaultHours = [
  { day: 'Monday', ...defaultTimes },
  { day: 'Tuesday', ...defaultTimes },
  { day: 'Wednesday', ...defaultTimes },
  { day: 'Thursday', ...defaultTimes },
  { day: 'Friday', ...defaultTimes },
  { day: 'Saturday', ...defaultTimes },
  { day: 'Sunday', ...defaultTimes }
];

const { MAP_AREA_FOR_GOOGLE, MAP_AREA_FOR_SERVER } = common;

const showErrors = (errors) => {
  // Error format for arrays includes undefined elements for valid indexes
  if (!errors) { return; }

  Object.values(errors).map((item) => {
    // Main level errors, e.g. location name, overall service hour validation
    if (typeof item === 'string') {
      return message.error(item);
    }
    // Array type, e.g. service hours
    if (item.length) {
      return item.forEach(elem => showErrors(elem));
    }
    // Nested attribute errors
    return message.error(Object.values(item).join(' AND '));
  });
};

class Location extends React.Component {
  state = {
    name: '',
    closedCopy: '',
    inactiveCopy: '',
    suspendedCopy: '',
    suspendedTitle: '',
    isSuspended: false,
    hasAppService: false,
    isADA: false,
    isAvailablilityOverlayActive: false,
    isUsingServiceTimes: false,
    serviceHours: defaultHours,
    serviceArea: [],
    timezone: null,
    isActive: false,
    fetching: true,
    cancelTime: '',
    arrivedRangeFeet: '',
    inversionRangeFeet: '',
    queueTimeLimit: '',
    showAlert: false,
    alert: {
      title: null,
      copy: null
    },
    etaIncreaseLimit: '',
    passengerLimit: '',
    concurrentRideLimit: '',
    paymentEnabled: false,
    paymentInformation: {},
    pwywEnabled: false,
    pwywInformation: null,
    tipEnabled: false,
    tipInformation: null,
    fixedStopEnabled: false,
    poolingEnabled: false,
    copyData: [],
    pwywCopy: '',
    riderPickupDirections: false,
    riderAgeRequirement: '',
    failedAgeRequirementAlert: {
      title: '',
      copy: ''
    },
    fleetEnabled: false,
    hideFlux: false,
    locationCode: '',
    stateCode: '',
    freeRideAgeRestrictionEnabled: false,
    freeRideAgeRestrictionInterval: {
      min: null,
      max: null
    },
    zones: []
  }

  componentDidMount() {
    const { match: { params: { id } } } = this.props;

    if (id) {
      this.fetch(id);
    } else {
      this.setState({ fetching: false });
    }
  }

  componentDidUpdate(prevProps) {
    const { match: { params: { id } } } = this.props;

    if (id && id !== prevProps.match.params.id) {
      this.fetch(id);
    }
  }

  setCopyData = (copyData) => {
    this.setAndUpdateState({ copyData });
  }

  setAndUpdateState(obj) {
    this.setState(state => ({ state, ...obj }));
  }

  fetch = (id) => {
    this.setState({ fetching: true });
    axios.get(`/v1/locations/${id}`)
      .then((res) => {
        const { serviceArea, breakDurations, routingArea } = res.data;
        const data = {
          ...res.data,
          serviceArea: serviceArea.map(MAP_AREA_FOR_GOOGLE),
          breakDurations: breakDurations.join(','),
          fetching: false
        };
        if (routingArea && routingArea.length) {
          data.routingArea = routingArea.map(MAP_AREA_FOR_GOOGLE);
        }
        this.setAndUpdateState(data);
      }).catch((err) => {
        console.log(err);
      });
  }

  updateZones = (updatedZonesList) => {
    this.setState({ zones: updatedZonesList });
  }

  save = (data, actions = null) => {
    const saveData = { ...data };

    this.setAndUpdateState({ ...saveData, fetching: true });

    const { match: { params: { id } }, history } = this.props;
    const { breakDurations, serviceArea, routingArea } = saveData;
    saveData.serviceArea = serviceArea.map(MAP_AREA_FOR_SERVER);
    if (routingArea && routingArea.length) {
      saveData.routingArea = routingArea.map(MAP_AREA_FOR_SERVER);
    }
    saveData.breakDurations = (breakDurations && breakDurations.length ? breakDurations.split(',') : [])
      .map(item => parseInt(item, 10))
      .filter(item => !Number.isNaN(item));

    return axios({
      method: id ? 'PUT' : 'POST',
      url: `/v1/locations/${id || ''}`,
      data: saveData
    }).then((res) => {
      message.success('Successfully Saved');
      if (!id) { // create
        history.replace(`/location/${res.data.id}`);
      }
      const updateData = {
        ...res.data,
        serviceArea: res.data.serviceArea.map(MAP_AREA_FOR_GOOGLE),
        breakDurations: res.data.breakDurations ? res.data.breakDurations.join(',') : ''
      };
      if (res.data.routingArea && res.data.routingArea.length) {
        updateData.routingArea = res.data.routingArea.map(MAP_AREA_FOR_GOOGLE);
      }
      this.setAndUpdateState(updateData);
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
    const { match: { params: { id } } } = this.props;
    const {
      name, closedCopy, inactiveCopy, isADA, passengerLimit,
      isAvailablilityOverlayActive, isUsingServiceTimes,
      poolingEnabled, serviceHours, serviceArea,
      isActive, timezone, cancelTime,
      arrivedRangeFeet, queueTimeLimit, showAlert, alert,
      isSuspended, hasAppService, suspendedCopy,
      suspendedTitle, inversionRangeFeet, etaIncreaseLimit,
      paymentEnabled, paymentInformation, fetching,
      concurrentRideLimit, fixedStopEnabled, copyData,
      pwywEnabled, pwywInformation, tipEnabled,
      tipInformation, pwywCopy, riderPickupDirections,
      riderAgeRequirement, failedAgeRequirementAlert,
      fleetEnabled, breakDurations, locationCode, stateCode,
      freeRideAgeRestrictionEnabled, freeRideAgeRestrictionInterval,
      routingArea, zones, poweredBy, ridesFareCopy, hideFlux
    } = this.state;

    if (paymentInformation) {
      paymentInformation.ridePrice = paymentInformation.ridePrice || 0;
      paymentInformation.pricePerHead = paymentInformation.pricePerHead || 0;
      paymentInformation.priceCap = paymentInformation.priceCap || 0;
    }

    return (
      <Spin spinning={fetching}>
        <Formik
          enableReinitialize
          initialValues={{
            alert,
            name,
            closedCopy,
            inactiveCopy,
            isADA,
            isAvailablilityOverlayActive,
            isUsingServiceTimes,
            poolingEnabled,
            serviceHours,
            serviceArea,
            isActive,
            timezone,
            cancelTime,
            arrivedRangeFeet,
            queueTimeLimit,
            showAlert,
            isSuspended,
            hasAppService,
            suspendedCopy,
            suspendedTitle,
            inversionRangeFeet,
            etaIncreaseLimit,
            passengerLimit,
            paymentEnabled,
            paymentInformation,
            concurrentRideLimit,
            fixedStopEnabled,
            copyData,
            pwywEnabled,
            pwywInformation,
            tipEnabled,
            tipInformation,
            pwywCopy,
            riderPickupDirections,
            riderAgeRequirement,
            failedAgeRequirementAlert,
            fleetEnabled,
            hideFlux,
            breakDurations,
            locationCode,
            stateCode,
            routingArea,
            freeRideAgeRestrictionEnabled,
            freeRideAgeRestrictionInterval,
            poweredBy,
            ridesFareCopy
          }}
          validateOnChange={false}
          validationSchema={LocationSchema}
          onSubmit={(values, actions) => {
            this.save({ ...values }, actions);
          }}
        >
          {
            formProps => (
                <>
                  <ErrorListener onError={showErrors} />

                  <Form onSubmit={formProps.handleSubmit}>
                    <Tabs defaultActiveKey="1">
                      <Tabs.TabPane tab="Location Basics" key="1">
                        <LocationInfo
                          locationIdParam={id}
                          formProps={formProps}
                        />
                      </Tabs.TabPane>
                      <Tabs.TabPane tab="Zones" key="2" disabled={!id}>
                        <ZoneTab serviceArea={serviceArea} locationId={id} updateZones={this.updateZones} />
                      </Tabs.TabPane>
                      <Tabs.TabPane tab="Location Copy" key="3">
                        <LocationDetails
                          setCopyData={this.setCopyData}
                          copyData={copyData}
                          locationIdParam={id}
                          formProps={formProps}
                        />
                      </Tabs.TabPane>
                      <Tabs.TabPane tab="Payment Information" key="4" disabled={!id}>
                        <LocationPayment
                          location={this.state}
                          locationIdParam={id}
                          formProps={formProps}
                        />
                      </Tabs.TabPane>
                      <Tabs.TabPane tab="Fixed Stops" key="5" disabled={!id}>
                        <LocationFixedStops
                          location={this.state}
                          locationIdParam={id}
                          formProps={formProps}
                        />
                      </Tabs.TabPane>
                      <Tabs.TabPane tab="Promocodes" key="6" disabled={!id}>
                        <LocationPromocodes
                          location={this.state}
                          locationIdParam={id}
                        />
                      </Tabs.TabPane>
                      <Tabs.TabPane tab="Payment Policy" key="7">
                        <PaymentPolicy locationId={id} zones={zones} />
                      </Tabs.TabPane>
                    </Tabs>
                  </Form>
                </>
            )
          }
        </Formik>
      </Spin>
    );
  }
}

export default withRouter(Location);
