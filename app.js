const audio = document.getElementById('audio-element');
let currentTrack = null;

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) targetTab.classList.add('active');

  if (tabName === 'home') loadHome();
}

async function loadHome() {
  const container = document.getElementById('home-feed');
  container.innerHTML = '<p class="loading-text">Lade Musik-Empfehlungen...</p>';

  try {
    const res = await fetch('/api/home');
    const data = await res.json();
    container.innerHTML = '';

    data.sections.forEach(sec => {
      if (!sec.items || sec.items.length === 0) return;

      const secEl = document.createElement('div');
      secEl.innerHTML = `<h2 class="section-title">${sec.title}</h2>`;

      const grid = document.createElement('div');
      grid.className = 'cards-grid';

      sec.items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = () => onCardClick(item);
        card.innerHTML = `
          <img src="${item.thumbnail}" referrerpolicy="no-referrer" alt="${item.title}">
          <p class="card-title">${item.title}</p>
          <p class="card-artist">${item.artist}</p>
        `;
        grid.appendChild(card);
      });

      secEl.appendChild(grid);
      container.appendChild(secEl);
    });
  } catch (err) {
    container.innerHTML = '<p>Fehler beim Laden der Inhalte.</p>';
  }
}

function onCardClick(item) {
  if (item.type === 'playlist' || item.id.startsWith('VL') || item.id.startsWith('PL') || item.id.startsWith('RD') || item.id.startsWith('MPRE')) {
    openPlaylist(item.id);
  } else {
    playSong(item);
  }
}

async function openPlaylist(playlistId) {
  switchTab('playlist');
  document.getElementById('playlist-title').innerText = 'Lade Playlist...';
  document.getElementById('playlist-tracks').innerHTML = '<p>Tracks werden geladen...</p>';

  try {
    const res = await fetch(`/api/playlist?id=${encodeURIComponent(playlistId)}`);
    const data = await res.json();

    const coverImg = document.getElementById('playlist-cover');
    coverImg.src = data.thumbnail || '';
    coverImg.setAttribute('referrerpolicy', 'no-referrer');

    document.getElementById('playlist-title').innerText = data.title;
    document.getElementById('playlist-count').innerText = `${data.tracks.length} Songs`;

    const container = document.getElementById('playlist-tracks');
    container.innerHTML = '';

    data.tracks.forEach(track => {
      const item = document.createElement('div');
      item.className = 'track-item';
      item.onclick = () => playSong(track);
      item.innerHTML = `
        <img src="${track.thumbnail}" referrerpolicy="no-referrer" alt="${track.title}">
        <div>
          <p class="card-title">${track.title}</p>
          <p class="card-artist">${track.artist}</p>
        </div>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    document.getElementById('playlist-tracks').innerHTML = '<p>Fehler beim Laden der Playlist.</p>';
  }
}

async function handleSearch(e) {
  e.preventDefault();
  const q = document.getElementById('search-input').value;
  const resultsContainer = document.getElementById('search-results');
  resultsContainer.innerHTML = '<p>Suche läuft...</p>';

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    resultsContainer.innerHTML = '';

    data.results.forEach(track => {
      const item = document.createElement('div');
      item.className = 'track-item';
      item.onclick = () => playSong(track);
      item.innerHTML = `
        <img src="${track.thumbnail}" referrerpolicy="no-referrer" alt="${track.title}">
        <div>
          <p class="card-title">${track.title}</p>
          <p class="card-artist">${track.artist}</p>
        </div>
      `;
      resultsContainer.appendChild(item);
    });
  } catch (err) {
    resultsContainer.innerHTML = '<p>Fehler bei der Suche.</p>';
  }
}

function playSong(track) {
  currentTrack = track;
  document.getElementById('player-bar').classList.remove('hidden');
  document.getElementById('player-thumb').src = track.thumbnail;
  document.getElementById('player-title').innerText = track.title;
  document.getElementById('player-artist').innerText = track.artist;

  audio.src = `/api/stream?id=${track.id}`;
  audio.play().catch(e => console.log('Audio Autoplay Blocked/Error', e));
  document.getElementById('play-pause-btn').innerText = '⏸';
}

function togglePlay() {
  if (!audio.src) return;
  if (audio.paused) {
    audio.play();
    document.getElementById('play-pause-btn').innerText = '⏸';
  } else {
    audio.pause();
    document.getElementById('play-pause-btn').innerText = '▶';
  }
}

audio.ontimeupdate = () => {
  const seek = document.getElementById('seek-bar');
  if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
    seek.value = (audio.currentTime / audio.duration) * 100;
    document.getElementById('current-time').innerText = formatTime(audio.currentTime);
    document.getElementById('duration-time').innerText = formatTime(audio.duration);
  }
};

function seekAudio() {
  const seek = document.getElementById('seek-bar');
  if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
    audio.currentTime = (seek.value / 100) * audio.duration;
  }
}

function changeVolume() {
  const vol = document.getElementById('volume-bar').value;
  audio.volume = vol / 100;
}

function formatTime(sec) {
  if (isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

loadHome();
