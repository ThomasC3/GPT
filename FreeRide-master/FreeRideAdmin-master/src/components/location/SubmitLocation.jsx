import React, { Component } from 'react';
import { Col, Card, Button } from 'antd';
import PropTypes from 'prop-types';
import { Row } from '../../elements';

class SubmitLocation extends Component {
  render() {
    const { id, formProps: { isSubmitting } } = this.props;

    return (
      <>
        <Row gutter={15} spacing={15}>
          <Col xs={24} sm={24} md={24} lg={24}>
            <Card bordered={false}>
              <div style={{ float: 'right' }}>
                <Button
                  size="small"
                  style={{ float: 'right' }}
                  type="primary"
                  htmlType="submit"
                  disabled={isSubmitting}
                >
                  { id ? 'Update' : 'Create' }
                </Button>
              </div>
            </Card>
          </Col>
        </Row>
      </>
    );
  }
}

SubmitLocation.propTypes = {
  id: PropTypes.string,
  formProps: PropTypes.shape({
    isSubmitting: PropTypes.bool
  }).isRequired
};

SubmitLocation.defaultProps = {
  id: null
};

export default SubmitLocation;
