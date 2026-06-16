/* @ds-bundle: {"format":3,"namespace":"SensesStudioDesignSystem_19693b","components":[],"sourceHashes":{"ui_kits/app/AppHome.jsx":"8e7dd20b3519","ui_kits/app/AppScreens.jsx":"0d1ae04ed9ae","ui_kits/app/AppShared.jsx":"c5e9778e5174","ui_kits/app/ios-frame.jsx":"39f3a091d97d","ui_kits/website/Classes.jsx":"94b8b0da9f6c","ui_kits/website/Hero.jsx":"24490f4a98dc","ui_kits/website/Nav.jsx":"94d8a5b5cde1","ui_kits/website/Pricing.jsx":"4c8fb3543dda","ui_kits/website/Schedule.jsx":"00326cb03c6a"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SensesStudioDesignSystem_19693b = window.SensesStudioDesignSystem_19693b || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/app/AppHome.jsx
try { (() => {
// ── Home / Today ──────────────────────────────────────────────
function HomeScreen({
  onBook
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 22px 120px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "app-eyebrow"
  }, "Tuesday \xB7 21 May"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '8px 0 0',
      lineHeight: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-script)',
      fontSize: 40,
      color: 'var(--ink)'
    }
  }, "Good morning,"), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    className: "app-serif",
    style: {
      fontSize: 34
    }
  }, "Mara"))), /*#__PURE__*/React.createElement("div", {
    className: "app-ph",
    style: {
      width: 46,
      height: 46,
      borderRadius: '50%',
      flex: 'none'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22,
      borderRadius: 26,
      overflow: 'hidden',
      background: 'var(--taupe)',
      color: 'var(--ivory)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-ph",
    style: {
      position: 'absolute',
      inset: 0,
      opacity: .32
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      padding: '22px 22px 20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-eyebrow",
    style: {
      color: 'var(--blush)'
    }
  }, "Your next class"), /*#__PURE__*/React.createElement("div", {
    className: "app-serif",
    style: {
      fontSize: 30,
      color: 'var(--ivory)',
      margin: '8px 0 4px'
    }
  }, "Morning Flow"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 300,
      fontSize: 13,
      opacity: .9
    }
  }, "Today \xB7 7:00 AM \xB7 Studio A \xB7 \xC9lise"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "tap",
    style: {
      flex: 1,
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      fontSize: 11,
      letterSpacing: '.14em',
      textTransform: 'uppercase',
      background: 'var(--ivory)',
      color: 'var(--espresso)',
      border: 'none',
      borderRadius: 999,
      padding: '13px 0'
    }
  }, "Check in"), /*#__PURE__*/React.createElement("button", {
    className: "tap",
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 11,
      letterSpacing: '.14em',
      textTransform: 'uppercase',
      background: 'rgba(250,247,243,.16)',
      color: 'var(--ivory)',
      border: '1px solid rgba(250,247,243,.4)',
      borderRadius: 999,
      padding: '13px 20px'
    }
  }, "Details")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 16
    }
  }, [['flame', '12', 'day streak'], ['calendar-check', '8', 'this month']].map(([ic, n, l]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      flex: 1,
      background: 'var(--ivory)',
      borderRadius: 18,
      padding: '16px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: '0 4px 16px rgba(58,50,44,.05)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: ic,
    size: 20,
    color: "var(--terracotta)"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "app-serif",
    style: {
      fontSize: 24
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 300,
      fontSize: 10.5,
      color: 'var(--fg3)',
      letterSpacing: '.04em'
    }
  }, l))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      margin: '28px 0 14px'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "app-serif",
    style: {
      fontSize: 22,
      margin: 0
    }
  }, "Today at the studio"), /*#__PURE__*/React.createElement("span", {
    className: "app-eyebrow",
    style: {
      fontSize: 9,
      color: 'var(--clay)'
    }
  }, "See all")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, CLASSES.slice(0, 3).map(c => /*#__PURE__*/React.createElement(ClassRow, {
    key: c.id,
    c: c,
    onBook: onBook
  }))));
}

