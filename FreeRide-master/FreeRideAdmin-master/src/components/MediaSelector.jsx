import * as React from 'react';
import PropTypes from 'prop-types';
import {
  Spin, Transfer, Tooltip, Select
} from 'antd';
import axios from 'axios';
import Qs from 'qs';
import { Image } from '../elements';
import { ENDPOINTS } from '../utils/constants';
import { LabelWrapper } from '.';

class MediaSelector extends React.PureComponent {
  state = {
    mediaList: [],
    fetching: false
  }

  componentDidMount() {
    const { advertiserId } = this.props;
    this.fetch(advertiserId);
  }

  componentDidUpdate(prevProps) {
    const { advertiserId } = this.props;
    if (prevProps.advertiserId !== advertiserId) {
      this.fetch(advertiserId);
    }
  }

  fetch = async (advertiserId) => {
    this.setState({ fetching: true });
    const params = {
      filters: {
        advertiserId
      }
    };
    try {
      const data = await axios({
        url: ENDPOINTS.MEDIA,
        params,
        paramsSerializer: p => Qs.stringify(p, { arrayFormat: 'brackets' })
      }).then(res => res.data);
      this.setState({ fetching: false, mediaList: data.items });
    } catch (e) {
      this.setState({ fetching: false });
    }
  }

  renderThumbnail = mediaItem => (
    <Tooltip title={<img src={mediaItem.sourceUrl} alt="" style={{ maxHeight: 200 }} />} placement="right" overlayStyle={{ maxWidth: 'none' }}>
      <Image
        src={mediaItem.sourceUrl}
        className="img-thumbnail mt-2"
        style={{ maxHeight: 30, paddingRight: 10 }}
      />
      {`${mediaItem.advertisementId} (${mediaItem.filename})`}
    </Tooltip>
  )

  render() {
    const { mediaList, fetching } = this.state;
    const {
      values, onChange, featuredMedia,
      onFeaturedMediaChange, withFeaturedMedia
    } = this.props;

    const formattedMediaList = mediaList.map(i => ({
      key: i.id,
      sourceUrl: i.sourceUrl,
      advertisementId: i.advertisement && i.advertisement.advertisementId,
      filename: i.filename
    }));

    return (
      <Spin spinning={fetching}>
        {withFeaturedMedia && (
          <LabelWrapper label="Featured media">
            <Select
              menuPlacement="auto"
              menuPosition="fixed"
              size="small"
              disabled={!values.length}
              placeholder="Select Media"
              value={featuredMedia}
              onChange={onFeaturedMediaChange}
              style={{ width: '250px' }}
            >
              <Select.Option value={null}>Select media</Select.Option>
              {formattedMediaList.filter(media => values.includes(media.key)).map(i => (
                <Select.Option key={i.key} value={i.key}>{i.advertisementId}</Select.Option>
              ))}
            </Select>
          </LabelWrapper>
        )}
        <LabelWrapper label="Media" style={{ width: '100%', display: 'flex' }}>
          <Transfer
            dataSource={formattedMediaList}
            titles={['Media', 'Managed']}
            targetKeys={values}
            onChange={onChange}
            render={i => this.renderThumbnail(i)}
            showSearch
            filterOption={(input, item) => (
              (
                item.filename
                && item.filename.toLowerCase().includes(input.toLowerCase())
              ) || (
                item.advertisementId
                && item.advertisementId.toLowerCase().includes(input.toLowerCase())
              )
            )}
            listStyle={{
              width: '40%'
            }}
          />
        </LabelWrapper>
      </Spin>
    );
  }
}

MediaSelector.propTypes = {
  values: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  advertiserId: PropTypes.string,
  withFeaturedMedia: PropTypes.bool,
  featuredMedia: PropTypes.string,
  onFeaturedMediaChange: PropTypes.func
};

MediaSelector.defaultProps = {
  onFeaturedMediaChange: () => {},
  advertiserId: '',
  featuredMedia: '',
  withFeaturedMedia: false
};

export default MediaSelector;
