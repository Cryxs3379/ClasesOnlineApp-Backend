const crypto = require('crypto');

/**
 * Genera un nombre único para la sala de Jitsi de una clase.
 * Formato: clase-{timestamp}-{randomHex}
 */
function generateJitsiRoom() {
  const timestamp = Date.now();
  const randomPart = crypto.randomBytes(4).toString('hex');
  return `clase-${timestamp}-${randomPart}`;
}

module.exports = generateJitsiRoom;
