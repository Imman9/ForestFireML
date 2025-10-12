from flask import Flask, request, jsonify
import tensorflow as tf
import numpy as np
import base64
from io import BytesIO
from PIL import Image

app = Flask(__name__)

# Load your model
MODEL_PATH = "/content/drive/MyDrive/fire_detection_mobilenetv2.keras"
model = tf.keras.models.load_model(MODEL_PATH)

# Preprocessing based on your training input size
IMG_SIZE = (224, 224)

def preprocess_image(base64_string):
    image_data = base64.b64decode(base64_string)
    img = Image.open(BytesIO(image_data)).convert("RGB")
    img = img.resize(IMG_SIZE)
    img_array = np.array(img) / 255.0
    return np.expand_dims(img_array, axis=0)

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    if "image" not in data:
        return jsonify({"error": "No image provided"}), 400

    image_base64 = data["image"]
    input_tensor = preprocess_image(image_base64)
    prediction = model.predict(input_tensor)[0][0]  # Assuming binary output

    return jsonify({
        "fireDetected": bool(prediction > 0.5),
        "confidence": float(prediction)
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
