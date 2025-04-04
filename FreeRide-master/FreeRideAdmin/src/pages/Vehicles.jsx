import {
  Tabs, Card
} from 'antd';
import React from 'react';
import { withRouter } from 'react-router-dom';
import {
  ButtonLink, VehicleList, VehicleTypeList, JobList
} from '../components';
import { allowView } from '../utils/auth';
import { AUTH0_RESOURCE_TYPES } from '../utils/constants';

const Vehicles = ({
  location, locations, activeLocation, permissions
}) => (
      <>
        <Tabs defaultActiveKey={(location.state && location.state.tab) || 'vehicle'}>
          <Tabs.TabPane tab="Vehicles" key="vehicle">
            <Card
              title="Vehicles"
              extra={<ButtonLink size="small" type="primary" to="/vehicles">New Vehicle</ButtonLink>}
            >
              <VehicleList locations={locations} activeLocation={activeLocation} />
            </Card>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Vehicle Types" key="vehicle_types">
            <Card
              title="Vehicle Types"
              extra={<ButtonLink size="small" type="primary" to="/vehicle_type">New Vehicle Type</ButtonLink>}
            >
              <VehicleTypeList />
            </Card>
          </Tabs.TabPane>
          {allowView(AUTH0_RESOURCE_TYPES.JOBS, permissions) && (
            <Tabs.TabPane tab="Jobs" key="jobs">
              <Card title="Jobs">
                <JobList />
              </Card>
            </Tabs.TabPane>
          )}
        </Tabs>
      </>
);

export default withRouter(Vehicles);
