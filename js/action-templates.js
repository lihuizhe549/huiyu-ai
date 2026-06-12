/**
 * 标准动作模板模块
 * Badminton AI Trainer - WeChat Mini Program
 *
 * 关节角度参数来源（GB/T 7714）：
 *   [1] Kumar A. Kinematical Analysis of the Smash and the
 *       Forehand Clear Skill in Badminton[D]. Lucknow:
 *       University of Lucknow, 2024.
 *       — 肘、肩、膝关节角度数据（Kinovea影像解析）
 *   [2] Ramasamy Y, et al. Kinetic and kinematic determinants
 *       of shuttlecock speed in the forehand jump smash[J].
 *       Sports Biomechanics, 2021.
 *       — 杀球肘关节最优角度范围
 *   [3] VIIRJ. Analysis of joint angles during badminton
 *       forehand service[J]. VIIRJ, 2021, 12(1).
 *       — 发球肘、肩关节角度数据
 *   [4] 郅季炘. 羽毛球后场正手高远球技术的运动学分析[J].
 *       沈阳体育学院学报, 2018, 37(2): 109-114.
 *       — 高远球肩关节运动学特征
 *   [5] Tang H P. Three-dimensional analysis of the forehand
 *       smash in badminton[C]. ISBS, 1995.
 *       — 杀球肘关节角度
 */

/** 预警等级判定 */
function getWarningLevel(angle, standard, tolerance) {
  const deviation = Math.abs(angle - standard);
  if (deviation <= tolerance * 0.6) return 'green';
  if (deviation <= tolerance) return 'yellow';
  return 'red';
}

/** 动作模板 */
const actions = {};

/** 初始化模板 */
function init() {
  Object.assign(actions, {
    /* ===== 正手高远球 =====
     * 肘角：Kumar(2024)实测155.92°±4.48 → 156°±5°
     * 肩角：Kumar(2024)实测132.75°±5.93 → 133°±6°
     * 膝角：Kumar(2024)实测149.08°±9.30 → 149°±9°
     * 髋角/转体/倾角：运动生物力学推估
     */
    'high-clear': {
      id: 'high-clear',
      name: '正手高远球',
      description: '考察上肢鞭打与下肢蹬转的协调配合',
      ref: 'Kumar(2024)[1]; 郅季炘(2018)[4]',
      joints: {
        rightElbow:     { standard: 156, tolerance: 5,  label: '右肘角', desc: '击球点肘关节角度[1]' },
        rightShoulder:  { standard: 133, tolerance: 6,  label: '右肩角', desc: '击球点肩关节角度[1]' },
        rightHip:       { standard: 60,  tolerance: 15, label: '右髋角', desc: '转髋幅度（推估）' },
        rightKnee:      { standard: 149, tolerance: 9,  label: '右膝角', desc: '下肢蹬伸角度[1]' },
        trunkRotation:  { standard: 45,  tolerance: 15, label: '转体角', desc: '躯干旋转幅度' },
        trunkLean:      { standard: 10,  tolerance: 8,  label: '躯干倾角', desc: '身体倾斜角度' }
      },
      keyJoints: ['rightElbow', 'rightShoulder', 'rightHip', 'rightKnee', 'trunkRotation']
    },

    /* ===== 正手挑球 =====
     * 文献数据稀缺，参考正手击球运动链推估
     * 挑球为前臂内旋主导的小幅度动作
     */
    'forehand-lift': {
      id: 'forehand-lift',
      name: '正手挑球',
      description: '侧重前臂内旋与小臂发力的精准控制',
      ref: '运动生物力学推估',
      joints: {
        rightElbow:     { standard: 160, tolerance: 15, label: '右肘角', desc: '前臂内旋角度（推估）' },
        rightShoulder:  { standard: 55,  tolerance: 15, label: '右肩角', desc: '引拍幅度（推估）' },
        rightHip:       { standard: 50,  tolerance: 15, label: '右髋角', desc: '转髋幅度（推估）' },
        rightKnee:      { standard: 155, tolerance: 15, label: '右膝角', desc: '下肢稳定角度（推估）' },
        trunkRotation:  { standard: 30,  tolerance: 12, label: '转体角', desc: '躯干旋转幅度（推估）' }
      },
      keyJoints: ['rightElbow', 'rightShoulder', 'rightHip', 'rightKnee']
    },

    /* ===== 正手发后场高远球 =====
     * 肘角：VIIRJ(2021)[3]实测长球144.40°±17.54 → 144°±18°
     * 肩角：VIIRJ(2021)[3]实测长球45.60°±19.95 → 46°±20°
     * 其他：推估
     */
    'forehand-serve': {
      id: 'forehand-serve',
      name: '正手发后场高远球',
      description: '考察发球时上肢控制与下肢配合的协调性',
      ref: 'VIIRJ(2021)[3]',
      joints: {
        rightElbow:     { standard: 144, tolerance: 18, label: '右肘角', desc: '击球点肘关节角度[3]' },
        rightShoulder:  { standard: 46,  tolerance: 20, label: '右肩角', desc: '击球点肩关节角度[3]' },
        rightHip:       { standard: 48,  tolerance: 12, label: '右髋角', desc: '转髋幅度（推估）' },
        rightKnee:      { standard: 152, tolerance: 14, label: '右膝角', desc: '下肢稳定角度（推估）' },
        trunkRotation:  { standard: 28,  tolerance: 12, label: '转体角', desc: '躯干旋转幅度（推估）' },
        trunkLean:      { standard: 12,  tolerance: 8,  label: '躯干倾角', desc: '身体前倾角度（推估）' }
      },
      keyJoints: ['rightElbow', 'rightShoulder', 'rightHip', 'rightKnee', 'trunkRotation']
    },

    /* ===== 正手杀球 =====
     * 肘角：Kumar(2024)[1]实测150.08°±9.95 → 150°±10°
     *       Tang(1995)[5]实测160°；Ramasamy(2021)[2]建议勿过伸
     * 肩角：Kumar(2024)实测133.33°
     * 膝角：Kumar(2024)实测148.17°
     */
    'smash': {
      id: 'smash',
      name: '正手杀球',
      description: '检验躯干扭转带动大臂的连贯性',
      ref: 'Kumar(2024)[1]; Tang(1995)[5]; Ramasamy(2021)[2]',
      joints: {
        rightElbow:     { standard: 150, tolerance: 10, label: '右肘角', desc: '击球点肘关节角度[1][2]' },
        rightShoulder:  { standard: 133, tolerance: 8,  label: '右肩角', desc: '击球点肩关节角度[1]' },
        rightHip:       { standard: 65,  tolerance: 15, label: '右髋角', desc: '转髋幅度（推估）' },
        rightKnee:      { standard: 148, tolerance: 10, label: '右膝角', desc: '起跳蹬伸角度[1]' },
        trunkRotation:  { standard: 50,  tolerance: 15, label: '转体角', desc: '躯干旋转幅度' },
        trunkLean:      { standard: 15,  tolerance: 8,  label: '躯干倾角', desc: '身体前倾角度' }
      },
      keyJoints: ['rightElbow', 'rightShoulder', 'rightHip', 'rightKnee', 'trunkRotation']
    }
  });
}

