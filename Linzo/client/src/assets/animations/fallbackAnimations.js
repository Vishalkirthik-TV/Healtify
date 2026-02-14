// Fallback animations for models with limited bone structure
// This provides basic sign language animations using only major arm/hand bones

export const createFallbackAnimation = (text, boneMapping) => {
  const animations = [];
  
  if (!boneMapping) return animations;
  
  // Simple wave animation using available bones
  const hasLeftArm = boneMapping.leftArm;
  const hasRightArm = boneMapping.rightArm;
  const hasLeftHand = boneMapping.leftHand;
  const hasRightHand = boneMapping.rightHand;
  
  if (hasLeftArm && hasLeftHand) {
    // Left arm wave
    animations.push([hasLeftArm, "rotation", "z", -Math.PI/3, "+"]);
    animations.push([hasLeftHand, "rotation", "x", Math.PI/4, "+"]);
  }
  
  if (hasRightArm && hasRightHand) {
    // Right arm wave
    animations.push([hasRightArm, "rotation", "z", Math.PI/3, "+"]);
    animations.push([hasRightHand, "rotation", "x", -Math.PI/4, "+"]);
  }
  
  // Return to neutral
  if (hasLeftArm) {
    animations.push([hasLeftArm, "rotation", "z", 0, "-"]);
  }
  if (hasLeftHand) {
    animations.push([hasLeftHand, "rotation", "x", 0, "-"]);
  }
  if (hasRightArm) {
    animations.push([hasRightArm, "rotation", "z", 0, "-"]);
  }
  if (hasRightHand) {
    animations.push([hasRightHand, "rotation", "x", 0, "+"]);
  }
  
  return animations;
};

// Simple alphabet animations for basic models
export const fallbackAlphabetA = (ref) => {
  if (!ref.boneMapping || ref.useFallbackAnimations !== true) return;
  
  const animations = [];
  const boneMapping = ref.boneMapping;
  
  // Simple A sign using available bones
  if (boneMapping.leftArm) {
    animations.push([boneMapping.leftArm, "rotation", "z", -Math.PI/4, "+"]);
  }
  if (boneMapping.leftHand) {
    animations.push([boneMapping.leftHand, "rotation", "x", Math.PI/6, "+"]);
  }
  
  // Return to neutral
  if (boneMapping.leftArm) {
    animations.push([boneMapping.leftArm, "rotation", "z", 0, "-"]);
  }
  if (boneMapping.leftHand) {
    animations.push([boneMapping.leftHand, "rotation", "x", 0, "-"]);
  }
  
  ref.animations.push(animations);
  
  if (ref.pending === false) {
    ref.pending = true;
    ref.animate();
  }
};

export const fallbackAlphabetB = (ref) => {
  if (!ref.boneMapping || ref.useFallbackAnimations !== true) return;
  
  const animations = [];
  const boneMapping = ref.boneMapping;
  
  // Simple B sign using available bones
  if (boneMapping.rightArm) {
    animations.push([boneMapping.rightArm, "rotation", "z", Math.PI/4, "+"]);
  }
  if (boneMapping.rightHand) {
    animations.push([boneMapping.rightHand, "rotation", "x", -Math.PI/6, "+"]);
  }
  
  // Return to neutral
  if (boneMapping.rightArm) {
    animations.push([boneMapping.rightArm, "rotation", "z", 0, "-"]);
  }
  if (boneMapping.rightHand) {
    animations.push([boneMapping.rightHand, "rotation", "x", 0, "-"]);
  }
  
  ref.animations.push(animations);
  
  if (ref.pending === false) {
    ref.pending = true;
    ref.animate();
  }
};

// Generic fallback animation for any letter
export const fallbackAlphabetGeneric = (ref, letter) => {
  if (!ref.boneMapping || ref.useFallbackAnimations !== true) return;
  
  const animations = [];
  const boneMapping = ref.boneMapping;
  
  // Alternate between left and right arm based on letter
  const useLeftArm = letter.charCodeAt(0) % 2 === 0;
  
  if (useLeftArm && boneMapping.leftArm) {
    animations.push([boneMapping.leftArm, "rotation", "z", -Math.PI/6, "+"]);
    animations.push([boneMapping.leftArm, "rotation", "z", 0, "-"]);
  } else if (boneMapping.rightArm) {
    animations.push([boneMapping.rightArm, "rotation", "z", Math.PI/6, "+"]);
    animations.push([boneMapping.rightArm, "rotation", "z", 0, "-"]);
  }
  
  ref.animations.push(animations);
  
  if (ref.pending === false) {
    ref.pending = true;
    ref.animate();
  }
};
