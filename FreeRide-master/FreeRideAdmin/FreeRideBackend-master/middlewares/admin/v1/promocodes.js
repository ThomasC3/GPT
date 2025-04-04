import moment from 'moment-timezone';
import {
  Promocodes, Locations
} from '../../../models';
import { ApplicationError, PromocodeNotFoundError } from '../../../errors';
import { validator } from '../../../utils';
import { adminErrorCatchHandler } from '..';
import { locationValidator } from '../utils/location';

const getPromocodes = async (req, res) => {
  try {
    const filterParams = validator.validate(
      validator.rules.object().keys({
        isEnabled: validator.rules.boolean().truthy(1).falsy(0).allow(''),
        name: validator.rules.string().allow(''),
        code: validator.rules.string().allow(''),
        skip: validator.rules.number().integer().min(0),
        limit: validator.rules.number().integer().min(1),
        location: validator.rules.string().required(),
        createdTimestamp: validator.rules.string().isoDate().allow(''),
        sort: validator.rules.string().valid('', 'createdTimestamp'),
        order: validator.rules.string().allow('')
      }),
      req.query
    );

    const locationId = filterParams.location;

    await locationValidator(locationId, req.user);
    filterParams.isDeleted = false;
    const promocodes = await Promocodes.getPromocodes(filterParams);
    res.status(200).json(promocodes);
  } catch (error) {
    adminErrorCatchHandler(res, error, req,
      'We were unable to fetch any promocode at this time.');
  }
};

const getPromocode = async (req, res) => {
  try {
    const {
      params: { id },
      user: admin
    } = req;
    const promocode = await Promocodes.getPromocode({ _id: id });

    if (!promocode) { throw new PromocodeNotFoundError(); }
    if (promocode.location) {
      await locationValidator(promocode.location, admin);
    }

    res.status(200).json(promocode);
  } catch (error) {
    adminErrorCatchHandler(res, error, req,
      'We were unable to fetch any promocode at this time.');
  }
};

const createPromocode = async (req, res) => {
  try {
    const { body: promocodeData } = req;

    if (!promocodeData) { throw new ApplicationError('Missing Promocode Information'); }
    if (!promocodeData.location) { throw new ApplicationError('Missing Location for Promocode'); }

    if (promocodeData.expiryDate) {
      const { expiryDate, location: locationId } = promocodeData;
      const { timezone } = await Locations.findOne({ _id: locationId });
      const expiryDateFullDay = moment.tz(moment(expiryDate).format('YYYY-MM-DD'), timezone).endOf('day').utc();
      promocodeData.expiryDate = expiryDateFullDay.toDate();
    }

    await locationValidator(promocodeData.location, req.user);

    const promocode = await Promocodes.createPromocode(promocodeData);
    res.status(200).json(promocode);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const updatePromocode = async (req, res) => {
  try {
    const {
      params: { id },
      body: updatedPromocode
    } = req;
    let promocode = await Promocodes.getPromocode({ _id: id });

    if (!promocode) { throw new PromocodeNotFoundError(); }

    if (updatedPromocode.expiryDate) {
      const { expiryDate, location: locationId } = updatedPromocode;
      const { timezone } = await Locations.findOne({ _id: locationId });
      const expiryDateFullDay = moment.tz(moment(expiryDate).format('YYYY-MM-DD'), timezone).endOf('day').utc();
      updatedPromocode.expiryDate = expiryDateFullDay.toDate();
    }

    await locationValidator(promocode.location, req.user);

    if (updatedPromocode.isDeleted) {
      await Promocodes.deletePromocode(id);
    } else {
      if (!updatedPromocode.location) {
        throw new ApplicationError('Missing Location for Promocode');
      }
      await Promocodes.updatePromocode(id, updatedPromocode);
    }

    promocode = await Promocodes.getPromocode({ _id: id });
    res.status(200).json(promocode);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

export default {
  getPromocodes,
  getPromocode,
  createPromocode,
  updatePromocode
};
