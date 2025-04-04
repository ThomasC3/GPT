import React, { Component, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Spin, Row, message
} from 'antd';
import axios from 'axios';
import { Image as ImgElem, FormItem } from '../elements';

class ProfilePictureUpload extends Component {
  state = {
    showActions: true,
    uploading: false,
    image: null
  }

  componentDidUpdate(_prevProps, prevState) {
    const { image: stateImage } = this.state;
    if (prevState.image && !stateImage) {
      this.fileUpload.value = null;
    }
  }

  setAndUpdateState(obj) {
    this.setState(state => ({ state, ...obj }));
  }

  setImage(image) {
    this.setAndUpdateState({ image });
  }

  setUploading(uploading) { this.setAndUpdateState({ uploading }); }

  uploadAndSetProfilePicture = () => {
    const { image } = this.state;
    const { driver, afterUpload } = this.props;

    if (!image) {
      message.error('Image required');
      return;
    }

    this.setUploading(true);
    const reader = new FileReader();

    reader.addEventListener('load', () => {
      const img = new Image();
      img.src = reader.result;
      if (img.height > 512) {
        message.error(`Height of picture (${img.height}px) must not exceed 512px`);
        return this.setUploading(false);
      }
      if (img.width > 512) {
        message.error(`Width of picture (${img.width}px) must not exceed 512px`);
        return this.setUploading(false);
      }
      return axios({
        method: 'POST',
        url: `/v1/drivers/${driver}/picture`,
        data: { image: reader.result }
      }).then((res) => {
        afterUpload(res.data.profilePicture);

        this.setUploading(false);
        this.setImage(null);
      }).catch((err) => {
        this.setUploading(false);
        const errorMessage = err.response && err.response.data
          ? err.response.data.message
          : null;
        message.error(errorMessage || 'An Error Occurred');
      });
    });

    reader.readAsDataURL(image);
  }

  removeProfilePicture = () => {
    const { driver, afterUpload } = this.props;

    this.setUploading(true);

    axios({
      method: 'DELETE',
      url: `/v1/drivers/${driver}/picture`
    }).then((res) => {
      afterUpload(res.data.profilePicture);

      this.setUploading(false);
      this.setImage(null);
    }).catch((err) => {
      this.setUploading(false);
      const errorMessage = err.response && err.response.data
        ? err.response.data.message
        : null;
      message.error(errorMessage || 'An Error Occurred');
    });
  }

  render() {
    const { image, uploading, showActions } = this.state;

    return (
      <Spin spinning={uploading}>
        <React.Fragment>
          {showActions && (
            <div>
              <Row>
                <FormItem label="Profile Picture">
                  <Thumb file={image} height={100} />
                  <input
                    id="file"
                    type="file"
                    accept="image/jpg, image/jpeg"
                    ref={(node) => { this.fileUpload = node; }}
                    onChange={(event) => {
                      this.setImage(event.currentTarget.files[0]);
                    }}
                  />
                </FormItem>
              </Row>
              <Row>
                <Button size="small" type="danger" onClick={this.removeProfilePicture} style={{ float: 'left' }}>Remove</Button>
                <Button size="small" type="primary" onClick={this.uploadAndSetProfilePicture} style={{ float: 'right' }}> Upload </Button>
              </Row>
            </div>
          )}
          {!showActions && (
            <div>
            To upload a profile picture, please create this driver first and upload it after.
            </div>
          )}
        </React.Fragment>
      </Spin>
    );
  }
}

const Thumb = ({ file }) => {
  const [thumb, setThumb] = useState();

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setThumb(reader.result);
      reader.readAsDataURL(file);
    }
  }, [file]);

  return file && (
    <ImgElem
      src={thumb}
      alt={file.name}
      className="img-thumbnail mt-2"
      height={100}
    />
  );
};

ProfilePictureUpload.propTypes = {
  driver: PropTypes.string,
  afterUpload: PropTypes.func.isRequired
};
ProfilePictureUpload.defaultProps = {
  driver: null
};

export default ProfilePictureUpload;
