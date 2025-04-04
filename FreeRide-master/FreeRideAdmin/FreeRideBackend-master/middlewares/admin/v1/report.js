import { Reports, Rides } from '../../../models';
import { ApplicationError } from '../../../errors';
import { validator } from '../../../utils';
import { adminErrorCatchHandler } from '..';
import { s3 } from '../../../services';
import { aws } from '../../../config';
import { dumpReportForAdmin } from '../../../utils/dump';
import { locationValidator } from '../utils/location';

const getReports = async (req, res) => {
  try {
    const filterParams = validator.validate(
      validator.rules.object().keys({
        skip: validator.rules.number().integer().min(0),
        limit: validator.rules.number().integer().min(1),
        location: validator.rules.string().allow(''),
        createdTimestamp: validator.rules.object().keys({
          start: validator.rules.string().isoDate().allow(''),
          end: validator.rules.string().isoDate().allow('')
        }),
        sort: validator.rules.string().valid('', 'createdTimestamp'),
        order: validator.rules.string().allow(''),
        reportee: validator.rules.string()
      }),
      req.query
    );

    filterParams.isDeleted = false;
    let reports = await Reports.getReports(filterParams);
    reports = {
      ...reports,
      items: reports.items?.map(report => dumpReportForAdmin(report))
    };

    res.status(200).json(reports);
  } catch (error) {
    adminErrorCatchHandler(res, error, req,
      'We were unable to fetch any report at this time.');
  }
};

const getReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Reports.getReport(id);

    if (!report) {
      throw new ApplicationError('Report not found', 404);
    }

    const {
      user: admin
    } = req;
    const locationId = report.ride.location;

    await locationValidator(locationId, admin);

    res.status(200).json(report);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const createReport = async (req, res) => {
  try {
    const {
      body: reportData
    } = req;

    const ride = await Rides.findById(reportData.ride);

    if (!ride) {
      throw new ApplicationError(`Ride with specified id of ${reportData.ride} not found`);
    }
    // TODO: Implement a way to know it's an admin that made the report
    const report = await Reports.createByDriver({
      ...reportData,
      reporter: ride.driver,
      reportee: ride.rider
    });
    res.status(200).json(report);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const updateReport = async (req, res) => {
  try {
    const {
      params: { id },
      body: updatedReport
    } = req;

    const {
      user: admin
    } = req;
    let report = await Reports.getReport(id);
    const locationId = report.ride.location;

    await locationValidator(locationId, admin);

    await Reports.updateReport(id, updatedReport);
    report = await Reports.getReport(id);
    res.status(200).json(report);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const deleteReport = async (req, res) => {
  try {
    const { params: { id } } = req;
    const { user: admin } = req;

    const report = await Reports.getReport(id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await locationValidator(report.ride.location, admin);

    await Reports.updateReport(id, { isDeleted: true });

    return res.status(200).json({ message: 'Report deleted successfully' });
  } catch (error) {
    return adminErrorCatchHandler(res, error, req);
  }
};

const createDoc = async (req, res) => {
  try {
    const {
      params: { id },
      body: { doc }
    } = req;

    const report = await Reports.getReport(id);
    const docs = report.docs.filter(item => item.filename !== doc.filename);
    docs.push({ url: doc.url, filename: doc.filename });

    const updatedReport = await Reports.updateReport(id, { docs });
    res.status(200).json(updatedReport);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const signS3 = async (req, res) => {
  try {
    const {
      body: { objectName, contentType, prefix }
    } = req;

    const Key = prefix ? `${prefix}/${objectName}` : objectName;

    const data = await s3.signS3(Key, contentType);
    const returnData = {
      signedUrl: data,
      url: `https://s3.amazonaws.com/${aws.s3.docs_bucket_name}/${Key}`
    };

    res.status(200).json(returnData);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

export default {
  getReports,
  getReport,
  createReport,
  createDoc,
  updateReport,
  deleteReport,
  signS3
};