// ── Classes browse ────────────────────────────────────────────
function ClassesScreen({
  onBook
}) {
  const [filter, setFilter] = React.useState('All');
  const filters = ['All', 'Vinyasa', 'Reformer', 'Restorative', 'Express'];
  const list = filter === 'All' ? CLASSES : CLASSES.filter(c => c.tag === filter);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 22px 120px'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    className: "app-serif",
    style: {
      fontSize: 32,
      margin: '10px 0 4px'
    }
  }, "Classes"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 300,
      fontSize: 13,
      color: 'var(--fg3)',
      margin: '0 0 18px'
    }
  }, "Find your flow for the week."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      paddingBottom: 6,
      margin: '0 -22px 18px',
      padding: '0 22px 6px'
    }
  }, filters.map(f => /*#__PURE__*/React.createElement("span", {
    key: f,
    className: "tap",
    onClick: () => setFilter(f),
    style: {
      flex: 'none',
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 11,
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      padding: '9px 16px',
      borderRadius: 999,
      border: '1px solid ' + (filter === f ? 'var(--taupe)' : 'var(--linen)'),
      background: filter === f ? 'var(--taupe)' : 'transparent',
      color: filter === f ? 'var(--ivory)' : 'var(--taupe)'
    }
  }, f))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, list.map(c => /*#__PURE__*/React.createElement(ClassRow, {
    key: c.id,
    c: c,
    onBook: onBook
  }))));
}
window.HomeScreen = HomeScreen;
window.ClassesScreen = ClassesScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AppHome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AppScreens.jsx
try { (() => {
// ── Schedule (week) ───────────────────────────────────────────
function ScheduleScreen({
  onBook
}) {
  const days = [['Mon', 19], ['Tue', 20], ['Wed', 21], ['Thu', 22], ['Fri', 23], ['Sat', 24], ['Sun', 25]];
  const [sel, setSel] = React.useState(20);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 22px 120px'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    className: "app-serif",
    style: {
      fontSize: 32,
      margin: '10px 0 18px'
    }
  }, "Schedule"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 7,
      margin: '0 -22px 22px',
      padding: '0 22px',
      overflowX: 'auto'
    }
  }, days.map(([d, n]) => {
    const on = sel === n;
    return /*#__PURE__*/React.createElement("div", {
      key: d,
      className: "tap",
      onClick: () => setSel(n),
      style: {
        flex: 'none',
        width: 46,
        textAlign: 'center',
        padding: '12px 0',
        borderRadius: 16,
        background: on ? 'var(--taupe)' : 'transparent',
        color: on ? 'var(--ivory)' : 'var(--taupe)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-sans)',
        fontWeight: 500,
        fontSize: 9.5,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        opacity: .8
      }
    }, d), /*#__PURE__*/React.createElement("div", {
      className: "app-serif",
      style: {
        fontSize: 22,
        color: on ? 'var(--ivory)' : 'var(--espresso)',
        marginTop: 4
      }
    }, n));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 0
    }
  }, CLASSES.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    className: "tap",
    onClick: () => onBook(c),
    style: {
      display: 'flex',
      gap: 16,
      padding: '16px 0',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 52,
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-serif",
    style: {
      fontSize: 21,
      color: 'var(--espresso)'
    }
  }, c.time), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 300,
      fontSize: 10,
      color: 'var(--fg3)'
    }
  }, c.len)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-serif",
    style: {
      fontSize: 19
    }
  }, c.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 300,
      fontSize: 11.5,
      color: 'var(--fg3)',
      marginTop: 2
    }
  }, c.teacher, " \xB7 ", c.lvl)), /*#__PURE__*/React.createElement(Icon, {
    n: "chevron-right",
    size: 18,
    color: "var(--clay)"
  })))));
}

