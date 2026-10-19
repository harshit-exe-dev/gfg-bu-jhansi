// diagnostic block (separate so it runs even if the main block above fails)
(function () {
  var d = document.getElementById('diag');
  if (!d) return;
  if (window.__quizReady) { d.textContent = '✓ Quiz engine ready'; d.style.color = '#2f8d46'; }
  else { d.textContent = '✗ Quiz engine failed at: ' + (window.__quizStep || 'parse error'); d.style.color = '#e06c6c'; }
})();
