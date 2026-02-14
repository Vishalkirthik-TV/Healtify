export const defaultPose = (ref) => {
    if (!ref.avatar) return;
    
    const avatar = ref.avatar;
    
    console.log('🤖 Applying XBOT/YBOT default pose...');
    
    // Apply rotations directly to bones for XBOT/YBOT
    try {
        // Neck - slight forward tilt
        const neck = avatar.getObjectByName('mixamorigNeck');
        if (neck) {
            neck.rotation.x = Math.PI/12;
            console.log('✅ XBOT/YBOT neck rotated');
        }
        
        // Left arm - positioned for signing (more extreme for robot look)
        const leftArm = avatar.getObjectByName('mixamorigLeftArm');
        if (leftArm) {
            leftArm.rotation.z = -Math.PI/3;
            console.log('✅ XBOT/YBOT left arm rotated');
        }
        
        // Left forearm - positioned for signing
        const leftForeArm = avatar.getObjectByName('mixamorigLeftForeArm');
        if (leftForeArm) {
            leftForeArm.rotation.y = -Math.PI/1.5;
            console.log('✅ XBOT/YBOT left forearm rotated');
        }
        
        // Right arm - positioned for signing (more extreme for robot look)
        const rightArm = avatar.getObjectByName('mixamorigRightArm');
        if (rightArm) {
            rightArm.rotation.z = Math.PI/3;
            console.log('✅ XBOT/YBOT right arm rotated');
        }
        
        // Right forearm - positioned for signing
        const rightForeArm = avatar.getObjectByName('mixamorigRightForeArm');
        if (rightForeArm) {
            rightForeArm.rotation.y = Math.PI/1.5;
            console.log('✅ XBOT/YBOT right forearm rotated');
        }
        
        // Reset hand rotations to neutral
        const leftHand = avatar.getObjectByName('mixamorigLeftHand');
        if (leftHand) {
            leftHand.rotation.set(0, 0, 0);
            console.log('✅ XBOT/YBOT left hand reset');
        }
        
        const rightHand = avatar.getObjectByName('mixamorigRightHand');
        if (rightHand) {
            rightHand.rotation.set(0, 0, 0);
            console.log('✅ XBOT/YBOT right hand reset');
        }
        
        // Reset all finger rotations to neutral
        const fingerBones = [
            'mixamorigLeftHandIndex1', 'mixamorigLeftHandIndex2', 'mixamorigLeftHandIndex3',
            'mixamorigLeftHandMiddle1', 'mixamorigLeftHandMiddle2', 'mixamorigLeftHandMiddle3',
            'mixamorigLeftHandRing1', 'mixamorigLeftHandRing2', 'mixamorigLeftHandRing3',
            'mixamorigLeftHandPinky1', 'mixamorigLeftHandPinky2', 'mixamorigLeftHandPinky3',
            'mixamorigLeftHandThumb1', 'mixamorigLeftHandThumb2', 'mixamorigLeftHandThumb3',
            'mixamorigRightHandIndex1', 'mixamorigRightHandIndex2', 'mixamorigRightHandIndex3',
            'mixamorigRightHandMiddle1', 'mixamorigRightHandMiddle2', 'mixamorigRightHandMiddle3',
            'mixamorigRightHandRing1', 'mixamorigRightHandRing2', 'mixamorigRightHandRing3',
            'mixamorigRightHandPinky1', 'mixamorigRightHandPinky2', 'mixamorigRightHandPinky3',
            'mixamorigRightHandThumb1', 'mixamorigRightHandThumb2', 'mixamorigRightHandThumb3'
        ];
        
        fingerBones.forEach(boneName => {
            const bone = avatar.getObjectByName(boneName);
            if (bone) {
                bone.rotation.set(0, 0, 0);
            }
        });
        
        console.log('✅ XBOT/YBOT fingers reset to neutral');
        
        // Force scene update
        if (ref.scene) {
            ref.scene.updateMatrixWorld(true);
        }
        
        console.log('✅ XBOT/YBOT default pose applied successfully');
        
    } catch (error) {
        console.log('❌ Error applying XBOT/YBOT default pose:', error);
    }
};