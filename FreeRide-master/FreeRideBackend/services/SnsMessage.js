/* eslint-disable no-underscore-dangle */
import * as pushNotifications from './notifications';

export class SnsMessage {
  constructor(messageType, messageData, req) {
    this.messageType = messageType;
    this.messageData = messageData || {};
    this.t = req.t;
    this.language = req.lng;

    this.message = this._build();
  }

  _build() {
    return pushNotifications[this.messageType](this.messageData, this.t, this.language);
  }

  mapNotificationToPlatform(platform, env) {
    const {
      title, body, sound, badge
    } = this.message;

    const mappedMessage = {
      MessageStructure: 'json',
      Message: {}
    };
    if (platform === 'ios') {
      const key = env === 'debug' ? 'APNS_SANDBOX' : 'APNS';

      mappedMessage.Message[key] = JSON.stringify({
        aps: { alert: { title, body }, sound, badge }
      });
    } else {
      const key = 'GCM';
      mappedMessage.Message[key] = JSON.stringify({
        notification: {
          title,
          body
        },
        priority: 'high'
      });
    }
    mappedMessage.Message = JSON.stringify(mappedMessage.Message);
    return mappedMessage;
  }
}

export default SnsMessage;
