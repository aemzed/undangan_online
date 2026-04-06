// ===== DOM Elements =====
const btnOpen = document.getElementById('btnOpen');
const mainContent = document.getElementById('mainContent');
const floatingNav = document.getElementById('floatingNav');
const cover = document.getElementById('cover');
const musicToggle = document.getElementById('musicToggle');
const rsvpForm = document.getElementById('rsvpForm');
const guestNameInput = document.getElementById('guestName');
const attendanceInput = document.getElementById('attendance');
const guestCountInput = document.getElementById('guestCount');
const rsvpStorageHint = document.getElementById('rsvpStorageHint');
const galleryItems = document.querySelectorAll('.gallery-item');
const galleryLightbox = document.getElementById('galleryLightbox');
const galleryLightboxImage = document.getElementById('galleryLightboxImage');
const galleryLightboxClose = document.getElementById('galleryLightboxClose');
const MUSIC_YOUTUBE_ID = 'xnrFiwjyr-o';
const MUSIC_START_SECONDS = 101;

// ===== Open Invitation =====
btnOpen.addEventListener('click', () => {
  mainContent.classList.remove('hidden');
  floatingNav.classList.remove('hidden');

  // Smooth scroll to first section
  mainContent.scrollIntoView({ behavior: 'smooth' });

  // Hide cover after scroll
  setTimeout(() => {
    cover.style.display = 'none';
  }, 1000);

  // Start particles
  createParticles();

  // Start music after user interaction
  setMusicPlayback(true, { showToast: false, isAuto: false });
});

// ===== Scroll Reveal =====
const revealSelectors = '.reveal, .reveal-left, .reveal-right, .reveal-zoom';

function revealOnScroll() {
  const reveals = document.querySelectorAll(revealSelectors);
  const windowHeight = window.innerHeight;

  reveals.forEach(el => {
    const elementTop = el.getBoundingClientRect().top;
    const revealPoint = windowHeight * 0.88;

    if (elementTop < revealPoint) {
      el.classList.add('active');
    }
  });
}

// Use IntersectionObserver if available for better performance
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -60px 0px'
  });

  function observeReveals() {
    document.querySelectorAll(revealSelectors).forEach(el => {
      if (!el.classList.contains('active')) {
        revealObserver.observe(el);
      }
    });
  }

  window.addEventListener('load', observeReveals);
  // Re-observe after main content is shown
  btnOpen.addEventListener('click', () => {
    setTimeout(observeReveals, 100);
  });
} else {
  window.addEventListener('scroll', revealOnScroll);
  window.addEventListener('load', revealOnScroll);
}

