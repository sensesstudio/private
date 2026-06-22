// Senses Pilates — Mock data

export const LOCATIONS = [
  { id: 'central', name: 'Central',      blurb: 'Refined energy in the heart of the city', note: 'Flagship · 3 reformer studios', address: '1701, 17/F, H Queen’s, 80 Queen’s Road Central' },
  { id: 'cwb',     name: 'Causeway Bay', blurb: 'Vibrant and social — always in motion',   note: 'Open late · 6 days',            address: '20/F, The Hedon, 11 Matheson Street, Causeway Bay' },
  { id: 'qb',      name: 'Quarry Bay',   blurb: 'Sea-view stillness above the harbour',    note: 'Harbour-view studio', sea: true, address: '1906, 19/F, Westlands Centre, 20 Westlands Road, Quarry Bay' },
  { id: 'kt',      name: 'Kwun Tong',    blurb: 'Industrial calm, athletic focus',         note: 'Largest mat space',             address: '30B, TG Place, 10 Shing Yip Street, Kwun Tong' },
  { id: 'lck',     name: 'Lai Chi Kok',  blurb: 'Quiet, local and grounded',               note: 'Neighbourhood studio',          address: 'B, 31/F, Billion Plaza II, 10 Cheung Yue Street, Lai Chi Kok' },
];

export const TEACHERS = [
  {
    id: 't1', name: 'Élise Wong', initials: 'ÉW', ph: '',
    headline: 'Reformer & rehabilitation',
    specs: ['Reformer', 'Injury rehab', 'Posture'],
    rate: 580, locId: 'central', exp: 9, rating: 4.9, reviews: 212, match: 96,
    langs: ['English', 'Cantonese'],
    certs: ['STOTT Reformer (Full)', 'Polestar Rehabilitation', 'Pre/Postnatal'],
    bio: 'Élise blends clinical precision with calm. After nine years and a background in physiotherapy, she specialises in returning the body to ease — rebuilding strength around old injuries, one breath at a time.',
    style: 'Slow, precise, deeply attentive',
    nextAvail: 'Tomorrow · 7:00 AM',
  },
  {
    id: 't2', name: 'Marin Cheng', initials: 'MC', ph: 'sage',
    headline: 'Contemporary & athletic pilates',
    specs: ['Reformer', 'Athletic', 'Strength'],
    rate: 520, locId: 'cwb', exp: 6, rating: 4.8, reviews: 148, match: 91,
    langs: ['English', 'Mandarin'],
    certs: ['BASI Comprehensive', 'TRX Suspension'],
    bio: 'Marin trains the body like an athlete and treats the mind like a teammate. Expect dynamic, sweat-earning sessions that still end in stillness.',
    style: 'Energetic, progressive, motivating',
    nextAvail: 'Today · 6:30 PM',
  },
  {
    id: 't3', name: 'Noor Rahman', initials: 'NR', ph: 'almond',
    headline: 'Pre / postnatal & restorative',
    specs: ['Prenatal', 'Restorative', 'Breathwork'],
    rate: 540, locId: 'qb', exp: 8, rating: 4.9, reviews: 176, match: 88,
    langs: ['English', 'Hindi', 'Cantonese'],
    certs: ['Pre/Postnatal Specialist', 'Pink Ribbon Recovery', 'Restorative Yoga'],
    bio: 'Noor holds space for the body in transition — pregnancy, recovery, rest. Her sessions are gentle, intelligent and quietly strengthening.',
    style: 'Nurturing, intuitive, grounding',
    nextAvail: 'Thu · 10:00 AM',
  },
  {
    id: 't4', name: 'Aya Tanaka', initials: 'AT', ph: 'taupe',
    headline: 'Mat, mobility & conditioning',
    specs: ['Mat', 'Mobility', 'Conditioning'],
    rate: 480, locId: 'kt', exp: 5, rating: 4.7, reviews: 94, match: 84,
    langs: ['English', 'Japanese'],
    certs: ['Balanced Body Mat', 'FRC Mobility'],
    bio: 'Aya makes mobility feel like play. Her mat and conditioning work builds resilient, capable bodies that move well far beyond the studio.',
    style: 'Playful, technical, encouraging',
    nextAvail: 'Tomorrow · 12:15 PM',
  },
  {
    id: 't5', name: 'Sasha Lai', initials: 'SL', ph: 'blush',
    headline: 'Foundations & alignment',
    specs: ['Foundations', 'Alignment', 'Beginners'],
    rate: 450, locId: 'lck', exp: 4, rating: 4.8, reviews: 67, match: 79,
    langs: ['English', 'Cantonese'],
    certs: ['STOTT Matwork', 'Anatomy in Motion'],
    bio: 'Sasha is where many begin. Patient and exacting about the basics, she builds the foundation that makes every later practice safer and stronger.',
    style: 'Patient, clear, reassuring',
    nextAvail: 'Today · 2:00 PM',
  },
];