// ── Profile / membership ──────────────────────────────────────
function ProfileScreen() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 22px 120px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      margin: '10px 0 22px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-ph",
    style: {
      width: 64,
      height: 64,
      borderRadius: '50%',
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "app-serif",
    style: {
      fontSize: 28,
      margin: 0
    }
  }, "Mara Whitfield"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 300,
      fontSize: 12,
      color: 'var(--fg3)',
      marginTop: 3
    }
  }, "Member since 2023"))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 24,
      background: 'var(--espresso)',
      color: 'var(--cream)',
      padding: '24px 24px 22px',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/submark-black-trim.png",
    alt: "",
    style: {
      position: 'absolute',
      right: -16,
      top: -10,
      height: 120,
      filter: 'brightness(0) invert(1)',
      opacity: .12
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "app-eyebrow",
    style: {
      color: 'var(--blush)'
    }
  }, "Unlimited Membership"), /*#__PURE__*/React.createElement("div", {
    className: "app-serif",
    style: {
      fontSize: 30,
      color: 'var(--cream)',
      margin: '10px 0 2px'
    }
  }, "Active"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 300,
      fontSize: 12,
      opacity: .8
    }
  }, "Renews 1 June \xB7 $179/mo"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 28,
      marginTop: 22
    }
  }, [['142', 'classes'], ['2', 'guest passes']].map(([n, l]) => /*#__PURE__*/React.createElement("div", {
    key: l
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-serif",
    style: {
      fontSize: 24,
      color: 'var(--cream)'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 300,
      fontSize: 10,
      opacity: .7,
      letterSpacing: '.06em'
    }
  }, l))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22,
      background: 'var(--ivory)',
      borderRadius: 20,
      overflow: 'hidden'
    }
  }, [['credit-card', 'Payment & billing'], ['bell', 'Notifications'], ['heart', 'Saved classes'], ['settings', 'Preferences'], ['log-out', 'Sign out']].map(([ic, l], i, a) => /*#__PURE__*/React.createElement("div", {
    key: l,
    className: "tap",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '16px 18px',
      borderBottom: i < a.length - 1 ? '1px solid var(--border)' : 'none'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: ic,
    size: 18,
    color: "var(--taupe)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: 'var(--font-sans)',
      fontWeight: 400,
      fontSize: 14,
      color: 'var(--espresso)'
    }
  }, l), /*#__PURE__*/React.createElement(Icon, {
    n: "chevron-right",
    size: 16,
    color: "var(--clay)"
  })))));
}
window.ScheduleScreen = ScheduleScreen;
window.ProfileScreen = ProfileScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AppScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AppShared.jsx
try { (() => {
// ── Shared bits ───────────────────────────────────────────────
const CLASSES = [{
  id: 1,
  tag: 'Vinyasa',
  title: 'Morning Flow',
  teacher: 'Élise',
  time: '7:00',
  len: '60 min',
  lvl: 'All levels',
  ph: '',
  spots: 4
}, {
  id: 2,
  tag: 'Reformer',
  title: 'Pilates Sculpt',
  teacher: 'Marin',
  time: '9:30',
  len: '50 min',
  lvl: 'Intermediate',
  ph: 'sage',
  spots: 2
}, {
  id: 3,
  tag: 'Express',
  title: 'Lunch Flow',
  teacher: 'Noor',
  time: '12:15',
  len: '30 min',
  lvl: 'All levels',
  ph: 'almond',
  spots: 8
}, {
  id: 4,
  tag: 'Restorative',
  title: 'Slow & Restore',
  teacher: 'Aya',
  time: '18:00',
  len: '75 min',
  lvl: 'All levels',
  ph: 'taupe',
  spots: 0
}];
function Icon({
  n,
  size = 22,
  color = 'currentColor',
  sw = 1.6
}) {
  return /*#__PURE__*/React.createElement("i", {
    "data-lucide": n,
    style: {
      width: size,
      height: size,
      color,
      strokeWidth: sw
    }
  });
}
function Pill({
  children,
  color = 'var(--taupe)',
  bg = 'var(--sand)'
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 9.5,
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      color,
      background: bg,
      padding: '5px 11px',
      borderRadius: 999
    }
  }, children);
}

// ── Bottom tab bar ────────────────────────────────────────────
function TabBar({
  tab,
  setTab
}) {
  const tabs = [['home', 'Today'], ['flower-2', 'Classes'], ['calendar', 'Schedule'], ['user', 'You']];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 40,
      background: 'rgba(250,247,243,.9)',
      backdropFilter: 'blur(14px)',
      borderTop: '1px solid var(--border)',
      padding: '12px 24px 30px',
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, tabs.map(([ic, label]) => {
    const on = tab === label;
    return /*#__PURE__*/React.createElement("div", {
      key: label,
      className: "tap",
      onClick: () => setTab(label),
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        flex: 1,
        color: on ? 'var(--taupe)' : 'var(--fg3)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: ic,
      size: 22,
      sw: on ? 2 : 1.6
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-sans)',
        fontWeight: on ? 600 : 400,
        fontSize: 9.5,
        letterSpacing: '.08em',
        textTransform: 'uppercase'
      }
    }, label));
  }));
}

