const POST_DEADLINE_VISIBILITY_MS = 24 * 60 * 60 * 1000;

const getAssessmentVisibility = (endDate, now = Date.now()) => {
  if (!endDate) {
    return { expired: false, visible: true, withinRequestWindow: false };
  }

  const deadline = new Date(endDate).getTime();
  if (!Number.isFinite(deadline)) {
    return { expired: false, visible: true, withinRequestWindow: false };
  }

  const expired = deadline <= now;
  const visibilityEndsAt = deadline + POST_DEADLINE_VISIBILITY_MS;

  return {
    expired,
    visible: now < visibilityEndsAt,
    withinRequestWindow: expired && now < visibilityEndsAt,
    visibilityEndsAt: new Date(visibilityEndsAt),
  };
};

module.exports = { POST_DEADLINE_VISIBILITY_MS, getAssessmentVisibility };
