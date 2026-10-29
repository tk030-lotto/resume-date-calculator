/**
 * ResumeDateCalc - コア計算エンジン (js/engine.js)
 * 
 * 法律準拠:
 * - 年齢計算ニ関スル法律 (明治35年法律第50号)
 * - 民法第143条 (暦による期間の計算)
 * - 学校教育法第17条第1項・学校教育法施行規則第59条
 * 
 * 外部依存ゼロ・純粋関数群
 */

// 元号定義テーブル (グレゴリオ暦基準)
const ERAS = [
  { name: '令和', start: new Date(2019, 4, 1), end: null },             // 2019/05/01〜
  { name: '平成', start: new Date(1989, 0, 8), end: new Date(2019, 3, 30) }, // 1989/01/08〜2019/04/30
  { name: '昭和', start: new Date(1926, 11, 25), end: new Date(1989, 0, 7) }, // 1926/12/25〜1989/01/07
  { name: '大正', start: new Date(1912, 6, 30), end: new Date(1926, 11, 24) }, // 1912/07/30〜1926/12/24 (※改元日25日は昭和)
  { name: '明治', start: new Date(1868, 0, 25), end: new Date(1912, 6, 29) }  // 1868/01/25〜1912/07/29
];

// 十二支
const ZODIAC_SIGNS = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/**
 * 学年年度 (School Year) の判定
 * 学校教育法第17条および年齢計算ニ関スル法律に基づき、
 * 1月1日〜4月1日生まれは「早生まれ」として前年年度に属する。
 * 
 * @param {number} birthYear - 生年
 * @param {number} birthMonth - 誕生月 (1〜12)
 * @param {number} birthDate - 誕生日 (1〜31)
 * @returns {number} 学年年度 (生年または生年 - 1)
 */
function getSchoolYear(birthYear, birthMonth, birthDate) {
  const isEarly = (birthMonth < 4) || (birthMonth === 4 && birthDate === 1);
  return isEarly ? (birthYear - 1) : birthYear;
}

/**
 * 満年齢の計算
 * 日本の法規上、誕生日前日の午後12時 (24時) に加齢する。
 * うるう年 (2月29日) 生まれの者は平年では2月28日24時 (=3月1日0時) に加齢する。
 * 
 * @param {Date|string|{year: number, month: number, date: number}} birth - 生年月日
 * @param {Date} [targetDate=new Date()] - 基準日
 * @returns {number} 満年齢
 */
function calculateAge(birth, targetDate = new Date()) {
  let bYear, bMonth, bDate;
  if (birth instanceof Date) {
    bYear = birth.getFullYear();
    bMonth = birth.getMonth() + 1;
    bDate = birth.getDate();
  } else if (typeof birth === 'object' && birth !== null) {
    bYear = birth.year;
    bMonth = birth.month;
    bDate = birth.date;
  } else {
    const d = new Date(birth);
    bYear = d.getFullYear();
    bMonth = d.getMonth() + 1;
    bDate = d.getDate();
  }

  const tYear = targetDate.getFullYear();
  const tMonth = targetDate.getMonth() + 1;
  const tDate = targetDate.getDate();

  let age = tYear - bYear;
  // 誕生月日を迎えていない場合は -1
  if (tMonth < bMonth || (tMonth === bMonth && tDate < bDate)) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * 日齢 (生後日数) の計算
 * 生まれた当日を「1日目」としてカウントする。
 * タイムゾーン非依存でUTCミリ秒ベースの整数計算を行う。
 * 
 * @param {number} birthYear 
 * @param {number} birthMonth (1〜12)
 * @param {number} birthDate 
 * @param {Date} [targetDate=new Date()] 
 * @returns {number} 日齢
 */
function calculateDaysOld(birthYear, birthMonth, birthDate, targetDate = new Date()) {
  const birthUtc = Date.UTC(birthYear, birthMonth - 1, birthDate);
  const targetUtc = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const diffMs = targetUtc - birthUtc;
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / 86400000) + 1;
}

