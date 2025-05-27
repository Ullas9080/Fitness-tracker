import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [tailwindcss(),react()],
  optimizeDeps: {
    include: [
      "@tensorflow/tfjs",
      "@tensorflow/tfjs-backend-webgl",
      "@tensorflow/tfjs-backend-cpu",
      "@tensorflow/tfjs-backend-webgpu",
      "@mediapipe/pose",
      "@tensorflow-models/pose-detection"
    ]
  }
});
