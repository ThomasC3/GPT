import { translator } from '../../utils/translation';

export default function (params_, t, language) {
  return {
    title: translator(t, 'noDriversAvailableNotification.title', {}, language),
    body: translator(t, 'noDriversAvailableNotification.body', {}, language),
    badge: 1,
    sound: 'RideCancelled.wav'
  };
}
