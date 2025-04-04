import AWS from 'aws-sdk';
import csv from 'csv';

import { aws as awsConfig } from '../../config';
import { ReportGeneratorService } from '../../services';
import { emptyAllCollections } from '../utils/helper';
import {
  Locations,
  Rides
} from '../../models';

const s3 = new AWS.S3({
  accessKeyId: awsConfig.access_key_id,
  secretAccessKey: awsConfig.access_key_secret
});

const baseS3Params = {
  Bucket: awsConfig.s3.ridereports_bucket_name
};

function emptyBucket(done) {
  s3.listObjectsV2({ Bucket: awsConfig.s3.ridereports_bucket_name }).promise()
    .then((data) => {
      if (data.Contents.length === 0) {
        return done();
      }
      const s3params = {
        ...baseS3Params,
        Delete: {
          Objects: data.Contents.map(file => ({ Key: file.Key }))
        }
      };
      return s3.deleteObjects(s3params).promise()
        .then(() => done(), err_ => done(err_));
    }, err => done(err));
}

describe('ReportGeneratorService', () => {
  beforeEach('cleaning s3 bucket', (done) => {
    emptyBucket(done);
  });

  beforeEach('clearing database', () => {
    emptyAllCollections();
  });

  after('cleaning s3 bucket', (done) => {
    emptyBucket(done);
  });

  context('when there are no locations in the database', () => {
    it('doesn\'t store anything', (done) => {
      ReportGeneratorService.perform()
        .then(() => s3.listObjectsV2(baseS3Params).promise())
        .then((data) => {
          if (data.Contents.length === 0) {
            done();
          } else {
            done(new Error('S3 bucket is not empty'));
          }
        }, err => done(err))
        .catch(err => done(err));
    });
  });

  context('when there are locations in the database', () => {
    context('when there are no rides in the database', () => {
      const locationName = 'Location One';
      beforeEach('adding location', () => Locations.createLocation({
        name: locationName,
        isADA: false,
        isUsingServiceTimes: false,
        isActive: true,
        fleetEnabled: true
      }));

      it('stores a CSV report with the name of the location', (done) => {
        ReportGeneratorService.perform()
          .then(() => s3.listObjectsV2(baseS3Params).promise())
          .then((data) => {
            if (data.Contents.length !== 1) {
              done(new Error('wrong number of reports generated'));
            } else if (data.Contents[0].Key.endsWith(`${locationName}.csv`)) {
              done();
            } else {
              done(new Error('CSV report has wrong filename'));
            }
          }, err => done(err))
          .catch(err => done(err));
      });

      it('stores a CSV report with only header line', (done) => {
        ReportGeneratorService.perform()
          .then(() => s3.listObjectsV2(baseS3Params).promise())
          .then((data) => {
            if (data.Contents.length !== 1) {
              return done(new Error('wrong number of reports generated'));
            }
            const s3params = {
              ...baseS3Params,
              Key: data.Contents[0].Key
            };
            return s3.getObject(s3params).promise();
          }, err => done(err))
          .then((data) => {
            const parser = csv.parse({ info: true, columns: true, skip_empty_lines: true });
            parser.on('readable', () => { while (parser.read() !== null) { /**/ } });
            parser.on('error', err => done(err));
            parser.on('end', () => {
              if (parser.info.records !== 0) {
                done(new Error('wrong number of lines in CSV report'));
              } else {
                done();
              }
            });
            parser.write(data.Body);
            parser.end();
          })
          .catch(err => done(err));
      });
    });

    context('when there are rides in the database', () => {
      const locationName = 'Location One';
      beforeEach('adding location and rides', () => Locations.createLocation({
        name: locationName,
        isADA: false,
        isUsingServiceTimes: false,
        isActive: true
      }).then((location) => {
        const date = new Date();
        const year = date.getFullYear(); const
          month = date.getMonth();
        const baseBody = {
          location: location._id, isADA: false, isOldRecord: false, passengers: 2, vehicle: null
        };
        return Promise.all([
          Rides.create({
            ...baseBody,
            createdTimestamp: new Date(year, month - 1, 1, 0, 0, 1)
          }),
          Rides.create({
            ...baseBody,
            createdTimestamp: new Date(year, month, 0, 23, 59, 59)
          }),
          Rides.create({
            ...baseBody,
            createdTimestamp: new Date(year, month - 1, 15)
          }),
          Rides.create({
            ...baseBody,
            createdTimestamp: new Date(year, month - 1, 0)
          }),
          Rides.create({
            ...baseBody,
            createdTimestamp: new Date(year, month, 1)
          })
        ]);
      }).then(() => { Rides.getRides(); }));

      it('stores a CSV report with the name of the location', (done) => {
        ReportGeneratorService.perform()
          .then(() => s3.listObjectsV2(baseS3Params).promise())
          .then((data) => {
            if (data.Contents.length !== 1) {
              done(new Error('wrong number of reports generated'));
            } else if (data.Contents[0].Key.endsWith(`${locationName}.csv`)) {
              done();
            } else {
              done(new Error('CSV report has wrong filename'));
            }
          }, err => done(err))
          .catch(err => done(err));
      });

      it('stores a CSV report with only rides from the previous month', (done) => {
        ReportGeneratorService.perform()
          .then(() => s3.listObjectsV2(baseS3Params).promise())
          .then((data) => {
            if (data.Contents.length !== 1) {
              return done(new Error('wrong number of reports generated'));
            }
            const s3params = {
              ...baseS3Params,
              Key: data.Contents[0].Key
            };
            return s3.getObject(s3params).promise();
          }, err => done(err))
          .then((data) => {
            const parser = csv.parse({ info: true, columns: true, skip_empty_lines: true });
            parser.on('readable', () => { while (parser.read() !== null) { /**/ } });
            parser.on('error', err => done(err));
            parser.on('end', () => {
              if (parser.info.records !== 3) {
                done(new Error('wrong number of lines in CSV report'));
              } else {
                done();
              }
            });
            parser.write(data.Body);
            parser.end();
          })
          .catch(err => done(err));
      });
    });
  });
});
