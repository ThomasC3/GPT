export const generatePromocodeString = (size = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let promocodeString = '';
  for (let i = 0; i < size; i += 1) {
    promocodeString += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return promocodeString;
};

export default {
  generatePromocodeString
};
