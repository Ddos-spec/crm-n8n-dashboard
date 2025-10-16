// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || 'Terjadi kesalahan pada server';
  const details = err.details || undefined;

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(status).json({
    status: 'error',
    message,
    details
  });
};

module.exports = errorHandler;
