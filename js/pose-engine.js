/**
 * 姿态检测引擎模块
 * Badminton AI Trainer
 *
 * 封装 MediaPipe Pose 的初始化和运行逻辑。
 * 使用 @mediapipe/pose CDN 加载，在浏览器中实时运行。
 */

const PoseEngine = {
  /** MediaPipe Pose 实例 */
  pose: null,
  /** 是否正在运行 */
  isRunning: false,
  /** 当前视频元素 */
  video: null,
  /** 检测结果回调 */
  onResultsCallback: null,
  /** 错误回调 */
  onErrorCallback: null,
  /** 最近一次检测结果 */
  lastResults: null,
  /** 累计处理帧数 */
  frameCount: 0,
  /** 初始化状态 */
  _initialized: false,

  /**
   * 初始化 MediaPipe Pose
   * @returns {Promise<boolean>} 是否成功
   */
  async init() {
    if (this._initialized) return true;

    try {
      this.pose = new Pose({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
      });

      this.pose.setOptions({
        modelComplexity: 1,           // 0=lite, 1=full, 2=heavy
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      });

      this.pose.onResults((results) => {
        this.lastResults = results;
        this.frameCount++;
        if (this.onResultsCallback) {
          this.onResultsCallback(results);
        }
      });

      this._initialized = true;
      console.log('[PoseEngine] MediaPipe Pose 初始化完成');
      return true;
    } catch (err) {
      console.error('[PoseEngine] 初始化失败:', err);
      if (this.onErrorCallback) this.onErrorCallback(err);
      return false;
    }
  },

  /**
   * 启动摄像头并开始检测
   * @param {HTMLVideoElement} videoEl - 视频元素
   * @param {Function} onResults - 每帧检测回调 (results)
   * @param {Function} onError - 错误回调 (err)
   * @returns {Promise<Camera|null>} Camera实例
   */
  async start(videoEl, onResults, onError) {
    if (this.isRunning) {
      console.warn('[PoseEngine] 已在运行中');
      return null;
    }

    this.video = videoEl;
    if (onResults) this.onResultsCallback = onResults;
    if (onError) this.onErrorCallback = onError;

    if (!this._initialized) {
      const ok = await this.init();
      if (!ok) return null;
    }

    try {
      // 使用 @mediapipe/camera_utils 的 Camera 类
      const camera = new Camera(videoEl, {
        onFrame: async () => {
          if (this.isRunning) {
            await this.pose.send({ image: videoEl });
          }
        },
        width: 640,
        height: 480
      });

      this.isRunning = true;
      await camera.start();
      console.log('[PoseEngine] 摄像头已启动');
      return camera;
    } catch (err) {
      console.error('[PoseEngine] 摄像头启动失败:', err);
      this.isRunning = false;
      if (this.onErrorCallback) this.onErrorCallback(err);
      return null;
    }
  },

  /**
   * 停止检测
   */
  stop() {
    this.isRunning = false;
    if (this.video) {
      const stream = this.video.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      this.video = null;
    }
    console.log('[PoseEngine] 已停止');
  },

  /**
   * 获取最近一次检测的关键点
   * @returns {Array|null} 33个关键点数组，或null
   */
  getLandmarks() {
    if (this.lastResults && this.lastResults.poseLandmarks) {
      return this.lastResults.poseLandmarks;
    }
    return null;
  },

  /**
   * 检测是否有人体在画面中
   * @returns {boolean}
   */
  hasDetection() {
    return this.lastResults && this.lastResults.poseLandmarks && this.lastResults.poseLandmarks.length > 0;
  },

  /**
   * 重置统计
   */
  resetStats() {
    this.frameCount = 0;
  }
};

window.PoseEngine = PoseEngine;
