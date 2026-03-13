import google.generativeai as genai
import PIL.Image
import os

# 1. Configure your API key
# Replace "YOUR_API_KEY" with your actual Gemini API key, or use an environment variable.
API_KEY = "YOUR_API_KEY" 
genai.configure(api_key=API_KEY)

# 2. Choose the model (Gemini 1.5 Flash is fast, free, and supports images)
model = genai.GenerativeModel('gemini-2.5-flash')

# 3. Load the image you want to check
image_path = 'test_image.jpg' # Change this to your image's file name
try:
    img = PIL.Image.open(image_path)
except FileNotFoundError:
    print(f"Error: Could not find the image '{image_path}'.")
    exit()

# 4. Create a specific prompt
# Asking the model to look for specific artifacts yields better results.
prompt = (
    "Analyze this image carefully. Tell me if you think it is AI-generated or a real photograph. "
    "Point out any specific visual artifacts, inconsistencies in lighting, weird textures, or "
    "anatomical errors (like messed up hands, garbled text, or nonsensical background details) "
    "that lead to your conclusion."
)

# 5. Generate the response
print(f"Sending '{image_path}' to Gemini for analysis...")
try:
    response = model.generate_content([prompt, img])
    
    # 6. Print the result
    print("\n--- Gemini's Analysis ---")
    print(response.text)
except Exception as e:
    print(f"\nAn error occurred: {e}")