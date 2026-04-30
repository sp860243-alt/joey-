import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let faceLandmarker: FaceLandmarker | null = null;
let _isInitializing = false;

export async function getFaceLandmarker() {
  if (faceLandmarker) return faceLandmarker;
  if (_isInitializing) {
    // Wait until initialized if it's currently initializing
    while (_isInitializing && !faceLandmarker) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (faceLandmarker) return faceLandmarker;
  }

  try {
    _isInitializing = true;
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU"
      },
      outputFaceBlendshapes: false,
      runningMode: "IMAGE",
      numFaces: 1
    });
    return faceLandmarker;
  } finally {
    _isInitializing = false;
  }
}

export function extractFaceTraits(landmarks: any[]) {
  if (!landmarks || landmarks.length === 0) return null;

  const dx = (p1: number, p2: number) => landmarks[p1].x - landmarks[p2].x;
  const dy = (p1: number, p2: number) => landmarks[p1].y - landmarks[p2].y;
  const dist = (p1: number, p2: number) => Math.sqrt(dx(p1, p2)**2 + dy(p1, p2)**2);

  const faceWidth = dist(234, 454);
  const faceHeight = dist(10, 152);

  if (faceWidth === 0 || faceHeight === 0) return null;

  // Jeontaekgung: Distance between eyebrow bottom and eye top
  const jeontaekLeft = dist(65, 159);
  const jeontaekRight = dist(295, 386);
  const jeontaekgung = ((jeontaekLeft + jeontaekRight) / 2) / faceHeight;

  // Indang: Distance between inner brows
  const indang = dist(107, 336) / faceWidth;

  // Samjeong: Top to brow, brow to nose, nose to chin
  const upperY = landmarks[10].y;
  const browY = (landmarks[9].y + landmarks[8].y) / 2; // Roughly between brows
  const noseY = landmarks[1].y; // Nose tip
  const chinY = landmarks[152].y; // Bottom of chin

  let upperHeight = browY - upperY;
  let middleHeight = noseY - browY;
  let lowerHeight = chinY - noseY;

  // absolute values in case of head tilt
  upperHeight = Math.abs(upperHeight);
  middleHeight = Math.abs(middleHeight);
  lowerHeight = Math.abs(lowerHeight);

  const totalSamjeong = upperHeight + middleHeight + lowerHeight;

  let samjeong = {
    upper: 0.33,
    middle: 0.33,
    lower: 0.33
  };

  if (totalSamjeong > 0) {
    samjeong = {
      upper: upperHeight / totalSamjeong,
      middle: middleHeight / totalSamjeong,
      lower: lowerHeight / totalSamjeong
    };
  }

  return {
    jeontaekgung,
    indang,
    samjeong
  };
}
