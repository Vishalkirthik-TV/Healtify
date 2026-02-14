export const humanoidDefaultPose = (ref) => {
    if (!ref.avatar) {
        console.log('❌ No avatar found for humanoid default pose');
        return;
    }

    const avatar = ref.avatar;
    console.log('🎭 FIXING HumanoidAvatar to bring hands FORWARD like red robot...');

    try {
        // Clear any existing animations that might interfere
        if (ref.animations) {
            ref.animations = [];
        }
        if (ref.pending) {
            ref.pending = false;
        }

        // Apply rotations to bring hands naturally forward (adjusted to minimize twist)
        const neck = avatar.getObjectByName('mixamorigNeck');
        if (neck) {
            neck.rotation.set(Math.PI/12, 0, 0);  // Slight head tilt forward
            console.log('✅ Humanoid neck positioned');
        }

        // LEFT ARM - Subtle lift outward (z negative), minimal forward swing (y negative), slight tilt (x)
        const leftArm = avatar.getObjectByName('mixamorigLeftArm');
        if (leftArm) {
            leftArm.rotation.set(-Math.PI/12, -Math.PI/6, -Math.PI/4);  // Updated: y to -30° (reduced swing), z to -45° (less lift)
            console.log('✅ Left arm positioned - hands forward, rotation:', leftArm.rotation);
        }

        // LEFT FOREARM - Stronger bend to align hand forward, reducing twist
        const leftForeArm = avatar.getObjectByName('mixamorigLeftForeArm');
        if (leftForeArm) {
            leftForeArm.rotation.set(0, -Math.PI/1.2, Math.PI/12);  // Updated: added small z twist to correct hand orientation
            console.log('✅ Left forearm positioned - hands forward, rotation:', leftForeArm.rotation);
        }

        // RIGHT ARM - Mirror left: subtle lift outward (z positive), minimal forward swing (y positive), slight tilt (x)
        const rightArm = avatar.getObjectByName('mixamorigRightArm');
        if (rightArm) {
            rightArm.rotation.set(-Math.PI/12, Math.PI/6, Math.PI/4);  // Updated: y to +30° (reduced swing), z to +45° (less lift)
            console.log('✅ Right arm positioned - hands forward, rotation:', rightArm.rotation);
        }

        // RIGHT FOREARM - Stronger bend to align hand forward, reducing twist
        const rightForeArm = avatar.getObjectByName('mixamorigRightForeArm');
        if (rightForeArm) {
            rightForeArm.rotation.set(0, Math.PI/1.2, -Math.PI/12);  // Updated: added small z twist to correct hand orientation
            console.log('✅ Right forearm positioned - hands forward, rotation:', rightForeArm.rotation);
        }

        // Hands with slight wrist rotation for natural palm facing
        const leftHand = avatar.getObjectByName('mixamorigLeftHand');
        if (leftHand) {
            leftHand.rotation.set(0, 0, Math.PI/6);  // Slight z rotation for palm facing
            console.log('✅ Left hand neutral, rotation:', leftHand.rotation);
        }

        const rightHand = avatar.getObjectByName('mixamorigRightHand');
        if (rightHand) {
            rightHand.rotation.set(0, 0, -Math.PI/6);  // Slight z rotation for palm facing
            console.log('✅ Right hand neutral, rotation:', rightHand.rotation);
        }

        // Reset all finger bones to neutral
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

        let fingerCount = 0;
        fingerBones.forEach(boneName => {
            const bone = avatar.getObjectByName(boneName);
            if (bone) {
                bone.rotation.set(0, 0, 0);
                fingerCount++;
            }
        });
        console.log(`✅ ${fingerCount} finger bones reset to neutral`);

        // Force multiple scene updates to ensure changes take effect immediately
        if (ref.scene) {
            ref.scene.updateMatrixWorld(true);
            ref.scene.updateMatrixWorld(true);
            ref.scene.updateMatrixWorld(true);
        }

        avatar.updateMatrixWorld(true);
        avatar.updateMatrixWorld(true);
        avatar.updateMatrixWorld(true);

        console.log('✅ HumanoidAvatar pose fixed - hands now forward like red robot');

    } catch (error) {
        console.log('❌ Error fixing HumanoidAvatar pose:', error);
    }
};
// Function to transition from relaxed pose to sign language pose
export const transitionToSignLanguagePose = (ref) => {
    if (!ref.avatar) return;
    
    const avatar = ref.avatar;
    
    console.log('🎭 Transitioning HumanoidAvatar to sign language pose...');
    
    try {
        // Add transition animation to the animation system
        ref.characters.push(' ');
        let transitionAnimations = [];
        
        // Transition animations - move from relaxed pose to sign language pose
        transitionAnimations.push(["mixamorigNeck", "rotation", "x", Math.PI/12, "+"]);
        transitionAnimations.push(["mixamorigLeftArm", "rotation", "z", -Math.PI/4, "-"]);
        transitionAnimations.push(["mixamorigLeftArm", "rotation", "y", -Math.PI/8, "-"]);
        transitionAnimations.push(["mixamorigLeftArm", "rotation", "x", 0, "+"]);
        transitionAnimations.push(["mixamorigLeftForeArm", "rotation", "y", -Math.PI/2, "-"]);
        transitionAnimations.push(["mixamorigLeftForeArm", "rotation", "z", 0, "+"]);
        transitionAnimations.push(["mixamorigRightArm", "rotation", "z", Math.PI/4, "+"]);
        transitionAnimations.push(["mixamorigRightArm", "rotation", "y", Math.PI/8, "+"]);
        transitionAnimations.push(["mixamorigRightArm", "rotation", "x", 0, "+"]);
        transitionAnimations.push(["mixamorigRightForeArm", "rotation", "y", Math.PI/2, "+"]);
        transitionAnimations.push(["mixamorigRightForeArm", "rotation", "z", 0, "+"]);
        transitionAnimations.push(["mixamorigLeftHand", "rotation", "x", 0, "+"]);
        transitionAnimations.push(["mixamorigLeftHand", "rotation", "y", 0, "+"]);
        transitionAnimations.push(["mixamorigLeftHand", "rotation", "z", 0, "+"]);
        transitionAnimations.push(["mixamorigRightHand", "rotation", "x", 0, "+"]);
        transitionAnimations.push(["mixamorigRightHand", "rotation", "y", 0, "+"]);
        transitionAnimations.push(["mixamorigRightHand", "rotation", "z", 0, "+"]);
        
        ref.animations.push(transitionAnimations);
        
        console.log('🎯 Transition animation added to system');
        
        if (ref.pending === false) {
            ref.pending = true;
            console.log('🎯 Starting transition animation');
            ref.animate();
        } else {
            console.log('⚠️ Animation system already running, transition will be queued');
        }
        
        console.log('✅ HumanoidAvatar transition to sign language pose initiated');
        
    } catch (error) {
        console.log('❌ Error transitioning to sign language pose:', error);
    }
};
