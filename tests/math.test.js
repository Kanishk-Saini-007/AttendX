const { test } = require("node:test");
const assert = require("node:assert/strict");
const { summary, project, validCounts } = require("../math");
test("known 75% and 80% boundaries", () => {
  assert.equal(summary(9, 10, 80).misses, 1);
  assert.equal(summary(12, 15, 80).misses, 0);
  assert.equal(summary(15, 15, 80).misses, 3);
  assert.equal(summary(14, 19, 80).recovery, 6);
  assert.equal(summary(13, 19, 75).recovery, 5);
  assert.equal(summary(0, 1, 75).recovery, 3);
  assert.equal(summary(0, 0).percent, null);
  assert.equal(summary(0, 0).eligible, false);
  assert.equal(summary(79, 100, 100).recovery, Infinity);
  assert.equal(summary(100, 100, 100).misses, 0);
});
test("rounding never decides status", () => {
  assert.equal(summary(7999, 10000, 80).percent.toFixed(1), "80.0");
  assert.equal(summary(7999, 10000, 80).eligible, false);
});
test("exhaustive bounds for every integer target and counts up to 100", () => {
  for (let p = 1; p <= 100; p++)
    for (let t = 1; t <= 100; t++)
      for (let a = 0; a <= t; a++) {
        const m = summary(a, t, p);
        if (m.eligible) {
          assert.ok(100 * a >= p * (t + m.misses));
          assert.ok(100 * a < p * (t + m.misses + 1));
        } else if (p < 100) {
          assert.ok(100 * (a + m.recovery) >= p * (t + m.recovery));
          assert.ok(100 * (a + m.recovery - 1) < p * (t + m.recovery - 1));
        } else assert.equal(m.recovery, Infinity);
      }
});
test("projection counts", () => {
  assert.deepEqual(project(27, 30, 4, 1, 4), { attended: 39, total: 46 });
  assert.deepEqual(project(13, 19, 4, 0, 4), { attended: 29, total: 35 });
  assert.deepEqual(project(8, 10, 0, 0, 4), { attended: 8, total: 10 });
  assert.deepEqual(project(8, 10, 3, 3, 2), { attended: 8, total: 16 });
});
test("validation", () => {
  for (const [a, t] of [
    [-1, 2],
    [3, 2],
    [1.5, 2],
    [NaN, 2],
    [1, Infinity],
  ]) {
    assert.equal(validCounts(a, t), false);
    assert.throws(() => summary(a, t));
  }
  assert.throws(() => summary(8, 10, 0));
  assert.throws(() => summary(8, 10, 101));
  assert.throws(() => summary(8, 10, 75.5));
  assert.throws(() => project(8, 10, 3, 4, 2));
  assert.throws(() => project(8, 10, 3, 0, 0));
});