// ===== Countdown Timer =====
function updateCountdown() {
  const weddingDate = new Date('2026-09-20T08:00:00+07:00').getTime();
  const now = new Date().getTime();
  const diff = weddingDate - now;

  if (diff <= 0) {
    document.getElementById('days').textContent = '0';
    document.getElementById('hours').textContent = '0';
    document.getElementById('minutes').textContent = '0';
    document.getElementById('seconds').textContent = '0';
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  document.getElementById('days').textContent = days;
  document.getElementById('hours').textContent = hours;
  document.getElementById('minutes').textContent = minutes;
  document.getElementById('seconds').textContent = seconds;
}

setInterval(updateCountdown, 1000);
updateCountdown();

// ===== RSVP Form =====
const rsvpConfig = window.RSVP_CONFIG || {};
const supabaseConfig = {
  supabaseUrl: (rsvpConfig.supabaseUrl || '').trim(),
  supabaseAnonKey: (rsvpConfig.supabaseAnonKey || '').trim(),
  tableName: (rsvpConfig.tableName || 'rsvp_responses').trim(),
};

function isSupabaseConfigured() {
  return (
    supabaseConfig.supabaseUrl.startsWith('https://') &&
    supabaseConfig.supabaseUrl.includes('.supabase.co') &&
    supabaseConfig.supabaseAnonKey.length > 20 &&
    supabaseConfig.tableName.length > 0
  );
}

function normalizeGuestName(name) {
  return name.trim().replace(/\s+/g, ' ');
}

function prefillGuestNameFromQuery() {
  const query = new URLSearchParams(window.location.search);
  const nameFromLink = query.get('to') || query.get('nama') || '';
  const cleanedName = normalizeGuestName(nameFromLink);

  if (cleanedName && guestNameInput) {
    guestNameInput.value = cleanedName;
  }
}

function setRsvpStorageHint() {
  if (!rsvpStorageHint) return;

  if (isSupabaseConfigured()) {
    rsvpStorageHint.textContent = 'RSVP tersimpan ke database online.';
    return;
  }

  rsvpStorageHint.textContent = 'RSVP masih mode lokal browser. Isi konfigurasi Supabase agar tersimpan online.';
}

function saveRsvpToLocalStorage(payload) {
  const rsvpData = JSON.parse(localStorage.getItem('rsvpData') || '[]');
  const localRecord = {
    name: payload.guest_name,
    attendance: payload.attendance,
    count: String(payload.guest_count),
    date: payload.responded_at,
  };

  const existingIndex = rsvpData.findIndex(item => (
    normalizeGuestName(item.name || '').toLowerCase() === payload.guest_name.toLowerCase()
  ));

  if (existingIndex >= 0) {
    rsvpData[existingIndex] = localRecord;
  } else {
    rsvpData.push(localRecord);
  }

  localStorage.setItem('rsvpData', JSON.stringify(rsvpData));
}

async function saveRsvpToSupabase(payload) {
  const tablePath = encodeURIComponent(supabaseConfig.tableName);
  const endpoint = `${supabaseConfig.supabaseUrl}/rest/v1/${tablePath}?on_conflict=guest_name`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: supabaseConfig.supabaseAnonKey,
      Authorization: `Bearer ${supabaseConfig.supabaseAnonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify([payload]),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Gagal menyimpan RSVP ke Supabase.');
  }
}

prefillGuestNameFromQuery();
setRsvpStorageHint();

rsvpForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = rsvpForm.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.textContent;
  const name = normalizeGuestName(guestNameInput.value);
  const attendance = attendanceInput.value;
  const count = Number(guestCountInput.value);
  const respondedAt = new Date().toISOString();

  if (!name) {
    showToast('Nama tamu wajib diisi.');
    return;
  }

  const payload = {
    guest_name: name,
    attendance,
    guest_count: count,
    responded_at: respondedAt,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Menyimpan...';

  try {
    if (isSupabaseConfigured()) {
      await saveRsvpToSupabase(payload);
      saveRsvpToLocalStorage(payload);
    } else {
      saveRsvpToLocalStorage(payload);
    }

    const message = attendance === 'hadir'
      ? `Terima kasih ${name}, kami tunggu kehadiran Anda!`
      : `Terima kasih ${name}, semoga di lain waktu bisa bertemu.`;

    showToast(message);
    rsvpForm.reset();

    // Kirim konfirmasi via WhatsApp
    const waNumber = window.RSVP_CONFIG?.whatsappNumber;
    if (waNumber) {
      const statusText = attendance === 'hadir'
        ? `hadir (${count} orang)`
        : 'tidak bisa hadir';
      const waMessage = `Halo, saya *${name}* ingin mengkonfirmasi kehadiran undangan:\n\nStatus: *${statusText}*\n\nTerima kasih.`;
      const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;
      window.open(waUrl, '_blank');
    }
  } catch (error) {
    console.error('RSVP submit error:', error);
    saveRsvpToLocalStorage(payload);
    showToast('Koneksi database gagal, data disimpan lokal di browser.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
});

// ===== Gallery =====
const galleryLightboxBody = document.getElementById('galleryLightboxBody');
const galleryLightboxPrev = document.getElementById('galleryLightboxPrev');
const galleryLightboxNext = document.getElementById('galleryLightboxNext');
const galleryLightboxCounter = document.getElementById('galleryLightboxCounter');

let galleryImages = [];
let currentGalleryIndex = 0;

function enableGalleryImageState() {
  galleryItems.forEach((item) => {
    const image = item.querySelector('.gallery-image');
    if (!image) return;

    const setLoaded = () => {
      if (image.naturalWidth > 0) {
        item.classList.add('has-image');
      } else {
        item.classList.remove('has-image');
      }
    };

    if (image.complete) {
      setLoaded();
    }

    image.addEventListener('load', setLoaded);
    image.addEventListener('error', () => {
      item.classList.remove('has-image');
    });
  });
}

function collectGalleryImages() {
  galleryImages = [];
  document.querySelectorAll('.gallery-item.has-image').forEach((item) => {
    const img = item.querySelector('.gallery-image');
    if (img) {
      galleryImages.push({
        src: img.currentSrc || img.src,
        alt: img.alt || 'Preview foto galeri',
      });
    }
  });
}

function updateLightboxCounter() {
  if (galleryLightboxCounter) {
    galleryLightboxCounter.textContent = `${currentGalleryIndex + 1} / ${galleryImages.length}`;
  }
}

function showLightboxImage(index, direction) {
  if (!galleryLightboxImage || index < 0 || index >= galleryImages.length) return;

  const img = galleryLightboxImage;
  const data = galleryImages[index];

  if (direction) {
    // Animate out
    img.classList.add('swipe-transition');
    img.style.transform = `translateX(${direction === 'left' ? '-40%' : '40%'})`;
    img.style.opacity = '0';

    setTimeout(() => {
      img.src = data.src;
      img.alt = data.alt;
      // Jump to opposite side instantly
      img.classList.remove('swipe-transition');
      img.style.transform = `translateX(${direction === 'left' ? '40%' : '-40%'})`;
      img.style.opacity = '0';

      // Animate in
      requestAnimationFrame(() => {
        img.classList.add('swipe-transition');
        img.style.transform = 'translateX(0)';
        img.style.opacity = '1';
        setTimeout(() => img.classList.remove('swipe-transition'), 350);
      });
    }, 200);
  } else {
    img.src = data.src;
    img.alt = data.alt;
    img.style.transform = 'translateX(0)';
    img.style.opacity = '1';
  }

  currentGalleryIndex = index;
  updateLightboxCounter();
}

function goToPrevImage() {
  if (galleryImages.length <= 1) return;
  const newIndex = (currentGalleryIndex - 1 + galleryImages.length) % galleryImages.length;
  showLightboxImage(newIndex, 'right');
}

function goToNextImage() {
  if (galleryImages.length <= 1) return;
  const newIndex = (currentGalleryIndex + 1) % galleryImages.length;
  showLightboxImage(newIndex, 'left');
}

function openGalleryLightbox(index) {
  if (!galleryLightbox || !galleryLightboxImage) return;
  collectGalleryImages();
  if (galleryImages.length === 0) return;

  currentGalleryIndex = Math.min(index, galleryImages.length - 1);
  showLightboxImage(currentGalleryIndex, null);
  galleryLightbox.classList.add('open');
  galleryLightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('lightbox-open');
}

function closeGalleryLightbox() {
  if (!galleryLightbox || !galleryLightboxImage) return;
  galleryLightbox.classList.remove('open');
  galleryLightbox.setAttribute('aria-hidden', 'true');
  galleryLightboxImage.src = '';
  galleryLightboxImage.style.transform = '';
  galleryLightboxImage.style.opacity = '';
  document.body.classList.remove('lightbox-open');
}

function initGalleryLightbox() {
  if (!galleryLightbox || !galleryLightboxImage || !galleryLightboxClose) return;

  // Click to open - track which loaded image was clicked
  document.querySelectorAll('.gallery-trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const image = trigger.querySelector('.gallery-image');
      const isImageReady = image && image.naturalWidth > 0;

      if (!isImageReady) {
        showToast('File foto belum tersedia. Tambahkan dulu di folder assets/gallery.');
        return;
      }

      // Find the index among loaded images only
      collectGalleryImages();
      const src = image.currentSrc || image.src;
      const loadedIndex = galleryImages.findIndex(g => g.src === src);
      openGalleryLightbox(loadedIndex >= 0 ? loadedIndex : 0);
    });
  });

  // Close
  galleryLightboxClose.addEventListener('click', closeGalleryLightbox);
  galleryLightbox.addEventListener('click', (e) => {
    if (e.target === galleryLightbox) closeGalleryLightbox();
  });

  // Prev / Next buttons
  if (galleryLightboxPrev) galleryLightboxPrev.addEventListener('click', goToPrevImage);
  if (galleryLightboxNext) galleryLightboxNext.addEventListener('click', goToNextImage);

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!galleryLightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeGalleryLightbox();
    if (e.key === 'ArrowLeft') goToPrevImage();
    if (e.key === 'ArrowRight') goToNextImage();
  });

  // Swipe/drag with touch and mouse (Pointer Events)
  const swipeArea = galleryLightboxBody || galleryLightbox;
  const swipeState = {
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    deltaX: 0,
    isSwiping: false,
  };

  function resetSwipeVisual() {
    galleryLightboxImage.classList.add('swipe-transition');
    galleryLightboxImage.style.transform = 'translateX(0)';
    galleryLightboxImage.style.opacity = '1';
    window.setTimeout(() => {
      galleryLightboxImage.classList.remove('swipe-transition');
    }, 350);
  }

  function finishSwipe() {
    if (!swipeState.active) return;

    swipeState.active = false;
    swipeArea.classList.remove('swiping');

    if (!swipeState.isSwiping) {
      swipeState.deltaX = 0;
      return;
    }

    const threshold = 70;

    if (swipeState.deltaX < -threshold && galleryImages.length > 1) {
      goToNextImage();
    } else if (swipeState.deltaX > threshold && galleryImages.length > 1) {
      goToPrevImage();
    } else {
      resetSwipeVisual();
    }

    swipeState.deltaX = 0;
    swipeState.isSwiping = false;
  }

  swipeArea.addEventListener('pointerdown', (e) => {
    if (!galleryLightbox.classList.contains('open')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    swipeState.active = true;
    swipeState.pointerId = e.pointerId;
    swipeState.startX = e.clientX;
    swipeState.startY = e.clientY;
    swipeState.deltaX = 0;
    swipeState.isSwiping = false;
    galleryLightboxImage.classList.remove('swipe-transition');

    if (swipeArea.setPointerCapture) {
      swipeArea.setPointerCapture(e.pointerId);
    }
  });

  swipeArea.addEventListener('pointermove', (e) => {
    if (!swipeState.active || e.pointerId !== swipeState.pointerId) return;

    const dx = e.clientX - swipeState.startX;
    const dy = e.clientY - swipeState.startY;

    if (!swipeState.isSwiping && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      swipeState.isSwiping = true;
      swipeArea.classList.add('swiping');
    }

    if (!swipeState.isSwiping) return;

    swipeState.deltaX = dx;
    const progress = Math.max(-1, Math.min(1, dx / 220));
    galleryLightboxImage.style.transform = `translateX(${dx * 0.62}px)`;
    galleryLightboxImage.style.opacity = String(1 - Math.abs(progress) * 0.3);

    if (e.cancelable) {
      e.preventDefault();
    }
  });

  swipeArea.addEventListener('pointerup', (e) => {
    if (swipeArea.releasePointerCapture && swipeState.pointerId !== null) {
      try {
        swipeArea.releasePointerCapture(swipeState.pointerId);
      } catch (error) {
        // Ignore release errors when pointer is already released.
      }
    }
    if (e.pointerId !== swipeState.pointerId) return;
    finishSwipe();
    swipeState.pointerId = null;
  });

  swipeArea.addEventListener('pointercancel', () => {
    finishSwipe();
    swipeState.pointerId = null;
    resetSwipeVisual();
  });
}

enableGalleryImageState();
initGalleryLightbox();

// ===== Wishes Form =====
const wishesForm = document.getElementById('wishesForm');
const wishesList = document.getElementById('wishesList');

// Load existing wishes
function loadWishes() {
  const wishes = JSON.parse(localStorage.getItem('wishes') || '[]');
  wishesList.innerHTML = '';
  wishes.reverse().forEach(wish => {
    addWishToList(wish.name, wish.message, wish.date);
  });
}

function addWishToList(name, message, date) {
  const wishItem = document.createElement('div');
  wishItem.className = 'wish-item';

  const timeAgo = getTimeAgo(new Date(date));

  wishItem.innerHTML = `
    <p class="wish-item-name">${escapeHtml(name)}</p>
    <p class="wish-item-message">${escapeHtml(message)}</p>
    <p class="wish-item-time">${timeAgo}</p>
  `;

  wishesList.prepend(wishItem);
}

wishesForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('wishName').value;
  const message = document.getElementById('wishMessage').value;
  const date = new Date().toISOString();

  // Store in localStorage
  const wishes = JSON.parse(localStorage.getItem('wishes') || '[]');
  wishes.push({ name, message, date });
  localStorage.setItem('wishes', JSON.stringify(wishes));

  addWishToList(name, message, date);
  showToast('Terima kasih atas ucapan dan doanya!');
  wishesForm.reset();
});

loadWishes();

// ===== Copy to Clipboard =====
document.querySelectorAll('.btn-copy').forEach(btn => {
  btn.addEventListener('click', () => {
    const text = btn.dataset.copy;
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = 'Tersalin!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'Salin Nomor';
        btn.classList.remove('copied');
      }, 2000);
    });
  });
});

// ===== Music Toggle =====
let isPlaying = false;
const musicState = {
  player: null,
  apiReady: false,
  apiLoading: false,
  shouldPlay: false,
  hasStarted: false,
  playRequestedByAuto: false,
  autoplayBlockedNotified: false,
};

function ensureMusicHostElement() {
  let host = document.getElementById('youtubePlayerHost');

  if (!host) {
    host = document.createElement('div');
    host.id = 'youtubePlayerHost';
    host.style.position = 'fixed';
    host.style.width = '0';
    host.style.height = '0';
    host.style.opacity = '0';
    host.style.pointerEvents = 'none';
    host.style.overflow = 'hidden';
    host.style.bottom = '0';
    host.style.right = '0';

    const playerEl = document.createElement('div');
    playerEl.id = 'youtubePlayer';
    host.appendChild(playerEl);
    document.body.appendChild(host);
  }
}

function createYouTubePlayer() {
  if (!musicState.apiReady || musicState.player) return;

  ensureMusicHostElement();

  musicState.player = new window.YT.Player('youtubePlayer', {
    width: '1',
    height: '1',
    videoId: MUSIC_YOUTUBE_ID,
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      playsinline: 1,
      rel: 0,
      start: MUSIC_START_SECONDS,
      origin: window.location.origin,
    },
    events: {
      onReady: () => {
        if (musicState.shouldPlay) {
          playMusicFromYouTube({ isAuto: musicState.playRequestedByAuto });
        }
      },
      onStateChange: (event) => {
        if (event.data === window.YT.PlayerState.ENDED && isPlaying) {
          event.target.seekTo(MUSIC_START_SECONDS, true);
          event.target.playVideo();
        }
      },
      onError: () => {
        isPlaying = false;
        musicState.shouldPlay = false;
        musicState.playRequestedByAuto = false;
        musicToggle.classList.remove('playing');
        showToast('Video YouTube tidak bisa diputar. Coba ganti link lagu lain.');
      },
    },
  });
}

function ensureYouTubeApiLoaded() {
  if (window.YT && window.YT.Player) {
    musicState.apiReady = true;
    createYouTubePlayer();
    return;
  }

  if (musicState.apiLoading) return;
  musicState.apiLoading = true;

  const previousReady = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    if (typeof previousReady === 'function') {
      previousReady();
    }

    musicState.apiReady = true;
    createYouTubePlayer();
  };

  const apiScript = document.createElement('script');
  apiScript.src = 'https://www.youtube.com/iframe_api';
  apiScript.async = true;
  apiScript.onerror = () => {
    musicState.apiLoading = false;
    showToast('Gagal memuat YouTube API. Periksa koneksi internet Anda.');
  };

  document.head.appendChild(apiScript);
}

function playMusicFromYouTube(options = {}) {
  const isAuto = Boolean(options.isAuto);
  musicState.shouldPlay = true;
  musicState.playRequestedByAuto = isAuto;
  ensureYouTubeApiLoaded();

  if (!musicState.player) return;

  if (!musicState.hasStarted) {
    musicState.player.seekTo(MUSIC_START_SECONDS, true);
    musicState.hasStarted = true;
  }

  musicState.player.playVideo();

  if (isAuto) {
    window.setTimeout(() => {
      if (!musicState.player || !isPlaying || !musicState.shouldPlay) return;
      const currentState = musicState.player.getPlayerState
        ? musicState.player.getPlayerState()
        : null;

      if (currentState !== window.YT.PlayerState.PLAYING) {
        isPlaying = false;
        musicState.shouldPlay = false;
        musicToggle.classList.remove('playing');

        if (!musicState.autoplayBlockedNotified) {
          showToast('Autoplay diblokir browser. Klik tombol musik untuk memutar.');
          musicState.autoplayBlockedNotified = true;
        }
      }
    }, 900);
  }
}

function pauseMusicFromYouTube() {
  musicState.shouldPlay = false;
  musicState.playRequestedByAuto = false;
  if (musicState.player) {
    musicState.player.pauseVideo();
  }
}

function setMusicPlayback(shouldPlay, options = {}) {
  const displayToast = options.showToast !== false;
  const isAuto = Boolean(options.isAuto);

  if (shouldPlay) {
    if (isPlaying && musicState.shouldPlay) return;
    isPlaying = true;
    musicToggle.classList.add('playing');
    playMusicFromYouTube({ isAuto });

    if (displayToast) {
      showToast('Musik diputar dari YouTube (mulai 1:41).');
    }
    return;
  }

  if (!isPlaying && !musicState.shouldPlay) return;
  isPlaying = false;
  pauseMusicFromYouTube();
  musicToggle.classList.remove('playing');

  if (displayToast) {
    showToast('Musik dijeda.');
  }
}

musicToggle.addEventListener('click', () => {
  setMusicPlayback(!isPlaying, { showToast: true, isAuto: false });
});

ensureYouTubeApiLoaded();
window.addEventListener('load', () => {
  setMusicPlayback(true, { showToast: false, isAuto: true });
}, { once: true });

// ===== Falling Leaves =====
function createFallingLeaf() {
  const colors = ['#6B8F6B', '#8FA98F', '#B5CCB5', '#4A6741', '#C4937A'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = Math.random() * 16 + 14;
  const duration = Math.random() * 6 + 6;
  const delay = Math.random() * 2;

  const leaf = document.createElement('div');
  leaf.className = 'falling-leaf';
  leaf.style.left = Math.random() * 100 + 'vw';
  leaf.style.setProperty('--leaf-size', size + 'px');
  leaf.style.setProperty('--fall-duration', duration + 's');
  leaf.style.setProperty('--fall-delay', delay + 's');

  leaf.innerHTML = `<svg viewBox="0 0 24 24" fill="${color}" opacity="0.5">
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20c4 0 8.56-3.88 9-10z"/>
    <path d="M12.47 2.19C11 3.42 9.28 5.5 8.87 8c1.43-.73 3.08-1.2 5.13-1.54V2.19z" opacity="0.7"/>
  </svg>`;

  document.body.appendChild(leaf);

  setTimeout(() => {
    leaf.remove();
  }, (duration + delay) * 1000 + 500);
}

function createParticles() {
  // Initial burst of leaves
  for (let i = 0; i < 8; i++) {
    setTimeout(() => createFallingLeaf(), i * 600);
  }

  // Keep creating leaves periodically
  setInterval(() => {
    createFallingLeaf();
  }, 2500);
}

// ===== Smooth Scroll for Nav Links =====
document.querySelectorAll('.nav-item').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// ===== Utility Functions =====
function showToast(message) {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit yang lalu`;
  if (diffHours < 24) return `${diffHours} jam yang lalu`;
  if (diffDays < 30) return `${diffDays} hari yang lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
