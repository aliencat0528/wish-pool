/**
 * 仙女棒效果：游標拖尾、送出時的星塵爆開、願望升空。
 *
 * 原則：
 * - 只動 transform / opacity，不觸發 layout
 * - 粒子有數量上限，動畫結束就自我移除，不會愈積愈多
 * - `prefers-reduced-motion: reduce` 時整份直接不啟動
 * - 純裝飾，掛掉也不影響表單功能，所以整份包在 try 裡不干擾主流程
 */
(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const COLORS = ['#8fd8ff', '#c9a6ff', '#ffe08a', '#ffffff'];
  const MAX_LIVE = 220;
  const TRAIL_MIN_DISTANCE = 6;

  let live = 0;
  let lastX = null;
  let lastY = null;

  function spawn(x, y, options) {
    if (live >= MAX_LIVE) return;

    const opts = options || {};
    const size = opts.size || 6 + Math.random() * 8;
    const life = opts.life || 1100 + Math.random() * 700;
    const color = COLORS[(Math.random() * COLORS.length) | 0];
    // 四成五機率生成星形而非圓點——混著才像仙女棒灑出來的
    const isStar = opts.star !== undefined ? opts.star : Math.random() < 0.45;

    const el = document.createElement('span');
    el.className = 'sparkle';
    el.style.left = x + 'px';
    el.style.top = y + 'px';

    if (isStar) {
      el.textContent = Math.random() < 0.5 ? '✦' : '✧';
      el.style.fontSize = size * 2.6 + 'px';
      el.style.color = color;
      el.style.borderRadius = '0';
      el.style.textShadow = `0 0 ${size * 2}px ${color}, 0 0 ${size * 4}px ${color}`;
    } else {
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.background = color;
      el.style.boxShadow = `0 0 ${size * 2}px ${color}, 0 0 ${size * 5}px ${color}`;
    }

    document.body.appendChild(el);
    live += 1;

    const angle = opts.angle !== undefined ? opts.angle : Math.random() * Math.PI * 2;
    const distance = opts.distance || 12 + Math.random() * 26;
    const driftX = Math.cos(angle) * distance;
    const driftY = Math.sin(angle) * distance + (opts.rise || 14);

    const animation = el.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0) rotate(0deg)', opacity: 0 },
        { transform: 'translate(-50%, -50%) scale(1) rotate(90deg)', opacity: 1, offset: 0.25 },
        {
          transform: `translate(calc(-50% + ${driftX}px), calc(-50% - ${driftY}px)) scale(0) rotate(220deg)`,
          opacity: 0,
        },
      ],
      { duration: life, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' }
    );

    animation.onfinish = function () {
      el.remove();
      live -= 1;
    };
  }

  // ---- 游標拖尾（仙女棒） ----
  // 用移動距離節流而非時間：慢慢移動時不該噴一堆粒子在同一個點。
  document.addEventListener(
    'pointermove',
    function (event) {
      if (event.pointerType === 'touch') return;

      if (lastX !== null) {
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        if (dx * dx + dy * dy < TRAIL_MIN_DISTANCE * TRAIL_MIN_DISTANCE) return;
      }
      lastX = event.clientX;
      lastY = event.clientY;

      const n = 1 + (Math.random() < 0.55 ? 1 : 0);
      for (let i = 0; i < n; i += 1) {
        spawn(
          event.clientX + (Math.random() - 0.5) * 14,
          event.clientY + (Math.random() - 0.5) * 14,
          { size: 4 + Math.random() * 5, life: 850 + Math.random() * 400 }
        );
      }
    },
    { passive: true }
  );

  // ---- 輸入時在游標附近點一下光 ----
  document.addEventListener('focusin', function (event) {
    const target = event.target;
    if (!target.matches || !target.matches('textarea, input[type="email"]')) return;
    const box = target.getBoundingClientRect();
    for (let i = 0; i < 6; i += 1) {
      spawn(box.left + Math.random() * box.width, box.top + Math.random() * box.height, {
        size: 2 + Math.random() * 2,
        life: 800,
        distance: 10,
      });
    }
  });

  // ---- 送出成功：星塵爆開 + 願望升空 ----
  window.addEventListener('wish:sent', function () {
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;

    for (let i = 0; i < 60; i += 1) {
      const angle = (Math.PI * 2 * i) / 60 + Math.random() * 0.2;
      setTimeout(function () {
        spawn(x, y, {
          angle: angle,
          distance: 60 + Math.random() * 160,
          size: 3 + Math.random() * 5,
          life: 1100 + Math.random() * 700,
          rise: 30,
        });
      }, Math.random() * 260);
    }

    riseWish(x, y);
  });

  /** 一顆星從中央緩緩升空後消失 */
  function riseWish(x, y) {
    const star = document.createElement('div');
    star.textContent = '🌠';
    star.setAttribute('aria-hidden', 'true');
    star.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:3;
      font-size:2rem;pointer-events:none;will-change:transform,opacity;`;
    document.body.appendChild(star);

    star
      .animate(
        [
          { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0 },
          { transform: 'translate(-50%, -90%) scale(1.2)', opacity: 1, offset: 0.3 },
          { transform: 'translate(-50%, -420%) scale(0.5)', opacity: 0 },
        ],
        { duration: 2200, easing: 'cubic-bezier(0.3, 0, 0.2, 1)' }
      )
      .addEventListener('finish', function () {
        star.remove();
      });
  }

  // ---- 送出失敗：不放煙火。錯誤不該被慶祝 ----
})();
