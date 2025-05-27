import React, { useRef, useEffect, useContext, useState } from "react";
import Webcam from "react-webcam";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import { WorkoutContext } from "./WorkoutContext"; 

const WebCam = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [detector, setDetector] = useState(null);
  const [status, setStatus] = useState("Initializing backend...");
  const handLifted = useRef(false);
  const blinkDetected = useRef(false);
  const pushUpState = useRef("up");
  const highJumpState = useRef("down");
  const squatState = useRef("up");
  const jumpingJackState = useRef("closed");
  const lungeState = useRef("up");
  const lastBlinkTime = useRef(0);
  const lastPushUpTime = useRef(0);
  const lastHighJumpTime = useRef(0);
  const lastSquatTime = useRef(0);
  const lastJumpingJackTime = useRef(0);
  const lastLungeTime = useRef(0);

  const [localCounts, setLocalCounts] = useState({
    handLifts: 0,
    eyeBlinks: 0,
    pushUps: 0,
    highJumps: 0,
    squats: 0,
    jumpingJacks: 0,
    lunges: 0,
  });

  const { counts, updateCount } = useContext(WorkoutContext) || {
    counts: localCounts,
    updateCount: (key, value) => setLocalCounts((prev) => ({ ...prev, [key]: value })),
  };

  // Initialize TensorFlow.js backend and load model
  useEffect(() => {
    const initializeBackendAndModel = async () => {
      try {
        await tf.setBackend("webgl");
        await tf.ready();
        console.log("TensorFlow.js backend initialized:", tf.getBackend());

        setStatus("Loading model...");
        const model = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
          modelType: "SinglePose.Lightning",
        });
        setDetector(model);
        setStatus("Model loaded. Perform workouts to track counts.");
      } catch (error) {
        console.error("Error initializing backend or model:", error);
        setStatus("Failed to initialize. Please refresh.");
      }
    };
    initializeBackendAndModel();
  }, []);

  // Set up pose detection interval
  useEffect(() => {
    if (!detector) return;
    const interval = setInterval(() => {
      detectPose();
    }, 300);
    return () => clearInterval(interval);
  }, [detector]);

  // Draw keypoints on canvas for debugging
  const drawKeypoints = (keypoints) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    keypoints.forEach((kp, index) => {
      if (kp.score > 0.2 && kp.x && kp.y) {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
        ctx.fillStyle = "black";
        ctx.font = "12px Arial";
        ctx.fillText(`${kp.name || index}`, kp.x + 10, kp.y);
      }
    });
  };

  // Detect poses and update counts
  const detectPose = async () => {
    if (
      webcamRef.current &&
      webcamRef.current.video.readyState === 4 &&
      detector &&
      canvasRef.current
    ) {
      try {
        const video = webcamRef.current.video;
        const poses = await detector.estimatePoses(video);
        if (poses.length === 0) {
          console.log("No poses detected");
          return;
        }

        const keypoints = poses[0].keypoints;
        console.log("Keypoint names:", keypoints.map(k => k.name));
        console.log("Keypoints detected:", keypoints);

        // Draw keypoints for visual feedback
        drawKeypoints(keypoints);

        // Helper function to get keypoint with validation and scaling
        const getKeypoint = (name) => {
          const kp = keypoints.find((k) => k.name === name);
          if (!kp || !kp.x || !kp.y || isNaN(kp.x) || isNaN(kp.y) || kp.score < 0.2) {
            console.log(`Invalid keypoint: ${name}`, kp);
            return null;
          }
          return { ...kp, x: kp.x * 640, y: kp.y * 480 };
        };

        const currentTime = Date.now();

        // Hand lift detection
        const leftWrist = getKeypoint("left_wrist");
        const leftShoulder = getKeypoint("left_shoulder");
        if (leftWrist && leftShoulder) {
          console.log(`Left Wrist Y: ${leftWrist.y}, Left Shoulder Y: ${leftShoulder.y}`);
          if (leftWrist.y < leftShoulder.y + 10) {
            if (!handLifted.current) {
              updateCount("handLifts", counts.handLifts + 1);
              handLifted.current = true;
              console.log("Hand lift detected");
            }
          } else {
            handLifted.current = false;
            console.log("Hand lift not detected: wrist Y too high");
          }
        } else {
          console.log("Hand lift skipped: missing keypoints");
        }

        // Eye blink detection
        const leftEye = getKeypoint("left_eye");
        const rightEye = getKeypoint("right_eye");
        const nose = getKeypoint("nose");
        if (leftEye && rightEye && nose) {
          const leftEyeToNose = Math.hypot(leftEye.x - nose.x, leftEye.y - nose.y);
          const rightEyeToNose = Math.hypot(rightEye.x - nose.x, rightEye.y - nose.y);
          const earAvg = (leftEyeToNose + rightEyeToNose) / 2;

          console.log(`EAR Avg (eye-to-nose): ${earAvg}`);
          if (earAvg < 100 && !blinkDetected.current && currentTime - lastBlinkTime.current > 50 && !isNaN(earAvg)) {
            updateCount("eyeBlinks", counts.eyeBlinks + 1);
            blinkDetected.current = true;
            lastBlinkTime.current = currentTime;
            console.log("Blink detected");
          } else if (earAvg > 110) {
            blinkDetected.current = false;
            console.log("Blink not detected: EAR too high");
          }
        } else {
          console.log("Blink skipped: missing keypoints");
        }

        // Push-up detection
        const rightShoulder = getKeypoint("right_shoulder");
        if (rightShoulder) {
          const shoulderY = rightShoulder.y;

          console.log(`Shoulder Y: ${shoulderY}`);
          if (shoulderY > 220 && pushUpState.current === "up" && currentTime - lastPushUpTime.current > 300) {
            pushUpState.current = "down";
            console.log("Push-up state: down");
          } else if (shoulderY < 120 && pushUpState.current === "down") {
            updateCount("pushUps", counts.pushUps + 1);
            pushUpState.current = "up";
            lastPushUpTime.current = currentTime;
            console.log("Push-up detected");
          } else {
            console.log("Push-up not detected: shoulder Y out of range");
          }
        } else {
          console.log("Push-up skipped: missing keypoints");
        }

        // High jump detection
        const leftAnkle = getKeypoint("left_ankle");
        const rightAnkle = getKeypoint("right_ankle");
        if (leftAnkle && rightAnkle) {
          const ankleAvgY = (leftAnkle.y + rightAnkle.y) / 2;

          console.log(`Ankle Avg Y: ${ankleAvgY}`);
          if (ankleAvgY < 120 && highJumpState.current === "down" && currentTime - lastHighJumpTime.current > 500) {
            updateCount("highJumps", counts.highJumps + 1);
            highJumpState.current = "up";
            lastHighJumpTime.current = currentTime;
            console.log("High jump detected");
          } else if (ankleAvgY > 320) {
            highJumpState.current = "down";
            console.log("High jump state: down");
          } else {
            console.log("High jump not detected: ankle Y out of range");
          }
        } else {
          console.log("High jump skipped: missing keypoints");
        }

        // Squat detection
        const leftKnee = getKeypoint("left_knee");
        const leftHip = getKeypoint("left_hip");
        if (leftKnee && leftHip) {
          console.log(`Left Knee Y: ${leftKnee.y}, Left Hip Y: ${leftHip.y}`);
          if (leftKnee.y > leftHip.y + 40 && squatState.current === "up" && currentTime - lastSquatTime.current > 500) {
            squatState.current = "down";
            console.log("Squat state: down");
          } else if (leftKnee.y < leftHip.y + 10 && squatState.current === "down") {
            updateCount("squats", counts.squats + 1);
            squatState.current = "up";
            lastSquatTime.current = currentTime;
            console.log("Squat detected");
          } else {
            console.log("Squat not detected: knee Y out of range");
          }
        } else {
          console.log("Squat skipped: missing keypoints");
        }

        // Jumping jack detection
        const rightWrist = getKeypoint("right_wrist");
        if (leftWrist && rightWrist && leftAnkle && rightAnkle) {
          const armSpread = Math.abs(leftWrist.x - rightWrist.x);
          const legSpread = Math.abs(leftAnkle.x - rightAnkle.x);

          console.log(`Arm Spread: ${armSpread}, Leg Spread: ${legSpread}`);
          if (armSpread > 220 && legSpread > 120 && jumpingJackState.current === "closed" && currentTime - lastJumpingJackTime.current > 300) {
            updateCount("jumpingJacks", counts.jumpingJacks + 1);
            jumpingJackState.current = "open";
            lastJumpingJackTime.current = currentTime;
            console.log("Jumping jack detected");
          } else if (armSpread < 80 && legSpread < 40) {
            jumpingJackState.current = "closed";
            console.log("Jumping jack state: closed");
          } else {
            console.log("Jumping jack not detected: spread out of range");
          }
        } else {
          console.log("Jumping jack skipped: missing keypoints");
        }

        // Lunge detection
        const rightKnee = getKeypoint("right_knee");
        const rightHip = getKeypoint("right_hip");
        if (rightKnee && rightHip) {
          const kneeHipDistance = Math.abs(rightKnee.y - rightHip.y);

          console.log(`Right Knee Y: ${rightKnee.y}, Right Hip Y: ${rightHip.y}`);
          if (kneeHipDistance > 80 && rightKnee.x > rightHip.x + 10 && lungeState.current === "up" && currentTime - lastLungeTime.current > 500) {
            lungeState.current = "down";
            console.log("Lunge state: down");
          } else if (kneeHipDistance < 40 && lungeState.current === "down") {
            updateCount("lunges", counts.lunges + 1);
            lungeState.current = "up";
            lastLungeTime.current = currentTime;
            console.log("Lunge detected");
          } else {
            console.log("Lunge not detected: knee position out of range");
          }
        } else {
          console.log("Lunge skipped: missing keypoints");
        }
      } catch (error) {
        console.error("Error detecting pose:", error);
      }
    }
  };

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user",
  };

  return (
    <div className="p-4 max-w-3xl mx-auto bg-gray-100 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">{status}</h2>
      <div className="relative flex-shrink-0">
        <Webcam
          ref={webcamRef}
          audio={false}
          videoConstraints={videoConstraints}
          className="rounded-lg shadow-md mx-auto"
          style={{ width: 640, height: 480 }}
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="absolute top-0 left-0"
          style={{ zIndex: 10 }}
        />
      </div>
    </div>
  );
};

// Error boundary component
class WebCamErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

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