import { translator } from './translation';

export default function responseHandler(
  params, res, defaultMessage, t = null, translationKey = null, translationParams = {}
) {
  if (params && !defaultMessage && !translationKey) {
    // Arrays and direct non-message responses
    return res.status(200).json(params);
  }
  let message = translator(t, translationKey, translationParams);

  message = message || defaultMessage || params.message || params.successMessage;

  return res.status(200).json({
    ...params,
    message
  });
}
