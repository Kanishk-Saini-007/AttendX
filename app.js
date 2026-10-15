/* UI and browser storage. See math.js for the small, testable calculation layer. */
"use strict";
const { summary, project, validCounts } = AttendanceMath;
const $ = (s) => document.querySelector(s),
  KEY = "attendx-v1";
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const pct = (n) => (n === null ? "No classes" : n.toFixed(1) + "%");
let state = {
  version: 1,
  demo: true,
  target: 75,
  weeks: 4,
  subjects: [
    {
      id: "sample-1",
      name: "Mathematics",
      attended: 27,
      total: 30,
      weekly: 4,
      skips: 1,
    },
    {
      id: "sample-2",
      name: "Physics",
      attended: 16,
      total: 21,
      weekly: 3,
      skips: 1,
    },
    {
      id: "sample-3",
      name: "Programming in C",
      attended: 13,
      total: 19,
      weekly: 4,
      skips: 0,
    },
  ],
};
let editing = null,
  undo = null,
  timer;
function validate(d) {
  if (
    !d ||
    d.version !== 1 ||
    typeof d.demo !== "boolean" ||
    !Number.isInteger(d.target) ||
    d.target < 1 ||
    d.target > 100 ||
    !Number.isInteger(d.weeks) ||
    d.weeks < 1 ||
    d.weeks > 16 ||
    !Array.isArray(d.subjects) ||
    d.subjects.length > 50
  )
    throw Error("Invalid AttendX backup.");
  const ids = new Set();
  const subjects = d.subjects.map((s) => {
    if (
      !s ||
      typeof s.id !== "string" ||
      !s.id ||
      s.id.length > 100 ||
      ids.has(s.id) ||
      typeof s.name !== "string" ||
      !s.name.trim() ||
      s.name.length > 60 ||
      !validCounts(s.attended, s.total) ||
      s.total > 100000 ||
      !Number.isInteger(s.weekly) ||
      s.weekly < 0 ||
      s.weekly > 30 ||
      !Number.isInteger(s.skips) ||
      s.skips < 0 ||
      s.skips > s.weekly
    )
      throw Error("Invalid subject in backup.");
    ids.add(s.id);
    return {
      id: s.id,
      name: s.name.trim(),
      attended: s.attended,
      total: s.total,
      weekly: s.weekly,
      skips: s.skips,
    };
  });
  return {
    version: 1,
    demo: d.demo,
    target: d.target,
    weeks: d.weeks,
    subjects,
  };
}
function warn(text) {
  $("#storage-warning").hidden = false;
  $("#storage-warning").textContent = text;
}
try {
  const d = localStorage.getItem(KEY);
  if (d) state = validate(JSON.parse(d));
} catch (e) {
  warn(
    "Saved data could not be read. Showing samples. Export backups to protect your records.",
  );
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    warn(
      "Browser storage is unavailable. Changes only last in this tab. Export before closing.",
    );
  }
}
function remember() {
  undo = JSON.stringify(state);
}
function toast(text, canUndo = false) {
  clearTimeout(timer);
  $("#toast").hidden = false;
  $("#toast").innerHTML =
    esc(text) + (canUndo ? '<button id="undo">Undo</button>' : "");
  if (canUndo)
    $("#undo").onclick = () => {
      if (!undo) return;
      state = JSON.parse(undo);
      undo = null;
      save();
      render();
      toast("Change undone.");
    };
  timer = setTimeout(() => ($("#toast").hidden = true), 10000);
}
function card(s) {
  const m = summary(s.attended, s.total, state.target),
    labels = {
      safe: "Safe",
      warning: "Tight buffer",
      danger: "Catch up",
      empty: "Not started",
    };
  const message = !s.total
    ? "Add your first class to start tracking."
    : m.recovery === Infinity
      ? "A 100% target cannot be recovered after a missed class."
      : m.recovery
        ? `<strong>Attend ${m.recovery} in a row</strong> to reach ${state.target}%.`
        : `<strong>${m.misses} ${m.misses === 1 ? "class" : "classes"} you can miss</strong> while staying at or above ${state.target}%.`;
  return `<article class="subject-card ${m.status}" data-id="${esc(s.id)}"><div class="card-top"><span class="subject-code">${esc(
    s.name
      .split(/\s+/)
      .map((x) => x[0])
      .slice(0, 2)
      .join("")
      .toUpperCase(),
  )}</span><span class="status">${labels[m.status]}</span></div><h3>${esc(s.name)}</h3><div class="attendance-num">${m.percent === null ? "–" : m.percent.toFixed(1)}<small>${s.total ? "%" : ""}</small></div><p class="class-count">${s.attended} attended / ${s.total} held</p><div class="meter" role="img" aria-label="${pct(m.percent)}; target ${state.target}%"><div class="meter-fill" style="width:${m.percent || 0}%"></div></div><p class="buffer">${message}</p><div class="card-controls"><button data-action="attend" aria-label="Mark attended for ${esc(s.name)}">✓ Attended</button><button data-action="miss" aria-label="Mark missed for ${esc(s.name)}">− Missed</button><button data-action="edit" aria-label="Edit ${esc(s.name)}">Edit ↗</button></div></article>`;
}
function render() {
  document.documentElement.style.setProperty("--threshold", state.target + "%");
  $("#hero-target").textContent = state.target;
  $("#required").value = state.target;
  $(".hero-visual").setAttribute(
    "aria-label",
    state.target + " percent attendance target",
  );
  $(".target").style.background =
    `conic-gradient(from 36deg,var(--lime) 0 ${state.target}%,#303a2b ${state.target}% 100%)`;
  $("#demo-banner").hidden = !state.demo;
  $("#stat-count").textContent = state.subjects.length;
  const ms = state.subjects.map((s) =>
    summary(s.attended, s.total, state.target),
  );
  $("#stat-safe").innerHTML =
    `${ms.filter((m) => m.eligible).length}<span class="unit"> / ${ms.length}</span>`;
  $("#stat-danger").textContent = ms.filter(
    (m) => m.status === "danger",
  ).length;
  $("#subject-grid").innerHTML =
    state.subjects.map(card).join("") ||
    '<div class="empty-state"><strong>A clean slate.</strong><p>Add your first subject above to get started.</p></div>';
  $("#subjects>.small-note").textContent =
    `Safe = 2+ misses left · Tight = 0–1 misses left · Catch up = below ${state.target}%. Exact fractions decide status, not rounded percentages.`;
  if (![...$("#weeks").options].some((o) => Number(o.value) === state.weeks))
    $("#weeks").add(new Option(state.weeks + " weeks", state.weeks));
  $("#weeks").value = state.weeks;
  renderPlan();
}
function renderPlan() {
  let below = 0;
  $("#plan-rows").innerHTML =
    state.subjects
      .map((s) => {
        const all = project(s.attended, s.total, s.weekly, 0, state.weeks),
          plan = project(s.attended, s.total, s.weekly, s.skips, state.weeks);
        function result(label, c) {
          const m = summary(c.attended, c.total, state.target);
          if (label === "Your plan" && m.status === "danger") below++;
          return `<div class="project-result ${m.status === "danger" ? "below" : ""}"><span>${label}</span><strong>${pct(m.percent)}${m.status === "danger" ? " · below" : ""}</strong><span class="mini-track"><span style="width:${m.percent || 0}%"></span></span><span>${c.attended}/${c.total} classes</span></div>`;
        }
        return `<div class="plan-row" data-id="${esc(s.id)}"><div class="plan-row-title"><strong>${esc(s.name)}</strong><span>AFTER ${state.weeks} ${state.weeks === 1 ? "WEEK" : "WEEKS"}</span></div><div class="plan-inputs"><label>Classes/week <input data-field="weekly" aria-label="Weekly classes for ${esc(s.name)}" type="number" min="0" max="30" step="1" value="${s.weekly}"></label><label>Skip/week <input data-field="skips" aria-label="Weekly skips for ${esc(s.name)}" type="number" min="0" max="${s.weekly}" step="1" value="${s.skips}"></label></div><div class="comparison">${result("Attend all", all)}${result("Your plan", plan)}</div></div>`;
      })
      .join("") || '<p class="muted">Add subjects to try a scenario.</p>';
  $("#plan-summary").innerHTML = !state.subjects.length
    ? "Your future starts with your first subject."
    : below
      ? `<strong class="bad">${below} ${below === 1 ? "subject" : "subjects"} below ${state.target}%</strong> at the end of this plan. Adjust your skips before making it real.`
      : `<strong>No subject below ${state.target}%</strong> at the end of this plan. This does not guarantee staying above the target every week in between.`;
}
function openForm(id = null) {
  editing = id;
  const s = state.subjects.find((x) => x.id === id);
  $("#subject-form").reset();
  $("#form-error").textContent = "";
  $("#dialog-title").textContent = s ? "Edit subject" : "New subject";
  $("#subject-name").value = s ? s.name : "";
  $("#attended").value = s ? s.attended : 0;
  $("#total").value = s ? s.total : 0;
  $("#weekly").value = s ? s.weekly : 3;
  $(".delete-subject")?.remove();
  if (s) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "delete-subject";
    b.textContent = "Delete subject";
    b.onclick = () => {
      if (!confirm("Delete " + s.name + "?")) return;
      remember();
      state.subjects = state.subjects.filter((x) => x.id !== id);
      save();
      render();
      $("#subject-dialog").close();
      toast("Subject deleted.", true);
    };
    $("#subject-form").append(b);
  }
  $("#subject-dialog").showModal();
  $("#subject-name").focus();
}
$("#add-subject").onclick = () =>
  state.subjects.length >= 50
    ? toast("Maximum 50 subjects. Export before removing any.")
    : openForm();
