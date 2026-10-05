const dashboardData = {
  "24h": {
    metrics: [
      { label: "Active workflows", value: "12", trend: "+2", note: "of 14 total" },
      { label: "Executions", value: "184", trend: "+12%", note: "vs previous period" },
      { label: "Success rate", value: "98.7%", trend: "+0.4%", note: "2 failed executions" },
      { label: "Time saved", value: "11.4h", trend: "+1.8h", note: "estimated" },
    ],
    activity: [20, 32, 24, 41, 36, 52, 46, 61, 58, 72, 56, 65, 77, 68, 83, 74, 62, 79, 91, 84, 72, 88, 68, 46],
  },
  "7d": {
    metrics: [
      { label: "Active workflows", value: "12", trend: "+1", note: "of 14 total" },
      { label: "Executions", value: "1,248", trend: "+18%", note: "vs previous period" },
      { label: "Success rate", value: "98.3%", trend: "+0.2%", note: "21 failed executions" },
      { label: "Time saved", value: "77h", trend: "+9h", note: "estimated" },
    ],
    activity: [32, 44, 38, 62, 54, 78, 66, 72, 84, 76, 88, 71, 92, 83, 76, 88, 95, 79, 86, 74, 91, 82, 69, 77],
  },
  "30d": {
    metrics: [
      { label: "Active workflows", value: "12", trend: "+4", note: "of 14 total" },
      { label: "Executions", value: "5,604", trend: "+26%", note: "vs previous period" },
      { label: "Success rate", value: "97.9%", trend: "+0.6%", note: "118 failed executions" },
      { label: "Time saved", value: "346h", trend: "+54h", note: "estimated" },
    ],
    activity: [28, 42, 36, 48, 55, 46, 63, 58, 71, 66, 78, 62, 84, 76, 88, 81, 74, 91, 85, 79, 94, 87, 75, 82],
  },
};

const workflows = [
  { name: "Daily operations brief", group: "CONTROL", status: "Active", lastRun: "3 min ago", runs: 1, success: 100 },
  { name: "Lead intake & qualification", group: "SALES", status: "Active", lastRun: "8 min ago", runs: 31, success: 100 },
  { name: "Customer request triage", group: "SUPPORT", status: "Active", lastRun: "14 min ago", runs: 24, success: 96.1 },
  { name: "Content research pipeline", group: "MARKETING", status: "Active", lastRun: "32 min ago", runs: 8, success: 100 },
  { name: "Repository activity watch", group: "PRODUCT", status: "Warning", lastRun: "1 h ago", runs: 42, success: 95.2 },
  { name: "Weekly performance report", group: "CONTROL", status: "Active", lastRun: "2 d ago", runs: 1, success: 100 },
];

const attention = [
  {
    id: "decision-1042",
    title: "Content release proposal",
    detail: "Waiting for approval · 6 minutes ago",
    context: "The agent prepared the next release package and recommends publishing it now.",
    status: "pending",
  },
  {
    id: "decision-1041",
    title: "Customer request triage",
    detail: "Ambiguous priority · 14 minutes ago",
    context: "The agent needs a priority rule before assigning the request to a work queue.",
    status: "pending",
  },
];

const metricsElement = document.querySelector("#metrics");
const chartElement = document.querySelector("#activityChart");
const workflowRows = document.querySelector("#workflowRows");
const searchInput = document.querySelector("#workflowSearch");
const toast = document.querySelector("#toast");
const refreshButton = document.querySelector("#refreshButton");

function renderMetrics(period) {
  metricsElement.innerHTML = dashboardData[period].metrics
    .map(
      (metric) => `
        <article class="metric-card">
          <div class="metric-top">
            <span class="metric-label">${metric.label}</span>
            <span class="metric-trend">${metric.trend}</span>
          </div>
          <strong class="metric-value">${metric.value}</strong>
          <p class="metric-note">${metric.note}</p>
        </article>
      `,
    )
    .join("");
}

function renderChart(period) {
  chartElement.innerHTML = dashboardData[period].activity
    .map(
      (value, index) => `
        <div class="bar-wrap" title="${value} executions">
          <div class="bar" style="height:${value}%; animation-delay:${index * 15}ms"></div>
        </div>
      `,
    )
    .join("");
}

