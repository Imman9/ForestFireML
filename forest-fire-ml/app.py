import os
import logging
import base64
import io
import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# --- Configuration ---
MODEL_PATH = "model.tflite"

# Try to load TensorFlow Lite Interpreter
interpreter = None
try:
    # Try importing full tensorflow first (common in dev envs)
    import tensorflow as tf
    logger.info("Using TensorFlow for TFLite inference")
    interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
except ImportError:
    try:
        # Fallback to tflite_runtime (lighter, common in Docker)
        import tflite_runtime.interpreter as tflite
        logger.info("Using tflite_runtime for inference")
        interpreter = tflite.Interpreter(model_path=MODEL_PATH)
    except ImportError:
        logger.warning("Neither tensorflow nor tflite_runtime found. Inference will be MOCKED.")
        interpreter = None
except ValueError:
    logger.warning(f"Model file not found at {MODEL_PATH}. Inference will be MOCKED.")
    interpreter = None


# Initialize Model details if loaded
input_details = None
output_details = None

if interpreter:
    try:
        interpreter.allocate_tensors()
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()
        logger.info(f"Model loaded successfully. Input shape: {input_details[0]['shape']}")
    except Exception as e:
        logger.error(f"Failed to allocate tensors: {e}")
        interpreter = None


class PredictionRequest(BaseModel):
    image: str  # Base64 string


def preprocess_image(image_bytes, target_size=(224, 224)):
    """
    Decodes and preprocesses the image for MobileNetV2.
    Adjust per your specific model requirements.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    img = img.resize(target_size)
    img_array = np.array(img, dtype=np.float32)
    
    # Standard MobileNetV2 preprocessing: (pixel - 127.5) / 127.5  -> range [-1, 1]
    # OR simple normalization: pixel / 255.0 -> range [0, 1]
    # CHECK YOUR MODEL TRAINING! safely assuming [0, 1] or [-1, 1] usually works "okay" for demo
    # Let's assume standard float32 input [0, 1]
    img_array = img_array / 255.0
    
    # Add batch dimension: (1, 224, 224, 3)
    img_array = np.expand_dims(img_array, axis=0)
    return img_array


@app.get("/")
def read_root():
    return {
        "status": "Forest Fire ML Service is running",
        "model_loaded": interpreter is not None
    }


@app.post("/predict")
async def predict(request: PredictionRequest):
    if not request.image:
        raise HTTPException(status_code=400, detail="No image provided")

    try:
        # 1. Decode Image
        image_bytes = base64.b64decode(request.image)
        
        # 2. Mock Fallback
        if interpreter is None:
            # Random mock logic if model is missing
            import random
            confidence = random.uniform(0.60, 0.99)
            return {
                "confidence": confidence,
                "class": "Fire" if confidence > 0.5 else "Neutral",
                "hasFire": confidence > 0.5,
                "note": "MOCKED RESPONSE - Model not loaded"
            }

        # 3. Real Inference
        # Get expected input shape
        input_shape = input_details[0]['shape'] # e.g. [1, 224, 224, 3]
        height = input_shape[1]
        width = input_shape[2]
        
        # Preprocess
        input_data = preprocess_image(image_bytes, target_size=(width, height))
        
        # Set tensor
        interpreter.set_tensor(input_details[0]['index'], input_data)
        
        # Run
        interpreter.invoke()
        
        # Get result
        output_data = interpreter.get_tensor(output_details[0]['index'])
        # output_data is usually [[prob_no_fire, prob_fire]] or similar
        
        # Heuristic for generic binary classification
        # Adjust index based on your specific training (which class is Fire?)
        # Commonly: 0=Neutral, 1=Fire OR 0=Fire, 1=Neutral
        # We will assume index 1 is Fire for now (common convention)
        
        output_flat = output_data.flatten()
        
        if len(output_flat) == 1:
            # Sigmoid output 0..1
            fire_score = float(output_flat[0])
        else:
            # Softmax output [score0, score1]
            # Assuming index 1 is fire
            fire_score = float(output_flat[1]) if len(output_flat) > 1 else 0.0

        return {
            "confidence": fire_score,
            "class": "Fire" if fire_score > 0.5 else "Neutral",
            "hasFire": fire_score > 0.5
        }

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
