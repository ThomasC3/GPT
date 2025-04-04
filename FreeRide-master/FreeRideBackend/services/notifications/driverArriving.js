import { translator } from '../../utils/translation';

export default function ({ driverDisplayName }, t, language) {
  return {
    title: translator(t, 'driverArrivingNotification.title', {}, language),
    body: translator(t, 'driverArrivingNotification.body', { driverDisplayName }, language),
    badge: 1,
    sound: 'CarHonk.wav'
  };
}
