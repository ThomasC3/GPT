import React, { useContext } from 'react';
import { Modal, Button, message } from 'antd';
import axios from 'axios';
import { allowDelete } from '../utils/auth';
import Profile from './providers/Profile';

const DeleteModal = ({
  url, buttonProps, resourceType, deleteMethod = 'DELETE',
  deleteHandler = null, title = '', confirmMessage = '',
  warningMessage = '', ...props
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { permissions } = useContext(Profile.ProfileContext);

  if (resourceType && !allowDelete(resourceType, permissions)) {
    return null;
  }

  const handleOk = async () => {
    setIsSaving(true);
    try {
      if (deleteHandler) {
        await deleteHandler();
      } else if (deleteMethod === 'DELETE') {
        await axios({ method: 'DELETE', url });
      } else if (deleteMethod === 'PUT') {
        await axios({ method: 'PUT', url, data: { isDeleted: true } });
      }
      props.onSuccess();
    } catch (error) {
      const errorMessage = error.response && error.response.data
        ? error.response.data.message
        : 'An Error Occurred';
      message.error(errorMessage);
    } finally {
      setIsSaving(false);
      setIsOpen(false);
    }
  };

  return (
    <>
      <Button size="small" type="danger" onClick={() => setIsOpen(true)} {...buttonProps}>
        Delete
      </Button>
      <Modal
        title={title || 'Delete Record?'}
        visible={isOpen}
        onOk={handleOk}
        okText="Delete"
        confirmLoading={isSaving}
        onCancel={() => setIsOpen(false)}
      >
        <p>{confirmMessage || 'Are you sure you want to delete this record?'}</p>
        {warningMessage && <b>{warningMessage}</b>}
      </Modal>
    </>
  );
};

export default DeleteModal;
