/* Local TFLite inference wrapper. Falls back gracefully if native module is unavailable.
 * Primary target: react-native-fast-tflite (recommended). Fallback attempts tflite-react-native.
 */

import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

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
    // Prepare 224x224 RGB input using expo-image-manipulator
    try {
      const resized = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 224, height: 224 } }],
        { compress: 1, format: ImageManipulator.SaveFormat.PNG, base64: true }
      );
      // NOTE: fast-tflite requires a typed array tensor; converting PNG base64 -> RGBA bytes
      // is not trivial without an image decoder on JS. For now, fall back to remote until
      // a pixel buffer bridge is added.
    } catch (_e) {
      // ignore and fall through to legacy/remote
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


