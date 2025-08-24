(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const body = document.body;
  const nowYear = new Date().getFullYear();
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(nowYear);

  // Pull event data from body attributes
  const eventTitle = body.dataset.eventTitle || 'Codezen Event';
  const eventStartISO = body.dataset.eventStart || new Date().toISOString();
  const eventEndISO = body.dataset.eventEnd || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const eventLocation = body.dataset.eventLocation || 'University Campus';

  // Fill meta in header/venue
  try {
    const start = new Date(eventStartISO);
    const dateFmt = new Intl.DateTimeFormat([], { month: 'short', day: 'numeric', year: 'numeric' });
    const timeFmt = new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' });
    const whenText = `${dateFmt.format(start)} · ${timeFmt.format(start)}`;
    const whenEl = $('#eventWhen');
    if (whenEl) whenEl.textContent = whenText;

    const whereEl = $('#eventWhere');
    if (whereEl) whereEl.textContent = eventLocation.split(',')[0] || eventLocation;

    const venueName = $('#venueName');
    if (venueName) venueName.textContent = eventLocation.split(',')[0] || eventLocation;

    const maps = $('#openMaps');
    if (maps) {
      const q = encodeURIComponent(eventLocation);
      maps.href = `https://www.google.com/maps/search/?api=1&query=${q}`;
    }
  } catch {}

  // Calendar (.ics) generator
  function pad(n) { return String(n).padStart(2, '0'); }
  function toICSDate(d) {
    // format as YYYYMMDDTHHMMSSZ in UTC
    const dt = new Date(d);
    const y = dt.getUTCFullYear();
    const m = pad(dt.getUTCMonth() + 1);
    const day = pad(dt.getUTCDate());
    const h = pad(dt.getUTCHours());
    const min = pad(dt.getUTCMinutes());
    const s = pad(dt.getUTCSeconds());
    return `${y}${m}${day}T${h}${min}${s}Z`;
  }
  function downloadICS() {
    const uid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Codezen//Event//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}@codezen`,
      `DTSTAMP:${toICSDate(new Date())}`,
      `DTSTART:${toICSDate(eventStartISO)}`,
      `DTEND:${toICSDate(eventEndISO)}`,
      `SUMMARY:${escapeICS(eventTitle)}`,
      `LOCATION:${escapeICS(eventLocation)}`,
      `DESCRIPTION:${escapeICS('Join Codezen. Learn, build, and connect.')}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([lines], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugify(eventTitle)}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  function escapeICS(text) {
    return String(text).replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
  }
  function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  // Bind calendar buttons
  ['#addToCalendarTop', '#addToCalendarMid', '#addToCalendarBottom', '#successCalendar'].forEach(sel => {
    const btn = $(sel);
    if (btn) btn.addEventListener('click', downloadICS);
  });

  // Modal handling
  const modal = $('#registerModal');
  const regForm = $('#regForm');
  const successState = $('#successState');
  const openers = ['#openRegisterTop', '#openRegisterBottom'].map(sel => $(sel)).filter(Boolean);
  const closers = ['#closeRegister', '[data-close]'].flatMap(sel => $$(sel));

  function openModal() {
    if (!modal) return;
    modal.hidden = false;
    body.style.overflow = 'hidden';
    setTimeout(() => $('#fullName')?.focus(), 0);
  }
  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    body.style.overflow = '';
    if (successState) successState.hidden = true;
    if (regForm) {
      regForm.hidden = false;
      regForm.reset();
      clearErrors();
    }
  }

  openers.forEach(btn => btn.addEventListener('click', openModal));
  closers.forEach(btn => btn.addEventListener('click', closeModal));
  modal?.addEventListener('click', (e) => {
    if (e.target && (e.target instanceof HTMLElement) && e.target.hasAttribute('data-close')) {
      closeModal();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  // Form validation + local save
  const fields = ['fullName', 'email', 'studentId', 'year', 'consent'];
  function showError(id, msg) {
    const el = document.querySelector(`[data-error-for="${id}"]`);
    if (el) el.textContent = msg || '';
  }
  function clearErrors() { fields.forEach(f => showError(f, '')); }

  function validate() {
    clearErrors();
    let ok = true;

    const name = $('#fullName').value.trim();
    if (!name) { showError('fullName', 'Please enter your name.'); ok = false; }

    const email = $('#email').value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('email', 'Enter a valid email address.');
      ok = false;
    }

    const sid = $('#studentId').value.trim();
    if (!sid) { showError('studentId', 'Student ID is required.'); ok = false; }

    const yearSel = $('#year');
    if (!yearSel.value) { showError('year', 'Select your year.'); ok = false; }

    const consent = $('#consent').checked;
    if (!consent) { // inline message near checkbox
      alert('Please agree to receive event-related emails to proceed.');
      ok = false;
    }

    return ok;
  }

  regForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      fullName: $('#fullName').value.trim(),
      email: $('#email').value.trim(),
      studentId: $('#studentId').value.trim(),
      department: $('#department').value.trim(),
      year: $('#year').value,
      consent: $('#consent').checked,
      eventTitle,
      eventStartISO,
      eventEndISO,
      eventLocation,
      ts: new Date().toISOString()
    };

    // Save to localStorage as a demo. Replace with your API/Google Form endpoint as needed.
    try {
      const key = 'codezen_registrations';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(payload);
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {}

    // Show success state
    regForm.hidden = true;
    successState.hidden = false;
  });

  // Improve hit targets for iOS safe area on sticky bar
  // No-op, handled via CSS env(safe-area-inset-bottom)
})();