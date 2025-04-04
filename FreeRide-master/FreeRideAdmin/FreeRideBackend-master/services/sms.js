import twilio from 'twilio';
import { twilio as config } from '../config';
import { Settings } from '../models';


class SMSService {
  constructor(client = null) {
    this.client = client || twilio(config.accountSid, config.authToken);
  }

  async send(to, body) {
    const settings = await Settings.getSettings();
    if (settings.smsDisabled) {
      throw new Error('This feature is unavailable at this time.');
    }

    const result = await this.client.messages.create({
      to,
      body,
      from: config.from
    }, (err, message) => {
      if (err) {
        return false;
      }

      return message.sid;
    });

    return result;
  }
}

export default SMSService;
