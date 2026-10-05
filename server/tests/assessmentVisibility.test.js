const assert = require("assert");
const { getAssessmentVisibility, POST_DEADLINE_VISIBILITY_MS } = require("../utils/assessmentVisibility");

const deadline = new Date("2026-10-05T00:00:00.000Z");
const deadlineTime = deadline.getTime();

const active = getAssessmentVisibility(deadline, deadlineTime - 1);
assert.strictEqual(active.visible, true);
assert.strictEqual(active.expired, false);
assert.strictEqual(active.withinRequestWindow, false);

const expiredTwoHours = getAssessmentVisibility(deadline, deadlineTime + 2 * 60 * 60 * 1000);
assert.strictEqual(expiredTwoHours.visible, true);
assert.strictEqual(expiredTwoHours.expired, true);
assert.strictEqual(expiredTwoHours.withinRequestWindow, true);

const expiredTwentyThreeHours = getAssessmentVisibility(deadline, deadlineTime + 23 * 60 * 60 * 1000);
assert.strictEqual(expiredTwentyThreeHours.visible, true);
assert.strictEqual(expiredTwentyThreeHours.withinRequestWindow, true);

const expiredExactlyTwentyFourHours = getAssessmentVisibility(
  deadline,
  deadlineTime + POST_DEADLINE_VISIBILITY_MS
);
assert.strictEqual(expiredExactlyTwentyFourHours.visible, false);
assert.strictEqual(expiredExactlyTwentyFourHours.withinRequestWindow, false);

const expiredTwentyFiveHours = getAssessmentVisibility(
  deadline,
  deadlineTime + 25 * 60 * 60 * 1000
);
assert.strictEqual(expiredTwentyFiveHours.visible, false);
assert.strictEqual(expiredTwentyFiveHours.withinRequestWindow, false);

console.log("assessment visibility boundary tests passed");