/**
 * 西暦年月日から和暦への変換
 * 元年表記、改元日境界に完全対応。
 * 
 * @param {number} year 
 * @param {number} month (1〜12)
 * @param {number} [day=1] (1〜31)
 * @returns {{ era: string, eraYear: number, formatted: string, label: string }}
 */
function convertToWareki(year, month, day = 1) {
  const target = new Date(year, month - 1, day);

  for (const era of ERAS) {
    const isAfterStart = target >= era.start;
    const isBeforeEnd = era.end === null || target <= era.end;

    if (isAfterStart && isBeforeEnd) {
      const eraYear = year - era.start.getFullYear() + 1;
      const eraText = eraYear === 1 ? '元年' : `${eraYear}年`;
      return {
        era: era.name,
        eraYear: eraYear,
        formatted: `${era.name}${eraText}`,
        label: `${era.name}${eraText}${month}月`
      };
    }
  }

  // 明治以前のフォールバック
  return {
    era: '西暦',
    eraYear: year,
    formatted: `${year}年`,
    label: `${year}年${month}月`
  };
}

/**
 * 干支 (十二支) の取得
 * グレゴリオ暦年基準: (year + 8) % 12
 * 
 * @param {number} year 
 * @returns {string} 十二支
 */
function getZodiac(year) {
  const index = ((year + 8) % 12 + 12) % 12;
  return ZODIAC_SIGNS[index];
}

/**
 * 厄年判定 (数え年基準)
 * 数え年 = 基準年 - 生年 + 1
 * 
 * @param {number} birthYear 
 * @param {'male'|'female'|'none'} gender 
 * @param {number} [targetYear=new Date().getFullYear()] 
 * @returns {{ isYakudoshi: boolean, type: string|null, kazoeAge: number, description: string }}
 */
function getYakudoshi(birthYear, gender, targetYear = new Date().getFullYear()) {
  const kazoeAge = targetYear - birthYear + 1;

  const yakudoshiTable = {
    male: {
      mae: [24, 41, 60],
      hon: [25, 42, 61],
      dai: [42],
      ato: [26, 43, 62]
    },
    female: {
      mae: [18, 32, 36, 60],
      hon: [19, 33, 37, 61],
      dai: [33],
      ato: [20, 34, 38, 62]
    }
  };

  const check = (g) => {
    const table = yakudoshiTable[g];
    if (table.dai.includes(kazoeAge)) return { isYakudoshi: true, type: '大厄', desc: `数え${kazoeAge}歳（大厄）` };
    if (table.hon.includes(kazoeAge)) return { isYakudoshi: true, type: '本厄', desc: `数え${kazoeAge}歳（本厄）` };
    if (table.mae.includes(kazoeAge)) return { isYakudoshi: true, type: '前厄', desc: `数え${kazoeAge}歳（前厄）` };
    if (table.ato.includes(kazoeAge)) return { isYakudoshi: true, type: '後厄', desc: `数え${kazoeAge}歳（後厄）` };
    return null;
  };

  if (gender === 'male' || gender === 'female') {
    const res = check(gender);
    if (res) {
      return { isYakudoshi: true, type: res.type, kazoeAge, description: `${gender === 'male' ? '男性' : '女性'}の${res.desc}` };
    }
  } else {
    // 性別指定なし時
    const mRes = check('male');
    const fRes = check('female');
    if (mRes && fRes) {
      return { isYakudoshi: true, type: '厄年', kazoeAge, description: `数え${kazoeAge}歳: 男性${mRes.type} / 女性${fRes.type}` };
    } else if (mRes) {
      return { isYakudoshi: true, type: mRes.type, kazoeAge, description: `数え${kazoeAge}歳: 男性の${mRes.type}` };
    } else if (fRes) {
      return { isYakudoshi: true, type: fRes.type, kazoeAge, description: `数え${kazoeAge}歳: 女性の${fRes.type}` };
    }
  }

  return { isYakudoshi: false, type: null, kazoeAge, description: '今年は厄年ではありません' };
}

