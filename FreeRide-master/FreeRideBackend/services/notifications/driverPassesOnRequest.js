import { translator } from '../../utils/translation';

export default function (params_, t, language) {
  return {
    title: translator(t, 'driverPassesOnRequestNotification.title', {}, language),
    body: translator(t, 'driverPassesOnRequestNotification.body', {}, language),
    badge: 1,
    sound: 'RideCancelled.wav'
  };
}
