import dlib
import cv2

# Load the headshot image
img = cv2.imread("scripts/face-gen/mahomes.png")

# Convert to grayscale
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


# Load the pre-trained face detector
face_detector = dlib.get_frontal_face_detector()

# Detect faces in the image
faces = face_detector(gray, 1)

# Check if a face was detected
if len(faces) == 0:
    print("No face detected")
    exit()

# Extract the first face
face = faces[0]

# Load the pre-trained facial landmarks predictor
predictor = dlib.shape_predictor("scripts/face-gen/shape_predictor_68_face_landmarks.dat")

# Extract the landmarks for the face
landmarks = predictor(gray, face)

for part in landmarks.parts():
    print(part)

# print(landmarks)