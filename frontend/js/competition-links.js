/* Link directory with personalized student age & gender filtering. */
'use strict';
(() => {
  const status = document.getElementById('copyStatus');
  let statusTimer;
  function announce(message) {
    clearTimeout(statusTimer);
    status.textContent = message;
    status.hidden = false;
    statusTimer = setTimeout(() => { status.hidden = true; }, 3500);
  }

  async function copyText(text) {
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      announce(text.includes('\n') ? 'تم نسخ روابط فئتك' : 'تم نسخ الرابط بنجاح');
    } catch (_) {
      const dialog = document.getElementById('copyFallback');
      const field = document.getElementById('copyFallbackText');
      field.value = text;
      if (!dialog.open) dialog.showModal();
      field.focus();
      field.select();
    }
  }

  const tajweedRow = document.querySelector('[data-tajweed-video]');
  const originalTajweed = {
    url: tajweedRow ? tajweedRow.querySelector('.sc-open').href : '',
    title: tajweedRow ? tajweedRow.querySelector('h4').textContent : '',
    platform: tajweedRow ? tajweedRow.querySelector('.sc-platform').textContent : ''
  };

  function syncTajweedVideo() {
    if (!tajweedRow) return;
    tajweedRow.querySelector('.sc-open').href = originalTajweed.url;
    tajweedRow.querySelector('h4').textContent = originalTajweed.title;
    tajweedRow.querySelector('.sc-platform').textContent = originalTajweed.platform;
    try {
      const stored = JSON.parse(localStorage.getItem('monir_tajweed_active_video') || 'null');
      if (!stored || !stored.url) return;
      const url = new URL(stored.url);
      if (url.protocol !== 'https:') return;
      tajweedRow.querySelector('.sc-open').href = url.href;
      tajweedRow.querySelector('.sc-platform').textContent = url.hostname === 'drive.google.com' ? 'Google Drive' : url.hostname;
      if (typeof stored.title === 'string' && stored.title.trim()) tajweedRow.querySelector('h4').textContent = stored.title;
    } catch (_) {}
  }

  function readSavedProfile(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch (_) {
      return null;
    }
  }

  function resolveStudentProfile() {
    const params = new URLSearchParams(window.location.search);
    const user = readSavedProfile('monir_current_user');
    const saved = user && readSavedProfile('monir_competition_target_student');
    const requestedCode = params.get('code');
    const studentCode = user?.role === 'student' ? (user.student_code || user.username) : '';
    const code = studentCode || requestedCode || (user?.role === 'student' ? '' : saved?.code);
    const matchesCode = candidate => Boolean(code && candidate && String(candidate).toUpperCase() === String(code).toUpperCase());

    const candidates = [
      matchesCode(requestedCode) && { age: params.get('age'), gender: params.get('gender'), name: params.get('name') },
      matchesCode(saved?.code) && saved,
      matchesCode(studentCode) && { age: user.age, gender: user.gender, name: user.full_name || user.name },
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      const age = Number(candidate.age);
      const rawGender = String(candidate.gender || '').trim().toLowerCase();
      const gender = ['m', 'male', 'ذكر', 'ولد'].includes(rawGender) ? 'm'
        : ['f', 'female', 'أنثى', 'بنت'].includes(rawGender) ? 'f' : '';
      if (Number.isInteger(age) && age > 0 && gender) {
        return { name: typeof candidate.name === 'string' ? candidate.name : '', gender, age };
      }
    }
    return null;
  }

  const student = resolveStudentProfile();
  const ageGroup = student && (student.age >= 10 ? '10plus' : 'under10');
  const targetKey = student && `${student.gender}-${ageGroup}`;

  if (student) {
    const badge = document.getElementById('studentGenderAgeBadge');
    const isGirl = student.gender === 'f';
    badge.textContent = `${isGirl ? 'بنات' : 'بنين'} · ${ageGroup === '10plus' ? '10 سنوات فأكبر' : 'أقل من 10 سنوات'}`;
    badge.classList.add(isGirl ? 'female' : 'male');
    document.getElementById('studentPersonalizedName').textContent = student.name || 'روابط فئتك';
    document.getElementById('studentPersonalizationBanner').hidden = false;
  } else {
    document.getElementById('studentProfileRequired').hidden = false;
  }

  document.querySelectorAll('.sc-link').forEach(row => {
    const targets = row.dataset.target.split(',').map(target => target.trim());
    row.hidden = !targets.includes('all') && !targets.includes(targetKey);
  });
  document.querySelectorAll('.sc-card').forEach(card => {
    card.hidden = !card.querySelector('.sc-link:not([hidden])');
  });

  const archives = [...document.querySelectorAll('.sc-archive')];
  for (const archive of archives) {
    const count = archive.querySelectorAll('.sc-link:not([hidden])').length;
    archive.querySelector('.sc-archive-count').textContent = count;
    archive.hidden = count === 0;
  }
  for (const kind of ['live', 'recordings']) {
    const count = document.querySelectorAll(`[data-link-kind="${kind}"] .sc-link:not([hidden])`).length;
    document.querySelector(`.sc-nav-links a[href="#${kind}"] span`).textContent = count;
  }
  function openArchives() {
    for (const archive of archives) {
      if (!archive.hidden) archive.open = true;
    }
  }
  document.querySelector('.sc-nav-links a[href="#recordings"]').addEventListener('click', openArchives);
  if (window.location.hash === '#recordings') openArchives();

  // Action Buttons
  document.querySelectorAll('.sc-copy').forEach(button => {
    button.addEventListener('click', () => copyText(button.closest('.sc-link').querySelector('.sc-open').href));
  });

  document.getElementById('copyAllLinks').addEventListener('click', () => {
    const blocks = ['محاضرات المسابقة — أكاديمية منير'];
    if (student?.name) {
      blocks[0] += ` (الروابط المخصصة لـ: ${student.name})`;
    }
    document.querySelectorAll('.sc-card').forEach(card => {
      const rows = [...card.querySelectorAll('.sc-link:not([hidden])')];
      if (!rows.length) return;
      const links = rows.map(row => {
        const kind = row.closest('[data-link-kind]').dataset.linkKind === 'live' ? 'البث المباشر' : 'تسجيل';
        return `${kind} — ${row.querySelector('h4').textContent}:\n${row.querySelector('.sc-open').href}`;
      });
      blocks.push('\n' + card.querySelector('h3').textContent + '\n' + links.join('\n\n'));
    });
    copyText(blocks.join('\n'));
  });

  syncTajweedVideo();
  window.addEventListener('storage', event => { if (event.key === 'monir_tajweed_active_video') syncTajweedVideo(); });
})();
