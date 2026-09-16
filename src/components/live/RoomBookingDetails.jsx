export function RoomBookingDetails({ details, studio, start, end, exact = false }) {
  if (!details) return null;
  const rows = details.rows.filter(r => r.studio_id === studio && (exact
    ? +new Date(r.starts_at) === +new Date(start) && +new Date(r.ends_at) === +new Date(end)
    : +new Date(r.starts_at) < +new Date(end) && +new Date(r.ends_at) > +new Date(start)));
  if (!rows.length) return <span className="room-booking-details">{details.loading ? 'Loading client details…' : 'Client details unavailable'}</span>;
  return <span className="room-booking-details">{rows.map((r, i) => <span className="room-booking-entry" key={i}>
    {r.state === 'changed' ? 'Booking changed · Awaiting room sync' : r.state !== 'current' ? 'Client details unavailable' : <>
      <span>{r.kind} · {r.status}{r.title ? ` · ${r.title}` : ''}</span>
      <span>{r.client_names?.length ? r.client_names.join(', ') : r.kind === 'Class' && r.client_count === 0 ? 'No clients booked' : 'Client name unavailable'}{r.client_names?.length > 0 && r.missing_names ? ` · ${r.missing_names} name(s) unavailable` : ''}</span>
    </>}
  </span>)}</span>;
}
