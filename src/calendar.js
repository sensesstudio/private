// Add a booked class to the client's calendar. Generates a standard .ics
// event (works with Apple Calendar, Google Calendar and Outlook) and hands it
// to the device — fully client-side, no backend. Includes a 2-hour reminder.

const pad = (n) => String(n).padStart(2, '0');
const fmtUTC = (d) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');

export function addClassToCalendar({ teacherName, startsAt, durationMin = 60, locName, address, format } = {}) {
  const start = startsAt instanceof Date ? startsAt : new Date(startsAt);
  if (!start || isNaN(start.getTime())) return false;
  const end = new Date(start.getTime() + durationMin * 60000);
  const fmtLabel = format === '1:2' ? 'Semi-private (1-on-2)' : 'Private (1-on-1)';
  const loc = [locName, address].filter(Boolean).join(' — ');
  const uid = `senses-${start.getTime()}-${String(teacherName || '').replace(/\s+/g, '')}@sensesprivate.com`;

  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Senses Studio//Booking//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${fmtUTC(new Date())}`,
    `DTSTART:${fmtUTC(start)}`,
    `DTEND:${fmtUTC(end)}`,
    `SUMMARY:${esc('Senses Pilates · ' + (teacherName || 'Private session'))}`,
    `DESCRIPTION:${esc(fmtLabel + ' Pilates session at Senses with ' + (teacherName || 'your instructor') + '. Please arrive 10 minutes early.')}`,
    loc ? `LOCATION:${esc(loc)}` : '',
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Senses Pilates session in 2 hours', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  try {
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'senses-class.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch {
    // Fallback: open as a data URI (older mobile browsers).
    window.open('data:text/calendar;charset=utf-8,' + encodeURIComponent(ics), '_blank');
    return true;
  }
}
