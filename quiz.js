// Every question below is from the session slides — nothing outside them.
window.__quizStep = 'main-start';
const QUESTIONS = [
  { q: "What does HTML stand for?",
    o: ["HyperText Markup Language", "HighText Machine Language", "Hyperlink Text Mode Language", "Home Tool Markup Language"], a: 0 },
  { q: "Which tag makes the biggest heading?",
    o: ["<h6>", "<heading>", "<h1>", "<head>"], a: 2 },
  { q: "How many <h1> tags should a page have?",
    o: ["As many as you want", "One — it's the page's title", "Exactly six", "None, h1 is outdated"], a: 1 },
  { q: "Which is the correct way to make a link?",
    o: ['<link href="url">text</link>', '<a href="url">text</a>', '<a link="url">text</a>', '<href url="url">text</href>'], a: 1 },
  { q: "Which attribute gives the image file in an <img> tag?",
    o: ["href", "link", "src", "path"], a: 2 },
  { q: "Why do we write alt text on images?",
    o: ["It makes images load faster", "It shows if the image fails, and screen readers read it aloud", "It is required for the image to display", "It adds a caption under the image"], a: 1 },
  { q: "Which tag makes a bulleted (unordered) list?",
    o: ["<ol>", "<li>", "<ul>", "<list>"], a: 2 },
  { q: "Which input type shows a calendar picker?",
    o: ['type="calendar"', 'type="date"', 'type="day"', 'type="picker"'], a: 1 },
  { q: "Radio buttons only work as a group when they share the same…",
    o: ["id", "value", "name", "class"], a: 2 },
  { q: "Which tag defines a row in a table?",
    o: ["<td>", "<th>", "<tr>", "<table-row>"], a: 2 },
];

const $ = id => document.getElementById(id);
const state = { who: null, order: [], idx: 0, score: 0, t0: 0, myId: null, timer: null };

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  $(id).classList.add('on');
  window.scrollTo(0, 0);
}
function fmtTime(sec) {
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}
function esc(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---- entry ----
$('btn-start').onclick = () => {
  const name = $('f-name').value.trim();
  const branch = $('f-branch').value;
  const year = $('f-year').value;
  const err = $('entry-err');
  if (!name) { err.textContent = 'Please enter your name.'; return; }
  if (!branch) { err.textContent = 'Please pick your branch.'; return; }
  if (!year) { err.textContent = 'Please pick your year.'; return; }
  err.textContent = '';
  state.who = { name, branch, year };
  startQuiz();
};

// ---- quiz ----
function startQuiz() {
  state.order = shuffle(QUESTIONS.map((q, i) => i));
  state.idx = 0; state.score = 0; state.myId = null;
  state.t0 = Date.now();
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    $('qtimer').textContent = fmtTime(Math.floor((Date.now() - state.t0) / 1000));
  }, 1000);
  renderQ();
  show('s-quiz');
}

function renderQ() {
  const qi = state.order[state.idx];
  const Q = QUESTIONS[qi];
  $('pbar').style.width = (state.idx / QUESTIONS.length * 100) + '%';
  $('qnum').textContent = `Question ${state.idx + 1} of ${QUESTIONS.length}`;
  $('qtext').textContent = Q.q;
  const box = $('opts');
  box.innerHTML = '';
  const order = shuffle(Q.o.map((text, i) => ({ text, correct: i === Q.a })));
  order.forEach(({ text, correct }) => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.textContent = text;
    b.onclick = () => {
      if (b.classList.contains('picked')) return;
      b.classList.add('picked');
      if (correct) state.score++;
      setTimeout(() => {
        state.idx++;
        if (state.idx < QUESTIONS.length) renderQ();
        else finishQuiz();
      }, 320);
    };
    box.appendChild(b);
  });
}

async function finishQuiz() {
  clearInterval(state.timer);
  $('pbar').style.width = '100%';
  const durationSec = Math.floor((Date.now() - state.t0) / 1000);
  $('r-score').textContent = state.score;
  $('r-time').textContent = `Finished in ${fmtTime(durationSec)}`;
  $('r-rank').textContent = 'Saving your score…';
  show('s-result');
  try {
    const r = await fetch('/api/quiz-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...state.who, score: state.score, durationSec }),
    });
    const d = await r.json();
    if (d.ok) {
      state.myId = d.id;
      const board = await loadBoard();
      const me = board.findIndex(x => x.id === d.id);
      $('r-rank').textContent = me >= 0
        ? `You ranked #${me + 1} on the leaderboard 🏆`
        : 'Score saved — check the leaderboard!';
    } else {
      $('r-rank').textContent = 'Score could not be saved — try again.';
    }
  } catch (e) {
    $('r-rank').textContent = 'Network hiccup — your score may not be saved.';
  }
}

// ---- leaderboard ----
async function loadBoard() {
  const r = await fetch('/api/quiz-leaderboard');
  const d = await r.json();
  return d.ok ? d.board : [];
}

async function renderBoard() {
  const box = $('board');
  box.innerHTML = '<div class="empty">Loading…</div>';
  try {
    const board = await loadBoard();
    if (!board.length) { box.innerHTML = '<div class="empty">No scores yet — be the first!</div>'; return; }
    let html = '<table><tr><th>#</th><th>Name</th><th>Branch · Yr</th><th>Score</th><th>Time</th></tr>';
    board.forEach(x => {
      const medal = x.rank <= 3 ? ' class="gold"' : '';
      const me = x.id === state.myId ? ' class="me"' : '';
      html += `<tr${me}><td${medal}>${x.rank}</td><td>${esc(x.name)}</td>` +
              `<td>${esc(x.branch)} · ${esc(x.year)}${x.year === '1' ? 'st' : x.year === '2' ? 'nd' : x.year === '3' ? 'rd' : 'th'}</td>` +
              `<td>${x.score}/10</td><td>${fmtTime(x.durationSec)}</td></tr>`;
    });
    box.innerHTML = html + '</table>';
  } catch (e) {
    box.innerHTML = '<div class="empty">Could not load the leaderboard. Check your connection.</div>';
  }
}

$('btn-board').onclick = () => { renderBoard(); show('s-board'); };
$('btn-refresh').onclick = renderBoard;
$('btn-retry').onclick = startQuiz;
$('btn-again').onclick = () => { show('s-entry'); };
window.__quizReady = true;
