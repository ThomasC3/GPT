import AWS from 'aws-sdk';
import request from 'supertest-promised';
import io from 'socket.io-client';
import sinon from 'sinon';
import csv from 'csv';
import app from '../../server';
import { port, domain, aws as awsConfig } from '../../config';
import { RiderGeneratorService } from '../../services';
import { emptyAllCollections } from '../utils/helper';
import { Locations, Requests } from '../../models';
import { createRiderLogin } from '../utils/rider';
import s3Service from '../../services/s3';

let riderSocket;
const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
const riderBody = {
  email: 'rider@mail.com',
  dob: '1994-07-02',
  password: 'password1!',
  firstName: 'fname',
  lastName: 'lname',
  gender: 'male',
  phone: '911111111',
  zip: '3030'
};
const keyLoc = {
  req1p: [
    40.683619,
    -73.907704,
    '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'
  ],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};
let location;

const createReq = (rider, reqLocation, requestTimestamp) => {
  const destination = {
    address: keyLoc.req1d[2],
    latitude: keyLoc.req1d[0],
    longitude: keyLoc.req1d[1]
  };
  const origin = {
    address: keyLoc.req1p[2],
    latitude: keyLoc.req1p[0],
    longitude: keyLoc.req1p[1]
  };
  const requestInfo = {
    rider,
    location: reqLocation,
    passengers: 1,
    isADA: false,
    pickupAddress: origin.address,
    pickupLatitude: origin.latitude,
    pickupLongitude: origin.longitude,
    dropoffAddress: destination.address,
    dropoffLatitude: destination.latitude,
    dropoffLongitude: destination.longitude,
    requestTimestamp,
    pickupZone: {
      id: '5d41eb558f144230ac51e29d',
      name: 'Pickup Zone'
    },
    dropoffZone: {
      id: '5d41eb558f144230ac51e29d',
      name: 'Dropoff Zone'
    }
  };
  return Requests.createRequest(requestInfo);
};

const s3 = new AWS.S3({
  accessKeyId: awsConfig.access_key_id,
  secretAccessKey: awsConfig.access_key_secret
});

const baseS3Params = {
  Bucket: awsConfig.s3.rider_exports_bucket_name
};

const emptyBucket = (done) => {
  s3.listObjectsV2({ Bucket: awsConfig.s3.rider_exports_bucket_name })
    .promise()
    .then(
      (data) => {
        if (data.Contents.length === 0) {
          return done();
        }
        const s3params = {
          ...baseS3Params,
          Delete: {
            Objects: data.Contents.map(file => ({ Key: file.Key }))
          }
        };
        return s3
          .deleteObjects(s3params)
          .promise()
          .then(
            () => done(),
            err_ => done(err_)
          );
      },
      err => done(err)
    );
};

describe('RiderGeneratorService', () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  before(() => {
    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);
  });

  beforeEach((done) => {
    emptyBucket(done);
  });

  beforeEach('clear db', async () => {
    await emptyAllCollections();
  });

  after('cleaning s3 bucket', (done) => {
    emptyBucket(done);
  });

  describe('Confirm input from generated report', () => {
    beforeEach(async () => {
      location = await Locations.createLocation({
        name: 'Location',
        isADA: false,
        isUsingServiceTimes: false,
        isActive: true
      });
      const rider1 = await createRiderLogin(
        riderBody,
        app,
        request,
        domain,
        riderSocket
      );
      await createReq(rider1.rider._id, location._id, new Date());
    });
    it('should query Request Model with the correct aggregation pipeline', async () => {
      const aggregateStub = sinon.stub(Requests, 'aggregate');
      const uploadStub = sinon.stub(s3Service, 'upload');

      await RiderGeneratorService.perform();

      const expectedPipeline = [
        {
          $match: {
            requestTimestamp: {
              $gte: sinon.match.any,
              $lt: sinon.match.any
            },
            location: location._id
          }
        },
        {
          $group: {
            _id: '$rider'
          }
        },
        {
          $lookup: {
            from: 'Riders',
            localField: '_id',
            foreignField: '_id',
            as: 'rider'
          }
        },
        {
          $unwind: '$rider'
        },
        {
          $replaceRoot: {
            newRoot: '$rider'
          }
        }
      ];
      sinon.assert.calledOnceWithExactly(aggregateStub, expectedPipeline);
      aggregateStub.restore();
      uploadStub.restore();
    });
    it('should call the s3 upload method with the correct information', async () => {
      const uploadStub = sinon.stub(s3Service, 'upload');

      await RiderGeneratorService.perform();

      const expectedBucketName = awsConfig.s3.rider_exports_bucket_name;
      const today = new Date();
      const expectedKey = `${today.getFullYear()}/${today.getMonth()}/${
        location.name
      }.csv`;
      sinon.assert.calledWith(
        uploadStub,
        sinon.match({
          Bucket: expectedBucketName,
          Key: expectedKey,
          ContentType: 'text/csv'
        })
      );
      uploadStub.restore();
    });
    context('when there are multiple locations in the db', () => {
      it('calls the s3 upload method multiple times', async () => {
        await Locations.createLocation({
          name: 'Location 2',
          isADA: false,
          isUsingServiceTimes: false,
          isActive: true
        });

        const uploadStub = sinon.stub(s3Service, 'upload');

        await RiderGeneratorService.perform();
        sinon.assert.calledTwice(uploadStub);
        uploadStub.restore();
      });
    });
    context('when there is no location in the db', () => {
      it('does not call the s3 upload method at all', async () => {
        await Locations.deleteMany();
        const uploadStub = sinon.stub(s3Service, 'upload');

        await RiderGeneratorService.perform();
        sinon.assert.notCalled(uploadStub);
        uploadStub.restore();
      });
    });
  });
  describe('Confirm actual upload output', () => {
    beforeEach(async () => {
      location = await Locations.createLocation({
        name: 'Location',
        isADA: false,
        isUsingServiceTimes: false,
        isActive: true
      });
      const rider1 = await createRiderLogin(
        riderBody,
        app,
        request,
        domain,
        riderSocket
      );
      const rider2 = await createRiderLogin(
        { ...riderBody, email: 'rider2@mail.com' },
        app,
        request,
        domain,
        riderSocket
      );
      const rider3 = await createRiderLogin(
        { ...riderBody, email: 'rider3@mail.com' },
        app,
        request,
        domain,
        riderSocket
      );

      await createReq(
        rider1.rider._id,
        location._id,
        new Date(year, month - 1, 10)
      );
      await createReq(
        rider2.rider._id,
        location._id,
        new Date(year, month - 1, 10)
      );
      await createReq(
        rider3.rider._id,
        location._id,
        new Date(year, month - 2, 10)
      );
    });
    it('stores a CSV report with only riders active from the previous month', (done) => {
      RiderGeneratorService.perform()
        .then(() => s3.listObjectsV2(baseS3Params).promise())
        .then(
          (data) => {
            if (data.Contents.length !== 1) {
              return done(new Error('wrong number of reports generated'));
            }
            const s3params = {
              ...baseS3Params,
              Key: data.Contents[0].Key
            };
            return s3.getObject(s3params).promise();
          },
          err => done(err)
        )
        .then((data) => {
          const parser = csv.parse({
            info: true,
            columns: true,
            skip_empty_lines: true
          });
          parser.on('readable', () => {
            while (parser.read() !== null) {
              /**/
            }
          });
          parser.on('error', err => done(err));
          parser.on('end', () => {
            if (parser.info.records !== 2) {
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
