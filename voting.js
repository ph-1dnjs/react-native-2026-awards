export function setupVoting(apps, onClose) {
  const config = window.GALLERY_CONFIG || {};
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || location.protocol === 'file:';
  const start = config.exhibitionStartsAt ? Date.parse(config.exhibitionStartsAt) : NaN;
  const end = config.exhibitionEndsAt ? Date.parse(config.exhibitionEndsAt) : NaN;
  const key = 'rn2026-ballot';
  const voteButton = document.querySelector('#voteButton');
  const voteStatus = document.querySelector('#voteStatus');
  const results = document.querySelector('#voteResults');
  let currentApp = null;
  const lede = document.querySelector('.lede');
  const originalLede = lede.innerHTML;
  const beforeStart = () => Number.isFinite(start) && Date.now() < start;
  const closed = () => Number.isFinite(end) && Date.now() >= end;
  function ballot() {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  }
  function refreshVote() {
    const saved = ballot();
    voteButton.disabled = beforeStart() || closed() || !saved || Boolean(saved.exhibitId);
    voteStatus.textContent = saved?.exhibitId ? '투표를 완료했습니다. 한 번 제출한 투표는 변경할 수 없습니다.' : saved ? '투표 용지 1장 · 한 작품에 투표할 수 있습니다.' : '입장 후 투표 용지를 받을 수 있습니다.';
  }
  function showClosed() {
    if ((!beforeStart() || local) && !closed()) {
      document.querySelector('#overlay').classList.remove('resultsOpen');
      lede.innerHTML = originalLede;
      document.querySelector('#enter').hidden = false;
      document.querySelector('.mode').hidden = false;
      return false;
    }
    onClose();
    document.querySelector('#enter').hidden = true;
    document.querySelector('.mode').hidden = true;
    if (beforeStart() && !local) {
      document.querySelector('#overlay').classList.remove('resultsOpen');
      lede.textContent = '전시 시작: ' + new Date(start).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) + ' (한국 시간)';
      results.hidden = true;
      return true;
    }
    document.querySelector('.lede').textContent = '전시와 투표가 종료되었습니다. 관람해 주셔서 감사합니다.';
    document.querySelector('#overlay').classList.add('resultsOpen');
    results.hidden = false;
    const saved = ballot();
    const list = document.querySelector('#resultList');
    list.replaceChildren();
    for (const app of apps) {
      const row = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'resultName';
      name.textContent = app.name;
      const author = document.createElement('small');
      author.textContent = app.author;
      name.appendChild(author);
      const status = document.createElement('span');
      status.className = 'resultStatus';
      status.textContent = saved?.exhibitId === app.id ? '내가 투표한 작품 ✦' : '집계 준비 중';
      row.append(name, status);
      list.appendChild(row);
    }
    refreshVote();
    return true;
  }
  voteButton.addEventListener('click', () => {
    if (showClosed() || !currentApp) return;
    const saved = ballot();
    if (!saved || saved.exhibitId) return refreshVote();
    if (!confirm(`${currentApp.name}에 투표하시겠습니까? 제출 후 변경할 수 없습니다.`)) return;
    if (showClosed()) return;
    try {
      localStorage.setItem(key, JSON.stringify({ ...saved, exhibitId: currentApp.id }));
      refreshVote();
    } catch { voteStatus.textContent = '투표를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.'; }
  });
  addEventListener('storage', event => { if (event.key === key) { refreshVote(); if (closed()) showClosed(); } });
  let previousState = '';
  setInterval(() => {
    const state = beforeStart() ? 'before' : closed() ? 'closed' : 'open';
    if (state !== previousState) { previousState = state; showClosed(); }
  }, 1000);
  showClosed();
  return {
    enter() {
      if (showClosed()) return false;
      try {
        if (!ballot()) localStorage.setItem(key, JSON.stringify({ id: crypto.randomUUID() }));
      } catch {
        alert('투표 용지를 저장할 수 없습니다. 브라우저 저장 공간을 확인해 주세요.');
        return false;
      }
      return true;
    },
    select(app) { currentApp = app; refreshVote(); }
  };
}
