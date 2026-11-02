/* Talking Rev · gambar Rev (kucing oranye) dan ikon benda, semuanya SVG.
   revSVG(mood) mengembalikan string <svg>. Dipakai juga oleh scripts/generate-images.mjs
   supaya thumbnail sama persis dengan isi game.

   Mulut punya dua versi: .mouth (diam) dan .mouth-talk (terbuka). Saat Rev bicara/mengunyah,
   game menukar keduanya lewat class .yap di pembungkus, tanpa menggambar ulang SVG. */

const ICONS = {
  makan: `<ellipse cx="32" cy="48" rx="29" ry="9" fill="#fff" stroke="#C9B8A6" stroke-width="3"/>
    <path d="M8 36 Q25 16 44 36 Q25 54 8 36Z" fill="#4FA3F7" stroke="#2C6FB8" stroke-width="3" stroke-linejoin="round"/>
    <path d="M44 36 L57 25 V47Z" fill="#4FA3F7" stroke="#2C6FB8" stroke-width="3" stroke-linejoin="round"/>
    <path d="M28 27 Q32 36 28 45" fill="none" stroke="#2C6FB8" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="17" cy="34" r="3" fill="#2B1B12"/>`,
  minum: `<path d="M14 6 H50 L45 55 Q44 60 39 60 H25 Q20 60 19 55Z" fill="#E6F4FF" stroke="#2C6FB8" stroke-width="3" stroke-linejoin="round"/>
    <path d="M17 24 H47 L43 55 Q42 58 39 58 H25 Q22 58 21 55Z" fill="#4FA3F7"/>
    <path d="M22 30 L25 52" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`,
  obat: `<rect x="23" y="2" width="18" height="11" rx="3" fill="#8A4FD8"/>
    <path d="M22 13 H42 V19 Q51 23 51 32 V54 Q51 61 44 61 H20 Q13 61 13 54 V32 Q13 23 22 19Z" fill="#EBDDFF" stroke="#8A4FD8" stroke-width="3" stroke-linejoin="round"/>
    <path d="M14.5 40 H49.5 V54 Q49.5 59.5 44 59.5 H20 Q14.5 59.5 14.5 54Z" fill="#B48CFF"/>
    <rect x="19" y="28" width="26" height="18" rx="4" fill="#fff"/>
    <path d="M32 42 C24 36 26 30 29.5 31 Q31.5 31.5 32 34 Q32.5 31.5 34.5 31 C38 30 40 36 32 42Z" fill="#FF6B8A"/>`,
  sendok: `<path d="M34 38 L59 9" stroke="#8AA0B8" stroke-width="8" stroke-linecap="round"/>
    <ellipse cx="22" cy="44" rx="19" ry="13" fill="#fff" stroke="#8AA0B8" stroke-width="3.5"/>
    <path d="M10 44 H34" stroke="#C9D3DE" stroke-width="2" stroke-dasharray="3 3"/>`,
  sendokPenuh: `<path d="M34 38 L59 9" stroke="#8AA0B8" stroke-width="8" stroke-linecap="round"/>
    <ellipse cx="22" cy="44" rx="19" ry="13" fill="#fff" stroke="#8AA0B8" stroke-width="3.5"/>
    <ellipse cx="22" cy="45" rx="14" ry="8.5" fill="#B48CFF"/><ellipse cx="17" cy="42" rx="4" ry="2" fill="#fff" opacity=".7"/>`,
  tidur: `<path d="M38 6 A26 26 0 1 0 58 46 A21 21 0 1 1 38 6Z" fill="#FFD23F" stroke="#E0A800" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="28" cy="40" r="2.5" fill="#E0A800"/><circle cx="20" cy="30" r="1.8" fill="#E0A800"/>`,
};
const iconSVG = (name) => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${ICONS[name]}</svg>`;

const REV_MOODS = {
  senang: { eyes: 'open', mouth: 'w' },
  lapar:  { eyes: 'wet', brows: 1, mouth: 'o', arms: 'belly', drool: 1, growl: 1, bubble: 'makan' },
  haus:   { eyes: 'sleepy', brows: 1, mouth: 'tongue', ears: 'droop', sweat: 1, bubble: 'minum' },
  sakit:  { eyes: 'sick', brows: 1, mouth: 'thermo', ears: 'droop', pale: 1, fever: 1, kompres: 1, bubble: 'obat' },
  obat:   { eyes: 'sick', brows: 1, mouth: 'w', ears: 'droop', pale: 1, fever: 1, kompres: 1 },   // sakit, termometer sudah dilepas
  sembuh: { eyes: 'happy', mouth: 'open', arms: 'up', sparkle: 1 },
  makan:  { eyes: 'happy', mouth: 'w', talk: 'chew' },
  minum:  { eyes: 'happy', mouth: 'o' },
  pahit:  { eyes: 'squeeze', mouth: 'wavy', pale: 1, kompres: 1 },
  tidur:  { eyes: 'closed', mouth: 'w', ears: 'droop', pale: 1, zzz: 1 },
  geli:   { eyes: 'happy', mouth: 'open' },
  dengar: { eyes: 'open', mouth: 'o', arms: 'ear' },
};

function revSVG(mood = 'senang') {
  const M = REV_MOODS[mood] || REV_MOODS.senang;
  const fur = M.pale ? '#FFC08A' : '#FF9A3C', line = M.pale ? '#D9945A' : '#C8641E',
    stripe = M.pale ? '#F2A468' : '#E0691F', cream = '#FFE9CF', ink = '#2B1B12', brown = '#7A3B16';
  const s = `stroke="${line}" stroke-width="5"`;
  const ear = (flip) => {
    const d = flip ? -1 : 1, rot = M.ears === 'droop' ? -22 * d : 0;
    return `<g transform="rotate(${rot} ${150 - 70 * d} 95)"><path d="M${150 - 80 * d} 120 L${150 - 88 * d} 30 L${150 - 10 * d} 72 Z" fill="${fur}" ${s} stroke-linejoin="round"/>
      <path d="M${150 - 70 * d} 100 L${150 - 74 * d} 52 L${150 - 32 * d} 76 Z" fill="#FFB3C1"/></g>`;
  };
  const eye = (x) => {
    const L = x < 150;
    switch (M.eyes) {
      case 'open': return `<ellipse cx="${x}" cy="132" rx="17" ry="23" fill="${ink}"/><circle cx="${x + 6}" cy="122" r="7" fill="#fff"/><circle cx="${x - 4}" cy="142" r="3.5" fill="#fff"/>`;
      case 'wet': return `<ellipse cx="${x}" cy="134" rx="20" ry="25" fill="${ink}"/><ellipse cx="${x}" cy="150" rx="14" ry="6" fill="#7FC8FF" opacity=".55"/>
        <circle cx="${x + 6}" cy="122" r="8.5" fill="#fff"/><circle cx="${x - 6}" cy="128" r="4" fill="#fff"/><circle cx="${x + 5}" cy="146" r="3" fill="#fff"/>`;
      case 'sleepy': return `<path d="M${x - 17} 134 A17 18 0 0 0 ${x + 17} 134 Z" fill="${ink}"/><path d="M${x - 20} 134 H${x + 20}" stroke="${brown}" stroke-width="5" stroke-linecap="round"/><circle cx="${x + 5}" cy="140" r="3.5" fill="#fff"/>`;
      case 'sick': { const t = L ? -1 : 1;
        return `<path d="M${x - 17} ${134 - 4 * t} L${x + 17} ${134 + 4 * t} A17 17 0 0 1 ${x - 17} ${134 - 4 * t} Z" fill="${ink}"/>
        <path d="M${x - 20} ${134 - 5 * t} L${x + 20} ${134 + 5 * t}" stroke="${brown}" stroke-width="5" stroke-linecap="round"/><circle cx="${x + 4}" cy="144" r="3.5" fill="#fff"/>`; }
      case 'happy': return `<path d="M${x - 16} 140 Q${x} 116 ${x + 16} 140" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round"/>`;
      case 'closed': return `<path d="M${x - 16} 132 Q${x} 146 ${x + 16} 132" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round"/>`;
      case 'squeeze': return L
        ? `<path d="M${x - 14} 120 L${x + 10} 133 L${x - 14} 146" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<path d="M${x + 14} 120 L${x - 10} 133 L${x + 14} 146" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
  };
  const brows = M.brows ? `<g fill="none" stroke="${brown}" stroke-width="5" stroke-linecap="round"><path d="M88 102 Q104 98 122 ${M.eyes === 'sick' ? 88 : 92}"/><path d="M212 102 Q196 98 178 ${M.eyes === 'sick' ? 88 : 92}"/></g>` : '';
  const nose = `<path d="M150 167 V172" stroke="${brown}" stroke-width="4" stroke-linecap="round"/>`;
  const mouth = {
    w: `<path d="M150 167 V174 M136 176 Q143 184 150 174 Q157 184 164 176" fill="none" stroke="${brown}" stroke-width="4" stroke-linecap="round"/>`,
    open: `${nose}<path d="M132 172 Q150 202 168 172 Q150 178 132 172Z" fill="#7A2E1A" stroke="${brown}" stroke-width="4" stroke-linejoin="round"/><path d="M141 186 Q150 180 159 186 Q150 194 141 186Z" fill="#FF7A8F"/>`,
    o: `${nose}<ellipse cx="150" cy="184" rx="8" ry="10" fill="#7A2E1A" stroke="${brown}" stroke-width="3"/>`,
    tongue: `<path d="M150 167 V173 M136 178 Q150 170 164 178" fill="none" stroke="${brown}" stroke-width="4" stroke-linecap="round"/><path d="M144 176 Q143 194 150 194 Q157 194 156 176Z" fill="#FF7A8F" stroke="${brown}" stroke-width="3"/>`,
    thermo: `<path d="M150 167 V173 M138 179 Q144 175 150 179 Q156 183 162 179" fill="none" stroke="${brown}" stroke-width="4" stroke-linecap="round"/>
      <g transform="rotate(25 160 180)"><rect x="158" y="174" width="52" height="11" rx="5.5" fill="#fff" stroke="#8AA0B8" stroke-width="3"/><rect x="164" y="178" width="22" height="3" rx="1.5" fill="#FF5A6E"/></g>`,
    wavy: `${nose}<path d="M134 182 q4 -6 8 0 t8 0 t8 0 t8 0" fill="none" stroke="${brown}" stroke-width="4" stroke-linecap="round"/>`,
  }[M.mouth];
  // Mulut terbuka untuk bicara; versi "chew" lebih lebar untuk mengunyah.
  const talk = M.talk === 'chew'
    ? `${nose}<path d="M134 174 Q150 198 166 174 Q150 180 134 174Z" fill="#7A2E1A" stroke="${brown}" stroke-width="4" stroke-linejoin="round"/>`
    : `${nose}<path d="M137 174 Q150 196 163 174 Q150 179 137 174Z" fill="#7A2E1A" stroke="${brown}" stroke-width="4" stroke-linejoin="round"/><path d="M143 185 Q150 180 157 185 Q150 191 143 185Z" fill="#FF7A8F"/>`;
  const arm = (cx, cy, r) => `<ellipse cx="${cx}" cy="${cy}" rx="16" ry="25" fill="${fur}" ${s} transform="rotate(${r} ${cx} ${cy})"/>`;
  const arms = {
    side: arm(96, 262, 20) + arm(204, 262, -20),
    belly: arm(124, 266, -55) + arm(176, 266, 55),
    up: arm(80, 216, -40) + arm(220, 216, 40),
    ear: arm(96, 262, 20) + arm(232, 196, -30),
  }[M.arms || 'side'];
  const bubble = M.bubble ? `<g class="think" transform="translate(12 -14)"><circle cx="225" cy="70" r="5" fill="#fff" stroke="#E2C9B0" stroke-width="3"/><circle cx="236" cy="56" r="8" fill="#fff" stroke="#E2C9B0" stroke-width="3"/>
    <circle cx="257" cy="28" r="34" fill="#fff" stroke="#E2C9B0" stroke-width="4"/><svg x="233" y="4" width="48" height="48" viewBox="0 0 64 64">${ICONS[M.bubble]}</svg></g>` : '';
  const drop = (x, y, r = 1) => `<path d="M${x} ${y} Q${x + 9 * r} ${y + 14 * r} ${x} ${y + 18 * r} Q${x - 9 * r} ${y + 14 * r} ${x} ${y}Z" fill="#7FC8FF" stroke="#3E8FD6" stroke-width="2.5"/>`;
  const blush = M.fever ? 'fill="#FF4F6E" opacity=".7"' : 'fill="#FF6B8A" opacity=".45"';
  return `<svg viewBox="-10 -20 320 360" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
 <ellipse cx="150" cy="324" rx="85" ry="10" fill="#000" opacity=".08"/>
 <g class="tail"><path d="M205 280 C260 270 270 210 240 185" fill="none" stroke="${line}" stroke-width="30" stroke-linecap="round"/>
 <path d="M205 280 C260 270 270 210 240 185" fill="none" stroke="${fur}" stroke-width="20" stroke-linecap="round"/><circle cx="240" cy="186" r="10" fill="${cream}"/></g>
 <ellipse cx="150" cy="255" rx="72" ry="62" fill="${fur}" ${s}/><ellipse cx="150" cy="268" rx="44" ry="42" fill="${cream}"/>
 ${M.growl ? `<g class="growl" fill="none" stroke="${brown}" stroke-width="3.5" stroke-linecap="round" opacity=".6"><path d="M60 250 q6 -6 0 -12 q-6 -6 0 -12"/><path d="M240 250 q-6 -6 0 -12 q6 -6 0 -12"/></g>` : ''}
 <ellipse cx="116" cy="312" rx="26" ry="15" fill="${cream}" ${s}/><ellipse cx="184" cy="312" rx="26" ry="15" fill="${cream}" ${s}/>
 ${arms}
 ${ear(0)}${ear(1)}
 <ellipse cx="150" cy="135" rx="102" ry="84" fill="${fur}" ${s}/>
 <g stroke="${stripe}" stroke-width="9" stroke-linecap="round"><path d="M150 54 V78"/><path d="M128 58 L132 78"/><path d="M172 58 L168 78"/>
  <path d="M50 125 H68"/><path d="M52 145 H66"/><path d="M250 125 H232"/><path d="M248 145 H234"/></g>
 ${M.kompres ? `<g transform="rotate(-6 150 70)"><rect x="106" y="54" width="88" height="30" rx="12" fill="#BFE6FF" stroke="#3E8FD6" stroke-width="4"/><path d="M124 58 V80 M150 58 V80 M176 58 V80" stroke="#8CCBF5" stroke-width="4"/></g>` : ''}
 <ellipse cx="131" cy="172" rx="27" ry="21" fill="${cream}"/><ellipse cx="169" cy="172" rx="27" ry="21" fill="${cream}"/>
 <ellipse cx="80" cy="168" rx="17" ry="11" ${blush}/><ellipse cx="220" cy="168" rx="17" ry="11" ${blush}/>
 ${brows}<g class="eyes">${eye(108)}${eye(192)}</g>
 <path d="M140 156 Q150 150 160 156 Q156 166 150 167 Q144 166 140 156Z" fill="#FF6B8A"/>
 <g class="mouth">${mouth}</g><g class="mouth-talk" display="none">${talk}</g>
 <g stroke="${line}" stroke-width="3" stroke-linecap="round" opacity=".7"><path d="M100 172 L60 166"/><path d="M100 182 L62 188"/><path d="M200 172 L240 166"/><path d="M200 182 L238 188"/></g>
 ${M.drool ? drop(160, 186, .8) : ''}${M.sweat ? drop(238, 86) + drop(62, 100, .7) : ''}
 ${M.sparkle ? `<g class="sparkle" fill="#FFD23F" stroke="#E0A800" stroke-width="2.5" stroke-linejoin="round">${[[40, 40, 1], [262, 52, 1.2], [270, 250, .8], [28, 230, .9]].map(([x, y, k]) => `<path transform="translate(${x} ${y}) scale(${k})" d="M0 -16 L4 -4 L16 0 L4 4 L0 16 L-4 4 L-16 0 L-4 -4Z"/>`).join('')}</g>` : ''}
 ${M.zzz ? `<g class="zzz" fill="#7A6BD8" font-family="'Baloo 2',sans-serif" font-weight="800"><text x="226" y="54" font-size="30">z</text><text x="250" y="26" font-size="38">z</text><text x="276" y="-6" font-size="46">Z</text></g>` : ''}
 ${bubble}
</svg>`;
}
