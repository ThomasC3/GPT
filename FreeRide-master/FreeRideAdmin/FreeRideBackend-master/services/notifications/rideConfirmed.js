import { translator } from '../../utils/translation';

export default function (params_, t, language) {
  return {
    title: translator(t, 'rideConfirmedNotification.title', {}, language),
    body: translator(t, 'rideConfirmedNotification.body', {}, language),
    badge: 1,
    sound: 'CarHonk.wav'
  };
}
