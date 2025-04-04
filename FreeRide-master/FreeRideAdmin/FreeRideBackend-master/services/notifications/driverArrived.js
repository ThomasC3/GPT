import { translator } from '../../utils/translation';

export default function ({
  driverDisplayName, timeString, outOfTime
}, t, language) {
  let bodyString = translator(t, 'driverArrivedNotification.body', { driverDisplayName }, language);
  if (outOfTime) {
    bodyString = translator(t, 'driverArrivedNotification.bodyTimeEnd', { driverDisplayName, timeString }, language);
  } else if (timeString) {
    bodyString = translator(t, 'driverArrivedNotification.bodyWithTime', { driverDisplayName, timeString }, language);
  }
  return {
    title: translator(t, 'driverArrivedNotification.title', {}, language),
    body: bodyString,
    badge: 1,
    sound: 'CarHonk.wav'
  };
}
