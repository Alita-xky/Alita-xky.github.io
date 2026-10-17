// Today, tomorrow and the day after, from github.com/Alita-xky/schedule.
// Events are edited at https://alitaxky.icu/schedule/ ; this widget only reads them.

export const command = "bash schedule.widget/fetch.sh";
export const refreshFrequency = 5 * 60 * 1000;

const EDIT_URL = "https://alitaxky.icu/schedule/";
const COLORS = { ink: "#1c3140", blue: "#2f7ea8", coral: "#c4573a", green: "#3d7a5a", amber: "#c28f2c", violet: "#6b5a9e" };
const LABELS = ["Today", "Tomorrow", "Day after"];
const MAX_PER_DAY = 7;

export const className = `
  top: 46px;
  left: 30px;
  font-family: -apple-system, "PingFang SC", "Helvetica Neue", sans-serif;
  color: #1c3140;
  -webkit-font-smoothing: antialiased;

  --panel: rgba(239, 247, 250, 0.84);
  --line: rgba(28, 49, 64, 0.14);
  --muted: #4d6573;
  --faint: #7f98a4;

  @media (prefers-color-scheme: dark) {
    color: #e3eef3;
    --panel: rgba(20, 32, 41, 0.72);
    --line: rgba(227, 238, 243, 0.14);
    --muted: #a9bec8;
    --faint: #7f98a4;
  }

  .panel {
    width: 660px;
    padding: 16px 20px 12px;
    border-radius: 14px;
    background: var(--panel);
    -webkit-backdrop-filter: blur(22px) saturate(1.3);
    backdrop-filter: blur(22px) saturate(1.3);
    box-shadow: 0 10px 34px rgba(10, 25, 35, 0.18);
  }
  .cols { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 22px; }
  .label {
    margin: 0;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .date {
    margin: 1px 0 8px;
    font-family: ui-serif, "New York", Georgia, serif;
    font-size: 21px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  ul { margin: 0; padding: 0; list-style: none; }
  li {
    position: relative;
    padding: 6px 0 6px 10px;
    border-top: 1px solid var(--line);
    font-size: 13px;
    line-height: 1.35;
  }
  li::before {
    content: "";
    position: absolute;
    left: 0;
    top: 8px;
    bottom: 8px;
    width: 3px;
    border-radius: 2px;
    background: var(--c);
  }
  li.empty::before, li.more::before { display: none; }
  li.empty, li.more { padding-left: 0; color: var(--faint); }
  .time {
    display: block;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .title { font-weight: 500; overflow-wrap: anywhere; }
  .foot {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    font-size: 10.5px;
    color: var(--faint);
  }
  .foot a { color: inherit; text-decoration: none; }
  .foot a:hover { text-decoration: underline; }
  .msg { margin: 0; font-size: 13px; line-height: 1.45; }
  .msg b { font-weight: 600; }
  code { font-family: ui-monospace, Menlo, monospace; font-size: 11.5px; white-space: nowrap; }
`;

// Same rules as the web page: dates are local "YYYY-MM-DD" keys.
const pad = (n) => String(n).padStart(2, "0");
const keyOf = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const dayNum = (k) => {
  const p = k.split("-").map(Number);
  return Date.UTC(p[0], p[1] - 1, p[2]) / 864e5;
};

function occursOn(ev, k) {
  if (k < ev.date || (ev.until && k > ev.until)) return false;
  if (ev.skip && ev.skip.indexOf(k) !== -1) return false;
  const diff = dayNum(k) - dayNum(ev.date);
  if (ev.repeat === "daily") return true;
  if (ev.repeat === "weekly") return diff % (7 * (ev.every || 1)) === 0;
  return diff === 0;
}

const byTime = (a, b) => (a.start || "").localeCompare(b.start || "") || a.title.localeCompare(b.title);
const timeText = (ev) => (ev.start ? (ev.end ? ev.start + "–" + ev.end : ev.start) : "All day");

function parse(output) {
  try {
    return JSON.parse(output);
  } catch (e) {
    return null;
  }
}

const Msg = ({ children }) => (
  <div className="panel">
    <p className="msg">{children}</p>
  </div>
);

const SETUP = "bash ~/Alita-xky.github.io/schedule/desktop/install.sh --token";

export const render = ({ output }) => {
  const res = parse(output);
  if (!res) return <Msg>Schedule widget: couldn't read <code>fetch.sh</code> output.</Msg>;

  const status = res.status;
  if (status === "notoken") return <Msg><b>Schedule:</b> add your GitHub token with <code>{SETUP}</code></Msg>;
  if (!res.data && (status === "401" || status === "403")) return <Msg><b>Schedule:</b> GitHub rejected the token. Run <code>{SETUP}</code></Msg>;
  if (!res.data && status === "norepo") return <Msg><b>Schedule:</b> the token can't see <code>Alita-xky/schedule</code>.</Msg>;
  if (!res.data) return <Msg><b>Schedule:</b> can't reach GitHub yet. Retrying every 5 minutes.</Msg>;

  const events = Array.isArray(res.data.events) ? res.data.events.filter((e) => e && e.title && e.date) : [];
  const now = new Date();
  const days = LABELS.map((label, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const k = keyOf(d);
    return {
      label,
      date: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      events: events.filter((ev) => occursOn(ev, k)).sort(byTime),
    };
  });

  const fresh = status === "200";
  const when = res.fetchedAt
    ? new Date(res.fetchedAt * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
    : "never";
  const problem = status === "401" || status === "403" ? "token rejected" : status === "norepo" ? "repo not visible" : "offline";

  return (
    <div className="panel">
      <div className="cols">
        {days.map((day) => (
          <div key={day.label}>
            <p className="label">{day.label}</p>
            <p className="date">{day.date}</p>
            <ul>
              {day.events.length === 0 && <li className="empty">Nothing planned.</li>}
              {day.events.slice(0, MAX_PER_DAY).map((ev) => (
                <li key={ev.id} style={{ "--c": COLORS[ev.color] || COLORS.ink }}>
                  <span className="time">{timeText(ev)}</span>
                  <span className="title">{ev.title}</span>
                </li>
              ))}
              {day.events.length > MAX_PER_DAY && <li className="more">+{day.events.length - MAX_PER_DAY} more</li>}
            </ul>
          </div>
        ))}
      </div>
      <div className="foot">
        <span>{fresh ? "Synced " + when : problem + " · last synced " + when}</span>
        <a href={EDIT_URL}>Edit schedule ↗</a>
      </div>
    </div>
  );
};
