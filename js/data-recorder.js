/**
 * 训练记录持久化模块
 * Badminton AI Trainer
 *
 * 使用 IndexedDB 存储训练数据。
 * 每条训练记录包含：时间、动作类型、各帧关节数据、综合评分等。
 */

const DataRecorder = {
  DB_NAME: 'BadmintonTrainerDB',
  DB_VERSION: 1,
  STORE_NAME: 'sessions',
  db: null,

  /** 当前训练会话数据 */
  currentSession: null,
  /** 当前训练是否进行中 */
  isRecording: false,
  /** 帧数据缓存（用于实时计算，不全部持久化） */
  _frameBuffer: [],
  /** 最大缓存帧数 */
  MAX_FRAMES: 500,

  /**
   * 打开数据库
   * @returns {Promise<IDBDatabase>}
   */
  async openDB() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, {
            keyPath: 'id',
            autoIncrement: false
          });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('actionType', 'actionType', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[DataRecorder] 数据库打开失败:', event.target.error);
        reject(event.target.error);
      };
    });
  },

  /**
   * 开始新的训练会话
   * @param {string} actionId - 动作ID
   * @param {Object} studentInfo - 学生信息（可选）
   * @returns {Object} session对象
   */
  startSession(actionId, studentInfo = {}) {
    this.currentSession = {
      id: Utils.genId(),
      date: Utils.formatDate(),
      timestamp: Date.now(),
      actionType: actionId,
      actionName: ActionTemplates.get(actionId)?.name || actionId,
      studentName: studentInfo.name || '',
      studentId: studentInfo.id || '',
      duration: 0,
      totalFrames: 0,
      validFrames: 0,
      jointHistory: [],
      scoreHistory: [],
      overallScore: 0,
      averageScore: 0,
      passRate: 0,
      jointAverages: {},
      status: 'in_progress'
    };
    this._frameBuffer = [];
    this.isRecording = true;
    console.log('[DataRecorder] 训练会话开始:', this.currentSession.id);
    return this.currentSession;
  },

  /**
   * 记录一帧数据
   * @param {Object} angles - AngleCalc.getAll() 输出
   * @param {Object} evalResult - ActionTemplates.evaluateSession() 输出
   */
  recordFrame(angles, evalResult) {
    if (!this.isRecording || !this.currentSession) return;

    this.currentSession.totalFrames++;

    // 只记录有关节数据的帧
    if (angles && evalResult) {
      this.currentSession.validFrames++;

      // 采样记录关节数据（每5帧记录一次，减少存储量）
      if (this.currentSession.totalFrames % 5 === 0) {
        const frameData = { angles: {}, score: evalResult.score };
        for (const [key, val] of Object.entries(angles)) {
          if (val && val !== null) {
            frameData.angles[key] = val.angle;
          }
        }
        this.currentSession.jointHistory.push(frameData);
        this.currentSession.scoreHistory.push(evalResult.score);
      }

      // 缓存最近帧用于实时平均计算
      this._frameBuffer.push({ angles, evalResult });
      if (this._frameBuffer.length > this.MAX_FRAMES) {
        this._frameBuffer.shift();
      }
    }
  },

  /**
   * 结束当前训练会话
   * @returns {Promise<Object>} 保存的会话数据
   */
  async endSession() {
    if (!this.isRecording || !this.currentSession) {
      console.warn('[DataRecorder] 没有活跃的会话');
      return null;
    }

    this.isRecording = false;
    const session = this.currentSession;

    // 计算汇总数据
    session.duration = Date.now() - session.timestamp;
    session.averageScore = this._calcAverage(session.scoreHistory);
    session.overallScore = session.averageScore;
    session.passRate = session.scoreHistory.filter(s => s >= 60).length / Math.max(session.scoreHistory.length, 1);
    session.status = 'completed';

    // 计算各关节平均角度
    session.jointAverages = this._calcJointAverages(session.jointHistory);

    // 持久化
    try {
      await this.saveSession(session);
      console.log('[DataRecorder] 训练会话已保存:', session.id);
    } catch (err) {
      console.error('[DataRecorder] 保存失败:', err);
    }

    this.currentSession = null;
    this._frameBuffer = [];
    return session;
  },

  /**
   * 保存会话到 IndexedDB
   */
  async saveSession(session) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.put(session);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * 获取所有训练记录
   * @returns {Promise<Array>}
   */
  async getAllSessions() {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        // 按时间降序排列
        const sessions = request.result || [];
        sessions.sort((a, b) => b.timestamp - a.timestamp);
        resolve(sessions);
      };
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * 根据动作类型筛选记录
   * @param {string} actionId
   * @returns {Promise<Array>}
   */
  async getSessionsByAction(actionId) {
    const all = await this.getAllSessions();
    return all.filter(s => s.actionType === actionId);
  },

  /**
   * 获取某天的记录
   * @param {string} dateStr - "2026-06-09" 格式
   * @returns {Promise<Array>}
   */
  async getSessionsByDate(dateStr) {
    const all = await this.getAllSessions();
    return all.filter(s => s.date === dateStr);
  },

  /**
   * 删除记录
   * @param {string} id
   */
  async deleteSession(id) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * 清空所有记录
   */
  async clearAll() {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * 获取统计数据
   * @returns {Promise<Object>}
   */
  async getStats() {
    const sessions = await this.getAllSessions();
    const completed = sessions.filter(s => s.status === 'completed');

    if (completed.length === 0) {
      return {
        totalSessions: 0,
        totalDuration: 0,
        averageScore: 0,
        bestScore: 0,
        actionCounts: {},
        recentTrend: []
      };
    }

    // 各动作训练次数
    const actionCounts = {};
    for (const s of completed) {
      actionCounts[s.actionName] = (actionCounts[s.actionName] || 0) + 1;
    }

    // 最近10次的分数趋势
    const recentTrend = completed.slice(0, 10).reverse().map(s => ({
      date: s.date,
      score: s.overallScore,
      action: s.actionName
    }));

    return {
      totalSessions: completed.length,
      totalDuration: completed.reduce((sum, s) => sum + s.duration, 0),
      averageScore: Math.round(Utils.avg(completed.map(s => s.overallScore))),
      bestScore: Math.round(Math.max(...completed.map(s => s.overallScore))),
      actionCounts,
      recentTrend
    };
  },

  /** 计算平均分 */
  _calcAverage(arr) {
    if (!arr || arr.length === 0) return 0;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  },

  /** 计算各关节平均角度 */
  _calcJointAverages(history) {
    const sums = {};
    const counts = {};

    for (const frame of history) {
      for (const [joint, angle] of Object.entries(frame.angles)) {
        if (!sums[joint]) { sums[joint] = 0; counts[joint] = 0; }
        sums[joint] += angle;
        counts[joint]++;
      }
    }

    const averages = {};
    for (const [joint, sum] of Object.entries(sums)) {
      averages[joint] = Math.round(sum / counts[joint]);
    }
    return averages;
  },

  /** 获取当前实时平均分 */
  getCurrentAverage() {
    if (this._frameBuffer.length === 0) return 0;
    const scores = this._frameBuffer.map(f => f.evalResult?.score || 0);
    return Math.round(Utils.avg(scores));
  }
};

window.DataRecorder = DataRecorder;
