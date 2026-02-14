// Bone name mapping for different avatar types
// This allows animations to work across different 3D models with different bone structures

export const boneMappings = {
  // XBOT and YBOT use mixamorig naming convention
  xbot: {
    neck: 'mixamorigNeck',
    leftArm: 'mixamorigLeftArm',
    leftForeArm: 'mixamorigLeftForeArm',
    leftHand: 'mixamorigLeftHand',
    leftHandIndex1: 'mixamorigLeftHandIndex1',
    leftHandIndex2: 'mixamorigLeftHandIndex2',
    leftHandIndex3: 'mixamorigLeftHandIndex3',
    leftHandMiddle1: 'mixamorigLeftHandMiddle1',
    leftHandMiddle2: 'mixamorigLeftHandMiddle2',
    leftHandMiddle3: 'mixamorigLeftHandMiddle3',
    leftHandRing1: 'mixamorigLeftHandRing1',
    leftHandRing2: 'mixamorigLeftHandRing2',
    leftHandRing3: 'mixamorigLeftHandRing3',
    leftHandPinky1: 'mixamorigLeftHandPinky1',
    leftHandPinky2: 'mixamorigLeftHandPinky2',
    leftHandPinky3: 'mixamorigLeftHandPinky3',
    leftHandThumb1: 'mixamorigLeftHandThumb1',
    leftHandThumb2: 'mixamorigLeftHandThumb2',
    leftHandThumb3: 'mixamorigLeftHandThumb3',
    rightArm: 'mixamorigRightArm',
    rightForeArm: 'mixamorigRightForeArm',
    rightHand: 'mixamorigRightHand',
    rightHandIndex1: 'mixamorigRightHandIndex1',
    rightHandIndex2: 'mixamorigRightHandIndex2',
    rightHandIndex3: 'mixamorigRightHandIndex3',
    rightHandMiddle1: 'mixamorigRightHandMiddle1',
    rightHandMiddle2: 'mixamorigRightHandMiddle2',
    rightHandMiddle3: 'mixamorigRightHandMiddle3',
    rightHandRing1: 'mixamorigRightHandRing1',
    rightHandRing2: 'mixamorigRightHandRing2',
    rightHandRing3: 'mixamorigRightHandRing3',
    rightHandPinky1: 'mixamorigRightHandPinky1',
    rightHandPinky2: 'mixamorigRightHandPinky2',
    rightHandPinky3: 'mixamorigRightHandPinky3',
    rightHandThumb1: 'mixamorigRightHandThumb1',
    rightHandThumb2: 'mixamorigRightHandThumb2',
    rightHandThumb3: 'mixamorigRightHandThumb3'
  },
  
  // YBOT uses same mapping as XBOT
  ybot: {
    neck: 'mixamorigNeck',
    leftArm: 'mixamorigLeftArm',
    leftForeArm: 'mixamorigLeftForeArm',
    leftHand: 'mixamorigLeftHand',
    leftHandIndex1: 'mixamorigLeftHandIndex1',
    leftHandIndex2: 'mixamorigLeftHandIndex2',
    leftHandIndex3: 'mixamorigLeftHandIndex3',
    leftHandMiddle1: 'mixamorigLeftHandMiddle1',
    leftHandMiddle2: 'mixamorigLeftHandMiddle2',
    leftHandMiddle3: 'mixamorigLeftHandMiddle3',
    leftHandRing1: 'mixamorigLeftHandRing1',
    leftHandRing2: 'mixamorigLeftHandRing2',
    leftHandRing3: 'mixamorigLeftHandRing3',
    leftHandPinky1: 'mixamorigLeftHandPinky1',
    leftHandPinky2: 'mixamorigLeftHandPinky2',
    leftHandPinky3: 'mixamorigLeftHandPinky3',
    leftHandThumb1: 'mixamorigLeftHandThumb1',
    leftHandThumb2: 'mixamorigLeftHandThumb2',
    leftHandThumb3: 'mixamorigLeftHandThumb3',
    rightArm: 'mixamorigRightArm',
    rightForeArm: 'mixamorigRightForeArm',
    rightHand: 'mixamorigRightHand',
    rightHandIndex1: 'mixamorigRightHandIndex1',
    rightHandIndex2: 'mixamorigRightHandIndex2',
    rightHandIndex3: 'mixamorigRightHandIndex3',
    rightHandMiddle1: 'mixamorigRightHandMiddle1',
    rightHandMiddle2: 'mixamorigRightHandMiddle2',
    rightHandMiddle3: 'mixamorigRightHandMiddle3',
    rightHandRing1: 'mixamorigRightHandRing1',
    rightHandRing2: 'mixamorigRightHandRing2',
    rightHandRing3: 'mixamorigRightHandRing3',
    rightHandPinky1: 'mixamorigRightHandPinky1',
    rightHandPinky2: 'mixamorigRightHandPinky2',
    rightHandPinky3: 'mixamorigRightHandPinky3',
    rightHandThumb1: 'mixamorigRightHandThumb1',
    rightHandThumb2: 'mixamorigRightHandThumb2',
    rightHandThumb3: 'mixamorigRightHandThumb3'
  },
  
  // Humanoid model - common naming conventions
  humanoid: {
    // Common humanoid bone names - these will be auto-detected
    neck: null, // Will be auto-detected
    leftArm: null, // Will be auto-detected
    leftForeArm: null, // Will be auto-detected
    leftHand: null, // Will be auto-detected
    leftHandIndex1: null, // Will be auto-detected
    leftHandIndex2: null, // Will be auto-detected
    leftHandIndex3: null, // Will be auto-detected
    leftHandMiddle1: null, // Will be auto-detected
    leftHandMiddle2: null, // Will be auto-detected
    leftHandMiddle3: null, // Will be auto-detected
    leftHandRing1: null, // Will be auto-detected
    leftHandRing2: null, // Will be auto-detected
    leftHandRing3: null, // Will be auto-detected
    leftHandPinky1: null, // Will be auto-detected
    leftHandPinky2: null, // Will be auto-detected
    leftHandPinky3: null, // Will be auto-detected
    leftHandThumb1: null, // Will be auto-detected
    leftHandThumb2: null, // Will be auto-detected
    leftHandThumb3: null, // Will be auto-detected
    rightArm: null, // Will be auto-detected
    rightForeArm: null, // Will be auto-detected
    rightHand: null, // Will be auto-detected
    rightHandIndex1: null, // Will be auto-detected
    rightHandIndex2: null, // Will be auto-detected
    rightHandIndex3: null, // Will be auto-detected
    rightHandMiddle1: null, // Will be auto-detected
    rightHandMiddle2: null, // Will be auto-detected
    rightHandMiddle3: null, // Will be auto-detected
    rightHandRing1: null, // Will be auto-detected
    rightHandRing2: null, // Will be auto-detected
    rightHandRing3: null, // Will be auto-detected
    rightHandPinky1: null, // Will be auto-detected
    rightHandPinky2: null, // Will be auto-detected
    rightHandPinky3: null, // Will be auto-detected
    rightHandThumb1: null, // Will be auto-detected
    rightHandThumb2: null, // Will be auto-detected
    rightHandThumb3: null // Will be auto-detected
  },
  
  // Humanoid model with mixamorig4 prefix - specific mapping based on actual bone names
  humanoid_mixamorig4: {
    neck: 'mixamorig4Neck',
    leftArm: 'mixamorig4LeftArm',
    leftForeArm: 'mixamorig4LeftForeArm',
    leftHand: 'mixamorig4LeftHand',
    leftHandIndex1: 'mixamorig4LeftHandIndex1',
    leftHandIndex2: 'mixamorig4LeftHandIndex2',
    leftHandIndex3: 'mixamorig4LeftHandIndex3',
    leftHandMiddle1: 'mixamorig4LeftHandMiddle1',
    leftHandMiddle2: 'mixamorig4LeftHandMiddle2',
    leftHandMiddle3: 'mixamorig4LeftHandMiddle3',
    leftHandRing1: 'mixamorig4LeftHandRing1',
    leftHandRing2: 'mixamorig4LeftHandRing2',
    leftHandRing3: 'mixamorig4LeftHandRing3',
    leftHandPinky1: 'mixamorig4LeftHandPinky1',
    leftHandPinky2: 'mixamorig4LeftHandPinky2',
    leftHandPinky3: 'mixamorig4LeftHandPinky3',
    leftHandThumb1: 'mixamorig4LeftHandThumb1',
    leftHandThumb2: 'mixamorig4LeftHandThumb2',
    leftHandThumb3: 'mixamorig4LeftHandThumb3',
    rightArm: 'mixamorig4RightArm',
    rightForeArm: 'mixamorig4RightForeArm',
    rightHand: 'mixamorig4RightHand',
    rightHandIndex1: 'mixamorig4RightHandIndex1',
    rightHandIndex2: 'mixamorig4RightHandIndex2',
    rightHandIndex3: 'mixamorig4RightHandIndex3',
    rightHandMiddle1: 'mixamorig4RightHandMiddle1',
    rightHandMiddle2: 'mixamorig4RightHandMiddle2',
    rightHandMiddle3: 'mixamorig4RightHandMiddle3',
    rightHandRing1: 'mixamorig4RightHandRing1',
    rightHandRing2: 'mixamorig4RightHandRing2',
    rightHandRing3: 'mixamorig4RightHandRing3',
    rightHandPinky1: 'mixamorig4RightHandPinky1',
    rightHandPinky2: 'mixamorig4RightHandPinky2',
    rightHandPinky3: 'mixamorig4RightHandPinky3',
    rightHandThumb1: 'mixamorig4RightHandThumb1',
    rightHandThumb2: 'mixamorig4RightHandThumb2',
    rightHandThumb3: 'mixamorig4RightHandThumb3'
  },
  
  // New HumanoidAvatar model - assuming similar structure to Humanoid
  humanoid: {
    // Common humanoid bone names - these will be auto-detected
    neck: null, // Will be auto-detected
    leftArm: null, // Will be auto-detected
    leftForeArm: null, // Will be auto-detected
    leftHand: null, // Will be auto-detected
    leftHandIndex1: null, // Will be auto-detected
    leftHandIndex2: null, // Will be auto-detected
    leftHandIndex3: null, // Will be auto-detected
    leftHandMiddle1: null, // Will be auto-detected
    leftHandMiddle2: null, // Will be auto-detected
    leftHandMiddle3: null, // Will be auto-detected
    leftHandRing1: null, // Will be auto-detected
    leftHandRing2: null, // Will be auto-detected
    leftHandRing3: null, // Will be auto-detected
    leftHandPinky1: null, // Will be auto-detected
    leftHandPinky2: null, // Will be auto-detected
    leftHandPinky3: null, // Will be auto-detected
    leftHandThumb1: null, // Will be auto-detected
    leftHandThumb2: null, // Will be auto-detected
    leftHandThumb3: null, // Will be auto-detected
    rightArm: null, // Will be auto-detected
    rightForeArm: null, // Will be auto-detected
    rightHand: null, // Will be auto-detected
    rightHandIndex1: null, // Will be auto-detected
    rightHandIndex2: null, // Will be auto-detected
    rightHandIndex3: null, // Will be auto-detected
    rightHandMiddle1: null, // Will be auto-detected
    rightHandMiddle2: null, // Will be auto-detected
    rightHandMiddle3: null, // Will be auto-detected
    rightHandRing1: null, // Will be auto-detected
    rightHandRing2: null, // Will be auto-detected
    rightHandRing3: null, // Will be auto-detected
    rightHandPinky1: null, // Will be auto-detected
    rightHandPinky2: null, // Will be auto-detected
    rightHandPinky3: null, // Will be auto-detected
    rightHandThumb1: null, // Will be auto-detected
    rightHandThumb2: null, // Will be auto-detected
    rightHandThumb3: null // Will be auto-detected
  }
};

