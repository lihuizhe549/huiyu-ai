/**
 * 实时反馈渲染模块
 * Badminton AI Trainer
 *
 * 负责在Canvas上绘制骨架叠加、关节角度数值、三级预警灯光。
 */

const Feedback = {
  /** Canvas元素 */
  canvas: null,
  /** Canvas 2D上下文 */
  ctx: null,
  /** 当前检测的关键点 */
  landmarks: null,
  /** 当前关节角度 */
  angles: null,
  /** 当前动作ID */
  currentAction: null,
  /** 当前整体评估 */
  currentEval: null,
  /** 灯光状态 DOM 元素 */
  lightEl: null,
  /** 提示文字 DOM 元素 */
  hintEl: null,
  /** 角度信息 DOM 元素 */
  infoEl: null,

  /** Canvas绘图尺寸 */
  width: 640,
  height: 480,

  /** 骨架连接定义（MediaPipe Pose 标准连接） */
  connections: [
    // 面部
    [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
    // 躯干
    [9, 10], [11, 12],
    // 手臂
    [11, 13], [13, 15], [12, 14], [14, 16],
    // 手部
    [15, 17], [15, 19], [15, 21], [17, 19], [16, 18], [16, 20], [16, 22], [18, 20],
    // 下肢
    [11, 23], [12, 24], [23, 24],
    // 腿
    [23, 25], [25, 27], [27, 29], [29, 31], [24, 26], [26, 28], [28, 30], [30, 32]
  ],

  /** 预警颜色 */
  colors: {
    green: { main: '#4CAF50', light: '#A5D6A7', bg: 'rgba(76, 175, 80, 0.15)' },
    yellow: { main: '#FF9800', light: '#FFCC80', bg: 'rgba(255, 152, 0, 0.15)' },
    red: { main: '#F44336', light: '#EF9A9A', bg: 'rgba(244, 67, 54, 0.15)' },
    unknown: { main: '#9E9E9E', light: '#E0E0E0', bg: 'rgba(158, 158, 158, 0.1)' }
  },

  /**
   * 初始化
   * @param {HTMLCanvasElement} canvasEl
   * @param {Object} options
   */
  init(canvasEl, options = {}) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    if (options.lightEl) this.lightEl = options.lightEl;
    if (options.hintEl) this.hintEl = options.hintEl;
    if (options.infoEl) this.infoEl = options.infoEl;
    if (options.width) this.width = options.width;
    if (options.height) this.height = options.height;
  },

  /**
   * 更新检测数据并触发重绘
   * @param {Array} landmarks - 33个关键点
   * @param {Object} angles - angle-calc 计算的关节角度
   * @param {string} actionId - 当前动作ID
   * @param {Object} evalResult - 评估结果
   */
  update(landmarks, angles, actionId, evalResult) {
    this.landmarks = landmarks;
    this.angles = angles;
    this.currentAction = actionId;
    this.currentEval = evalResult;
    this.draw();
    this.updateLights();
    this.updateHints();
    this.updateInfo();
  },

  /**
   * 绘制骨架和角度标签
   */
  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 清空Canvas
    ctx.clearRect(0, 0, w, h);

    if (!this.landmarks) return;

    // 绘制连接线
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    for (const [i, j] of this.connections) {
      const a = this.landmarks[i];
      const b = this.landmarks[j];
      if (a && b && a.visibility > 0.5 && b.visibility > 0.5) {
        ctx.beginPath();
        ctx.moveTo(a.x * w, a.y * h);
        ctx.lineTo(b.x * w, b.y * h);
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // 绘制关键点
    for (let i = 0; i < this.landmarks.length; i++) {
      const lm = this.landmarks[i];
      if (lm && lm.visibility > 0.5) {
        const x = lm.x * w;
        const y = lm.y * h;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#FF6B6B';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // 绘制关节角度标签
    if (this.angles && this.currentAction) {
      const action = ActionTemplates.get(this.currentAction);
      if (action) {
        for (const [jointName, jointCfg] of Object.entries(action.joints)) {
          const angleData = this.angles[jointName];
          if (!angleData || angleData === null) continue;

          // 找到对应的关键点位置来显示标签
          const pos = this._getLabelPosition(jointName);
          if (pos) {
            const evalResult = ActionTemplates.evaluateJoint(this.currentAction, jointName, angleData.angle);
            const color = evalResult ? this.colors[evalResult.level].main : '#fff';

            ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4;
            ctx.fillStyle = color;
            ctx.fillText(`${jointCfg.label}: ${angleData.angle}°`, pos.x, pos.y);
            ctx.shadowBlur = 0;
          }
        }
      }
    }
  },

  /**
   * 获取各关节标签的显示位置
   */
  _getLabelPosition(jointName) {
    if (!this.landmarks) return null;
    const w = this.width, h = this.height;

    const positions = {
      rightElbow: () => {
        const lm = this.landmarks[14];
        return lm ? { x: lm.x * w, y: (lm.y * h) - 20 } : null;
      },
      rightShoulder: () => {
        const lm = this.landmarks[12];
        return lm ? { x: lm.x * w, y: (lm.y * h) - 20 } : null;
      },
      rightHip: () => {
        const lm = this.landmarks[24];
        return lm ? { x: lm.x * w, y: (lm.y * h) - 20 } : null;
      },
      rightKnee: () => {
        const lm = this.landmarks[26];
        return lm ? { x: lm.x * w, y: (lm.y * h) - 20 } : null;
      },
      trunkRotation: () => {
        const ls = this.landmarks[11], rs = this.landmarks[12];
        if (ls && rs) {
          return { x: ((ls.x + rs.x) / 2) * w, y: ((ls.y + rs.y) / 2) * h - 35 };
        }
        return null;
      },
      trunkLean: () => {
        const lh = this.landmarks[23], rh = this.landmarks[24];
        if (lh && rh) {
          return { x: ((lh.x + rh.x) / 2) * w, y: ((lh.y + rh.y) / 2) * h + 25 };
        }
        return null;
      },
      leftElbow: () => {
        const lm = this.landmarks[13];
        return lm ? { x: lm.x * w, y: (lm.y * h) - 20 } : null;
      },
      leftKnee: () => {
        const lm = this.landmarks[25];
        return lm ? { x: lm.x * w, y: (lm.y * h) - 20 } : null;
      }
    };

    const fn = positions[jointName];
    return fn ? fn() : null;
  },

  /**
   * 更新灯光指示
   */
  updateLights() {
    if (!this.lightEl || !this.currentEval) return;

    const color = this.colors[this.currentEval.overallLevel] || this.colors.unknown;
    this.lightEl.style.backgroundColor = color.main;
    this.lightEl.style.boxShadow = `0 0 30px ${color.main}`;

    // 更新灯光标签文字
    const labelMap = {
      green: '动作规范',
      yellow: '轻度偏差',
      red: '严重偏离',
      unknown: '检测中'
    };
    const labelEl = this.lightEl.querySelector('.light-label') || this.lightEl;
    if (labelEl.tagName !== 'DIV' || !labelEl.classList.contains('light-label')) {
      // 用 lightEl 的 data-label 或 textContent
      const textEl = this.lightEl.parentElement?.querySelector('.light-text');
      if (textEl) textEl.textContent = labelMap[this.currentEval.overallLevel] || '';
    }

    // 触发动画
    this.lightEl.classList.remove('pulse');
    void this.lightEl.offsetWidth; // reflow
    this.lightEl.classList.add('pulse');
  },

  /**
   * 更新提示文字
   */
  updateHints() {
    if (!this.hintEl || !this.currentEval) return;

    const action = ActionTemplates.get(this.currentAction);
    if (!action) return;

    // 找出最差的关节
    let worstJoint = null;
    let worstLevel = 0; // 0=green, 1=yellow, 2=red
    const levelOrder = { green: 0, yellow: 1, red: 2 };

    for (const [jointName, result] of Object.entries(this.currentEval.jointResults)) {
      const level = levelOrder[result.level] || 0;
      if (level > worstLevel) {
        worstLevel = level;
        worstJoint = { name: jointName, result };
      }
    }

    if (worstJoint && worstLevel > 0) {
      const jointCfg = action.joints[worstJoint.name];
      const hintMap = {
        'rightElbow': '注意右肘角度，保持挥拍轨迹',
        'rightShoulder': '注意右肩发力顺序，避免耸肩',
        'rightHip': '加强转髋幅度，用下肢带动上肢',
        'rightKnee': '注意下肢蹬伸，保持重心稳定',
        'trunkRotation': '增加转体幅度，充分利用核心力量',
        'trunkLean': '控制身体重心，避免过度倾斜',
        'leftElbow': '注意左臂平衡',
        'leftKnee': '注意左腿支撑稳定'
      };
      const hint = hintMap[worstJoint.name] || `${jointCfg?.label || worstJoint.name}需要调整`;
      this.hintEl.textContent = `提示：${hint}`;
      this.hintEl.className = `hint-text hint-${worstJoint.result.level}`;
    } else {
      this.hintEl.textContent = '动作规范，继续保持！';
      this.hintEl.className = 'hint-text hint-green';
    }
  },

  /**
   * 更新角度信息面板
   */
  updateInfo() {
    if (!this.infoEl || !this.angles || !this.currentAction) return;

    const action = ActionTemplates.get(this.currentAction);
    if (!action) return;

    let html = '';
    for (const [jointName, jointCfg] of Object.entries(action.joints)) {
      const angleData = this.angles[jointName];
      if (angleData && angleData !== null) {
        const evalResult = ActionTemplates.evaluateJoint(this.currentAction, jointName, angleData.angle);
        const color = evalResult ? this.colors[evalResult.level].main : '#fff';
        html += `<div class="joint-info-item">
          <span class="joint-label">${jointCfg.label}</span>
          <span class="joint-value" style="color:${color}">${angleData.angle}°</span>
          <span class="joint-standard">标准: ${jointCfg.standard}° ±${jointCfg.tolerance}°</span>
        </div>`;
      } else {
        html += `<div class="joint-info-item dimmed">
          <span class="joint-label">${jointCfg.label}</span>
          <span class="joint-value">--°</span>
          <span class="joint-standard">检测中...</span>
        </div>`;
      }
    }

    this.infoEl.innerHTML = html;
  },

  /**
   * 重置反馈
   */
  reset() {
    if (this.lightEl) {
      this.lightEl.style.backgroundColor = '#9E9E9E';
      this.lightEl.style.boxShadow = 'none';
    }
    if (this.hintEl) {
      this.hintEl.textContent = '准备就绪，请选择动作并开始训练';
      this.hintEl.className = 'hint-text';
    }
    if (this.infoEl) {
      this.infoEl.innerHTML = '';
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
    this.landmarks = null;
    this.angles = null;
    this.currentEval = null;
  }
};

window.Feedback = Feedback;
