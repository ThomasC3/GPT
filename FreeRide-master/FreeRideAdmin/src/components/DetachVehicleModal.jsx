import React from 'react';
import { Modal, Button, message } from 'antd';

const DetachVehicleModel = ({
  detachHandler = null, ...props
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleOk = async () => {
    setIsSaving(true);
    try {
      await detachHandler();
      props.onSuccess();
    } catch (error) {
      const errorMessage = error.response && error.response.data
        ? error.response.data.message
        : null;
      message.error(errorMessage || 'Unable to detach vehicle from driver');
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button type="danger" onClick={() => setIsOpen(true)}>
        Detach Vehicle
      </Button>
      <Modal
        title="Detach Vehicle?"
        visible={isOpen}
        onOk={handleOk}
        okText="Detach"
        confirmLoading={isSaving}
        onCancel={() => setIsOpen(false)}
      >
        <p>Are you sure you want to detach vehicle from driver?</p>
      </Modal>
    </>
  );
};

export default DetachVehicleModel;
