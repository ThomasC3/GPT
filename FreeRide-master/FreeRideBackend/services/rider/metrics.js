import { FluxTag } from '../../models';
import { translator } from '../../utils/translation';
import { isNumber } from '../../utils/math';

export const processFluxService = (historicReading, location, settings, { t, lng = 'en' }) => {
  const fluxTagData = isNumber(historicReading?.measurement)
    ? FluxTag[String(historicReading.measurement)] : FluxTag.default;

  const hideFlux = settings?.hideFlux || location?.hideFlux;

  return {
    ...fluxTagData,
    message: translator(t, fluxTagData.translationKey, {}, lng),
    display: !hideFlux
  };
};
export default {
  processFluxService
};