// ── Class row ─────────────────────────────────────────────────
function ClassRow({
  c,
  onBook
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "tap",
    onClick: () => onBook(c),
    style: {
      display: 'flex',
      gap: 14,
      alignItems: 'center',
      background: 'var(--ivory)',
      borderRadius: 20,
      padding: 12,
      boxShadow: '0 4px 16px rgba(58,50,44,.06)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: 'app-ph ' + c.ph,
    style: {
      width: 64,
      height: 64,
      borderRadius: 14,
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-eyebrow",
    style: {
      fontSize: 9
    }
  }, c.tag), /*#__PURE__*/React.createElement("div", {
    className: "app-serif",
    style: {
      fontSize: 19,
      margin: '2px 0 3px'
    }
  }, c.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 300,
      fontSize: 11.5,
      color: 'var(--fg3)'
    }
  }, c.time, " \xB7 ", c.len, " \xB7 ", c.teacher)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right',
      flex: 'none'
    }
  }, c.spots === 0 ? /*#__PURE__*/React.createElement(Pill, {
    color: "#9a8a7c",
    bg: "#efe7dd"
  }, "Waitlist") : /*#__PURE__*/React.createElement(Pill, {
    color: "#5f6650",
    bg: "rgba(138,144,121,.2)"
  }, c.spots, " left")));
}
window.CLASSES = CLASSES;
window.Icon = Icon;
window.Pill = Pill;
window.TabBar = TabBar;
window.ClassRow = ClassRow;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AppShared.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ios-frame.jsx
try { (() => {
/* BEGIN USAGE */
// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports (to window): IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard
//
// Usage — wrap your screen content in <IOSDevice> to get the bezel, status bar
// and home indicator (props: title, dark, keyboard):
//
//   <IOSDevice title="Settings">
//     ...your screen content...
//   </IOSDevice>
//   <IOSDevice dark title="Search" keyboard>…</IOSDevice>
/* END USAGE */

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({
  dark = false,
  time = '9:41'
}) {
  const c = dark ? '#fff' : '#000';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 154,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '21px 24px 19px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 20,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '-apple-system, "SF Pro", system-ui',
      fontWeight: 590,
      fontSize: 17,
      lineHeight: '22px',
      color: c
    }
  }, time)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingTop: 1,
      paddingRight: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "12",
    viewBox: "0 0 19 12"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7.5",
    width: "3.2",
    height: "4.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.8",
    y: "5",
    width: "3.2",
    height: "7",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.6",
    y: "2.5",
    width: "3.2",
    height: "9.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.4",
    y: "0",
    width: "3.2",
    height: "12",
    rx: "0.7",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "12",
    viewBox: "0 0 17 12"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "10.5",
    r: "1.5",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "27",
    height: "13",
    viewBox: "0 0 27 13"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "23",
    height: "12",
    rx: "3.5",
    stroke: c,
    strokeOpacity: "0.35",
    fill: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "9",
    rx: "2",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z",
    fill: c,
    fillOpacity: "0.4"
  }))));
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({
  children,
  dark = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      minWidth: 44,
      borderRadius: 9999,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: dark ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({
  title = 'Title',
  dark = false,
  trailingIcon = true
}) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = content => /*#__PURE__*/React.createElement(IOSGlassPill, {
    dark: dark
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, content));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      paddingTop: 62,
      paddingBottom: 10,
      position: 'relative',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }
  }, pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "20",
    viewBox: "0 0 12 20",
    fill: "none",
    style: {
      marginLeft: -1
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 2L2 10l8 8",
    stroke: muted,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), trailingIcon && pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "6",
    viewBox: "0 0 22 6"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "3",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "3",
    r: "2.5",
    fill: muted
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px',
      fontFamily: '-apple-system, system-ui',
      fontSize: 34,
      fontWeight: 700,
      lineHeight: '41px',
      color: text,
      letterSpacing: 0.4
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({
  title,
  detail,
  icon,
  chevron = true,
  isLast = false,
  dark = false
}) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 52,
      padding: '0 16px',
      position: 'relative',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      letterSpacing: -0.43
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 7,
      background: icon,
      marginRight: 12,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      color: text
    }
  }, title), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      color: sec,
      marginRight: 6
    }
  }, detail), chevron && /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "14",
    viewBox: "0 0 8 14",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1l6 6-6 6",
    stroke: ter,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), !isLast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: icon ? 58 : 16,
      height: 0.5,
      background: sep
    }
  }));
}
function IOSList({
  header,
  children,
  dark = false
}) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return /*#__PURE__*/React.createElement("div", null, header && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '-apple-system, system-ui',
      fontSize: 13,
      color: hc,
      textTransform: 'uppercase',
      padding: '8px 36px 6px',
      letterSpacing: -0.08
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 26,
      margin: '0 16px',
      overflow: 'hidden'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
  title,
  keyboard = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: 48,
      overflow: 'hidden',
      position: 'relative',
      background: dark ? '#000' : '#F2F2F7',
      boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system, system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 11,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 126,
      height: 37,
      borderRadius: 24,
      background: '#000',
      zIndex: 50
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement(IOSStatusBar, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, title !== undefined && /*#__PURE__*/React.createElement(IOSNavBar, {
    title: title,
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, children), keyboard && /*#__PURE__*/React.createElement(IOSKeyboard, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 60,
      height: 34,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingBottom: 8,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 139,
      height: 5,
      borderRadius: 100,
      background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'
    }
  })));
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({
  dark = false
}) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: /*#__PURE__*/React.createElement("svg", {
      width: "19",
      height: "17",
      viewBox: "0 0 19 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z",
      fill: glyph
    })),
    del: /*#__PURE__*/React.createElement("svg", {
      width: "23",
      height: "17",
      viewBox: "0 0 23 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z",
      fill: "none",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 5l7 7M17 5l-7 7",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinecap: "round"
    })),
    ret: /*#__PURE__*/React.createElement("svg", {
      width: "20",
      height: "14",
      viewBox: "0 0 20 14"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M18 1v6H4m0 0l4-4M4 7l4 4",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))
  };
  const key = (content, {
    w,
    flex,
    ret,
    fs = 25,
    k
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      height: 42,
      borderRadius: 8.5,
      flex: flex ? 1 : undefined,
      width: w,
      minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs,
      fontWeight: 458,
      color: ret ? '#fff' : glyph
    }
  }, content);
  const row = (keys, pad = 0) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      justifyContent: 'center',
      padding: `0 ${pad}px`
    }
  }, keys.map(l => key(l, {
    flex: true,
    k: l
  })));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 15,
      borderRadius: 27,
      overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: dark ? '0 -2px 20px rgba(0,0,0,0.09)' : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      alignItems: 'center',
      padding: '8px 22px 13px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, ['"The"', 'the', 'to'].map((w, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 25,
      background: '#ccc',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      color: sugg,
      letterSpacing: -0.43,
      lineHeight: '22px'
    }
  }, w)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13,
      padding: '0 6.5px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], 20), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14.25,
      alignItems: 'center'
    }
  }, key(icons.shift, {
    w: 45,
    k: 'shift'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      flex: 1
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l, {
    flex: true,
    k: l
  }))), key(icons.del, {
    w: 45,
    k: 'del'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, key('ABC', {
    w: 92.25,
    fs: 18,
    k: 'abc'
  }), key('', {
    flex: true,
    k: 'space'
  }), key(icons.ret, {
    w: 92.25,
    ret: true,
    k: 'ret'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      width: '100%',
      position: 'relative'
    }
  }));
}
Object.assign(window, {
  IOSDevice,
  IOSStatusBar,
  IOSNavBar,
  IOSGlassPill,
  IOSList,
  IOSListRow,
  IOSKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ios-frame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Classes.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Word marquee + class cards grid
function Marquee() {
  const words = ['breathe', 'flow', 'restore', 'ground', 'soften', 'move', 'gather', 'stillness'];
  const row = [...words, ...words];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
      padding: '22px 0',
      overflow: 'hidden',
      background: 'var(--ivory)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 0,
      whiteSpace: 'nowrap',
      animation: 'ss-marq 32s linear infinite',
      width: 'max-content'
    }
  }, row.map((w, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      display: 'inline-flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "serif",
    style: {
      fontSize: 30,
      fontStyle: 'italic',
      color: 'var(--taupe)',
      padding: '0 28px'
    }
  }, w), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'var(--clay)'
    }
  })))));
}
function ClassCard({
  tag,
  title,
  desc,
  meta,
  ph
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: 'var(--ivory)',
      borderRadius: 24,
      overflow: 'hidden',
      boxShadow: hover ? '0 18px 50px rgba(58,50,44,.12)' : '0 6px 24px rgba(58,50,44,.08)',
      transform: hover ? 'translateY(-4px)' : 'none',
      transition: 'all .4s var(--ease)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: 'ph ' + ph,
    "data-label": "Class",
    style: {
      height: 200
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 24px 26px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      fontSize: 10
    }
  }, tag), /*#__PURE__*/React.createElement("h3", {
    className: "serif",
    style: {
      fontSize: 28,
      margin: '8px 0 8px'
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 300,
      fontSize: 14,
      lineHeight: 1.65,
      color: 'var(--taupe)',
      margin: '0 0 16px'
    }
  }, desc), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      color: 'var(--fg3)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "clock",
    style: {
      width: 14,
      height: 14
    }
  }), meta)));
}
function Classes() {
  const items = [{
    tag: 'Vinyasa',
    title: 'Morning Flow',
    desc: 'A grounding flow to wake the body and steady the mind.',
    meta: '60 min · all levels',
    ph: 'ph-rose'
  }, {
    tag: 'Reformer',
    title: 'Pilates Sculpt',
    desc: 'Controlled, low-impact strength on the reformer.',
    meta: '50 min · intermediate',
    ph: 'ph-sage'
  }, {
    tag: 'Restorative',
    title: 'Slow & Restore',
    desc: 'Deep, supported stretches to fully unwind.',
    meta: '75 min · all levels',
    ph: 'ph-taupe'
  }];
  return /*#__PURE__*/React.createElement("section", {
    id: "classes",
    style: {
      padding: '96px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 56
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 16
    }
  }, "What we offer"), /*#__PURE__*/React.createElement("h2", {
    className: "serif",
    style: {
      fontSize: 52,
      margin: 0
    }
  }, "Classes for every body")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 28
    },
    className: "class-grid"
  }, items.map(it => /*#__PURE__*/React.createElement(ClassCard, _extends({
    key: it.title
  }, it))))));
}
window.Marquee = Marquee;
window.Classes = Classes;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Classes.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Hero.jsx
try { (() => {
// Full-bleed hero — script + serif headline, image, CTAs
function Hero({
  onBook
}) {
  return /*#__PURE__*/React.createElement("section", {
    id: "top",
    style: {
      paddingTop: 40,
      paddingBottom: 90
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 64,
      alignItems: 'center'
    },
    className: "hero-grid"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 24
    }
  }, "Yoga + Pilates Studio"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "script",
    style: {
      fontSize: 92,
      display: 'block',
      color: 'var(--ink)'
    }
  }, "A space to"), /*#__PURE__*/React.createElement("span", {
    className: "serif",
    style: {
      fontSize: 72,
      display: 'block',
      marginTop: 6
    }
  }, "move & breathe")), /*#__PURE__*/React.createElement("p", {
    className: "hero-lede",
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 21,
      lineHeight: 1.5,
      color: 'var(--espresso)',
      maxWidth: 440,
      margin: '26px 0 36px'
    }
  }, "Slow, intentional movement in a warm, light-filled studio. Come as you are \u2014 leave a little lighter."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      alignItems: 'center',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: onBook
  }, "Book a class"), /*#__PURE__*/React.createElement("a", {
    href: "#schedule",
    className: "btn btn-ghost"
  }, /*#__PURE__*/React.createElement("span", null, "View the schedule"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 32,
      marginTop: 52
    }
  }, [['12+', 'weekly classes'], ['3', 'studio rooms'], ['500+', 'happy members']].map(([n, l]) => /*#__PURE__*/React.createElement("div", {
    key: l
  }, /*#__PURE__*/React.createElement("div", {
    className: "serif",
    style: {
      fontSize: 34
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      fontSize: 10,
      marginTop: 4,
      color: 'var(--fg3)'
    }
  }, l))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ph ph-rose",
    "data-label": "Studio \xB7 natural light",
    style: {
      height: 540,
      borderRadius: 220,
      borderBottomRightRadius: 40
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: -28,
      bottom: 48,
      background: 'var(--ivory)',
      borderRadius: 20,
      padding: '18px 22px',
      boxShadow: '0 18px 50px rgba(58,50,44,.12)',
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/submark-black-trim.png",
    alt: "",
    style: {
      height: 38
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "serif",
    style: {
      fontSize: 19
    }
  }, "Next class"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      letterSpacing: '.06em',
      color: 'var(--taupe)',
      marginTop: 2
    }
  }, "Vinyasa Flow \xB7 7:00 AM"))))));
}
window.Hero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Nav.jsx
try { (() => {
// Sticky brand header with mobile toggle
function Nav({
  onBook
}) {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const el = document.querySelector('.kit-scroll') || window;
    const tgt = el === window ? window : el;
    const handler = () => {
      const y = el === window ? window.scrollY : el.scrollTop;
      setScrolled(y > 24);
    };
    tgt.addEventListener('scroll', handler);
    return () => tgt.removeEventListener('scroll', handler);
  }, []);
  const links = ['Classes', 'Schedule', 'Pricing', 'About'];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: scrolled ? 'rgba(245,239,234,.82)' : 'transparent',
      backdropFilter: scrolled ? 'saturate(140%) blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid var(--border-soft)' : '1px solid transparent',
      transition: 'all .4s var(--ease)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 78
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#top",
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-combo-black.png",
    alt: "Senses Studio",
    style: {
      height: 30
    }
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 34
    },
    className: "desk-nav"
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: '#' + l.toLowerCase(),
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 400,
      letterSpacing: '.18em',
      textTransform: 'uppercase',
      color: 'var(--espresso)',
      textDecoration: 'none',
      transition: 'color .3s'
    },
    onMouseEnter: e => e.target.style.color = 'var(--taupe)',
    onMouseLeave: e => e.target.style.color = 'var(--espresso)'
  }, l)), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      padding: '11px 24px'
    },
    onClick: onBook
  }, "Book now")), /*#__PURE__*/React.createElement("button", {
    className: "mob-toggle",
    onClick: () => setOpen(o => !o),
    "aria-label": "Menu",
    style: {
      display: 'none',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--espresso)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": open ? 'x' : 'menu'
  }))), open && /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      paddingBottom: 22,
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: '#' + l.toLowerCase(),
    onClick: () => setOpen(false),
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      letterSpacing: '.16em',
      textTransform: 'uppercase',
      color: 'var(--espresso)',
      textDecoration: 'none'
    }
  }, l)), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: onBook
  }, "Book now")));
}
window.Nav = Nav;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Nav.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Pricing.jsx
try { (() => {
// Pricing / membership + quote + footer
function Pricing({
  onBook
}) {
  const plans = [{
    name: 'Drop-in',
    price: '$28',
    unit: 'per class',
    feats: ['Any single class', 'Mat & props included', 'No commitment'],
    featured: false
  }, {
    name: 'Unlimited',
    price: '$179',
    unit: 'per month',
    feats: ['Unlimited classes', 'Priority booking', '2 guest passes', 'Member events'],
    featured: true
  }, {
    name: 'Ten pack',
    price: '$240',
    unit: '10 classes',
    feats: ['Valid 6 months', 'Shareable', 'Mat & props included'],
    featured: false
  }];
  return /*#__PURE__*/React.createElement("section", {
    id: "pricing",
    style: {
      padding: '96px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 56
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 16
    }
  }, "Membership"), /*#__PURE__*/React.createElement("h2", {
    className: "serif",
    style: {
      fontSize: 52,
      margin: 0
    }
  }, "Move on your terms")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 24,
      maxWidth: 1000,
      margin: '0 auto'
    },
    className: "price-grid"
  }, plans.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.name,
    style: {
      background: p.featured ? 'var(--taupe)' : 'var(--ivory)',
      color: p.featured ? 'var(--ivory)' : 'var(--ink)',
      border: p.featured ? 'none' : '1px solid var(--border)',
      borderRadius: 28,
      padding: '38px 32px',
      position: 'relative'
    }
  }, p.featured && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 22,
      right: 24
    },
    className: "eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--blush)'
    }
  }, "Most loved")), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      color: p.featured ? 'var(--blush)' : 'var(--taupe)'
    }
  }, p.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 8,
      margin: '18px 0 4px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "serif",
    style: {
      fontSize: 52,
      color: p.featured ? 'var(--ivory)' : 'var(--espresso)'
    }
  }, p.price), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      letterSpacing: '.08em',
      color: p.featured ? 'rgba(250,247,243,.7)' : 'var(--fg3)'
    }
  }, p.unit)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: p.featured ? 'rgba(250,247,243,.18)' : 'var(--border)',
      margin: '24px 0'
    }
  }), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      padding: 0,
      margin: '0 0 30px',
      display: 'flex',
      flexDirection: 'column',
      gap: 13
    }
  }, p.feats.map(f => /*#__PURE__*/React.createElement("li", {
    key: f,
    style: {
      display: 'flex',
      gap: 11,
      alignItems: 'center',
      fontFamily: 'var(--font-sans)',
      fontWeight: 300,
      fontSize: 14,
      color: p.featured ? 'rgba(250,247,243,.92)' : 'var(--taupe)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "check",
    style: {
      width: 15,
      height: 15,
      color: p.featured ? 'var(--blush)' : 'var(--terracotta)'
    }
  }), f))), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    style: p.featured ? {
      background: 'var(--ivory)',
      color: 'var(--espresso)',
      width: '100%',
      justifyContent: 'center'
    } : {
      background: 'transparent',
      color: 'var(--espresso)',
      border: '1px solid var(--taupe)',
      width: '100%',
      justifyContent: 'center'
    },
    onClick: onBook
  }, "Choose ", p.name))))));
}
function Quote() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '110px 0',
      background: 'var(--almond)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      maxWidth: 880,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/submark-black-trim.png",
    alt: "",
    style: {
      height: 52,
      marginBottom: 28,
      opacity: .8
    }
  }), /*#__PURE__*/React.createElement("p", {
    className: "serif",
    style: {
      fontStyle: 'italic',
      fontWeight: 400,
      fontSize: 40,
      lineHeight: 1.3,
      color: 'var(--espresso)',
      margin: 0
    }
  }, "\u201CI leave every class feeling more myself. Senses has become my weekly ritual \u2014 a place to slow down and simply breathe.\u201D"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginTop: 30,
      color: 'var(--taupe)'
    }
  }, "Mara \xB7 member since 2023")));
}
function Footer({
  onBook
}) {
  return /*#__PURE__*/React.createElement("footer", {
    id: "about",
    style: {
      background: 'var(--espresso)',
      color: 'var(--cream)',
      padding: '80px 0 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr 1fr',
      gap: 48,
      paddingBottom: 56,
      borderBottom: '1px solid rgba(245,239,234,.14)'
    },
    className: "foot-grid"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-combo-black.png",
    alt: "Senses Studio",
    style: {
      height: 34,
      filter: 'brightness(0) invert(1)',
      opacity: .95
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 19,
      lineHeight: 1.5,
      color: 'rgba(245,239,234,.7)',
      maxWidth: 320,
      marginTop: 20
    }
  }, "A space to move slowly and breathe deeply. Yoga + Pilates for every body.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      color: 'var(--clay)',
      marginBottom: 18
    }
  }, "Visit"), ['14 Linden Lane', 'Fitzroy, VIC 3065', 'Mon–Sun · 6am–8pm'].map(t => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 300,
      fontSize: 14,
      color: 'rgba(245,239,234,.78)',
      marginBottom: 10
    }
  }, t))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      color: 'var(--clay)',
      marginBottom: 18
    }
  }, "Stay close"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      marginBottom: 22
    }
  }, ['instagram', 'mail', 'phone'].map(ic => /*#__PURE__*/React.createElement("a", {
    key: ic,
    href: "#",
    style: {
      width: 40,
      height: 40,
      borderRadius: '50%',
      border: '1px solid rgba(245,239,234,.24)',
      display: 'grid',
      placeItems: 'center',
      color: 'var(--cream)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": ic,
    style: {
      width: 16,
      height: 16
    }
  })))), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    style: {
      background: 'var(--cream)',
      color: 'var(--espresso)'
    },
    onClick: onBook
  }, "Book a class"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 28,
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      letterSpacing: '.08em',
      color: 'rgba(245,239,234,.5)'
    },
    className: "foot-bottom"
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Senses Studio"), /*#__PURE__*/React.createElement("span", null, "Yoga + Pilates"))));
}
window.Pricing = Pricing;
window.Quote = Quote;
window.Footer = Footer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Pricing.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Schedule.jsx
try { (() => {
// Schedule with day tabs + class rows; rows are bookable
function Schedule({
  onBook
}) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const [day, setDay] = React.useState('Tue');
  const byDay = {
    Mon: [['6:30', 'Sunrise Vinyasa', 'Élise', '60 min', 'soft']],
    Tue: [['7:00', 'Morning Flow', 'Élise', '60 min', 'open'], ['9:30', 'Pilates Sculpt', 'Marin', '50 min', 'open'], ['12:15', 'Express Flow', 'Noor', '30 min', 'soft'], ['18:00', 'Slow & Restore', 'Aya', '75 min', 'full']],
    Wed: [['8:00', 'Reformer Basics', 'Marin', '50 min', 'open']],
    Thu: [['7:00', 'Morning Flow', 'Élise', '60 min', 'open'], ['19:00', 'Candlelit Yin', 'Aya', '75 min', 'soft']],
    Fri: [['9:30', 'Pilates Sculpt', 'Marin', '50 min', 'open']],
    Sat: [['8:30', 'Weekend Flow', 'Noor', '75 min', 'open'], ['10:30', 'Restore', 'Aya', '60 min', 'soft']],
    Sun: [['9:00', 'Slow Sunday', 'Élise', '90 min', 'open']]
  };
  const avail = {
    open: ['Spots open', 'var(--sage)'],
    soft: ['Filling up', 'var(--terracotta)'],
    full: ['Waitlist', 'var(--fg3)']
  };
  const rows = byDay[day] || [];
  return /*#__PURE__*/React.createElement("section", {
    id: "schedule",
    style: {
      padding: '96px 0',
      background: 'var(--ivory)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      maxWidth: 900
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 44
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 16
    }
  }, "This week"), /*#__PURE__*/React.createElement("h2", {
    className: "serif",
    style: {
      fontSize: 52,
      margin: 0
    }
  }, "Find your time")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: 6,
      marginBottom: 36,
      flexWrap: 'wrap'
    }
  }, days.map(d => /*#__PURE__*/React.createElement("button", {
    key: d,
    onClick: () => setDay(d),
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      padding: '11px 20px',
      borderRadius: 999,
      cursor: 'pointer',
      transition: 'all .3s var(--ease)',
      border: '1px solid ' + (day === d ? 'var(--taupe)' : 'transparent'),
      background: day === d ? 'var(--taupe)' : 'transparent',
      color: day === d ? 'var(--ivory)' : 'var(--taupe)'
    }
  }, d))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, rows.map((r, i) => {
    const [a, color] = avail[r[4]];
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'grid',
        gridTemplateColumns: '88px 1fr auto auto',
        gap: 20,
        alignItems: 'center',
        padding: '22px 8px',
        borderBottom: '1px solid var(--border)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "serif",
      style: {
        fontSize: 26,
        color: 'var(--espresso)'
      }
    }, r[0]), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "serif",
      style: {
        fontSize: 22
      }
    }, r[1]), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
        letterSpacing: '.06em',
        color: 'var(--fg3)',
        marginTop: 3
      }
    }, r[2], " \xB7 ", r[3])), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        color
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: color
      }
    }), a), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-outline",
      style: {
        padding: '10px 22px'
      },
      disabled: r[4] === 'full',
      onClick: onBook
    }, r[4] === 'full' ? 'Waitlist' : 'Book'));
  }))));
}
window.Schedule = Schedule;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Schedule.jsx", error: String((e && e.message) || e) }); }

})();
