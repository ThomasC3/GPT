import { message } from 'antd';
import Axios from 'axios';
import { withRouter } from 'react-router-dom';
import { Formik } from 'formik';
import React, { Component, Fragment } from 'react';
import { VehicleTypeForm } from '../components';
import { allowDelete } from '../utils/auth';
import withProfileContext from '../components/hocs/withProfileContext';
import { AUTH0_RESOURCE_TYPES } from '../utils/constants';

class VehicleType extends Component {
  state = {
    data: null
  };

  componentDidMount() {
    const { match } = this.props;
    const fetchVehicleType = async () => {
      const response = await Axios({
        method: 'GET',
        url: `/v1/vehicles/types/${match.params.id}`
      }).then(res => res.data);

      this.setState({ data: response });
    };
    fetchVehicleType();
  }

  updateVehicleType = async (data) => {
    const { history, match } = this.props;
    try {
      const result = await Axios({
        method: 'PUT',
        url: `/v1/vehicles/types/${match.params.id}`,
        data
      });
      message.success('Updated');
      history.push(`/vehicle_type/${result.data.id}`);
    } catch (error) {
      const errorMessage = error.response && error.response.data
        ? error.response.data.message : null;
      message.error(errorMessage || 'Error creating Vehicle');
    }
  };

  deleteHandler = async (vehicleTypeId) => {
    await Axios({
      method: 'DELETE',
      url: `/v1/vehicles/types/${vehicleTypeId}`
    });
  }

  render() {
    const { data } = this.state;
    const { history, profileContext: { permissions } } = this.props;
    return (
      <Fragment>
        {data && (
          <Formik
            initialValues={{
              type: data.type,
              passengerCapacity: data.passengerCapacity,
              adaCapacity: data.adaCapacity,
              checkInForm: data.checkInForm,
              checkOutForm: data.checkOutForm
            }}
            onSubmit={async (values, _actions) => {
              try {
                await this.updateVehicleType(values);
              } catch (error) {
                message.error('Error updating vehicle type');
              }
            }}
          >
            {formProps => (
              <VehicleTypeForm
                formProps={formProps}
                isUpdate
                isDeleted={data.isDeleted}
                allowDelete={allowDelete(AUTH0_RESOURCE_TYPES.FLEET, permissions)}
                deleteHandler={() => this.deleteHandler(data.id)}
                history={history}
              />
            )}
          </Formik>
        )}
      </Fragment>
    );
  }
}

export default withProfileContext(withRouter(VehicleType));