/**
 * 年祝い判定
 * 
 * @param {number} birthYear 
 * @param {number} birthMonth 
 * @param {number} birthDate 
 * @param {number} [targetYear=new Date().getFullYear()] 
 * @returns {Array<{ name: string, description: string }>}
 */
function getCelebrations(birthYear, birthMonth, birthDate, targetYear = new Date().getFullYear()) {
  const kazoeAge = targetYear - birthYear + 1;
  const celebrations = [];

  const list = [
    { name: '還暦（かんれき）', ageType: '満', age: 60, kazoe: 61, desc: '満60歳（数え61歳）' },
    { name: '古希（こき）', ageType: '数え', age: 70, kazoe: 70, desc: '数え70歳' },
    { name: '喜寿（きじゅ）', ageType: '数え', age: 77, kazoe: 77, desc: '数え77歳' },
    { name: '傘寿（さんじゅ）', ageType: '数え', age: 80, kazoe: 80, desc: '数え80歳' },
    { name: '米寿（べいじゅ）', ageType: '数え', age: 88, kazoe: 88, desc: '数え88歳' },
    { name: '卒寿（そつじゅ）', ageType: '数え', age: 90, kazoe: 90, desc: '数え90歳' },
    { name: '白寿（はくじゅ）', ageType: '数え', age: 99, kazoe: 99, desc: '数え99歳' },
    { name: '百寿（ひゃくじゅ）', ageType: '数え', age: 100, kazoe: 100, desc: '数え100歳' }
  ];

  for (const item of list) {
    if (kazoeAge === item.kazoe) {
      celebrations.push({ name: item.name, description: item.desc });
    }
  }

  return celebrations;
}

// 高等教育機関コース定義テーブル (データ駆動設計)
const HIGHER_EDUCATION_COURSES = {
  university_4: [
    { key: 'univ_enter', offsetYear: 0, month: 4, school: '大学', status: '入学', addRonin: true },
    { key: 'univ_grad', offsetYear: 4, month: 3, school: '大学', status: '卒業', addRonin: true, addRyunen: true }
  ],
  university_6: [
    { key: 'univ6_enter', offsetYear: 0, month: 4, school: '大学', status: '入学', addRonin: true },
    { key: 'univ6_grad', offsetYear: 6, month: 3, school: '大学', status: '卒業', addRonin: true, addRyunen: true }
  ],
  junior_college_2: [
    { key: 'jc_enter', offsetYear: 0, month: 4, school: '短期大学', status: '入学', addRonin: true },
    { key: 'jc_grad', offsetYear: 2, month: 3, school: '短期大学', status: '卒業', addRonin: true, addRyunen: true }
  ],
  junior_college_3: [
    { key: 'jc_enter', offsetYear: 0, month: 4, school: '短期大学', status: '入学', addRonin: true },
    { key: 'jc_grad', offsetYear: 3, month: 3, school: '短期大学', status: '卒業', addRonin: true, addRyunen: true }
  ],
  vocational_2: [
    { key: 'voc_enter', offsetYear: 0, month: 4, school: '専門学校', status: '入学', addRonin: true },
    { key: 'voc_grad', offsetYear: 2, month: 3, school: '専門学校', status: '卒業', addRonin: true, addRyunen: true }
  ],
  vocational_3: [
    { key: 'voc_enter', offsetYear: 0, month: 4, school: '専門学校', status: '入学', addRonin: true },
    { key: 'voc_grad', offsetYear: 3, month: 3, school: '専門学校', status: '卒業', addRonin: true, addRyunen: true }
  ],
  vocational_4: [
    { key: 'voc_enter', offsetYear: 0, month: 4, school: '専門学校', status: '入学', addRonin: true },
    { key: 'voc_grad', offsetYear: 4, month: 3, school: '専門学校', status: '卒業', addRonin: true, addRyunen: true }
  ],
  graduate_2: [
    { key: 'univ_enter', offsetYear: 0, month: 4, school: '大学', status: '入学', addRonin: true },
    { key: 'univ_grad', offsetYear: 4, month: 3, school: '大学', status: '卒業', addRonin: true },
    { key: 'grad_enter', offsetYear: 4, month: 4, school: '大学院修士課程', status: '入学', addRonin: true },
    { key: 'grad_grad', offsetYear: 6, month: 3, school: '大学院修士課程', status: '修了', addRonin: true, addRyunen: true }
  ]
};

