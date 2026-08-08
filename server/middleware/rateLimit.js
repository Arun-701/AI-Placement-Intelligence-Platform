const rateLimit = require("express-rate-limit");

const buildLimiter = ({ windowMs, max, message }) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message,
      data: null
    });
  }
});

const authLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 80,
  message: "Too many authentication requests, please try again later."
});

const aiLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: "Too many AI requests, please try again later."
});

const adminLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: "Too many admin requests, please try again later."
});

const generalLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: "Too many requests, please try again later."
});

module.exports = {
  authLimiter,
  aiLimiter,
  adminLimiter,
  generalLimiter
};