// 立即初始化
init();

/** 获取动作模板 */
function get(actionId) { return actions[actionId] || null; }

/** 获取动作列表 */
function getList() {
  return Object.values(actions).map(a => ({
    id: a.id, name: a.name, description: a.description, ref: a.ref
  }));
}

/** 评估单个关节 */
function evaluateJoint(actionId, jointName, actualAngle) {
  const action = actions[actionId];
  if (!action) return null;
  const joint = action.joints[jointName];
  if (!joint) return null;
  const deviation = Math.abs(actualAngle - joint.standard);
  return {
    level: getWarningLevel(actualAngle, joint.standard, joint.tolerance),
    deviation: Math.round(deviation),
    standard: joint.standard,
    tolerance: joint.tolerance
  };
}

/** 综合评估 */
function evaluateSession(actionId, angles) {
  const action = actions[actionId];
  if (!action) return null;

  const results = {};
  let greenCount = 0, totalCount = 0;

  for (const [jointName, jointCfg] of Object.entries(action.joints)) {
    const angleData = angles[jointName];
    if (!angleData || angleData === null) {
      results[jointName] = { level: 'unknown', deviation: 0, standard: jointCfg.standard, tolerance: jointCfg.tolerance };
      continue;
    }
    totalCount++;
    const er = evaluateJoint(actionId, jointName, angleData.angle);
    if (er) {
      results[jointName] = er;
      if (er.level === 'green') greenCount++;
    }
  }

  const score = totalCount > 0 ? Math.round((greenCount / totalCount) * 100) : 0;
  const overallLevel = score >= 80 ? 'green' : (score >= 50 ? 'yellow' : 'red');
  const 达标 = score >= 60;

  return { overallLevel, jointResults: results, score, 达标 };
}

window.ActionTemplates = { get, getList, evaluateJoint, evaluateSession, actions };
