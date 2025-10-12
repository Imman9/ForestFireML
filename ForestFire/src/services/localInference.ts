/* Local TFLite inference wrapper. Falls back gracefully if native module is unavailable.
 * Primary target: react-native-fast-tflite (recommended). Fallback attempts tflite-react-native.
 */

import { Platform } from 'react-native';
// import * as ImageManipulator from 'expo-image-manipulator';
import { getRgbaBytes } from '../native/ImagePixels';

export type LocalInferenceResult = {
  hasFire: boolean;
  confidence: number; // 0-100
  class: string;
};

let fastTflite: any = null;
let legacyTflite: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  fastTflite = require('react-native-fast-tflite');
} catch (_e) {
  // not installed
}

if (!fastTflite) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    legacyTflite = require('tflite-react-native');
  } catch (_e2) {
    // not installed
  }
}

// Path to model placed in app assets; adjust if you rename/move the model
const MODEL_ASSET_PATH = Platform.select({
  ios: 'fire_detection_mobilenetv2_quantized.tflite',
  android: 'fire_detection_mobilenetv2_quantized.tflite',
  default: 'fire_detection_mobilenetv2_quantized.tflite',
});

let fastModel: any = null;
let legacyModelLoaded = false;

export async function ensureModelLoaded(): Promise<boolean> {
  if (fastTflite && !fastModel) {
    try {
      // react-native-fast-tflite expects a file path or asset reference
      // Many setups copy the model into the app bundle; try asset path
      fastModel = await fastTflite.loadTFLiteModel(MODEL_ASSET_PATH);
      return !!fastModel;
    } catch (_e) {
      // ignore and try legacy
    }
  }

  if (legacyTflite && !legacyModelLoaded) {
    try {
      if (legacyTflite.loadModel) {
        await legacyTflite.loadModel({ model: MODEL_ASSET_PATH, numThreads: 2 });
      } else if (legacyTflite.loadTFLiteModel) {
        await legacyTflite.loadTFLiteModel(MODEL_ASSET_PATH);
      }
      legacyModelLoaded = true;
      return true;
    } catch (_e2) {
      return false;
    }
  }

  return !!fastModel || !!legacyModelLoaded;
}

export async function classifyImage(imageUri: string): Promise<LocalInferenceResult | null> {
  const ok = await ensureModelLoaded();
  if (!ok) return null;

  // react-native-fast-tflite typically operates on tensors/typed arrays; image preprocessing
  // (decode/resize/normalize) is required, which is out of scope here. We keep a safe no-op
  // until an image preprocessing pipeline is added.
  if (fastModel) {
    try {
      // Resize and extract [224,224,4] RGBA pixel data
      const rgba = await getRgbaBytes(imageUri, 224, 224); // length 224*224*4
      // MobilenetV2 quantized: expect [1,224,224,3] uint8 [0,255]
      const input = new Uint8Array(1 * 224 * 224 * 3);
      for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
        input[j] = rgba[i];     // R
        input[j + 1] = rgba[i+1]; // G
        input[j + 2] = rgba[i+2]; // B
        // (ignore alpha/rgba[i+3])
      }
      // For fast-tflite typical usage: { input: input } or just input
      // Model signature may require keys['input'] or shape
      const output = fastTflite.runModel(fastModel, input);
      // Output parsing: assume output is logits or probabilities, pick top class
      // The following assumes single output with { scores: [] } or array
      let maxIdx = 0, maxVal = -Infinity, scores = output.scores || output[0] || output;
      for (let i = 0; i < scores.length; ++i) { if (scores[i] > maxVal) { maxVal = scores[i]; maxIdx = i; } }
      // Map class idx to label if your labels are known; else just return idx
      // For binary fire/no fire model, you can threshold. Here we just return the max idx/confidence
      return {
        hasFire: Boolean(maxIdx === 1), // update per your model: e.g., class 1 = fire, 0 = no fire
        confidence: Math.round(100 * Math.abs(maxVal)),
        class: String(maxIdx),
      };
    } catch (_e) {
      // fallback if pixel conversion fails
    }
    return null;
  }

  if (legacyTflite && legacyModelLoaded) {
    try {
      if (legacyTflite.classify) {
        const results = await legacyTflite.classify({ imagePath: imageUri, topK: 1 });
        const top = Array.isArray(results) && results[0] ? results[0] : null;
        if (!top) return null;
        const label = top.label || top.class || 'fire';
        const confidence = Math.round((top.confidence || top.probability || 0) * 100);
        return {
          hasFire: /fire/i.test(label),
          confidence: Math.max(0, Math.min(100, confidence)),
          class: String(label),
        };
      }
    } catch (_e) {
      return null;
    }
  }

  return null;
}


