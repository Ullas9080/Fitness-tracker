import React, { useRef, useEffect, useContext, useState, useCallback } from "react";
import Webcam from "react-webcam";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import { WorkoutContext } from "./WorkoutContext";

/**
 * Optimized WebCam component using MoveNet (SinglePose.Lightning).
 * - Uses index mapping (MoveNet does not include `name`).
 * - Uses requestAnimationFrame loop for efficient detection.
 * - Batches context updates to avoid frequent re-renders.
 * - Helper functions extracted for clarity.
 */

const KEYPOINT_INDEX = {
  nose: 0,
  left_eye: 1,
  right_eye: 2,
  left_ear: 3,
  right_ear: 4,
  left_shoulder: 5,
  right_shoulder: 6,
  left_elbow: 7,
  right_elbow: 8,
  left_wrist: 9,
  right_wrist: 10,
  left_hip: 11,
  right_hip: 12,
  left_knee: 13,
  right_knee: 14,
  left_ankle: 15,
  right_ankle: 16,
};

const defaultLocalCounts = {
  handLifts: 0,
  eyeBlinks: 0,
  pushUps: 0,
  highJumps: 0,
  squats: 0,
  jumpingJacks: 0,
  lunges: 0,
};

const videoConstraints = { width: 640, height: 480, facingMode: "user" };

