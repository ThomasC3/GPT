import Joi from '@hapi/joi';
import { BadRequestError } from '../errors';

/**
 * Validates a model or a value
 * @param {Object} rules validation rules
 * @param {Object} toValidate value to validate
 * @param {Function(err:Error)} next error callback
 * @returns {Boolean} Returns null if validation failed, value otherwise
 */
const validate = (schema, toValidate, next) => {
  const { error, value } = schema.validate(toValidate);

  if (error) {
    const errMsg = error.details.map(detail => detail.message).join('. ');
    if (next) {
      return next(new BadRequestError(errMsg));
    }
    throw new BadRequestError(errMsg);
  }

  return value;
};

const partialValidate = (schema, toValidate) => {
  const { error, value } = schema.validate(toValidate, { allowUnknown: true });

  if (error) {
    const errMsg = error.details.map(detail => detail.message).join('. ');
    throw new BadRequestError(errMsg);
  }

  return value;
};

const schemaValidate = (schema, toValidate, next) => {
  const { error, value } = schema.validate(toValidate);

  if (error) {
    const errMsg = error.details.map(detail => detail.message).join('. ');
    if (next) {
      return next(new BadRequestError(errMsg));
    }
    throw new BadRequestError(errMsg);
  }

  return value;
};

export default {
  validate,
  partialValidate,
  schemaValidate,
  rules: Joi
};
