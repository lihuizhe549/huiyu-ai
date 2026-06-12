/**
 * 姿态检测引擎 — 原生getUserMedia（支持翻转摄像头）
 */
const PoseEngine = {
  pose: null, isRunning: false, video: null,
  onResultsCallback: null, lastResults: null,
  frameCount: 0, _initialized: false,
  _stream: null, _facingMode: 'environment',
  _animFrame: null,

  async init() {
    if (this._initialized) return true;
    try {
      this.pose = new Pose({
        locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`
      });
      this.pose.setOptions({
        modelComplexity: 1, smoothLandmarks: true,
        enableSegmentation: false, smoothSegmentation: false,
        minDetectionConfidence: 0.7, minTrackingConfidence: 0.5
      });
      this.pose.onResults((results) => {
        this.lastResults = results;
        this.frameCount++;
        if (this.onResultsCallback && this.isRunning) this.onResultsCallback(results);
      });
      this._initialized = true;
      console.log('[PoseEngine] 初始化完成');
      return true;
    } catch (err) {
      console.error('[PoseEngine] 初始化失败:', err);
      return false;
    }
  },

  async start(videoEl, onResults, onError, facingMode) {
    if (this.isRunning) {
      this.stop();
    }
    this.video = videoEl;
    if (onResults) this.onResultsCallback = onResults;
    this._facingMode = facingMode || 'environment';

    if (!this._initialized) {
      const ok = await this.init();
      if (!ok) return null;
    }

    try {
      // 使用原生getUserMedia获取摄像头
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this._facingMode, width: 640, height: 480 },
        audio: false
      });
      this._stream = stream;
      videoEl.srcObject = stream;
      await videoEl.play();

      // 手动循环送帧给MediaPipe
      this.isRunning = true;
      const loop = async () => {
        if (!this.isRunning) return;
        if (videoEl.readyState >= 2) {
          await this.pose.send({ image: videoEl });
        }
        this._animFrame = requestAnimationFrame(loop);
      };
      loop();

      console.log('[PoseEngine] 摄像头已启动, facingMode:', this._facingMode);
      return { stop: () => this.stop() };
    } catch (err) {
      console.error('[PoseEngine] 启动失败:', err);
      this.isRunning = false;
      return null;
    }
  },

  /** 切换摄像头方向（训练中热切换） */
  async switchCamera(facingMode) {
    this._facingMode = facingMode;
    // 停止旧流
    if (this._stream) {
      this._stream.getTracks().forEach(t => t.stop());
      this._stream = null;
    }
    if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: 640, height: 480 },
        audio: false
      });
      this._stream = stream;
      this.video.srcObject = stream;
      await this.video.play();

      const loop = async () => {
        if (!this.isRunning) return;
        if (this.video.readyState >= 2) {
          await this.pose.send({ image: this.video });
        }
        this._animFrame = requestAnimationFrame(loop);
      };
      loop();

      console.log('[PoseEngine] 已切换到:', facingMode);
      return true;
    } catch (err) {
      console.error('[PoseEngine] 切换失败:', err);
      return false;
    }
  },

  stop() {
    this.isRunning = false;
    if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }
    if (this._stream) { this._stream.getTracks().forEach(t => t.stop()); this._stream = null; }
    if (this.video) { this.video.srcObject = null; this.video = null; }
  },

  getLandmarks() { return this.lastResults?.poseLandmarks || null; },
  hasDetection() { return !!this.lastResults?.poseLandmarks; },
  resetStats() { this.frameCount = 0; }
};

window.PoseEngine = PoseEngine;
