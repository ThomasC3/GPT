import AWS from 'aws-sdk';
import { aws as awsConfig } from '../config';

export class S3Service {
  constructor(config) {
    this.config = config;

    this.s3 = new AWS.S3({
      accessKeyId: this.config.access_key_id,
      secretAccessKey: this.config.access_key_secret
    });
  }

  async upload(uploadData) {
    return this.s3.upload(uploadData).promise();
  }

  async uploadImage(image, type, fileName, bucketName) {
    const base64Data = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: base64Data,
      ACL: 'public-read',
      ContentEncoding: 'base64',
      ContentType: `image/${type}`
    };

    return this.s3.upload(params).promise();
  }

  async signS3(Key, ContentType) {
    const s3Params = {
      Bucket: this.config.s3.docs_bucket_name,
      Key,
      ContentType
    };

    return this.s3.getSignedUrl('putObject', s3Params);
  }
}

export default new S3Service(awsConfig);