// Auto-detect bone names for Humanoid model
export const detectHumanoidBones = (avatar) => {
  const detectedBones = {};
  const boneNames = [];
  
  // Collect all bone names
  avatar.traverse((child) => {
    if (child.type === 'Bone' || child.name.includes('mixamorig4') || child.name.includes('Arm') || child.name.includes('Hand') || child.name.includes('Neck')) {
      boneNames.push(child.name);
    }
  });
  
  console.log('🔍 Detected bones in Humanoid model:', boneNames);
  
  // Try to map bones based on common naming patterns
  boneNames.forEach(boneName => {
    const lowerName = boneName.toLowerCase();
    
    // Handle mixamorig4: prefix specifically
    if (boneName.includes('mixamorig4:')) {
      const boneNameWithoutPrefix = boneName.replace('mixamorig4:', '');
      const lowerNameWithoutPrefix = boneNameWithoutPrefix.toLowerCase();
      
      // Neck detection
      if (lowerNameWithoutPrefix.includes('neck') && !detectedBones.neck) {
        detectedBones.neck = boneName;
      }
      
      // Left arm detection - look for LeftArm, LeftForeArm, LeftHand
      if (lowerNameWithoutPrefix.includes('leftarm') && !detectedBones.leftArm) {
        detectedBones.leftArm = boneName;
      }
      if (lowerNameWithoutPrefix.includes('leftforearm') && !detectedBones.leftForeArm) {
        detectedBones.leftForeArm = boneName;
      }
      if (lowerNameWithoutPrefix.includes('lefthand') && !detectedBones.leftHand) {
        detectedBones.leftHand = boneName;
      }
      
      // Right arm detection - look for RightArm, RightForeArm, RightHand
      if (lowerNameWithoutPrefix.includes('rightarm') && !detectedBones.rightArm) {
        detectedBones.rightArm = boneName;
      }
      if (lowerNameWithoutPrefix.includes('rightforearm') && !detectedBones.rightForeArm) {
        detectedBones.rightForeArm = boneName;
      }
      if (lowerNameWithoutPrefix.includes('righthand') && !detectedBones.rightHand) {
        detectedBones.rightHand = boneName;
      }
      
      // Finger detection - left hand
      if (lowerNameWithoutPrefix.includes('left') && lowerNameWithoutPrefix.includes('index')) {
        if (lowerNameWithoutPrefix.includes('1') || lowerNameWithoutPrefix.includes('first')) detectedBones.leftHandIndex1 = boneName;
        else if (lowerNameWithoutPrefix.includes('2') || lowerNameWithoutPrefix.includes('second')) detectedBones.leftHandIndex2 = boneName;
        else if (lowerNameWithoutPrefix.includes('3') || lowerNameWithoutPrefix.includes('third')) detectedBones.leftHandIndex3 = boneName;
      }
      if (lowerNameWithoutPrefix.includes('left') && lowerNameWithoutPrefix.includes('middle')) {
        if (lowerNameWithoutPrefix.includes('1') || lowerNameWithoutPrefix.includes('first')) detectedBones.leftHandMiddle1 = boneName;
        else if (lowerNameWithoutPrefix.includes('2') || lowerNameWithoutPrefix.includes('second')) detectedBones.leftHandMiddle2 = boneName;
        else if (lowerNameWithoutPrefix.includes('3') || lowerNameWithoutPrefix.includes('third')) detectedBones.leftHandMiddle3 = boneName;
      }
      if (lowerNameWithoutPrefix.includes('left') && lowerNameWithoutPrefix.includes('ring')) {
        if (lowerNameWithoutPrefix.includes('1') || lowerNameWithoutPrefix.includes('first')) detectedBones.leftHandRing1 = boneName;
        else if (lowerNameWithoutPrefix.includes('2') || lowerNameWithoutPrefix.includes('second')) detectedBones.leftHandRing2 = boneName;
        else if (lowerNameWithoutPrefix.includes('3') || lowerNameWithoutPrefix.includes('third')) detectedBones.leftHandRing3 = boneName;
      }
      if (lowerNameWithoutPrefix.includes('left') && lowerNameWithoutPrefix.includes('pinky')) {
        if (lowerNameWithoutPrefix.includes('1') || lowerNameWithoutPrefix.includes('first')) detectedBones.leftHandPinky1 = boneName;
        else if (lowerNameWithoutPrefix.includes('2') || lowerNameWithoutPrefix.includes('second')) detectedBones.leftHandPinky2 = boneName;
        else if (lowerNameWithoutPrefix.includes('3') || lowerNameWithoutPrefix.includes('third')) detectedBones.leftHandPinky3 = boneName;
      }
      if (lowerNameWithoutPrefix.includes('left') && lowerNameWithoutPrefix.includes('thumb')) {
        if (lowerNameWithoutPrefix.includes('1') || lowerNameWithoutPrefix.includes('first')) detectedBones.leftHandThumb1 = boneName;
        else if (lowerNameWithoutPrefix.includes('2') || lowerNameWithoutPrefix.includes('second')) detectedBones.leftHandThumb2 = boneName;
        else if (lowerNameWithoutPrefix.includes('3') || lowerNameWithoutPrefix.includes('third')) detectedBones.leftHandThumb3 = boneName;
      }
      
      // Finger detection - right hand
      if (lowerNameWithoutPrefix.includes('right') && lowerNameWithoutPrefix.includes('index')) {
        if (lowerNameWithoutPrefix.includes('1') || lowerNameWithoutPrefix.includes('first')) detectedBones.rightHandIndex1 = boneName;
        else if (lowerNameWithoutPrefix.includes('2') || lowerNameWithoutPrefix.includes('second')) detectedBones.rightHandIndex2 = boneName;
        else if (lowerNameWithoutPrefix.includes('3') || lowerNameWithoutPrefix.includes('third')) detectedBones.rightHandIndex3 = boneName;
      }
      if (lowerNameWithoutPrefix.includes('right') && lowerNameWithoutPrefix.includes('middle')) {
        if (lowerNameWithoutPrefix.includes('1') || lowerNameWithoutPrefix.includes('first')) detectedBones.rightHandMiddle1 = boneName;
        else if (lowerNameWithoutPrefix.includes('2') || lowerNameWithoutPrefix.includes('second')) detectedBones.rightHandMiddle2 = boneName;
        else if (lowerNameWithoutPrefix.includes('3') || lowerNameWithoutPrefix.includes('third')) detectedBones.rightHandMiddle3 = boneName;
      }
      if (lowerNameWithoutPrefix.includes('right') && lowerNameWithoutPrefix.includes('ring')) {
        if (lowerNameWithoutPrefix.includes('1') || lowerNameWithoutPrefix.includes('first')) detectedBones.rightHandRing1 = boneName;
        else if (lowerNameWithoutPrefix.includes('2') || lowerNameWithoutPrefix.includes('second')) detectedBones.rightHandRing2 = boneName;
        else if (lowerNameWithoutPrefix.includes('3') || lowerNameWithoutPrefix.includes('third')) detectedBones.rightHandRing3 = boneName;
      }
      if (lowerNameWithoutPrefix.includes('right') && lowerNameWithoutPrefix.includes('pinky')) {
        if (lowerNameWithoutPrefix.includes('1') || lowerNameWithoutPrefix.includes('first')) detectedBones.rightHandPinky1 = boneName;
        else if (lowerNameWithoutPrefix.includes('2') || lowerNameWithoutPrefix.includes('second')) detectedBones.rightHandPinky2 = boneName;
        else if (lowerNameWithoutPrefix.includes('3') || lowerNameWithoutPrefix.includes('third')) detectedBones.rightHandPinky3 = boneName;
      }
      if (lowerNameWithoutPrefix.includes('right') && lowerNameWithoutPrefix.includes('thumb')) {
        if (lowerNameWithoutPrefix.includes('1') || lowerNameWithoutPrefix.includes('first')) detectedBones.rightHandThumb1 = boneName;
        else if (lowerNameWithoutPrefix.includes('2') || lowerNameWithoutPrefix.includes('second')) detectedBones.rightHandThumb2 = boneName;
        else if (lowerNameWithoutPrefix.includes('3') || lowerNameWithoutPrefix.includes('third')) detectedBones.rightHandThumb3 = boneName;
      }
    }
    
    // Also try generic patterns for non-mixamorig4 bones
    if (!boneName.includes('mixamorig4:')) {
      // Neck detection
      if (lowerName.includes('neck') && !detectedBones.neck) {
        detectedBones.neck = boneName;
      }
      
      // Left arm detection
      if (lowerName.includes('left') && lowerName.includes('arm') && !lowerName.includes('fore')) {
        detectedBones.leftArm = boneName;
      }
      if (lowerName.includes('left') && (lowerName.includes('forearm') || lowerName.includes('fore_arm'))) {
        detectedBones.leftForeArm = boneName;
      }
      if (lowerName.includes('left') && lowerName.includes('hand') && !lowerName.includes('index') && !lowerName.includes('middle') && !lowerName.includes('ring') && !lowerName.includes('pinky') && !lowerName.includes('thumb')) {
        detectedBones.leftHand = boneName;
      }
      
      // Right arm detection
      if (lowerName.includes('right') && lowerName.includes('arm') && !lowerName.includes('fore')) {
        detectedBones.rightArm = boneName;
      }
      if (lowerName.includes('right') && (lowerName.includes('forearm') || lowerName.includes('fore_arm'))) {
        detectedBones.rightForeArm = boneName;
      }
      if (lowerName.includes('right') && lowerName.includes('hand') && !lowerName.includes('index') && !lowerName.includes('middle') && !lowerName.includes('ring') && !lowerName.includes('pinky') && !lowerName.includes('thumb')) {
        detectedBones.rightHand = boneName;
      }
    }
  });
  
  console.log('🎯 Mapped bones for Humanoid:', detectedBones);
  return detectedBones;
};

// Get bone mapping for a specific avatar type
export const getBoneMapping = (avatarType, avatar = null) => {
      if (avatarType === 'humanoid' && avatar) {
      // Check if the Humanoid model uses mixamorig4 prefix (without colon)
      let hasMixamorig4 = false;
      avatar.traverse((child) => {
        if (child.name.includes('mixamorig4')) {
          hasMixamorig4 = true;
        }
      });
      
      if (hasMixamorig4) {
        console.log('🎯 Humanoid model uses mixamorig4 prefix, using specific mapping');
        return boneMappings.humanoid_mixamorig4;
      } else {
        console.log('🔍 Humanoid model uses different naming, auto-detecting bones');
        return detectHumanoidBones(avatar);
      }
    }
  
  return boneMappings[avatarType] || boneMappings.xbot;
};
