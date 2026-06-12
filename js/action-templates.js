/**
 * 标准动作模板模块
 * Badminton AI Trainer
 *
 * 定义羽毛球标准技术动作的关节角度范围和预警阈值。
 * 参数来源：运动生物力学文献 + 论文研究数据。
 *
 * 关节命名规则：{side}{Joint}
 *   side: left/right (右手执拍者以右侧为击球臂)
 *   Joint: Elbow/Shoulder/Hip/Knee/Trunk
 *
 * 每个关节参数：
 *   standard {number}   标准角度值
 *   tolerance {number}  容差范围（超过tolerance为红，60%以内为绿）
 *   label {string}      中文显示名
 *   unit {string}       单位
 *   description {string} 技术描述
 */

const ActionTemplates = {
  /** 动作模板列表 */
  actions: {},

  /**
   * 初始化默认动作模板
   */
  init() {
    this.actions = {
      /** 正手高远球 */
      'high-clear': {
        id: 'high-clear',
        name: '正手高远球',
        nameEn: 'Forehand High Clear',
        description: '考察上肢鞭打与下肢蹬转的协调配合',
        joints: {
          rightElbow:  { standard: 165, tolerance: 15, label: '右肘角', description: '击球点肘关节角度' },
          rightShoulder: { standard: 90, tolerance: 20, label: '右肩角', description: '引拍外展幅度' },
          rightHip:    { standard: 60, tolerance: 15, label: '右髋角', description: '转髋幅度' },
          rightKnee:   { standard: 160, tolerance: 15, label: '右膝角', description: '下肢蹬伸角度' },
          trunkRotation: { standard: 45, tolerance: 15, label: '转体角', description: '躯干旋转幅度' },
          trunkLean:  { standard: 10, tolerance: 8, label: '躯干倾角', description: '身体倾斜角度' }
        },
        keyJoints: ['rightElbow', 'rightShoulder', 'rightHip', 'rightKnee', 'trunkRotation']
      },

      /** 正手挑球 */
      'forehand-lift': {
        id: 'forehand-lift',
        name: '正手挑球',
        nameEn: 'Forehand Lift',
        description: '侧重前臂内旋与小臂发力的精准控制',
        joints: {
          rightElbow:  { standard: 160, tolerance: 15, label: '右肘角', description: '前臂内旋角度' },
          rightShoulder: { standard: 55, tolerance: 15, label: '右肩角', description: '引拍幅度' },
          rightHip:    { standard: 50, tolerance: 15, label: '右髋角', description: '转髋幅度' },
          rightKnee:   { standard: 155, tolerance: 15, label: '右膝角', description: '下肢稳定角度' },
          trunkRotation: { standard: 30, tolerance: 12, label: '转体角', description: '躯干旋转幅度' }
        },
        keyJoints: ['rightElbow', 'rightShoulder', 'rightHip', 'rightKnee']
      },

      /** 正手杀球 */
      'smash': {
        id: 'smash',
        name: '正手杀球',
        nameEn: 'Forehand Smash',
        description: '检验躯干扭转带动大臂的连贯性',
        joints: {
          rightElbow:  { standard: 170, tolerance: 12, label: '右肘角', description: '击球点肘关节角度' },
          rightShoulder: { standard: 90, tolerance: 15, label: '右肩角', description: '架拍角度' },
          rightHip:    { standard: 65, tolerance: 15, label: '右髋角', description: '转髋幅度' },
          rightKnee:   { standard: 155, tolerance: 15, label: '右膝角', description: '起跳蹬伸角度' },
          trunkRotation: { standard: 50, tolerance: 15, label: '转体角', description: '躯干旋转幅度' },
          trunkLean:  { standard: 15, tolerance: 8, label: '躯干倾角', description: '身体前倾角度' }
        },
        keyJoints: ['rightElbow', 'rightShoulder', 'rightHip', 'trunkRotation']
      }
    };
  },

  /**
   * 获取动作模板
   * @param {string} actionId
   * @returns {Object|null}
   */
  get(actionId) {
    return this.actions[actionId] || null;
  },

  /**
   * 获取所有动作列表
   * @returns {Array}
   */
  getList() {
    return Object.values(this.actions).map(a => ({
      id: a.id,
      name: a.name,
      description: a.description
    }));
  },

  /**
   * 评估关节角度
   * @param {string} actionId - 动作ID
   * @param {string} jointName - 关节名
   * @param {number} actualAngle - 实际测量角度
   * @returns {{ level: string, deviation: number, standard: number, tolerance: number } | null}
   */
  evaluateJoint(actionId, jointName, actualAngle) {
    const action = this.actions[actionId];
    if (!action) return null;
    const joint = action.joints[jointName];
    if (!joint) return null;

    const deviation = Math.abs(actualAngle - joint.standard);
    const level = Utils.getWarningLevel(actualAngle, joint.standard, joint.tolerance);

    return {
      level,
      deviation: Math.round(deviation),
      standard: joint.standard,
      tolerance: joint.tolerance
    };
  },

  /**
   * 综合评估一次检测的整体动作质量
   * @param {string} actionId
   * @param {Object} angles - AngleCalc.getAll() 的输出
   * @returns {{ overallLevel: string, jointResults: Object, score: number,达标: boolean }}
   */
  evaluateSession(actionId, angles) {
    const action = this.actions[actionId];
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
      const evalResult = this.evaluateJoint(actionId, jointName, angleData.angle);
      if (evalResult) {
        results[jointName] = evalResult;
        if (evalResult.level === 'green') greenCount++;
      }
    }

    const score = totalCount > 0 ? Math.round((greenCount / totalCount) * 100) : 0;
    const overallLevel = score >= 80 ? 'green' : (score >= 50 ? 'yellow' : 'red');
    const 达标 = score >= 60;

    return { overallLevel, jointResults: results, score, 达标 };
  }
};

// 初始化
ActionTemplates.init();

window.ActionTemplates = ActionTemplates;
