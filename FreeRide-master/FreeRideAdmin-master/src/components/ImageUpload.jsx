import React, { Component, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Spin, Row, message
} from 'antd';
import axios from 'axios';
import { Image as ImgElem } from '../elements';
import { common } from '../utils';
import { ENDPOINTS } from '../utils/constants';

const { convertBase64LengthToSizeInKB, getRatio, getFileExtension } = common;

class ImageUpload extends Component {
  state = {
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

  setImageInfo(image) {
    const { beforeUpload } = this.props;
    const reader = new FileReader();

    reader.addEventListener('load', () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        const { width, height } = img;
        beforeUpload({
          filename: image.name,
          filetype: getFileExtension(image.name),
          sizeInKB: convertBase64LengthToSizeInKB(reader.result.length),
          visualInfo: {
            width,
            height,
            ratio: getRatio(width, height)
          }
        });
      };
    });

    reader.readAsDataURL(image);
  }

  setImage(image) {
    const { resetUploadImage } = this.props;
    if (!image) {
      resetUploadImage();
      this.setState({ image: null });
    } else {
      this.setImageInfo(image);
      this.setAndUpdateState({ image });
    }
  }

  setUploading(uploading) { this.setAndUpdateState({ uploading }); }

  uploadAndSetImage = () => {
    const { image } = this.state;
    const { afterUpload, mediaId } = this.props;

    if (!image) {
      message.error('Image required');
      return;
    }

    this.setUploading(true);
    const reader = new FileReader();

    reader.addEventListener('load', () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        const { width, height } = img;
        return axios({
          method: 'POST',
          url: ENDPOINTS.MEDIA_UPLOAD(mediaId),
          data: {
            image: reader.result,
            mediaId,
            filename: image.name,
            filetype: getFileExtension(image.name),
            sizeInKB: convertBase64LengthToSizeInKB(reader.result.length),
            visualInfo: {
              width,
              height,
              ratio: getRatio(width, height)
            }
          }
        }).then((res) => {
          afterUpload(res.data);

          this.setUploading(false);
          this.setImage(null);
        }).catch((err) => {
          this.setUploading(false);
          const errorMessage = err.response && err.response.data
            ? err.response.data.message
            : null;
          message.error(errorMessage || 'An Error Occurred');
        });
      };
    });

    reader.readAsDataURL(image);
  }

  render() {
    const { image, uploading } = this.state;
    const { mediaId } = this.props;

    return (
      <Spin spinning={uploading}>
        <React.Fragment>
          {mediaId && (
            <div>
              <Row style={{ display: 'flex', justifyContent: 'center', paddingBottom: 10 }}>
                <Thumb file={image} />
              </Row>
              <Row>
                <input
                  id="file"
                  type="file"
                  accept="image/jpg, image/jpeg"
                  ref={(node) => { this.fileUpload = node; }}
                  onChange={event => this.setImage(event.currentTarget.files[0])}
                />
              </Row>
              { image && (
                <Row>
                  <Button size="small" type="primary" onClick={this.uploadAndSetImage} style={{ float: 'right' }}> Upload </Button>
                </Row>
              )}
            </div>
          )}
          {!mediaId && (
            <div>
            To upload an image, please create this media first and upload it after.
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
      width="90%"
    />
  );
};

ImageUpload.propTypes = {
  beforeUpload: PropTypes.func.isRequired,
  afterUpload: PropTypes.func.isRequired,
  mediaId: PropTypes.string,
  resetUploadImage: PropTypes.func.isRequired
};
ImageUpload.defaultProps = {
  mediaId: null
};

export default ImageUpload;