const _SOON = { t1: 'Free today · 4:30pm', t2: 'Free now · 6:30pm', t3: 'Opens tomorrow · 10:00', t4: 'Free today · 2:00pm', t5: 'Free now · 2:00pm' };
const _REASONS = {
  t1: ['Rehab specialist', 'Morning availability', 'Central studio'],
  t2: ['Strength focus', 'Evening slots', 'Top match'],
  t3: ['Restorative care', 'Calm & grounding', 'Harbour studio'],
  t4: ['Mobility & strength', 'Flexible times', 'Athletic focus'],
  t5: ['Ideal for starting', 'Patient & clear', 'Alignment focus'],
};
TEACHERS.forEach(t => {
  t.soon = _SOON[t.id];
  t.reasons = _REASONS[t.id];
  t.online = ['t1', 't2', 't4', 't5'].includes(t.id);
  t.responds = t.online ? 'Replies in minutes' : 'Replies within the hour';
});

export const teacherById = (id) => TEACHERS.find(t => t.id === id);
export const locName = (id) => (LOCATIONS.find(l => l.id === id) || {}).name || '';

export const PACKAGES = [
  // Private 1:1
  { id: 'p11-trial',  format: '1:1', name: 'Trial session', credits: 1,  price: 900,                tag: 'Begin',       blurb: 'A single private to find your fit.' },
  { id: 'p11-single', format: '1:1', name: 'Single class',  credits: 1,  price: 1200,               tag: '',            blurb: 'One private session, pay as you go.' },
  { id: 'p11-5',      format: '1:1', name: '5-class pack',  credits: 5,  price: 4750,  per: 950,    tag: 'Save 15%',    blurb: 'Five privates · valid 3 months.' },
  { id: 'p11-10',     format: '1:1', name: '10-class pack', credits: 10, price: 9000,  per: 900,    tag: 'Most chosen', blurb: 'Ten privates · best value · valid 6 months.', popular: true },
  // Semi-private 1:2
  { id: 'p12-trial',  format: '1:2', name: 'Trial session', credits: 1,  price: 1200,               tag: 'Begin',       blurb: 'A semi-private taster, for two.' },
  { id: 'p12-single', format: '1:2', name: 'Single class',  credits: 1,  price: 1600,               tag: '',            blurb: 'One semi-private session, pay as you go.' },
  { id: 'p12-5',      format: '1:2', name: '5-class pack',  credits: 5,  price: 6500,  per: 1300,   tag: 'Save 15%',    blurb: 'Five semi-privates · valid 3 months.' },
  { id: 'p12-10',     format: '1:2', name: '10-class pack', credits: 10, price: 12000, per: 1200,   tag: 'Most chosen', blurb: 'Ten semi-privates · best value · valid 6 months.', popular: true },
];

export const GOALS = [
  { id: 'strength', label: 'Build strength',      icon: 'dumbbell' },
  { id: 'flex',     label: 'Improve flexibility',  icon: 'wind' },
  { id: 'rehab',    label: 'Rehab an injury',      icon: 'heart-pulse' },
  { id: 'posture',  label: 'Posture & alignment',  icon: 'move-vertical' },
  { id: 'natal',    label: 'Pre / postnatal',       icon: 'flower-2' },
  { id: 'calm',     label: 'Stress & calm',         icon: 'waves' },
];
export const INJURIES = ['Lower back', 'Knees', 'Shoulders', 'Neck', 'Wrists', 'Hips', 'None'];
export const SCHEDULES = [
  { id: 'am',   label: 'Early morning', note: 'Before 9am' },
  { id: 'day',  label: 'Daytime',       note: '9am – 5pm' },
  { id: 'pm',   label: 'Evening',       note: 'After 5pm' },
  { id: 'wknd', label: 'Weekends',      note: 'Sat & Sun' },
];
export const LEVELS = [
  { id: 'new',  label: 'New to pilates',  note: 'Just beginning' },
  { id: 'some', label: 'Some experience', note: 'A handful of sessions' },
  { id: 'exp',  label: 'Experienced',     note: 'A regular practice' },
];

