/**
 * 关节角度计算模块
 * Badminton AI Trainer
 *
 * MediaPipe Pose 关键点索引：
 *   0:鼻子  11:左肩  12:右肩  13:左肘  14:右肘
 *  15:左腕  16:右腕  23:左髋  24:右髋
 *  25:左膝  26:右膝  27:左踝  28:右踝
 */

const AngleCalc = {
  /**
   * 计算右肘关节角度（肩-肘-腕）
   * @param {Array} landmarks - MediaPipe 33个关键点
   * @returns {{ angle: number, status: string } | null}
   */
  rightElbow(landmarks) {
    const s = Utils.safeLandmark(landmarks, 12);  // 右肩
    const e = Utils.safeLandmark(landmarks, 14);  // 右肘
    const w = Utils.safeLandmark(landmarks, 16);  // 右腕
    if (!s || !e || !w) return null;
    return { angle: Math.round(Utils.angle(s, e, w)) };
  },

  /**
   * 计算左肘关节角度
   */
  leftElbow(landmarks) {
    const s = Utils.safeLandmark(landmarks, 11);
    const e = Utils.safeLandmark(landmarks, 13);
    const w = Utils.safeLandmark(landmarks, 15);
    if (!s || !e || !w) return null;
    return { angle: Math.round(Utils.angle(s, e, w)) };
  },

  /**
   * 计算右肩关节角度（肘-肩-髋）
   * 反映手臂外展/上举幅度
   */
  rightShoulder(landmarks) {
    const e = Utils.safeLandmark(landmarks, 14);  // 右肘
    const s = Utils.safeLandmark(landmarks, 12);  // 右肩
    const h = Utils.safeLandmark(landmarks, 24);  // 右髋
    if (!e || !s || !h) return null;
    return { angle: Math.round(Utils.angle(e, s, h)) };
  },

  /**
   * 计算左肩关节角度
   */
  leftShoulder(landmarks) {
    const e = Utils.safeLandmark(landmarks, 13);
    const s = Utils.safeLandmark(landmarks, 11);
    const h = Utils.safeLandmark(landmarks, 23);
    if (!e || !s || !h) return null;
    return { angle: Math.round(Utils.angle(e, s, h)) };
  },

  /**
   * 计算右髋关节角度（膝-髋-肩）
   * 反映转髋幅度
   */
  rightHip(landmarks) {
    const k = Utils.safeLandmark(landmarks, 26);  // 右膝
    const h = Utils.safeLandmark(landmarks, 24);  // 右髋
    const s = Utils.safeLandmark(landmarks, 12);  // 右肩
    if (!k || !h || !s) return null;
    return { angle: Math.round(Utils.angle(k, h, s)) };
  },

  /**
   * 计算左髋关节角度
   */
  leftHip(landmarks) {
    const k = Utils.safeLandmark(landmarks, 25);
    const h = Utils.safeLandmark(landmarks, 23);
    const s = Utils.safeLandmark(landmarks, 11);
    if (!k || !h || !s) return null;
    return { angle: Math.round(Utils.angle(k, h, s)) };
  },

  /**
   * 计算右膝关节角度（踝-膝-髋）
   * 反映下肢蹬伸
   */
  rightKnee(landmarks) {
    const a = Utils.safeLandmark(landmarks, 28);  // 右踝
    const k = Utils.safeLandmark(landmarks, 26);  // 右膝
    const h = Utils.safeLandmark(landmarks, 24);  // 右髋
    if (!a || !k || !h) return null;
    return { angle: Math.round(Utils.angle(a, k, h)) };
  },

  /**
   * 计算左膝关节角度
   */
  leftKnee(landmarks) {
    const a = Utils.safeLandmark(landmarks, 27);
    const k = Utils.safeLandmark(landmarks, 25);
    const h = Utils.safeLandmark(landmarks, 23);
    if (!a || !k || !h) return null;
    return { angle: Math.round(Utils.angle(a, k, h)) };
  },

  /**
   * 计算躯干倾斜角度（肩中心-髋中心连线与垂直轴的夹角）
   */
  trunkLean(landmarks) {
    const ls = Utils.safeLandmark(landmarks, 11);
    const rs = Utils.safeLandmark(landmarks, 12);
    const lh = Utils.safeLandmark(landmarks, 23);
    const rh = Utils.safeLandmark(landmarks, 24);
    if (!ls || !rs || !lh || !rh) return null;

    const shoulderMid = {
      x: (ls.x + rs.x) / 2,
      y: (ls.y + rs.y) / 2
    };
    const hipMid = {
      x: (lh.x + rh.x) / 2,
      y: (lh.y + rh.y) / 2
    };
    // 与垂直轴夹角
    const angle = Math.abs(Utils.vectorAngle(hipMid, shoulderMid) - 90);
    return { angle: Math.round(angle) };
  },

  /**
   * 计算躯干旋转角度（双肩连线与双髋连线的夹角差）
   * 反映转体幅度
   */
  trunkRotation(landmarks) {
    const ls = Utils.safeLandmark(landmarks, 11);
    const rs = Utils.safeLandmark(landmarks, 12);
    const lh = Utils.safeLandmark(landmarks, 23);
    const rh = Utils.safeLandmark(landmarks, 24);
    if (!ls || !rs || !lh || !rh) return null;

    const shoulderAngle = Utils.vectorAngle(ls, rs);
    const hipAngle = Utils.vectorAngle(lh, rh);
    let diff = Math.abs(shoulderAngle - hipAngle);
    if (diff > 180) diff = 360 - diff;
    return { angle: Math.round(diff) };
  },

  /**
   * 获取所有相关关节角度（右手执拍者）
   * @param {Array} landmarks
   * @returns {Object} { rightElbow, rightShoulder, rightHip, rightKnee, trunkLean, trunkRotation, leftElbow, leftKnee }
   */
  getAll(landmarks) {
    return {
      rightElbow: this.rightElbow(landmarks),
      rightShoulder: this.rightShoulder(landmarks),
      rightHip: this.rightHip(landmarks),
      rightKnee: this.rightKnee(landmarks),
      trunkLean: this.trunkLean(landmarks),
      trunkRotation: this.trunkRotation(landmarks),
      leftElbow: this.leftElbow(landmarks),
      leftKnee: this.leftKnee(landmarks)
    };
  }
};

window.AngleCalc = AngleCalc;