function renderWorkflows(filter = "") {
  const normalizedFilter = filter.trim().toLowerCase();
  const filtered = workflows.filter((workflow) =>
    `${workflow.name} ${workflow.group} ${workflow.status}`.toLowerCase().includes(normalizedFilter),
  );

  workflowRows.innerHTML = filtered.length
    ? filtered
        .map((workflow) => {
          const warningClass = workflow.status === "Warning" ? "warning" : "";
          const initials = workflow.group.slice(0, 2);
          return `
            <div class="workflow-row" role="row">
              <span class="workflow-name" role="cell">
                <span class="workflow-glyph">${initials}</span>
                <span>
                  <strong>${workflow.name}</strong>
                  <small>${workflow.group}</small>
                </span>
              </span>
              <span class="status ${warningClass}" role="cell"><i></i>${workflow.status}</span>
              <span role="cell">${workflow.lastRun}</span>
              <span role="cell">${workflow.runs}</span>
              <span class="success-value ${warningClass}" role="cell">${workflow.success}%</span>
              <button class="workflow-open" type="button" aria-label="Open ${workflow.name}" data-workflow="${workflow.name}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>
          `;
        })
        .join("")
    : `<div class="workflow-row"><span>No workflows match this filter.</span></div>`;
}

function renderAttention() {
  const pending = attention.filter((item) => item.status === "pending");
  document.querySelector("#attentionCount").textContent = pending.length;
  document.querySelector("#attentionList").innerHTML = pending.length
    ? pending
    .map(
      (item) => `
        <div class="attention-item" data-decision-id="${item.id}">
          <span class="attention-icon">!</span>
          <div class="attention-body">
            <strong>${item.title}</strong>
            <p>${item.detail}</p>
            <p class="attention-context">${item.context}</p>
            <div class="decision-actions">
              <button class="decision-button approve" type="button" data-decision="approve">Approve</button>
              <button class="decision-button reject" type="button" data-decision="reject">Reject</button>
              <button class="decision-button" type="button" data-decision="clarify">Clarify</button>
            </div>
            <form class="clarification-form" hidden>
              <textarea name="prompt" aria-label="Guidance for the agent" placeholder="Tell the agent how to proceed…"></textarea>
              <button class="clarification-submit" type="submit">Send guidance</button>
            </form>
          </div>
        </div>
      `,
    )
    .join("")
    : `<div class="attention-item"><div class="attention-body"><strong>Inbox clear</strong><p>No agent is waiting for human input.</p></div></div>`;
}

async function submitDecision(id, decision, prompt = "") {
  // Demo transport. The production adapter will POST the same payload to
  // /api/decisions/:id without exposing n8n credentials to the browser.
  await new Promise((resolve) => window.setTimeout(resolve, 280));
  return { id, decision, prompt, accepted: true };
}

let toastTimer;
function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3200);
}

document.querySelectorAll(".period").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".period").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderMetrics(button.dataset.period);
    renderChart(button.dataset.period);
  });
});

searchInput.addEventListener("input", (event) => renderWorkflows(event.target.value));

refreshButton.addEventListener("click", () => {
  refreshButton.classList.add("refreshing");
  window.setTimeout(() => {
    refreshButton.classList.remove("refreshing");
    document.querySelector("#lastUpdated").textContent = "Updated just now";
    showToast("Dashboard refreshed");
  }, 650);
});

document.querySelector("#openN8nButton").addEventListener("click", () => {
  showToast("Connect the server-side n8n URL to enable this shortcut.");
});

workflowRows.addEventListener("click", (event) => {
  const button = event.target.closest("[data-workflow]");
  if (button) showToast(`${button.dataset.workflow} · open in n8n after API connection`);
});

document.querySelector("#attentionList").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-decision]");
  if (!button) return;

  const itemElement = button.closest("[data-decision-id]");
  const id = itemElement.dataset.decisionId;
  const decision = button.dataset.decision;

  if (decision === "clarify") {
    const form = itemElement.querySelector(".clarification-form");
    form.hidden = !form.hidden;
    if (!form.hidden) form.querySelector("textarea").focus();
    return;
  }

  button.disabled = true;
  await submitDecision(id, decision);
  const item = attention.find((entry) => entry.id === id);
  item.status = decision;
  renderAttention();
  showToast(decision === "approve" ? "Agent approved to continue" : "Agent instructed to stop");
});

document.querySelector("#attentionList").addEventListener("submit", async (event) => {
  if (!event.target.matches(".clarification-form")) return;
  event.preventDefault();

  const itemElement = event.target.closest("[data-decision-id]");
  const id = itemElement.dataset.decisionId;
  const prompt = new FormData(event.target).get("prompt").trim();

  if (!prompt) {
    showToast("Write a short instruction for the agent first");
    return;
  }

  const submitButton = event.target.querySelector("button[type='submit']");
  submitButton.disabled = true;
  await submitDecision(id, "clarify", prompt);
  const item = attention.find((entry) => entry.id === id);
  item.status = "clarified";
  renderAttention();
  showToast("Guidance sent to the agent");
});

renderMetrics("24h");
renderChart("24h");
renderWorkflows();
renderAttention();
