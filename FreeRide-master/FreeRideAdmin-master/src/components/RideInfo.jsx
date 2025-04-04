import React from 'react';
import { Link } from 'react-router-dom';
import {
  Col, Card, List, Rate, Button, Descriptions, Tag
} from 'antd';
import { Row } from '../elements';
import { RideStatusTag, MapWithMarkers, ReportInfo } from '.';

import { Modal } from '../elements';

class RideInfo extends React.Component {
  render() {
    const {
      cancelTimestamp, ratingForRider, ratingForDriver,
      requestMessages, driver, location, rider, passengers,
      isADA, pickupAddress, dropoffAddress, status,
      request, createdTimestamp, dropoffTimestamp,
      pickupTimestamp, fetching, hailedPickupLatitude,
      hailedPickupLongitude, hailedDropoffLatitude,
      hailedDropoffLongitude, pickupZone, dropoffZone,
      vehicle
    } = this.props.ride;
    let {
      pickupLatitude, pickupLongitude,
      dropoffLatitude, dropoffLongitude,
      isPickupFixedStop, isDropoffFixedStop
    } = this.props.ride;
    pickupLatitude = pickupLatitude || hailedPickupLatitude;
    pickupLongitude = pickupLongitude || hailedPickupLongitude;
    dropoffLatitude = dropoffLatitude || hailedDropoffLatitude;
    dropoffLongitude = dropoffLongitude || hailedDropoffLongitude;

    return (
      <Card
        title="Ride Details"
        extra={(
          <span>
            <RideStatusTag status={status} />
            <Modal
              title="New Report"
              button={<Button type="primary" size="small">New Report</Button>}
              destroyOnClose
              width="50vw"
              footer={[]}
            >
              <ReportInfo rideId={this.props.rideIdParam} history={this.props.history} />
            </Modal>
          </span>
)}
      >
        {!fetching
          && (
          <Row gutter={15} spacing={15}>
            <Col xs={24} sm={24} md={24} lg={12}>
            <Row gutter={15} spacing={15}>
              <Descriptions
                title="Ride Payment Information"
                size="small"
                bordered
                column={{
                  xxl: 1, xl: 1, lg: 1, md: 1, sm: 1, xs: 1
                }}
              >

                <Descriptions.Item label="Rider">
                  {rider ? (
                    <Link to={`/riders/${rider.id}`}>
                      { rider.firstName }
                      {' '}
                      {rider.lastName }
                    </Link>
                  ) : '-' }
                </Descriptions.Item>

                <Descriptions.Item label="Driver">
                  {rider ? (
                    <Link to={`/drivers/${driver.id}`}>
                      { driver.firstName }
                      {' '}
                      {driver.lastName }
                    </Link>
                  ) : '-'}
                </Descriptions.Item>

                <Descriptions.Item label="Location">
                  <Link to={`/location/${location.id}`}>{ location.name }</Link>
                </Descriptions.Item>

                <Descriptions.Item label="Status Number">
                  { status }
                </Descriptions.Item>

                <Descriptions.Item label="Pickup Address">
                  <Tag color={isPickupFixedStop ? 'green' : 'blue'}>{isPickupFixedStop ? 'FS' : 'D2D'}</Tag>
                  { pickupAddress }
                </Descriptions.Item>

                <Descriptions.Item label="Pickup Zone">
                  { pickupZone && pickupZone.name }
                </Descriptions.Item>

                <Descriptions.Item label="Dropoff Address">
                  <Tag color={isDropoffFixedStop ? 'green' : 'blue'}>{isDropoffFixedStop ? 'FS' : 'D2D'}</Tag>
                  { dropoffAddress }
                </Descriptions.Item>

                <Descriptions.Item label="Dropoff Zone">
                  { dropoffZone && dropoffZone.name }
                </Descriptions.Item>

                <Descriptions.Item label="Number of Passengers">
                  { passengers }
                </Descriptions.Item>

                <Descriptions.Item label="Accessible Ride">
                  { isADA ? 'Yes' : 'No' }
                </Descriptions.Item>

                <Descriptions.Item label="Requested At">
                  { request.id && request.requestTimestamp }
                </Descriptions.Item>

                <Descriptions.Item label="Ride confirmed At">
                  { createdTimestamp }
                </Descriptions.Item>

                <Descriptions.Item label="Cancelled At">
                  { cancelTimestamp && cancelTimestamp }
                </Descriptions.Item>

                <Descriptions.Item label="Dropoff At">
                  { dropoffTimestamp && dropoffTimestamp }
                </Descriptions.Item>

                <Descriptions.Item label="Pickup At">
                  { pickupTimestamp && pickupTimestamp }
                </Descriptions.Item>

                <Descriptions.Item label="Rating for Rider">
                  <Rate disabled defaultValue={ratingForRider} />
                </Descriptions.Item>
              </Descriptions>
            </Row>
            <Row gutter={15} spacing={15}>
              <Descriptions
                title="Driver info"
                size="small"
                bordered
                column={{
                  xxl: 1, xl: 1, lg: 1, md: 1, sm: 1, xs: 1
                }}
              >
                <Descriptions.Item label="Driver">
                  {rider ? (
                    <Link to={`/drivers/${driver.id}`}>
                      { driver.firstName }
                      {' '}
                      {driver.lastName }
                    </Link>
                  ) : '-'}
                </Descriptions.Item>

                <Descriptions.Item label="Vehicle">
                  {vehicle ? (
                    <Link to={`/vehicles/${vehicle.vehicleId}`}>
                      { `${vehicle.vehicleName} (${vehicle.publicId})` }
                    </Link>
                  ) : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Routing Policy">
                  { vehicle && vehicle.matchingRule && vehicle.matchingRule.title }
                </Descriptions.Item>
                <Descriptions.Item label="Zones">
                  { vehicle && vehicle.zones && vehicle.zones.map(zone => zone.name).join(', ') }
                </Descriptions.Item>

                <Descriptions.Item label="Rating for Driver">
                  <Rate disabled defaultValue={ratingForDriver} />
                </Descriptions.Item>
              </Descriptions>
              </Row>

              <div>
                <List
                  header={<strong>Messages</strong>}
                  itemLayout="horizontal"
                  locale={{ emptyText: 'No Messages' }}
                  dataSource={requestMessages}
                  renderItem={item => (
                    <List.Item>
                      <List.Item.Meta
                        title={item.sender === 'RIDER' ? `${rider.firstName} ${rider.lastName}` : `${driver.firstName} ${driver.lastName}`}
                        description={item.message}
                      />
                      {item.createdTimestamp}
                    </List.Item>
                  )}
                />
                <Row>
                  <Col>
                    {[300].includes(status) && <Button size="small" onClick={this.props.completeRide}>Complete ride</Button>}
                    {[200, 201, 202, 203].includes(status) && <Button size="small" onClick={this.props.cancelRide}>Cancel ride</Button>}
                  </Col>
                </Row>
              </div>
            </Col>

            <Col xs={24} sm={16} md={12}>
              {dropoffLatitude
                && (
                <MapWithMarkers
                  center={{ lat: dropoffLatitude, lng: dropoffLongitude }}
                  zoom={15}
                  markers={[
                    { lat: dropoffLatitude, lng: dropoffLongitude, label: 'B' },
                    { lat: pickupLatitude, lng: pickupLongitude, label: 'A' }
                  ]}
                  loadingElement={<div style={{ height: '100%' }} />}
                  containerElement={<div style={{ height: '400px' }} />}
                  mapElement={<div style={{ height: '100%' }} />}
                />
                )
              }
            </Col>
          </Row>
          )
        }
      </Card>
    );
  }
}

export default RideInfo;
