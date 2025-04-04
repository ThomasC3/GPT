import { message } from 'antd';
import Axios from 'axios';
import { withRouter } from 'react-router-dom';
import { Formik } from 'formik';
import React, { Component } from 'react';
import { VehicleTypeForm } from '../components';
import { allowDelete } from '../utils/auth';
import withProfileContext from '../components/hocs/withProfileContext';
import { AUTH0_RESOURCE_TYPES } from '../utils/constants';

class CreateVehicleType extends Component {
  createVehicleType = async (data) => {
    const { history } = this.props;
    try {
      const result = await Axios({
        method: 'POST',
        url: '/v1/vehicles/types',
        data
      });
      history.push(`/vehicle_type/${result.data.id}`);
    } catch (error) {
      const errorMessage = error.response && error.response.data
        ? error.response.data.message : null;
      message.error(errorMessage || 'Error creating vehicle type');
    }
  };

  render() {
    const { profileContext: { permissions } } = this.props;
    return (
      <Formik
        initialValues={{
          type: '',
          passengerCapacity: 0,
          adaCapacity: 0,
          checkInForm: null,
          checkOutForm: null
        }}
        onSubmit={async (values, _actions) => {
          try {
            await this.createVehicleType(values);
          } catch (error) {
            const errorMessage = error.response && error.response.data
              ? error.response.data.message : null;
            message.error(errorMessage || 'Error creating vehicle type');
          }
        }}
      >
        {formProps => <VehicleTypeForm formProps={formProps} allowDelete={allowDelete(AUTH0_RESOURCE_TYPES.FLEET, permissions)} />}
      </Formik>
    );
  }
}

export default withProfileContext(withRouter(CreateVehicleType));
