/* Integer cross-multiplication avoids rounding errors at the threshold. */
(function (root) {
  "use strict";
  const validCounts = (a, t) =>
    Number.isSafeInteger(a) &&
    Number.isSafeInteger(t) &&
    a >= 0 &&
    t >= a &&
    t <= 1000000;
  function summary(a, t, p = 75) {
    if (!validCounts(a, t) || !Number.isInteger(p) || p < 1 || p > 100)
      throw Error("Invalid counts or target");
    const eligible = t > 0 && 100 * a >= p * t;
    const misses = Math.max(0, Math.floor((100 * a - p * t) / p));
    const recovery =
      100 * a >= p * t
        ? 0
        : p === 100
          ? Infinity
          : Math.ceil((p * t - 100 * a) / (100 - p));
    return {
      percent: t ? (a / t) * 100 : null,
      eligible,
      misses,
      recovery,
      status: !t
        ? "empty"
        : !eligible
          ? "danger"
          : misses < 2
            ? "warning"
            : "safe",
    };
  }
  function project(a, t, weekly, skips, weeks) {
    if (
      !validCounts(a, t) ||
      ![weekly, skips, weeks].every(Number.isInteger) ||
      weekly < 0 ||
      weekly > 30 ||
      skips < 0 ||
      skips > weekly ||
      weeks < 1 ||
      weeks > 16
    )
      throw Error("Invalid projection");
    return {
      attended: a + (weekly - skips) * weeks,
      total: t + weekly * weeks,
    };
  }
  const api = { validCounts, summary, project };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AttendanceMath = api;
})(globalThis);
