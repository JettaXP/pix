// ===== Фронт Евразии v2 — данные =====
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => { n = Math.round(n); const a = Math.abs(n); return a >= 1e6 ? (n / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M' : a >= 1e4 ? (n / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'K' : String(n); };
const hash2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
let _seed = 1;
const rnd = () => { _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 4294967296; };
const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = a => a[Math.floor(rnd() * a.length)];

Object.assign(RU, {
  'Zimbabwe': 'Зимбабве', 'Zambia': 'Замбия', 'Uganda': 'Уганда', 'Tunisia': 'Тунис', 'Togo': 'Того', 'Timor-Leste': 'Вост. Тимор', 'Tanzania': 'Танзания', 'eSwatini': 'Эсватини',
  'S. Sudan': 'Южный Судан', 'Sudan': 'Судан', 'South Africa': 'ЮАР', 'Somalia': 'Сомали', 'Somaliland': 'Сомалиленд', 'Sierra Leone': 'Сьерра-Леоне', 'Senegal': 'Сенегал', 'Rwanda': 'Руанда',
  'Philippines': 'Филиппины', 'Papua New Guinea': 'Папуа — Н. Гвинея', 'Nigeria': 'Нигерия', 'Niger': 'Нигер', 'Namibia': 'Намибия', 'Mozambique': 'Мозамбик', 'Morocco': 'Марокко',
  'W. Sahara': 'Зап. Сахара', 'Mauritania': 'Мавритания', 'Mali': 'Мали', 'Malawi': 'Малави', 'Madagascar': 'Мадагаскар', 'Libya': 'Ливия', 'Liberia': 'Либерия', 'Lesotho': 'Лесото',
  'Kenya': 'Кения', 'Indonesia': 'Индонезия', 'Guinea-Bissau': 'Гвинея-Бисау', 'Guinea': 'Гвинея', 'Ghana': 'Гана', 'Gambia': 'Гамбия', 'Gabon': 'Габон', 'Ethiopia': 'Эфиопия',
  'Eritrea': 'Эритрея', 'Eq. Guinea': 'Экв. Гвинея', 'Egypt': 'Египет', 'Djibouti': 'Джибути', "Côte d'Ivoire": 'Кот-д’Ивуар', 'Dem. Rep. Congo': 'ДР Конго', 'Congo': 'Конго',
  'Chad': 'Чад', 'Central African Rep.': 'ЦАР', 'Cameroon': 'Камерун', 'Burundi': 'Бурунди', 'Burkina Faso': 'Буркина-Фасо', 'Brunei': 'Бруней', 'Botswana': 'Ботсвана', 'Benin': 'Бенин',
  'Angola': 'Ангола', 'Algeria': 'Алжир'
});
// [сила, экономика, нефть, промышленность, уран, ядерный арсенал]
Object.assign(STATS, {
  'Egypt': [6, 4, 3, 4, 0, 0], 'South Africa': [4, 4, 0, 5, 5, 0], 'Nigeria': [4, 4, 7, 3, 0, 0], 'Algeria': [5, 3, 7, 3, 0, 0], 'Morocco': [4, 3, 0, 3, 0, 0], 'Ethiopia': [4, 2, 0, 2, 0, 0],
  'Indonesia': [5, 5, 5, 5, 0, 0], 'Philippines': [3, 4, 1, 4, 0, 0], 'Libya': [2, 2, 8, 1, 0, 0], 'Angola': [3, 2, 7, 1, 0, 0], 'Sudan': [3, 1, 4, 1, 0, 0], 'S. Sudan': [2, 1, 4, 0, 0, 0],
  'Kenya': [3, 3, 0, 2, 0, 0], 'Tanzania': [2, 2, 0, 2, 2, 0], 'Dem. Rep. Congo': [3, 1, 1, 1, 3, 0], 'Niger': [1, 1, 1, 0, 7, 0], 'Namibia': [1, 2, 0, 1, 6, 0], 'Gabon': [1, 2, 5, 1, 2, 0],
  'Congo': [1, 1, 5, 1, 0, 0], 'Eq. Guinea': [1, 2, 5, 0, 0, 0], 'Chad': [2, 1, 3, 0, 0, 0], 'Brunei': [1, 4, 6, 1, 0, 0], 'Ghana': [2, 3, 2, 2, 0, 0], "Côte d'Ivoire": [2, 3, 1, 2, 0, 0],
  'Tunisia': [2, 3, 1, 2, 0, 0], 'Uganda': [2, 2, 0, 1, 0, 0], 'Zambia': [2, 2, 0, 2, 1, 0], 'Zimbabwe': [2, 1, 0, 2, 0, 0], 'Senegal': [2, 2, 0, 2, 0, 0], 'Cameroon': [2, 2, 2, 1, 0, 0]
});
const statOf = n => STATS[n] || [1, 1, 0, 1, 0, 0];

// Цвета фракций: фиксированные для крупных, остальным — золотой угол.
const FCOL = {
  'Russia': '#c94a3c', 'China': '#d8b02c', 'India': '#e08a2e', 'Germany': '#6b7280', 'France': '#3f6fd0', 'United Kingdom': '#b0486e', 'Ukraine': '#e6c935', 'Turkey': '#b53a3a', 'Iran': '#3f9a5a',
  'Japan': '#e8e8e8', 'Kazakhstan': '#39b5c8', 'Saudi Arabia': '#2f8a4a', 'Egypt': '#c9a05a', 'South Africa': '#3fa07a', 'Nigeria': '#4aa84a', 'Indonesia': '#d05a5a', 'Poland': '#d86a8a',
  'Italy': '#5aa85a', 'Spain': '#d8a02c', 'Mongolia': '#8a6ad0', 'Pakistan': '#2f7a5a', 'Algeria': '#7ab86a', 'Dem. Rep. Congo': '#4a8ad8', 'Ethiopia': '#a8b83a', 'Sweden': '#4a9ad8'
};
function facColor(name, i) { if (FCOL[name]) return FCOL[name]; const h = (i * 137.508 + 20) % 360, s = 45 + (i * 7) % 25, l = 44 + (i * 11) % 16; return hsl2hex(h, s, l); }
function hsl2hex(h, s, l) { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return '#' + [f(0), f(8), f(4)].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join(''); }
const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const shade = (hex, k) => { const [r, g, b] = hex2rgb(hex); const f = v => clamp(Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k), 0, 255); return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join(''); };

// Флаги: h:/v: полосы; +o круг, +n сканд. крест, +p плюс, +t треугольник, +k крыж
const FLAGS = {
  'Russia': 'h:fff,2545b0,d52b1e', 'Germany': 'h:111,d00,fc0', 'France': 'v:0055a4,fff,ef4135', 'Italy': 'v:009246,fff,ce2b37', 'Ukraine': 'h:0057b7,ffd700', 'Poland': 'h:fff,dc143c',
  'Netherlands': 'h:ae1c28,fff,21468b', 'Belgium': 'v:111,fae042,ed2939', 'Spain': 'h:aa151b,f1bf00,f1bf00,aa151b', 'Portugal': 'v:060,060,f00,f00,f00', 'United Kingdom': 'h:012169+p:c8102e',
  'Ireland': 'v:169b62,fff,ff883e', 'Austria': 'h:ed2939,fff,ed2939', 'Hungary': 'h:cd2a3e,fff,436f4d', 'Romania': 'v:002b7f,fcd116,ce1126', 'Bulgaria': 'h:fff,00966e,d62612',
  'Sweden': 'h:006aa7+n:fecc00', 'Norway': 'h:ba0c2f+n:00205b', 'Finland': 'h:fff+n:003580', 'Denmark': 'h:c8102e+n:fff', 'Iceland': 'h:02529c+n:dc1e35', 'Estonia': 'h:0072ce,111,fff',
  'Latvia': 'h:9e3039,fff,9e3039', 'Lithuania': 'h:fdb913,006a44,c1272d', 'Belarus': 'h:c8313e,c8313e,4aa657', 'Czechia': 'h:fff,d7141a+t:11457e', 'Japan': 'h:fff+o:bc002d',
  'China': 'h:de2910+k:ffde00', 'Turkey': 'h:e30a17+o:fff', 'India': 'h:f93,fff,128807', 'Pakistan': 'v:fff,01411c,01411c,01411c', 'Iran': 'h:239f40,fff,da0000', 'Iraq': 'h:ce1126,fff,111',
  'Saudi Arabia': 'h:006c35', 'Egypt': 'h:ce1126,fff,111', 'Israel': 'h:fff,0038b8,fff,fff,0038b8,fff', 'Kazakhstan': 'h:00afca+o:fec50c', 'Mongolia': 'v:c4272f,015197,c4272f',
  'South Korea': 'h:fff+o:cd2e3a', 'North Korea': 'h:024fa2,ed1c27,ed1c27,024fa2', 'Vietnam': 'h:da251d+o:ff0', 'Thailand': 'h:a51931,fff,2d2a4a,2d2a4a,fff,a51931', 'Indonesia': 'h:f00,fff',
  'Philippines': 'h:0038a8,ce1126+t:fff', 'Nigeria': 'v:008751,fff,008751', 'South Africa': 'h:e03c31,fff,007749,fff,001489', 'Algeria': 'v:006233,fff', 'Libya': 'h:e70013,111,111,239e46',
  'Ethiopia': 'h:078930,fcdd09,da121a', 'Kenya': 'h:111,b00,060', 'Morocco': 'h:c1272d+o:006233', 'Greece': 'h:0d5eaf,fff,0d5eaf,fff,0d5eaf', 'Switzerland': 'h:d52b1e+p:fff', 'Georgia': 'h:fff+p:f00',
  'Serbia': 'h:c6363c,0c4076,fff', 'Croatia': 'h:f00,fff,171796', 'Syria': 'h:ce1126,fff,111', 'Armenia': 'h:d90012,0033a0,f2a800', 'Azerbaijan': 'h:00b5e2,ef3340,509e2f',
  'Uzbekistan': 'h:0099b5,fff,1eb53a', 'Afghanistan': 'v:111,d32011,007a36', 'Bangladesh': 'h:006a4e+o:f42a41', 'Myanmar': 'h:fecb00,34b233,ea2839', 'Malaysia': 'h:c00,fff,c00,fff+k:010066',
  'Taiwan': 'h:fe0000+k:000095', 'Sudan': 'h:d21034,fff,111+t:007229', 'Dem. Rep. Congo': 'h:007fff+k:f7d618', 'Angola': 'h:c00,111', 'Tanzania': 'h:1eb53a,111,00a3dd', 'Mali': 'v:14b53a,fcd116,ce1126',
  'Niger': 'h:e05206,fff,0db02b', 'Chad': 'v:002664,fecb00,c60c30', 'Yemen': 'h:ce1126,fff,111', 'United Arab Emirates': 'h:00732f,fff,111', 'Slovakia': 'h:fff,0b4ea2,ee1c25',
  'Moldova': 'v:0046ae,ffd200,cc092f', 'Luxembourg': 'h:ed2939,fff,00a1de', 'Turkmenistan': 'h:00843d+k:d22630', 'Kyrgyzstan': 'h:e8112d+o:ffef00', 'Tajikistan': 'h:c00,fff,060',
  'Nepal': 'h:dc143c+t:003893', 'Sri Lanka': 'v:00534e,ff7f00,8d153a,8d153a', 'Laos': 'h:ce1126,002868,ce1126', 'Cambodia': 'h:032ea1,e00025,032ea1', 'Jordan': 'h:111,fff,007a3d+t:ce1126',
  'Lebanon': 'h:ed1c24,fff,ed1c24', 'Kuwait': 'h:007a3d,fff,ce1126', 'Qatar': 'v:fff,8a1538,8a1538', 'Oman': 'h:fff,db161b,008000', 'Ghana': 'h:ce1126,fcd116,006b3f', 'Senegal': 'v:00853f,fdef42,e31b23',
  'Cameroon': 'v:007a5e,ce1126,fcd116', "Côte d'Ivoire": 'v:f77f00,fff,009e60', 'Guinea': 'v:ce1126,fcd116,009460', 'Gabon': 'h:009e60,fcd116,3a75c4', 'Madagascar': 'h:fc3d32,007e3a+k:fff',
  'Somalia': 'h:4189dd+o:fff', 'Tunisia': 'h:e70013+o:fff', 'Zambia': 'h:198a00', 'Zimbabwe': 'h:006400,ffd200,d40000,111,d40000,ffd200,006400', 'Uganda': 'h:111,fcdc04,d90000,111,fcdc04,d90000',
  'Mozambique': 'h:009669,111,fce100+t:d21034', 'Botswana': 'h:75aadb,111,75aadb', 'Namibia': 'h:003580,d21034,009543', 'Slovenia': 'h:fff,0000ff,f00', 'Albania': 'h:e41e20', 'Bosnia and Herz.': 'h:002395+t:fecb00'
};
