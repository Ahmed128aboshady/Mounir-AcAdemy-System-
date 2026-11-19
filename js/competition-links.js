/* Link directory only. Does not load the LMS client or write attendance/credit data. */
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
    url: tajweedRow.querySelector('.sc-open').href,
    title: tajweedRow.querySelector('h4').textContent,
    platform: tajweedRow.querySelector('.sc-platform').textContent
  };
  function syncTajweedVideo() {
    tajweedRow.querySelector('.sc-open').href = originalTajweed.url;
    tajweedRow.querySelector('h4').textContent = originalTajweed.title;
    tajweedRow.querySelector('.sc-platform').textContent = originalTajweed.platform;
    try {
      const stored = JSON.parse(localStorage.getItem('monir_tajweed_active_video') || 'null');
      if (!stored || !stored.url) return;
      const url = new URL(stored.url);
      if (url.protocol !== 'https:') return;
      const row = document.querySelector('[data-tajweed-video]');
      row.querySelector('.sc-open').href = url.href;
      row.querySelector('.sc-platform').textContent = url.hostname === 'drive.google.com' ? 'Google Drive' : url.hostname;
      if (typeof stored.title === 'string' && stored.title.trim()) row.querySelector('h4').textContent = stored.title;
    } catch (_) { /* Keep the source-configured fallback link. */ }
  }
  document.querySelectorAll('.sc-copy').forEach(button => {
    button.addEventListener('click', () => copyText(button.closest('.sc-link').querySelector('.sc-open').href));
  });
  document.getElementById('copyAllLinks').addEventListener('click', () => {
    const blocks = ['محاضرات المسابقة — أكاديمية منير'];
    document.querySelectorAll('.sc-section').forEach(section => {
      blocks.push('\n' + section.querySelector('h2').textContent);
      section.querySelectorAll('.sc-card').forEach(card => {
        blocks.push('\n' + card.querySelector('h3').textContent);
        card.querySelectorAll('.sc-link').forEach(row => blocks.push(row.querySelector('h4').textContent + '\n' + row.querySelector('.sc-open').href));
      });
    });
    copyText(blocks.join('\n'));
  });
  syncTajweedVideo();
  window.addEventListener('storage', event => { if (event.key === 'monir_tajweed_active_video') syncTajweedVideo(); });
})();
