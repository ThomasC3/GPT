import React from 'react';
import { Col, Descriptions } from 'antd';
import { Row } from '../elements';
import { PaymentStatusTag } from '.';

class RideTipInfo extends React.Component {
  render() {
    const {
      fetching, tips
    } = this.props.ride;

    const {
      total, net, fee, currency, createdTimestamp, status
    } = tips[0] || {};

    return (
      <Row gutter={15} spacing={15}>
        <Col xs={24} sm={24} md={24} lg={12}>
          { (!fetching && tips.length)
            && (
            <Descriptions
              title="Ride Tip Information"
              bordered
              column={{
                xxl: 1, xl: 1, lg: 1, md: 1, sm: 1, xs: 1
              }}
            >
              <Descriptions.Item label="Total tip">
                {
                new Intl.NumberFormat(
                  'en-US', { style: 'currency', currency: currency || 'usd' }
                ).format((total || 0) / 100) }
              </Descriptions.Item>
              <Descriptions.Item label="Net">
                {
                new Intl.NumberFormat(
                  'en-US', { style: 'currency', currency: currency || 'usd' }
                ).format((net || 0) / 100) }
              </Descriptions.Item>
              <Descriptions.Item label="Fee">
                {
                new Intl.NumberFormat(
                  'en-US', { style: 'currency', currency: currency || 'usd' }
                ).format((fee || 0) / 100) }
              </Descriptions.Item>
              <Descriptions.Item label="Currency">{ currency }</Descriptions.Item>
              <Descriptions.Item label="Created At">
                { createdTimestamp }
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <PaymentStatusTag status={status} />
              </Descriptions.Item>
            </Descriptions>
            )
          }
        </Col>
      </Row>
    );
  }
}

export default RideTipInfo;
