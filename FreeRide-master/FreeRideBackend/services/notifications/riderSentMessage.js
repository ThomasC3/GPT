export default function ({ riderFirstName, riderLastName, message }) {
  return {
    title: `${riderFirstName} ${riderLastName} Sent a Message`,
    body: `${riderFirstName} ${riderLastName} sent: ${message}`,
    badge: 1,
    sound: 'Message.wav'
  };
}