$("#close-dialog").onclick = () => $("#subject-dialog").close();
$("#subject-form").onsubmit = (e) => {
  e.preventDefault();
  const name = $("#subject-name").value.trim(),
    attended = Number($("#attended").value),
    total = Number($("#total").value),
    weekly = Number($("#weekly").value);
  if (
    !name ||
    !validCounts(attended, total) ||
    total > 100000 ||
    !Number.isInteger(weekly) ||
    weekly < 0 ||
    weekly > 30
  ) {
    $("#form-error").textContent =
      "Use whole numbers. Attended cannot exceed total. Counts must be 0–100,000; weekly classes 0–30.";
    return;
  }
  remember();
  const old = state.subjects.find((s) => s.id === editing),
    s = {
      id: old
        ? old.id
        : "s-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      name,
      attended,
      total,
      weekly,
      skips: old ? Math.min(old.skips, weekly) : 0,
    };
  if (old) state.subjects[state.subjects.indexOf(old)] = s;
  else state.subjects.push(s);
  save();
  render();
  $("#subject-dialog").close();
  toast("Subject saved.", true);
};
$("#subject-grid").onclick = (e) => {
  const b = e.target.closest("button[data-action]");
  if (!b) return;
  const s = state.subjects.find(
    (x) => x.id === b.closest("[data-id]").dataset.id,
  );
  if (!s) return;
  if (b.dataset.action === "edit") return openForm(s.id);
  if (s.total >= 100000)
    return toast("Class limit reached. Edit your counts to continue.");
  remember();
  s.total++;
  if (b.dataset.action === "attend") s.attended++;
  save();
  render();
  toast(s.name + ": class marked.", true);
};
$("#required").onchange = () => {
  const n = Number($("#required").value);
  if (
    !$("#required").value.trim() ||
    !Number.isInteger(n) ||
    n < 1 ||
    n > 100
  ) {
    toast("Enter a target from 1 to 100 in whole percent.");
    $("#required").value = state.target;
    return;
  }
  state.target = n;
  save();
  render();
};
$("#weeks").onchange = () => {
  state.weeks = Number($("#weeks").value);
  save();
  renderPlan();
};
$("#plan-rows").onchange = (e) => {
  const input = e.target.closest("input[data-field]");
  if (!input) return;
  const s = state.subjects.find(
      (x) => x.id === input.closest("[data-id]").dataset.id,
    ),
    n = Number(input.value),
    max = input.dataset.field === "weekly" ? 30 : s.weekly;
  if (!input.value.trim() || !Number.isInteger(n) || n < 0 || n > max) {
    toast("Enter a whole number from 0 to " + max + ".");
    renderPlan();
    return;
  }
  s[input.dataset.field] = n;
  s.skips = Math.min(s.skips, s.weekly);
  save();
  renderPlan();
};
$("#start-fresh").onclick = () => {
  if (
    !confirm(
      "Remove all sample subjects, including any changes to them, and start fresh?",
    )
  )
    return;
  remember();
  state.subjects = [];
  state.demo = false;
  save();
  render();
  toast("Ready for your subjects.", true);
};
$("#export").onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "attendx-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Backup exported. Keep it somewhere safe.");
};
$("#import").onclick = () => $("#import-file").click();
$("#import-file").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    if (f.size > 100000) throw Error("Backup too large. Maximum 100 KB.");
    const d = validate(JSON.parse(await f.text()));
    if (
      !confirm(
        "Replace current records with " +
          d.subjects.length +
          " subjects from this backup?",
      )
    )
      return;
    remember();
    state = d;
    save();
    render();
    toast("Backup imported.", true);
  } catch (err) {
    toast(
      err instanceof SyntaxError ? "This file is not valid JSON." : err.message,
    );
  } finally {
    e.target.value = "";
  }
};
render();