function WebCam() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);

  const [status, setStatus] = useState("Initializing...");
  const [modelLoaded, setModelLoaded] = useState(false);

  // states for debounce / state machine
  const stateRef = useRef({
    handLifted: false,
    blinkDetected: false,
    pushUpState: "up",
    highJumpState: "down",
    squatState: "up",
    jumpingJackState: "closed",
    lungeState: "up",
    lastTimes: {
      blink: 0,
      pushUp: 0,
      highJump: 0,
      squat: 0,
      jumpingJack: 0,
      lunge: 0,
    },
  });

  // local count buffer to batch updates
  const localCountsRef = useRef({ ...defaultLocalCounts });
  const lastContextFlush = useRef(Date.now());

  const context = useContext(WorkoutContext);
  // fallback if context missing
  const counts = context?.counts ?? localCountsRef.current;
  const updateCount = context?.updateCount ?? ((key, val) => {
    // fallback: update local ref
    localCountsRef.current[key] = val;
  });

  // Minimal drawing for debugging (can be toggled off)
  const drawKeypoints = useCallback((keypoints, videoWidth, videoHeight) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    keypoints.forEach((kp, i) => {
      if (!kp) return;
      const { x, y, score } = kp;
      if (score == null || score < 0.2 || isNaN(x) || isNaN(y)) return;
      const sx = x * canvas.width;
      const sy = y * canvas.height;
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, 2 * Math.PI);
      ctx.fillStyle = "red";
      ctx.fill();
    });
  }, []);

  const getKeypointByName = useCallback((keypoints, name, videoWidth, videoHeight) => {
    const idx = KEYPOINT_INDEX[name];
    const kp = keypoints?.[idx];
    if (!kp || kp.score == null || kp.score < 0.2) return null;
    const x = kp.x * videoWidth;
    const y = kp.y * videoHeight;
    if (isNaN(x) || isNaN(y)) return null;
    return { ...kp, x, y };
  }, []);

  // increment local buffer
  const bufferIncrement = useCallback((key) => {
    localCountsRef.current[key] = (localCountsRef.current[key] ?? 0) + 1;
  }, []);

  // periodically flush local buffer to context (or fallback)
  const flushCountsToContext = useCallback(() => {
    if (!updateCount) return;
    const now = Date.now();
    // flush at most every 800ms
    if (now - lastContextFlush.current < 800) return;
    lastContextFlush.current = now;

    // For each key, if local differs from context, call updateCount
    Object.keys(localCountsRef.current).forEach((k) => {
      const localVal = localCountsRef.current[k];
      const contextVal = counts?.[k] ?? 0;
      if (localVal !== contextVal) {
        updateCount(k, localVal);
      }
    });
  }, [counts, updateCount]);

  const detectAndProcess = useCallback(async () => {
    const detector = detectorRef.current;
    const videoEl = webcamRef.current?.video;
    if (!detector || !videoEl || videoEl.readyState !== 4) {
      rafRef.current = requestAnimationFrame(detectAndProcess);
      return;
    }

    try {
      const videoWidth = videoEl.videoWidth || videoConstraints.width;
      const videoHeight = videoEl.videoHeight || videoConstraints.height;

      const poses = await detector.estimatePoses(videoEl, { maxPoses: 1, flipHorizontal: false });
      const pose = poses?.[0];
      const keypoints = pose?.keypoints;
      if (!keypoints || keypoints.length < 17) {
        rafRef.current = requestAnimationFrame(detectAndProcess);
        return;
      }

      // Optional small draw
      drawKeypoints(keypoints, videoWidth, videoHeight);

      const now = Date.now();
      const s = stateRef.current;
      const lt = s.lastTimes;

      // helpers to get kps in scaled coords
      const leftWrist = getKeypointByName(keypoints, "left_wrist", videoWidth, videoHeight);
      const rightWrist = getKeypointByName(keypoints, "right_wrist", videoWidth, videoHeight);
      const leftShoulder = getKeypointByName(keypoints, "left_shoulder", videoWidth, videoHeight);
      const rightShoulder = getKeypointByName(keypoints, "right_shoulder", videoWidth, videoHeight);
      const leftEye = getKeypointByName(keypoints, "left_eye", videoWidth, videoHeight);
      const rightEye = getKeypointByName(keypoints, "right_eye", videoWidth, videoHeight);
      const nose = getKeypointByName(keypoints, "nose", videoWidth, videoHeight);
      const rightShoulderKP = getKeypointByName(keypoints, "right_shoulder", videoWidth, videoHeight);
      const leftAnkle = getKeypointByName(keypoints, "left_ankle", videoWidth, videoHeight);
      const rightAnkle = getKeypointByName(keypoints, "right_ankle", videoWidth, videoHeight);
      const leftKnee = getKeypointByName(keypoints, "left_knee", videoWidth, videoHeight);
      const leftHip = getKeypointByName(keypoints, "left_hip", videoWidth, videoHeight);
      const rightKnee = getKeypointByName(keypoints, "right_knee", videoWidth, videoHeight);
      const rightHip = getKeypointByName(keypoints, "right_hip", videoWidth, videoHeight);

      // ---------- Hand lift detection ----------
      if (leftWrist && leftShoulder) {
        if (leftWrist.y < leftShoulder.y + 10 && !s.handLifted) {
          s.handLifted = true;
          bufferIncrement("handLifts");
        } else if (leftWrist.y >= leftShoulder.y + 10) {
          s.handLifted = false;
        }
      }

      // ---------- Blink detection (simple distance-based proxy) ----------
      if (leftEye && rightEye && nose) {
        const leftEyeToNose = Math.hypot(leftEye.x - nose.x, leftEye.y - nose.y);
        const rightEyeToNose = Math.hypot(rightEye.x - nose.x, rightEye.y - nose.y);
        const earAvg = (leftEyeToNose + rightEyeToNose) / 2;
        // thresholds tuned for 640x480; adapt if you change video resolution
        if (earAvg < 80 && !s.blinkDetected && now - lt.blink > 250) {
          s.blinkDetected = true;
          lt.blink = now;
          bufferIncrement("eyeBlinks");
        } else if (earAvg > 95) {
          s.blinkDetected = false;
        }
      }

      // ---------- Push-up detection (shoulder Y) ----------
      if (rightShoulderKP) {
        const shoulderY = rightShoulderKP.y;
        if (shoulderY > videoHeight * 0.45 && s.pushUpState === "up" && now - lt.pushUp > 400) {
          s.pushUpState = "down";
        } else if (shoulderY < videoHeight * 0.25 && s.pushUpState === "down") {
          s.pushUpState = "up";
          lt.pushUp = now;
          bufferIncrement("pushUps");
        }
      }

      // ---------- High jump detection (ankle average Y) ----------
      if (leftAnkle && rightAnkle) {
        const ankleAvgY = (leftAnkle.y + rightAnkle.y) / 2;
        if (ankleAvgY < videoHeight * 0.24 && s.highJumpState === "down" && now - lt.highJump > 500) {
          s.highJumpState = "up";
          lt.highJump = now;
          bufferIncrement("highJumps");
        } else if (ankleAvgY > videoHeight * 0.66) {
          s.highJumpState = "down";
        }
      }

      // ---------- Squat detection (knee vs hip Y) ----------
      if (leftKnee && leftHip) {
        if (leftKnee.y > leftHip.y + 40 && s.squatState === "up" && now - lt.squat > 500) {
          s.squatState = "down";
        } else if (leftKnee.y < leftHip.y + 10 && s.squatState === "down") {
          s.squatState = "up";
          lt.squat = now;
          bufferIncrement("squats");
        }
      }

      // ---------- Jumping Jack detection (arm spread & leg spread) ----------
      if (leftWrist && rightWrist && leftAnkle && rightAnkle) {
        const armSpread = Math.abs(leftWrist.x - rightWrist.x);
        const legSpread = Math.abs(leftAnkle.x - rightAnkle.x);
        if (armSpread > videoWidth * 0.34 && legSpread > videoWidth * 0.18 && s.jumpingJackState === "closed" && now - lt.jumpingJack > 350) {
          s.jumpingJackState = "open";
          lt.jumpingJack = now;
          bufferIncrement("jumpingJacks");
        } else if (armSpread < videoWidth * 0.12 && legSpread < videoWidth * 0.06) {
          s.jumpingJackState = "closed";
        }
      }

      // ---------- Lunge detection (knee-hip distance + x offset) ----------
      if (rightKnee && rightHip) {
        const kneeHipDistance = Math.abs(rightKnee.y - rightHip.y);
        if (kneeHipDistance > 80 && rightKnee.x > rightHip.x + 10 && s.lungeState === "up" && now - lt.lunge > 500) {
          s.lungeState = "down";
        } else if (kneeHipDistance < 40 && s.lungeState === "down") {
          s.lungeState = "up";
          lt.lunge = now;
          bufferIncrement("lunges");
        }
      }

      // Flush counts to context occasionally
      flushCountsToContext();
    } catch (err) {
      // keep errors minimal to avoid console spam
      // console.error("detection error:", err);
    } finally {
      rafRef.current = requestAnimationFrame(detectAndProcess);
    }
  }, [drawKeypoints, getKeypointByName, bufferIncrement, flushCountsToContext]);

  // Initialize TF backend + MoveNet detector
  useEffect(() => {
    let canceled = false;
    const init = async () => {
      try {
        setStatus("Initializing TensorFlow backend...");
        await tf.setBackend("webgl");
        await tf.ready();
        setStatus("Loading MoveNet model...");
        const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
          modelType: "SinglePose.Lightning",
        });
        if (canceled) {
          if (detector?.dispose) detector.dispose();
          return;
        }
        detectorRef.current = detector;
        setStatus("Model loaded. Starting detection...");
        setModelLoaded(true);
      } catch (err) {
        setStatus("Failed to initialize model.");
        // console.error(err);
      }
    };

    init();
    return () => { canceled = true; };
  }, []);

  // Start / stop detection loop when model loaded
  useEffect(() => {
    if (!modelLoaded) return;
    rafRef.current = requestAnimationFrame(detectAndProcess);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [modelLoaded, detectAndProcess]);

  // Clean up detector on unmount
  useEffect(() => {
    return () => {
      if (detectorRef.current && detectorRef.current.dispose) {
        try { detectorRef.current.dispose(); } catch (e) { /* ignore */ }
      }
    };
  }, []);

  return (
    <div className="p-4 max-w-3xl mx-auto bg-gray-100 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">{status}</h2>
      <div className="relative flex-shrink-0">
        <Webcam
          ref={webcamRef}
          audio={false}
          videoConstraints={videoConstraints}
          className="rounded-lg shadow-md mx-auto"
          style={{ width: videoConstraints.width, height: videoConstraints.height }}
        />
        <canvas
          ref={canvasRef}
          width={videoConstraints.width}
          height={videoConstraints.height}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ zIndex: 10 }}
        />
      </div>
    </div>
  );
}

/* Error boundary kept minimal and exported wrapper */
class WebCamErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center text-red-600">
          <h2>Error loading webcam component.</h2>
          <p>Please refresh the page or check your camera permissions.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function WebCamWithErrorBoundary() {
  return (
    <WebCamErrorBoundary>
      <WebCam />
    </WebCamErrorBoundary>
  );
}