export const CLIENTS = [
  { id: 'c1',  name: 'Mara Whitfield',   initials: 'MW', goal: 'Rehab an injury',      joined: 'Jan 2024', sessions: 28, status: 'active', spend: 15400 },
  { id: 'c2',  name: 'Priya Nair',       initials: 'PN', goal: 'Build strength',        joined: 'Mar 2024', sessions: 19, status: 'active', spend: 9880 },
  { id: 'c3',  name: 'Daniel Koh',       initials: 'DK', goal: 'Posture & alignment',   joined: 'Nov 2023', sessions: 41, status: 'active', spend: 21300 },
  { id: 'c4',  name: 'Sofia Marchetti',  initials: 'SM', goal: 'Stress & calm',         joined: 'Feb 2024', sessions: 12, status: 'active', spend: 6480 },
  { id: 'c5',  name: 'Wing Lam',         initials: 'WL', goal: 'Pre / postnatal',        joined: 'Apr 2024', sessions: 8,  status: 'active', spend: 4320 },
  { id: 'c6',  name: 'Tom Bradley',      initials: 'TB', goal: 'Improve flexibility',    joined: 'May 2024', sessions: 5,  status: 'active', spend: 2700 },
  { id: 'c7',  name: 'Hana Sato',        initials: 'HS', goal: 'Build strength',         joined: 'Jun 2024', sessions: 3,  status: 'new',    spend: 1740 },
  { id: 'c8',  name: 'Ravi Mehta',       initials: 'RM', goal: 'Rehab an injury',        joined: 'Dec 2023', sessions: 22, status: 'active', spend: 11800 },
  { id: 'c9',  name: 'Clara Yuen',       initials: 'CY', goal: 'Posture & alignment',    joined: 'Oct 2023', sessions: 36, status: 'lapsed', spend: 18600 },
  { id: 'c10', name: 'Leon Fischer',     initials: 'LF', goal: 'Stress & calm',          joined: 'Jul 2024', sessions: 2,  status: 'new',    spend: 1160 },
];

const _bk = (id, cId, tId, date, time, status, type = 'Private') => {
  const t = teacherById(tId);
  return { id, cId, tId, date, time, status, type, locId: t.locId, amount: t.rate };
};
export const BOOKINGS = [
  _bk('b01','c1','t1','2026-06-16','07:00','confirmed'),
  _bk('b02','c2','t2','2026-06-16','18:30','confirmed'),
  _bk('b03','c3','t1','2026-06-17','08:00','confirmed'),
  _bk('b04','c4','t3','2026-06-17','10:00','confirmed'),
  _bk('b05','c5','t3','2026-06-18','11:00','confirmed','Prenatal'),
  _bk('b06','c6','t4','2026-06-18','12:15','confirmed'),
  _bk('b07','c1','t1','2026-06-12','07:00','completed'),
  _bk('b08','c3','t1','2026-06-10','08:00','completed'),
  _bk('b09','c2','t2','2026-06-11','18:30','completed'),
  _bk('b10','c8','t1','2026-06-09','09:00','completed'),
  _bk('b11','c4','t3','2026-06-08','10:00','completed'),
  _bk('b12','c9','t4','2026-06-05','17:00','completed'),
  _bk('b13','c7','t5','2026-06-14','14:00','confirmed'),
  _bk('b14','c10','t5','2026-06-15','15:00','confirmed','Intro'),
  _bk('b15','c8','t1','2026-06-19','09:00','confirmed'),
  _bk('b16','c3','t2','2026-06-04','18:30','completed'),
  _bk('b17','c1','t1','2026-06-02','07:00','completed'),
  _bk('b18','c6','t4','2026-06-13','12:15','cancelled'),
  _bk('b19','c2','t2','2026-06-20','18:30','confirmed'),
  _bk('b20','c5','t3','2026-06-21','11:00','confirmed','Postnatal'),
];

