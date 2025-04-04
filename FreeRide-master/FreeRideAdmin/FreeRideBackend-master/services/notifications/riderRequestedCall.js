export default function ({ riderFirstName, riderLastName }) {
  return {
    title: `${riderFirstName} ${riderLastName} Requested Call`,
    body: `${riderFirstName} ${riderLastName} is asking you to call them.`,
    badge: 1,
    sound: 'Message.wav'
  };
}
