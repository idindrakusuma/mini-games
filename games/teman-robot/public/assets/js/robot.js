/* Teman Robot · gambar Bumble Bee (SVG).
   Dipakai oleh game.js dan scripts/generate-images.mjs (thumbnail & ikon), jadi gambarnya sama persis.
   robotSVG(mood, screen):
     mood   'senang' | 'bicara' | 'dengar' | 'wow' | 'geli'
     screen teks pendek di layar dada (huruf/angka); kosong = gambar hati */
function robotSVG(mood = 'senang', screen = ''){
  const happyEyes = mood === 'senang' || mood === 'geli';
  const waveR = mood === 'senang' || mood === 'wow';
  const waveL = mood === 'wow' || mood === 'geli';
  const DARK = '#2B2F45', YEL = '#FFD23F', BLUE = '#47C9E5', PINK = '#FF8FB8', WHITE = '#FFFDF7';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
  const arm = (side, up) => {
    const x = side === 'r' ? 160 : 40, a = (side === 'r' ? -1 : 1) * (up ? 130 : 14);
    return `<g class="arm arm-${side}${up ? ' up' : ''}"><g transform="rotate(${a} ${x} 146)">` +
      `<rect x="${x - 12}" y="140" width="24" height="56" rx="12" fill="${YEL}"/>` +
      `<circle cx="${x}" cy="198" r="13" fill="${DARK}"/></g></g>`;
  };
  const r = mood === 'wow' ? 16 : 13;
  const eyes = happyEyes
    ? `<path d="M69 84 Q80 70 91 84" fill="none" stroke="${BLUE}" stroke-width="6" stroke-linecap="round"/>` +
      `<path d="M109 84 Q120 70 131 84" fill="none" stroke="${BLUE}" stroke-width="6" stroke-linecap="round"/>`
    : `<g class="eye"><circle cx="80" cy="80" r="${r}" fill="${BLUE}"/><circle cx="85" cy="75" r="4.5" fill="${WHITE}"/></g>` +
      `<g class="eye"><circle cx="120" cy="80" r="${r}" fill="${BLUE}"/><circle cx="125" cy="75" r="4.5" fill="${WHITE}"/></g>`;
  const mouth =
    mood === 'bicara' ? `<ellipse class="mouth talk" cx="100" cy="101" rx="10" ry="7" fill="${PINK}"/>` :
    mood === 'dengar' || mood === 'wow' ? `<ellipse class="mouth" cx="100" cy="102" rx="5" ry="6" fill="${WHITE}"/>` :
    `<path class="mouth" d="M88 99 Q100 109 112 99" fill="none" stroke="${WHITE}" stroke-width="4.5" stroke-linecap="round"/>`;
  const chest = screen !== ''
    ? `<text x="100" y="185" text-anchor="middle" font-family="'Baloo 2','Trebuchet MS',sans-serif" font-weight="800" font-size="${String(screen).length > 1 ? 28 : 36}" fill="${BLUE}">${esc(screen)}</text>`
    : `<path d="M100 186 C88 177 84 171 84 166 C84 161 88 158 92 158 C96 158 98 160 100 163 C102 160 104 158 108 158 C112 158 116 161 116 166 C116 171 112 177 100 186 Z" fill="${PINK}"/>`;
  return `<svg class="robot mood-${mood}" viewBox="-16 0 232 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
    `<ellipse cx="100" cy="234" rx="62" ry="6" fill="#1B2A6B" opacity=".12"/>` +
    `<g class="antenna"><line x1="100" y1="32" x2="100" y2="14" stroke="${DARK}" stroke-width="5" stroke-linecap="round"/>` +
    `<circle cx="100" cy="11" r="8" fill="${mood === 'dengar' ? '#7BD88F' : PINK}"/></g>` +
    `<rect x="20" y="56" width="22" height="54" rx="10" fill="${DARK}"/><rect x="158" y="56" width="22" height="54" rx="10" fill="${DARK}"/>` +
    `<rect x="26" y="62" width="10" height="20" rx="5" fill="${BLUE}"/><rect x="164" y="62" width="10" height="20" rx="5" fill="${BLUE}"/>` +
    `<rect x="36" y="28" width="128" height="100" rx="36" fill="${YEL}"/>` +
    `<path d="M60 30 L100 46 L140 30" fill="none" stroke="#E8B514" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<rect x="54" y="52" width="92" height="62" rx="26" fill="${DARK}"/>` + eyes + mouth +
    `<circle cx="64" cy="100" r="5" fill="${PINK}" opacity=".7"/><circle cx="136" cy="100" r="5" fill="${PINK}" opacity=".7"/>` +
    `<rect x="88" y="126" width="24" height="10" rx="3" fill="${DARK}"/>` +
    arm('l', waveL) + arm('r', waveR) +
    `<rect x="64" y="204" width="26" height="24" rx="8" fill="${DARK}"/><rect x="110" y="204" width="26" height="24" rx="8" fill="${DARK}"/>` +
    `<rect x="56" y="218" width="40" height="14" rx="7" fill="${DARK}"/><rect x="104" y="218" width="40" height="14" rx="7" fill="${DARK}"/>` +
    `<rect x="46" y="132" width="108" height="80" rx="28" fill="${YEL}"/>` +
    `<rect x="86" y="132" width="9" height="16" fill="${DARK}"/><rect x="105" y="132" width="9" height="16" fill="${DARK}"/>` +
    `<rect x="68" y="150" width="64" height="46" rx="16" fill="${DARK}"/>` +
    `<circle cx="56" cy="196" r="6" fill="${WHITE}"/><circle cx="144" cy="196" r="6" fill="${WHITE}"/>` +
    chest + `</svg>`;
}
