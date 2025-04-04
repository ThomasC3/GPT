import AWS from 'aws-sdk';
import immutable from 'object-path-immutable';

import * as Sentry from '@sentry/node';
import { aws as config, domain, auth0 as auth0Config } from '../../config';
import { isArray } from '../../utils/array';
import { dump } from '../../utils';

import logger from '../../logger';

import * as templates from './templates';
import { EmailNotSentError } from '../../errors';

import { Rides } from '../../models';
import { auth0ClientInstance } from '../../middlewares/admin/utils/Auth0Client';

const emailStructure = {
  Destination: {
    ToAddresses: []
  },
  Message: {
    Body: {
      Html: {
        Charset: config.charset,
        Data: ''
      }
    },
    Subject: {
      Charset: config.charset,
      Data: ''
    }
  },
  Source: `Circuit <${config.from}>`
};

const prepareEmail = (to, subject, html) => immutable(emailStructure)
  .set('Destination.ToAddresses', isArray(to) ? to : [to])
  .set('Message.Subject.Data', subject)
  .set('Message.Body.Html.Data', html || '')
  .value();

export class SesMailer {
  constructor() {
    AWS.config.update({
      accessKeyId: config.access_key_id,
      secretAccessKey: config.access_key_secret,
      region: config.region
    });

    const testMode = ['local', 'test', 'test_docker'].includes(process.env.NODE_ENV);
    if (testMode) {
      this.ses = new AWS.SES({ region: config.region, endpoint: config.testSesEndpoint });
    } else {
      this.ses = new AWS.SES();
    }

    this.charset = config.charset;
    this.from = `Circuit <${config.from}>`;
  }

  async send(templateName, to, values, language = 'en') {
    try {
      if (!this.ses) {
        throw new EmailNotSentError('AWS SES not setup');
      } else if (!templateName) {
        throw new EmailNotSentError('Email Template not defined');
      } else if (!to) {
        throw new EmailNotSentError('No email destination address');
      } else if (!templates[templateName]) {
        throw new EmailNotSentError(`Unknown email template "${templateName}"`);
      }

      const templateWithValues = Object.assign({}, templates[templateName]);
      templateWithValues.html = await templateWithValues.html(values.html, language);
      templateWithValues.subject = await templateWithValues.subject(values.subject, language);

      const prepared = prepareEmail(to, templateWithValues.subject, templateWithValues.html);

      return this.ses.sendEmail(prepared, (err, data) => {
        if (!err) { return data; }

        logger.error(err);
        Sentry.captureException(err);

        return false;
      });
    } catch (err) {
      logger.error(err);
      Sentry.captureException(err);

      return false;
    }
  }

  async sendNewRiderReport(report) {
    const ride = await Rides.findById(report.ride.id).populate('location');

    const admins = await auth0ClientInstance.getAdminsByRoleAndLocation(
      auth0Config.riderReportRoleIds,
      ride.location._id.toString()
    );
    const emailsTo = admins.map(admin => admin.email);

    const htmlData = dump.dumpEmailReportData({
      ride, report, domain: domain.admin
    });
    return this.send('newRiderReport', emailsTo, {
      html: htmlData
    });
  }
}

export default new SesMailer();
