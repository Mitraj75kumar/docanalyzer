// Small helper for consistent success responses across controllers
const sendSuccess = (res, statusCode, message, data = null, meta = null) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });
};

module.exports = { sendSuccess };
