const { createLogger, format, transports } = require("winston");

const { combine, timestamp, printf, errors, colorize } = format;

const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}] ${stack || message}`;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(errors({ stack: true }), timestamp(), colorize({ all: true }), consoleFormat),
  transports: [new transports.Console()]
});

const requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number((process.hrtime.bigint() - start) / BigInt(1e6));
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
  });
  next();
};

module.exports = {
  logger,
  requestLogger
};
