const { errorResponse } = require("../utils/response");

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  return errorResponse(res, {
    message: err.message || "Internal Server Error",
    status: err.status || 500,
    data: null
  });
};

module.exports = errorHandler;