/**
 * 学歴タイムラインの生成
 * 
 * @param {number} birthYear 
 * @param {number} birthMonth 
 * @param {number} birthDate 
 * @param {Object} options
 * @param {string} options.course - 進路区分 ('university_4'|'university_6'|'junior_college_2'|'junior_college_3'|'vocational_2'|'vocational_3'|'vocational_4'|'kosen_5'|'graduate_2'|'highschool_only')
 * @param {number} options.ronin - 浪人年数 (0〜10)
 * @param {number} options.ryunen - 留年年数 (0〜10)
 * @param {'highschool'|'junior_high'|'all'} options.scope - 表示範囲
 * @param {'both'|'seireki'|'wareki'} options.format - 年号表記形式
 * @returns {Array<{ stageKey: string, year: number, month: number, dateText: string, defaultSchool: string, status: string }>}
 */
function generateAcademicHistory(birthYear, birthMonth, birthDate, options = {}) {
  const {
    course = 'university_4',
    ronin = 0,
    ryunen = 0,
    scope = 'junior_high',
    format = 'both'
  } = options;

  const R = Math.max(0, parseInt(ronin, 10) || 0);
  const D = Math.max(0, parseInt(ryunen, 10) || 0);

  const SY = getSchoolYear(birthYear, birthMonth, birthDate);
  const items = [];

  // ヘルパー: 年月表記のフォーマット
  const formatDate = (year, month) => {
    const w = convertToWareki(year, month, 1);
    if (format === 'seireki') {
      return `${year}年${month}月`;
    } else if (format === 'wareki') {
      return `${w.formatted}${month}月`;
    } else {
      // 併記 (標準)
      return `${year}年（${w.formatted}）${month}月`;
    }
  };

  const addItem = (stageKey, year, month, defaultSchool, status) => {
    items.push({
      stageKey,
      year,
      month,
      dateText: formatDate(year, month),
      defaultSchool,
      status
    });
  };

  // 1. 小学校
  if (scope === 'all') {
    addItem('elem_enter', SY + 7, 4, '小学校', '入学');
    addItem('elem_grad', SY + 13, 3, '小学校', '卒業');
  }

  // 2. 中学校
  if (scope === 'all' || scope === 'junior_high') {
    if (scope === 'all') {
      addItem('jhs_enter', SY + 13, 4, '中学校', '入学');
    }
    addItem('jhs_grad', SY + 16, 3, '中学校', '卒業');
  }

  // 3. 高専ルート (中学校卒業後に直進)
  if (course === 'kosen_5') {
    addItem('kosen_enter', SY + 16, 4, '高等専門学校', '入学');
    addItem('kosen_grad', SY + 21 + D, 3, '高等専門学校', '卒業');
    return items;
  }

  // 4. 高等学校
  addItem('hs_enter', SY + 16, 4, '高等学校', '入学');
  addItem('hs_grad', SY + 19, 3, '高等学校', '卒業');

  if (course === 'highschool_only') {
    return items;
  }

  // 5. 高等教育機関 (データ駆動テーブル展開)
  const baseHsGradYear = SY + 19;
  const courseStages = HIGHER_EDUCATION_COURSES[course] || HIGHER_EDUCATION_COURSES.university_4;

  courseStages.forEach(stage => {
    let year = baseHsGradYear + stage.offsetYear;
    if (stage.addRonin) year += R;
    if (stage.addRyunen) year += D;

    addItem(stage.key, year, stage.month, stage.school, stage.status);
  });

  return items;
}

// Node.js (CommonJS) 互換用エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ERAS,
    ZODIAC_SIGNS,
    HIGHER_EDUCATION_COURSES,
    getSchoolYear,
    calculateAge,
    calculateDaysOld,
    convertToWareki,
    getZodiac,
    getYakudoshi,
    getCelebrations,
    generateAcademicHistory
  };
}
