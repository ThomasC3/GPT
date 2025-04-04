import React from 'react';
import { Col, Descriptions } from 'antd';
import { Row } from '../elements';
import { Promocode, PaymentStatusTag } from '.';

class RidePaymentInfo extends React.Component {
  render() {
    const {
      fetching, request
    } = this.props.ride;

    const {
      status, totalPrice, discount,
      totalWithoutDiscount, ridePrice,
      pricePerHead, currency, promocodeId,
      isPromocodeValid, amountRefunded
    } = request.paymentInformation || {};

    return (
      <Row gutter={15} spacing={15}>
        <Col xs={24} sm={24} md={24} lg={12}>
          { !fetching
            && (
            <Descriptions
              title="Ride Payment Information"
              bordered
              column={{
                xxl: 1, xl: 1, lg: 1, md: 1, sm: 1, xs: 1
              }}
            >
              { isPromocodeValid
                && <>
                  <Descriptions.Item label="Total Price before discount">
                    {
                    new Intl.NumberFormat(
                      'en-US', { style: 'currency', currency: currency || 'usd' }
                    ).format((totalWithoutDiscount || 0) / 100) }
                  </Descriptions.Item>
                  <Descriptions.Item label="Discount">
                    {
                    new Intl.NumberFormat(
                      'en-US', { style: 'currency', currency: currency || 'usd' }
                    ).format((discount || 0) / 100) }
                  </Descriptions.Item>
                </>
              }
              <Descriptions.Item label="Total Price">
                {
                new Intl.NumberFormat(
                  'en-US', { style: 'currency', currency: currency || 'usd' }
                ).format((totalPrice || 0) / 100) }
              </Descriptions.Item>
              <Descriptions.Item label="Ride Base Price">
                {
                new Intl.NumberFormat(
                  'en-US', { style: 'currency', currency: currency || 'usd' }
                ).format((ridePrice || 0) / 100) }
              </Descriptions.Item>
              <Descriptions.Item label="Price Per Head">
                {
                new Intl.NumberFormat(
                  'en-US', { style: 'currency', currency: currency || 'usd' }
                ).format((pricePerHead || 0) / 100) }
              </Descriptions.Item>
              <Descriptions.Item label="Amount refunded">
                {
                new Intl.NumberFormat(
                  'en-US', { style: 'currency', currency: currency || 'usd' }
                ).format((amountRefunded || 0) / 100) }
              </Descriptions.Item>
              <Descriptions.Item label="Currency">{ currency }</Descriptions.Item>
              <Descriptions.Item label="Payment Status">
                <PaymentStatusTag status={status} />
              </Descriptions.Item>
            </Descriptions>
            )
          }
        &nbsp;
        </Col>
        { !fetching && promocodeId && isPromocodeValid
            && (
            <Col xs={24} sm={24} md={24} lg={12}>
              <Promocode id={promocodeId} />
            </Col>
            )
        }
      </Row>
    );
  }
}

export default RidePaymentInfo;
