
exports.getEpochTime = () => {
  return Math.floor(Date.now() / 1000);
};

exports.getJwtPayload = (token) => {
  const payloadB64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(payloadB64, 'base64').toString('ascii'));
};
