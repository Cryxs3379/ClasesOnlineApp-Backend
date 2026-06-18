function getAllowedOrigins() {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_WWW,
    process.env.FRONTEND_URL_2,
    process.env.FRONTEND_URL_2_WWW,
  ].filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push(
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173'
    );
  }

  return allowedOrigins;
}

function getCorsOptions() {
  const allowedOrigins = getAllowedOrigins();

  return {
    origin(origin, callback) {
      // Permite peticiones sin origin (curl, Postman, apps móviles)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS'));
      }
    },
    credentials: true,
  };
}

module.exports = getCorsOptions;
module.exports.getAllowedOrigins = getAllowedOrigins;
