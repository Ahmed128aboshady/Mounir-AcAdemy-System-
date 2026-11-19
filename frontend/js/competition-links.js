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
      announce(text.includes('\n') ? 'تم نسخ جميع الروابط بنجاح' : 'تم نسخ الرابط بنجاح');
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

  // ── Student Identification & Filtering Logic ──
  function guessGender(name) {
    if (!name) return 'm';
    const trimmed = name.trim();
    const parts = trimmed.split(/\s+/);
    const first = parts[0] || '';
    const maleWithTa = ['حمزة', 'أسامة', 'طلحة', 'قتادة', 'عبيدة', 'معاوية', 'عكرمة', 'حذيفة', 'عتبة', 'قتيبة', 'سلامة', 'جمعة', 'عطية', 'عرفة', 'شحاتة'];
    if (maleWithTa.includes(first)) return 'm';
    const females = ['كارما', 'مريم', 'فاطمة', 'عائشة', 'خديجة', 'زينب', 'سارة', 'نور', 'هدى', 'آلاء', 'دنيا', 'تسنيم', 'ياسمين', 'سهيلة', 'أميرة', 'منة', 'حبيبة', 'جنى', 'ملك', 'روان', 'رودينا', 'فريدة', 'ليان', 'ريماس', 'سدرة', 'تالية', 'ريتاج', 'جود', 'حلا', 'ريناد', 'مايا', 'ندى', 'شهد', 'مروة', 'آية', 'إسراء', 'شيماء', 'إيمان', 'أسماء', 'سلمى', 'هند', 'لين', 'دارين', 'رغد', 'رهف', 'لينا', 'تيا', 'تاليا', 'صبا', 'لمى', 'ميرال', 'وتين', 'بسملة', 'بسنت'];
    if (females.includes(first)) return 'f';
    if (first.endsWith('ة') || first.endsWith('اء') || first.endsWith('ى')) return 'f';
    return 'm';
  }

  function resolveStudentProfile() {
    const params = new URLSearchParams(window.location.search);
    let code = params.get('code') || '';
    let name = params.get('name') || '';
    let gender = (params.get('gender') || '').toLowerCase();
    let age = params.get('age') ? parseInt(params.get('age'), 10) : null;

    if (!code || !name || !gender || age === null) {
      try {
        const saved = JSON.parse(localStorage.getItem('monir_competition_target_student') || 'null');
        if (saved) {
          if (!code && saved.code) code = saved.code;
          if (!name && saved.name) name = saved.name;
          if (!gender && saved.gender) gender = String(saved.gender).toLowerCase();
          if (age === null && saved.age !== undefined && saved.age !== null) age = parseInt(saved.age, 10);
        }
      } catch (_) {}
    }

    if (!code || !name || !gender || age === null) {
      try {
        const curUser = JSON.parse(localStorage.getItem('monir_current_user') || 'null');
        if (curUser) {
          if (!code && (curUser.student_code || curUser.username)) code = curUser.student_code || curUser.username;
          if (!name && (curUser.full_name || curUser.name)) name = curUser.full_name || curUser.name;
          if (age === null && curUser.age !== undefined && curUser.age !== null) age = parseInt(curUser.age, 10);
          if (!gender && curUser.gender) gender = String(curUser.gender).toLowerCase();
        }
      } catch (_) {}
    }

    if (age === null || isNaN(age)) age = 9;
    if (!gender || (gender !== 'm' && gender !== 'f')) {
      gender = name ? guessGender(name) : 'f'; // default to student profile
    }

    return { code, name, gender, age, hasStudentData: !!(code || name) };
  }

  const student = resolveStudentProfile();
  let currentFilterGender = student.gender;
  let currentFilterAge = (student.age >= 10) ? '10plus' : 'under10';
  let isViewingAll = false;

  function applyFilter() {
    let targetKey = 'all';
    if (!isViewingAll && currentFilterGender && currentFilterAge) {
      targetKey = `${currentFilterGender}-${currentFilterAge}`;
    }

    let liveCount = 0;
    let recCount = 0;

    document.querySelectorAll('.sc-link').forEach(row => {
      const target = row.getAttribute('data-target') || 'all';
      let match = false;
      if (targetKey === 'all' || target === 'all') {
        match = true;
      } else {
        const targets = target.split(',').map(t => t.trim());
        match = targets.includes(targetKey);
      }

      if (match) {
        row.style.display = '';
        row.removeAttribute('hidden');
        if (row.closest('#live')) liveCount++;
        if (row.closest('#recordings')) recCount++;
      } else {
        row.style.display = 'none';
        row.setAttribute('hidden', '');
      }
    });

    // Update section counts in toolbar
    const liveCounter = document.querySelector('.sc-nav-links a[href="#live"] span');
    const recCounter = document.querySelector('.sc-nav-links a[href="#recordings"] span');
    if (liveCounter) liveCounter.textContent = liveCount;
    if (recCounter) recCounter.textContent = recCount;

    // Update manual filter buttons state
    document.querySelectorAll('[data-filter-gender]').forEach(btn => {
      btn.classList.toggle('active', isViewingAll ? btn.getAttribute('data-filter-gender') === 'all' : btn.getAttribute('data-filter-gender') === currentFilterGender);
    });
    document.querySelectorAll('[data-filter-age]').forEach(btn => {
      btn.classList.toggle('active', isViewingAll ? btn.getAttribute('data-filter-age') === 'all' : btn.getAttribute('data-filter-age') === currentFilterAge);
    });
  }

  // Setup UI elements
  const banner = document.getElementById('studentPersonalizationBanner');
  const nameEl = document.getElementById('studentPersonalizedName');
  const badgeEl = document.getElementById('studentGenderAgeBadge');
  const toggleBtn = document.getElementById('toggleAllLinksBtn');

  if (student.hasStudentData || student.name) {
    if (banner) banner.hidden = false;
    if (nameEl) nameEl.textContent = student.name || 'طالب الأكاديمية';
    if (badgeEl) {
      const isGirl = (student.gender === 'f');
      badgeEl.textContent = (isGirl ? 'طالبة (بنت)' : 'طالب (ولد)') + ` — ${student.age} سنوات (${student.age >= 10 ? 'فئة الكبار' : 'فئة الصغار'})`;
      badgeEl.className = 'sc-student-badge ' + (isGirl ? 'female' : 'male');
    }
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      isViewingAll = !isViewingAll;
      toggleBtn.textContent = isViewingAll ? 'تفعيل التصفية المخصصة للطالب' : 'عرض جميع الروابط';
      toggleBtn.classList.toggle('active', isViewingAll);
      applyFilter();
      announce(isViewingAll ? 'تم عرض جميع الروابط' : 'تم عرض الروابط المخصصة للطالب فقط');
    });
  }

  // Manual filter bar handlers
  document.querySelectorAll('[data-filter-gender]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-filter-gender');
      if (val === 'all') {
        isViewingAll = true;
      } else {
        isViewingAll = false;
        currentFilterGender = val;
      }
      if (toggleBtn) toggleBtn.textContent = isViewingAll ? 'تفعيل التصفية المخصصة للطالب' : 'عرض جميع الروابط';
      applyFilter();
    });
  });

  document.querySelectorAll('[data-filter-age]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-filter-age');
      if (val === 'all') {
        isViewingAll = true;
      } else {
        isViewingAll = false;
        currentFilterAge = val;
      }
      if (toggleBtn) toggleBtn.textContent = isViewingAll ? 'تفعيل التصفية المخصصة للطالب' : 'عرض جميع الروابط';
      applyFilter();
    });
  });

  // Action Buttons
  document.querySelectorAll('.sc-copy').forEach(button => {
    button.addEventListener('click', () => copyText(button.closest('.sc-link').querySelector('.sc-open').href));
  });

  document.getElementById('copyAllLinks').addEventListener('click', () => {
    const blocks = ['محاضرات المسابقة — أكاديمية منير'];
    if (!isViewingAll && student.name) {
      blocks[0] += ` (الروابط المخصصة لـ: ${student.name})`;
    }
    document.querySelectorAll('.sc-section').forEach(section => {
      const secTitle = section.querySelector('h2').textContent;
      const visibleLinks = [];
      section.querySelectorAll('.sc-card').forEach(card => {
        const cardTitle = card.querySelector('h3').textContent;
        card.querySelectorAll('.sc-link').forEach(row => {
          if (!row.hidden && window.getComputedStyle(row).display !== 'none') {
            visibleLinks.push(`${cardTitle} — ${row.querySelector('h4').textContent}:\n${row.querySelector('.sc-open').href}`);
          }
        });
      });
      if (visibleLinks.length > 0) {
        blocks.push('\n' + secTitle + '\n' + visibleLinks.join('\n\n'));
      }
    });
    copyText(blocks.join('\n'));
  });

  // Initial Filter Apply
  applyFilter();
  syncTajweedVideo();
  window.addEventListener('storage', event => { if (event.key === 'monir_tajweed_active_video') syncTajweedVideo(); });
})();
