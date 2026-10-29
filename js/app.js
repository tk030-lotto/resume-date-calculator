/**
 * ResumeDateCalc - UI制御・イベントハンドリング (js/app.js)
 * 
 * 外部通信ゼロ・完全クライアントサイド実行
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM要素参照
  const selectYear = document.getElementById('select-year');
  const selectMonth = document.getElementById('select-month');
  const selectDate = document.getElementById('select-date');
  const selectCourse = document.getElementById('select-course');
  const selectRonin = document.getElementById('select-ronin');
  const selectRyunen = document.getElementById('select-ryunen');
  const resumeTbody = document.getElementById('resume-tbody');
  const btnCopy = document.getElementById('btn-copy');
  const bannerContainer = document.getElementById('banner-container');

  // メトリクス参照
  const metricAge = document.getElementById('metric-age');
  const metricEarlyBadge = document.getElementById('metric-early-badge');
  const metricWarekiToday = document.getElementById('metric-wareki-today');
  const metricTodayDate = document.getElementById('metric-today-date');
  const metricDays = document.getElementById('metric-days');
  const metricZodiac = document.getElementById('metric-zodiac');
  const metricBirthWareki = document.getElementById('metric-birth-wareki');

  // トースト参照
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  let toastTimer = null;

  // 学校名入力の一時保持キャッシュ (メモリ内)
  const schoolNameMap = {};

  // 今日の日付 (基準日)
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDate = today.getDate();

  /**
   * トースト通知の表示
   */
  function showToast(msg) {
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.textContent = msg;
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  /**
   * 年・月・日セレクトボックスの初期化
   */
  function initDateSelects() {
    // 1. 年セレクト (1900年〜本年)
    selectYear.innerHTML = '';
    for (let y = currentYear; y >= 1900; y--) {
      const w = convertToWareki(y, 6, 1);
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = `${y}年 (${w.formatted})`;
      selectYear.appendChild(opt);
    }

    // 2. 月セレクト (1〜12月)
    selectMonth.innerHTML = '';
    for (let m = 1; m <= 12; m++) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = `${m}月`;
      selectMonth.appendChild(opt);
    }

    // 初期選択値: 2000年4月2日 (初期表示として最もバランスの良いモデルケース)
    selectYear.value = 2000;
    selectMonth.value = 4;
    updateDaysInMonth();
    selectDate.value = 2;
  }

  /**
   * 選択された年・月に応じて日数を更新
   */
  function updateDaysInMonth() {
    const y = parseInt(selectYear.value, 10);
    const m = parseInt(selectMonth.value, 10);
    const prevVal = parseInt(selectDate.value, 10) || 1;

    // 該当年月の日数を計算 (うるう年対応)
    const daysCount = new Date(y, m, 0).getDate();

    selectDate.innerHTML = '';
    for (let d = 1; d <= daysCount; d++) {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = `${d}日`;
      selectDate.appendChild(opt);
    }

    selectDate.value = Math.min(prevVal, daysCount);
  }

  /**
   * 今日の和暦サマリーカードの初期表示
   */
  function renderTodaySummary() {
    const w = convertToWareki(currentYear, currentMonth, currentDate);
    metricWarekiToday.textContent = w.formatted;
    metricTodayDate.textContent = `基準日: ${currentYear}年${currentMonth}月${currentDate}日`;
  }

  /**
   * 1. サマリーメトリクスの描画
   */
  function renderMetrics(birthYear, birthMonth, birthDate) {
    // 満年齢
    const age = calculateAge({ year: birthYear, month: birthMonth, date: birthDate }, today);
    metricAge.textContent = `${age} 歳`;

    // 早生まれ判定
    const isEarly = (birthMonth < 4) || (birthMonth === 4 && birthDate === 1);
    const schoolYear = getSchoolYear(birthYear, birthMonth, birthDate);
    if (isEarly) {
      metricEarlyBadge.textContent = `早生まれ (${schoolYear}年度 学年)`;
      metricEarlyBadge.style.color = 'var(--accent-amber)';
    } else {
      metricEarlyBadge.textContent = `通常年度 (${schoolYear}年度 学年)`;
      metricEarlyBadge.style.color = 'var(--text-secondary)';
    }

    // 日齢
    const daysOld = calculateDaysOld(birthYear, birthMonth, birthDate, today);
    metricDays.textContent = `${daysOld.toLocaleString()} 日`;

    // 干支 & 生年の和暦
    const zodiac = getZodiac(birthYear);
    metricZodiac.textContent = `${zodiac} 年`;
    const birthW = convertToWareki(birthYear, birthMonth, birthDate);
    metricBirthWareki.textContent = `生年和暦: ${birthW.formatted}`;
  }

  /**
   * 2. 厄年・年祝いバナーの描画
   */
  function renderBanner(birthYear, birthMonth, birthDate) {
    const genderEl = document.querySelector('input[name="gender"]:checked');
    const gender = genderEl ? genderEl.value : 'none';

    bannerContainer.innerHTML = '';

    // 厄年
    const yakudoshi = getYakudoshi(birthYear, gender, currentYear);
    if (yakudoshi.isYakudoshi) {
      const banner = document.createElement('div');
      banner.className = 'banner banner-yakudoshi';
      banner.innerHTML = `
        <span class="banner-tag">${yakudoshi.type}</span>
        <span>${yakudoshi.description} に該当します。</span>
      `;
      bannerContainer.appendChild(banner);
    }

    // 年祝い
    const celebrations = getCelebrations(birthYear, birthMonth, birthDate, currentYear);
    celebrations.forEach(c => {
      const banner = document.createElement('div');
      banner.className = 'banner banner-celebration';
      banner.innerHTML = `
        <span class="banner-tag">年祝い</span>
        <span>今年 (${currentYear}年) は <strong>${c.name}</strong>（${c.description}）です。おめでとうございます！</span>
      `;
      bannerContainer.appendChild(banner);
    });
  }

  /**
   * 3. 学歴タイムラインテーブルの描画
   */
  function renderTimeline(birthYear, birthMonth, birthDate) {
    const course = selectCourse.value;
    const ronin = parseInt(selectRonin.value, 10) || 0;
    const ryunen = parseInt(selectRyunen.value, 10) || 0;

    const scopeEl = document.querySelector('input[name="scope"]:checked');
    const scope = scopeEl ? scopeEl.value : 'junior_high';

    const formatEl = document.querySelector('input[name="format"]:checked');
    const format = formatEl ? formatEl.value : 'both';

    const historyItems = generateAcademicHistory(birthYear, birthMonth, birthDate, {
      course,
      ronin,
      ryunen,
      scope,
      format
    });

    // テーブル描画
    resumeTbody.innerHTML = '';
    historyItems.forEach((item) => {
      const tr = document.createElement('tr');
      const savedSchoolName = schoolNameMap[item.stageKey] || '';

      const isEnter = item.status === '入学';
      const badgeClass = isEnter ? 'badge-enter' : 'badge-grad';

      tr.innerHTML = `
        <td class="col-date">${item.dateText}</td>
        <td class="col-status">
          <span class="badge-status ${badgeClass}">${item.status}</span>
        </td>
        <td class="col-school">
          <input 
            type="text" 
            class="table-input" 
            data-stage="${item.stageKey}" 
            data-default="${item.defaultSchool}"
            value="${escapeHtml(savedSchoolName)}" 
            placeholder="例: ○○${item.defaultSchool}"
            aria-label="${item.dateText} ${item.defaultSchool} 学校名"
          >
        </td>
      `;
      resumeTbody.appendChild(tr);
    });

    // テーブル内インライン入力イベントのバインド
    const inputs = resumeTbody.querySelectorAll('.table-input');
    inputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const stage = e.target.getAttribute('data-stage');
        schoolNameMap[stage] = e.target.value;
      });
    });
  }

  /**
   * 画面全体の再計算とレンダリング (オーケストレーター)
   */
  function renderAll() {
    const birthYear = parseInt(selectYear.value, 10);
    const birthMonth = parseInt(selectMonth.value, 10);
    const birthDate = parseInt(selectDate.value, 10);

    // 入力値妥当性ガード (NaNおよび範囲外検証)
    if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDate)) return;
    if (birthYear < 1900 || birthMonth < 1 || birthMonth > 12 || birthDate < 1 || birthDate > 31) return;

    renderMetrics(birthYear, birthMonth, birthDate);
    renderBanner(birthYear, birthMonth, birthDate);
    renderTimeline(birthYear, birthMonth, birthDate);
  }

  /**
   * HTMLエスケープヘルパー
   */
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * 一括テキストコピー処理
   */
  async function handleCopy() {
    const rows = resumeTbody.querySelectorAll('tr');
    if (!rows || rows.length === 0) {
      showToast('コピー対象の学歴データがありません。');
      return;
    }

    const lines = [];
    rows.forEach(row => {
      const dateText = row.querySelector('.col-date').textContent.trim();
      const statusText = row.querySelector('.col-status').textContent.trim();
      const input = row.querySelector('.table-input');
      const enteredName = input ? input.value.trim() : '';
      const defaultName = input ? input.getAttribute('data-default') : '';

      const schoolName = enteredName || defaultName || '';
      lines.push(`${dateText}\t${schoolName}\t${statusText}`);
    });

    const fullText = lines.join('\n');

    // Clipboard API または フォールバック
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(fullText);
        showToast('学歴テキストをクリップボードにコピーしました！');
        return;
      } catch (err) {
        console.warn('Clipboard API 失敗、フォールバックを実行:', err);
      }
    }

    // フォールバック (textarea + execCommand)
    try {
      const textarea = document.createElement('textarea');
      textarea.value = fullText;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('学歴テキストをクリップボードにコピーしました！');
    } catch (fallbackErr) {
      console.error('コピー処理失敗:', fallbackErr);
      showToast('コピーに失敗しました。手動で選択してコピーしてください。');
    }
  }

  // イベントリスナーの登録
  selectYear.addEventListener('change', () => {
    updateDaysInMonth();
    renderAll();
  });

  selectMonth.addEventListener('change', () => {
    updateDaysInMonth();
    renderAll();
  });

  selectDate.addEventListener('change', renderAll);
  selectCourse.addEventListener('change', renderAll);
  selectRonin.addEventListener('change', renderAll);
  selectRyunen.addEventListener('change', renderAll);

  // ラジオボタングループの監視
  document.querySelectorAll('input[name="gender"]').forEach(r => r.addEventListener('change', renderAll));
  document.querySelectorAll('input[name="scope"]').forEach(r => r.addEventListener('change', renderAll));
  document.querySelectorAll('input[name="format"]').forEach(r => r.addEventListener('change', renderAll));

  // コピーボタン
  btnCopy.addEventListener('click', handleCopy);

  // 初回起動処理
  initDateSelects();
  renderTodaySummary();
  renderAll();
});
