/**
 * 姿态模拟器（演示模式）
 * Badminton AI Trainer
 *
 * 输出真实的高远球/挑球/杀球关节角度变化数据，
 * 让演示模式的显示数据与论文中的动作参数一致。
 *
 * 每个动作分为4个阶段，各关节角度按真实挥拍发力链设计：
 *   准备 → 引拍 → 击球 → 随挥
 *
 * 右手执拍者，角度单位：度
 */

const PoseSimulator = {
  isRunning: false,
  frame: 0,
  onResultsCallback: null,
  _timer: null,
  /** 当前动作阶段 0~3 */
  phase: 0,
  /** 阶段内进度 0~1 */
  phaseProgress: 0,
  lastResults: null,
  /** 当前应在模拟的动作类型 */
  actionId: 'high-clear',

  /** 每个阶段的帧数（控制速度） */
  PHASE_FRAMES: 48,

  /** ========== 各动作四阶段关节角度参数 ==========
   *  数据来源：羽毛球运动生物力学 + 论文标准
   *  按真实挥拍链设计：蹬地→转髋→转体→挥臂→闪腕
   */
  actionProfiles: {
    /** 正手高远球 —— 完整鞭打动作 */
    'high-clear': {
      name: '正手高远球',
      phases: [
        { // 0 准备：侧身站位，持拍上举，重心在右脚
          rightElbow: 95, rightShoulder: 68, rightHip: 52,
          rightKnee: 152, trunkRotation: 12, trunkLean: 8
        },
        { // 1 引拍：右臂后引，右肩外展，右膝弯曲蓄力，躯干扭转
          rightElbow: 118, rightShoulder: 98, rightHip: 55,
          rightKnee: 143, trunkRotation: 34, trunkLean: 10
        },
        { // 2 击球：手臂伸展到最高点，蹬地转体，肘角近180°
          rightElbow: 168, rightShoulder: 88, rightHip: 63,
          rightKnee: 164, trunkRotation: 49, trunkLean: 12
        },
        { // 3 随挥：手臂自然下摆，重心前移
          rightElbow: 142, rightShoulder: 70, rightHip: 50,
          rightKnee: 153, trunkRotation: 22, trunkLean: 14
        }
      ]
    },
    /** 正手挑球 —— 短促发力，小幅引拍 */
    'forehand-lift': {
      name: '正手挑球',
      phases: [
        {
          rightElbow: 98, rightShoulder: 48, rightHip: 48,
          rightKnee: 153, trunkRotation: 8, trunkLean: 12
        },
        {
          rightElbow: 128, rightShoulder: 62, rightHip: 50,
          rightKnee: 146, trunkRotation: 18, trunkLean: 14
        },
        {
          rightElbow: 162, rightShoulder: 68, rightHip: 56,
          rightKnee: 158, trunkRotation: 28, trunkLean: 16
        },
        {
          rightElbow: 138, rightShoulder: 52, rightHip: 46,
          rightKnee: 152, trunkRotation: 14, trunkLean: 12
        }
      ]
    },
    /** 正手杀球 —— 爆发性鞭打，大幅转体 */
    'smash': {
      name: '正手杀球',
      phases: [
        {
          rightElbow: 92, rightShoulder: 75, rightHip: 54,
          rightKnee: 153, trunkRotation: 14, trunkLean: 10
        },
        {
          rightElbow: 114, rightShoulder: 105, rightHip: 58,
          rightKnee: 140, trunkRotation: 38, trunkLean: 12
        },
        {
          rightElbow: 172, rightShoulder: 92, rightHip: 66,
          rightKnee: 166, trunkRotation: 53, trunkLean: 15
        },
        {
          rightElbow: 148, rightShoulder: 66, rightHip: 48,
          rightKnee: 152, trunkRotation: 20, trunkLean: 16
        }
      ]
    }
  },

  async init() { return true; },

  /**
   * 启动模拟
   */
  async start(videoEl, onResults, onError) {
    this.onResultsCallback = onResults;
    this.isRunning = true;
    this.frame = 0;
    this.phase = 0;
    this.phaseProgress = 0;

    this._timer = setInterval(() => {
      if (!this.isRunning) return;
      this.frame++;
      this.phaseProgress = (this.frame % this.PHASE_FRAMES) / this.PHASE_FRAMES;

      // 阶段切换
      if (this.frame > 0 && this.frame % this.PHASE_FRAMES === 0) {
        this.phase = (this.phase + 1) % 4;
      }

      // 生成当前帧的关节角度
      const angles = this._generateAngles();
      // 生成对应的骨架关键点（用于可视化）
      const landmarks = this._anglesToLandmarks(angles);

      const results = {
        poseLandmarks: landmarks,
        // 直接附上预计算的角度数据，让App直接使用
        _demoAngles: angles
      };

      this.lastResults = results;
      if (this.onResultsCallback) {
        this.onResultsCallback(results);
      }
    }, 50);

    console.log(`[PoseSimulator] 演示模式已启动 - ${this.actionProfiles[this.actionId]?.name || this.actionId}`);
    return { stop: () => {} };
  },

  stop() {
    this.isRunning = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  },

  getLandmarks() { return this.lastResults?.poseLandmarks || null; },

  /** 直接返回预计算的角度（被主App优先使用） */
  getDemoAngles() { return this.lastResults?._demoAngles || null; },

  hasDetection() { return !!this.lastResults; },
  resetStats() { this.frame = 0; },

  /** 设置要模拟的动作类型 */
  setAction(actionId) {
    if (this.actionProfiles[actionId]) {
      this.actionId = actionId;
    }
  },

  /**
   * 核心：生成真实关节角度
   * 在前后两个阶段之间做 smooth 过渡
   */
  _generateAngles() {
    const profile = this.actionProfiles[this.actionId];
    if (!profile) return null;

    const p = this._smoothStep(this.phaseProgress);
    const currentPhase = profile.phases[this.phase];
    const nextPhase = profile.phases[(this.phase + 1) % 4];

    // 在阶段之间线性插值，让角度平滑变化
    const lerp = (a, b) => Math.round(a + (b - a) * p);

    // 添加符合实际的轻微波动（模拟真实挥拍时的肌肉控制变化）
    const jitter = () => (Math.random() - 0.5) * 2.5;

    return {
      rightElbow:  { angle: lerp(currentPhase.rightElbow, nextPhase.rightElbow) + jitter() },
      rightShoulder: { angle: lerp(currentPhase.rightShoulder, nextPhase.rightShoulder) + jitter() },
      rightHip:    { angle: lerp(currentPhase.rightHip, nextPhase.rightHip) + jitter() },
      rightKnee:   { angle: lerp(currentPhase.rightKnee, nextPhase.rightKnee) + jitter() },
      trunkRotation: { angle: lerp(currentPhase.trunkRotation, nextPhase.trunkRotation) + jitter() },
      trunkLean:   { angle: lerp(currentPhase.trunkLean, nextPhase.trunkLean) + jitter() },
      leftElbow:   { angle: 152 + jitter() * 0.5 },
      leftKnee:    { angle: 158 + jitter() * 0.5 }
    };
  },

  /**
   * 平滑插值函数（ease-in-out）
   */
  _smoothStep(t) {
    return t * t * (3 - 2 * t);
  },

  /**
   * 根据关节角度反推关键点位置
   * 让画布上的骨架动画与角度数据一致
   */
  _anglesToLandmarks(angles) {
    const l = (x, y, z = 0, visibility = 0.99) => ({ x, y, z, visibility });

    // 基准站姿
    const landmarks = [
      l(0.50, 0.08), l(0.45, 0.10), l(0.42, 0.09), l(0.40, 0.10),
      l(0.55, 0.10), l(0.58, 0.09), l(0.60, 0.10), l(0.45, 0.13),
      l(0.55, 0.13), l(0.45, 0.15), l(0.55, 0.15),
      // 11左肩 12右肩
      l(0.40, 0.24), l(0.60, 0.24),
      // 13左肘 14右肘
      l(0.36, 0.36), l(0.50, 0.30),
      // 15左腕 16右腕
      l(0.34, 0.46), l(0.46, 0.20),
      l(0.30, 0.52), l(0.28, 0.48), l(0.28, 0.46), l(0.26, 0.44),
      l(0.32, 0.48), l(0.30, 0.44),
      // 23左髋 24右髋
      l(0.42, 0.54), l(0.58, 0.54),
      // 25左膝 26右膝
      l(0.44, 0.69), l(0.56, 0.69),
      // 27左踝 28右踝
      l(0.46, 0.84), l(0.54, 0.84),
      l(0.48, 0.90), l(0.52, 0.90), l(0.46, 0.95), l(0.54, 0.95)
    ];

    if (!angles) return landmarks;

    // 用角度推算关键点位置（只调整上半身，下肢保持常规站姿）
    const e = angles.rightElbow?.angle || 100;
    const s = angles.rightShoulder?.angle || 70;
    const tr = angles.trunkRotation?.angle || 20;

    // 肘角 → 右臂伸展程度：e越大手臂越直
    const elbowExt = Math.min(1, Math.max(0, (e - 80) / 100));
    // 肩角 → 右臂抬高程度：s越大手臂越侧举
    const shoulderRaise = Math.min(1, Math.max(0, (s - 40) / 80));
    // 转体 → 躯干扭转
    const rotate = Math.min(1, Math.max(0, (tr - 5) / 55));

    // 右肩抬高 + 转体
    landmarks[12].x = 0.60 + rotate * 0.04;
    landmarks[12].y = 0.24 - shoulderRaise * 0.04;

    // 左肩后拉（转体）
    landmarks[11].x = 0.40 - rotate * 0.03;
    landmarks[11].y = 0.24 + rotate * 0.01;

    // 右肘：肩抬高 + 肘伸展
    landmarks[14].x = landmarks[12].x + 0.06 - rotate * 0.08;
    landmarks[14].y = landmarks[12].y + 0.14 - elbowExt * 0.10 - shoulderRaise * 0.06;

    // 右腕：随肘伸展抬高
    landmarks[16].x = landmarks[14].x - 0.02 - rotate * 0.04;
    landmarks[16].y = landmarks[14].y + 0.12 - elbowExt * 0.12 - shoulderRaise * 0.08;

    // 右膝：根据膝角调整微屈
    const kneeAngle = angles.rightKnee?.angle || 155;
    const kneeBend = Math.min(1, Math.max(0, (170 - kneeAngle) / 40));
    landmarks[26].y = 0.69 + kneeBend * 0.04;

    // 左臂自然摆动
    landmarks[13].x = 0.36 + rotate * 0.03;
    landmarks[13].y = 0.36 + rotate * 0.02;
    landmarks[15].x = 0.34 + rotate * 0.04;
    landmarks[15].y = 0.46 + rotate * 0.03;

    return landmarks;
  }
};

window.PoseSimulator = PoseSimulator;
