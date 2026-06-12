/**
 * 实时反馈渲染模块
 * 负责Canvas骨架绘制 + 底部面板DOM更新
 */
const Feedback = {
  canvas: null, ctx: null, width: 640, height: 480,
  hintEl: null, infoEl: null,

  connections: [
    [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],
    [9,10],[11,12],
    [11,13],[13,15],[12,14],[14,16],
    [15,17],[15,19],[15,21],[17,19],[16,18],[16,20],[16,22],[18,20],
    [11,23],[12,24],[23,24],
    [23,25],[25,27],[27,29],[29,31],[24,26],[26,28],[28,30],[30,32]
  ],

  init(canvasEl, opts) {
    this.canvas = canvasEl; this.ctx = canvasEl.getContext('2d');
    if (opts) { this.hintEl = opts.hintEl; this.infoEl = opts.infoEl; }
    if (opts && opts.width) { this.width = opts.width; this.height = opts.height; }
  },

  update(landmarks, angles, actionId, evalResult) {
    this._drawSkeleton(landmarks);
    this._updateHint(evalResult, angles, actionId);
    this._updateJointGrid(angles, actionId);
  },

  _drawSkeleton(landmarks) {
    const ctx = this.ctx, w = this.width, h = this.height;
    ctx.clearRect(0, 0, w, h);
    if (!landmarks) return;

    // 连线
    ctx.lineCap = 'round';
    for (const [i, j] of this.connections) {
      const a = landmarks[i], b = landmarks[j];
      if (a && b && a.visibility > 0.5 && b.visibility > 0.5) {
        ctx.beginPath(); ctx.moveTo(a.x * w, a.y * h); ctx.lineTo(b.x * w, b.y * h);
        ctx.strokeStyle = '#00E5FF'; ctx.lineWidth = 2; ctx.stroke();
      }
    }
    // 关键点
    for (const lm of landmarks) {
      if (lm && lm.visibility > 0.5) {
        ctx.beginPath(); ctx.arc(lm.x * w, lm.y * h, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#FF6B6B'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
      }
    }
  },

  _updateHint(evalResult, angles, actionId) {
    if (!this.hintEl || !evalResult) return;
    const level = evalResult.overallLevel;
    const colors = { green: '#4CAF50', yellow: '#FF9800', red: '#F44336' };

    let worstJoint = null, worstDev = 0;
    const tbl = window.ActionTemplates;
    if (tbl && actionId) {
      const action = tbl.get(actionId);
      if (action) {
        for (const [jn, jc] of Object.entries(action.joints)) {
          const ad = angles && angles[jn];
          if (ad) {
            const dev = Math.abs(ad.angle - jc.standard);
            if (dev > jc.tolerance * 0.6 && dev > worstDev) { worstJoint = { name: jc.label, angle: ad.angle, std: jc.standard, tol: jc.tolerance, diff: Math.round(ad.angle - jc.standard) }; worstDev = dev; }
          }
        }
      }
    }
    if (worstJoint) {
      this.hintEl.textContent = `${worstJoint.name}偏差${Math.abs(worstJoint.diff)}° (当前${worstJoint.angle}°, 标准${worstJoint.std}°±${worstJoint.tol}°)`;
      this.hintEl.style.color = worstDev > worstJoint.tol ? colors.red : colors.yellow;
    } else {
      this.hintEl.textContent = '动作规范，继续保持！';
      this.hintEl.style.color = colors.green;
    }
  },

  _updateJointGrid(angles, actionId) {
    if (!this.infoEl) return;
    const tbl = window.ActionTemplates;
    if (!tbl || !actionId) return;
    const action = tbl.get(actionId);
    if (!action) return;

    let html = '';
    for (const [jn, jc] of Object.entries(action.joints)) {
      const ad = angles && angles[jn];
      const val = ad ? ad.angle+'°' : '--°';
      const dev = ad ? Math.abs(ad.angle - jc.standard) : 999;
      const color = dev <= jc.tolerance*0.6 ? '#4CAF50' : (dev <= jc.tolerance ? '#FF9800' : '#F44336');
      html += `<div class="joint-cell"><span class="jc-label">${jc.label}</span><span class="jc-value" style="color:${color}">${val}</span></div>`;
    }
    this.infoEl.innerHTML = html;
  },

  reset() {
    if (this.ctx) this.ctx.clearRect(0,0,this.width,this.height);
    if (this.hintEl) { this.hintEl.textContent = ''; this.hintEl.style.color = '#8892a8'; }
    if (this.infoEl) this.infoEl.innerHTML = '';
  }
};
