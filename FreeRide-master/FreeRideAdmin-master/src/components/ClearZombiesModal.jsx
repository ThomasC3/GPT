import React from 'react';
import {
  Modal, Button, Card, message, Col
} from 'antd';
import axios from 'axios';
import { Row } from '../elements';

const ClearZombiesModal = ({ location, pendingRequests, ...props }) => {
  const url = '/v1/requests/clearZombies';
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleOk = async () => {
    try {
      const data = { location };
      const response = await axios({ method: 'POST', url, data });
      const { modifiedCount } = response.data;

      if (props.onSuccess) {
        props.onSuccess(modifiedCount);
      } else {
        message.success(`Requests cancelled: ${modifiedCount}`);
      }
    } catch (error) {
      message.error('An Error Occurred');
      setIsSaving(false);
    }
  };

  return (
    <>
      <Row gutter={15} spacing={15}>
        <Col xs={24} sm={24} md={24} lg={24}>
          <Card bordered={false}>
            <div style={{ float: 'right' }}>
              <Button size="small" type="danger" onClick={() => setIsOpen(true)}>
                {`Cancel (${pendingRequests}) pending requests!`}
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
      <Modal
        title="Clean Requests Older than one hour?"
        visible={isOpen}
        onOk={handleOk}
        okText="Delete"
        confirmLoading={isSaving}
        onCancel={() => setIsOpen(false)}
      >
        <p>
          {`Are you sure you want to cancel these ${pendingRequests} pending requests?`}
        </p>
      </Modal>
    </>
  );
};

export default ClearZombiesModal;