export const APPLICANTS = [
  { id: 'a1', name: 'Yuki Mori',   initials: 'YM', headline: 'Reformer & flexibility', exp: 7, locId: 'central', certs: ['STOTT Reformer', 'BASI Mat'], applied: '2 days ago', ph: 'sage' },
  { id: 'a2', name: 'Carlos Vega', initials: 'CV', headline: 'Athletic conditioning',  exp: 5, locId: 'kt',      certs: ['Balanced Body', 'NASM-CPT'], applied: '4 days ago', ph: 'almond' },
  { id: 'a3', name: 'Mei Lin',     initials: 'ML', headline: 'Restorative & breath',   exp: 6, locId: 'qb',      certs: ['Restorative Yoga', 'Pre/Postnatal'], applied: '5 days ago', ph: 'taupe' },
];

export const EARNINGS = [
  { m: 'Jan', v: 38200 }, { m: 'Feb', v: 41600 }, { m: 'Mar', v: 47900 },
  { m: 'Apr', v: 44300 }, { m: 'May', v: 52100 }, { m: 'Jun', v: 49400 },
];
export const REVENUE = [
  { m: 'Jan', v: 612 }, { m: 'Feb', v: 648 }, { m: 'Mar', v: 731 },
  { m: 'Apr', v: 705 }, { m: 'May', v: 812 }, { m: 'Jun', v: 768 },
];

export const PROGRESS_LOG = [
  { id: 'pl10', n: 10, date: '2026-06-12', tId: 't1', focus: 'Lower-back mobility & core control', note: 'Great session — your pelvic stability has noticeably improved. Held the bridge with control today. Next time we\'ll add single-leg work to challenge it further.' },
  { id: 'pl09', n: 9,  date: '2026-06-05', tId: 't1', focus: 'Hip hinge & posterior chain',         note: 'Hamstrings looser this week. Form on the hinge is clean now. Keep up the daily breathing drill — it\'s helping your rib position.' },
  { id: 'pl08', n: 8,  date: '2026-05-28', tId: 't1', focus: 'Standing alignment & balance',         note: 'Balance work paid off — much steadier on the unstable surface. Slight tendency to grip the toes; we\'ll soften that next round.' },
  { id: 'pl07', n: 7,  date: '2026-05-21', tId: 't2', focus: 'Core endurance & breathing',           note: 'Strong core engagement throughout. Watch the lower-back arch under fatigue — cue the deep breath to reset.' },
  { id: 'pl06', n: 6,  date: '2026-05-14', tId: 't1', focus: 'Lower-back rehab — flexion control',   note: 'Pain-free full range today, a real milestone. Confidence is up. We can begin gentle loading from here.' },
  { id: 'pl05', n: 5,  date: '2026-05-07', tId: 't1', focus: 'Pelvic floor & deep core',             note: 'Good connection to the deep core. Practise the cat-cow at home to keep the spine mobile between sessions.' },
  { id: 'pl04', n: 4,  date: '2026-04-30', tId: 't1', focus: 'Posture — thoracic extension',         note: 'Upper-back opened up nicely. Desk posture is the homework — set a reminder to reset every hour.' },
  { id: 'pl03', n: 3,  date: '2026-04-23', tId: 't1', focus: 'Foundations — neutral spine',          note: 'Finding neutral much faster now. Still cueing the shoulder drop; it\'ll become automatic with reps.' },
  { id: 'pl02', n: 2,  date: '2026-04-16', tId: 't1', focus: 'Breath & gentle mobilisation',         note: 'Settled in well. Breathing pattern improving. We kept load light to protect the lower back — right call.' },
  { id: 'pl01', n: 1,  date: '2026-04-09', tId: 't1', focus: 'Assessment & introduction',            note: 'Lovely first session. Mapped your lower-back history and set a gentle, progressive plan. Welcome to the studio.' },
];
