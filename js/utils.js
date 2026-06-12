/**
 * 工具函数模块
 * Badminton AI Trainer — 羽毛球AI姿态识别训练工具
 */

const Utils = {
  /**
   * 计算两点间距离
   * @param {Object} a - 关键点 {x, y}
   * @param {Object} b - 关键点 {x, y}
   * @returns {number} 距离
   */
  distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  },

  /**
   * 计算三点夹角（度）
   * @param {Object} a - 顶点 {x, y}
   * @param {Object} b - 中间点 {x, y}
   * @param {Object} c - 末端点 {x, y}
   * @returns {number} 角度（度），0-180
   */
  angle(a, b, c) {
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const dot = ab.x * cb.x + ab.y * cb.y;
    const cross = ab.x * cb.y - ab.y * cb.x;
    return Math.abs(Math.atan2(cross, dot) * (180 / Math.PI));
  },

  /**
   * 计算向量与水平轴的夹角
   * @param {Object} from - 起点 {x, y}
   * @param {Object} to - 终点 {x, y}
   * @returns {number} 角度（度）
   */
  vectorAngle(from, to) {
    return Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI);
  },

  /**
   * 将角度归一化到0-360
   */
  normalizeAngle(angle) {
    angle = angle % 360;
    return angle < 0 ? angle + 360 : angle;
  },

  /**
   * 检测关键点可见性（MediaPipe visibility阈值）
   * @param {Object} landmark - 关键点
   * @param {number} [threshold=0.5]
   * @returns {boolean}
   */
  isVisible(landmark, threshold = 0.5) {
    return landmark && landmark.visibility >= threshold;
  },

  /**
   * 安全的 landmark 访问，不可见则返回null
   */
  safeLandmark(landmarks, index, threshold = 0.5) {
    if (!landmarks || !landmarks[index]) return null;
    if (landmarks[index].visibility < threshold) return null;
    return landmarks[index];
  },

  /**
   * 格式化时间
   * @param {Date} date
   * @returns {string} "2026-06-09 14:30"
   */
  formatDateTime(date) {
    const d = date || new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  /**
   * 格式化日期
   */
  formatDate(date) {
    const d = date || new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },

  /**
   * 根据角度值返回预警等级
   * @param {number} angle - 实际角度
   * @param {number} standard - 标准角度
   * @param {number} tolerance - 容差范围
   * @returns {string} 'green' | 'yellow' | 'red'
   */
  getWarningLevel(angle, standard, tolerance) {
    const deviation = Math.abs(angle - standard);
    if (deviation <= tolerance * 0.6) return 'green';
    if (deviation <= tolerance) return 'yellow';
    return 'red';
  },

  /**
   * 生成唯一ID
   */
  genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  /**
   * 百分比
   */
  percent(value, total) {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  },

  /**
   * 平均值
   */
  avg(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  },

  /**
   * 检测是否是移动端
   */
  isMobile() {
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
};

// 导出
window.Utils = Utils;
