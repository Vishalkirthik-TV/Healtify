import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

// Import animations
import * as wordAnimations from '../assets/animations/words';
import * as alphabetAnimations from '../assets/animations/alphabets';
import { defaultPose } from '../assets/animations/defaultPose';
import { humanoidDefaultPose, transitionToSignLanguagePose } from '../assets/animations/humanoidDefaultPose';
import { getBoneMapping } from '../assets/animations/boneMapping';
import { fallbackAlphabetGeneric } from '../assets/animations/fallbackAnimations';

// Import 3D models - with fallback handling
import xbotModel from '../assets/models/xbot.glb';
import ybotModel from '../assets/models/ybot.glb';
import humanoidAvatarModel from '../assets/models/HumanoidRetargeted.glb';

const SignLanguageAvatar = ({
  text,
  isActive = false,
  avatarType = 'xbot',
  animationSpeed = 0.1,
  pauseTime = 800,
  onAnimationComplete
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const avatarRef = useRef(null);
  const animationRef = useRef(null);

  const [isAnimating, setIsAnimating] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [hasTransitionedToSignPose, setHasTransitionedToSignPose] = useState(false);

  // Update animation system when speed/pause props change
  useEffect(() => {
    if (animationSystemRef.current) {
      animationSystemRef.current.speed = animationSpeed;
      animationSystemRef.current.pause = pauseTime;
      console.log('⚡ Animation settings updated:', { speed: animationSpeed, pause: pauseTime });
    }
  }, [animationSpeed, pauseTime]);

  // Animation system state - using proven reference codebase pattern
  const animationSystemRef = useRef({
    animations: [],
    pending: false,
    flag: false,
    speed: animationSpeed,
    pause: pauseTime,
    avatar: null,
    scene: null,
    camera: null,
    renderer: null,
    characters: []
  });

  useEffect(() => {
    if (!mountRef.current) return;

    // Clean up previous renderer if any
    if (rendererRef.current && mountRef.current.contains(rendererRef.current.domElement)) {
      mountRef.current.removeChild(rendererRef.current.domElement);
    }

    // Initialize Three.js scene - using proven reference codebase pattern
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdddddd);
    sceneRef.current = scene;

    // Professional lighting setup for all avatar types
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff, 1.5);
    spotLight.position.set(0, 5, 5);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.1;
    spotLight.decay = 2;
    spotLight.distance = 200;
    scene.add(spotLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Camera - using proven positioning from 3D Avatar codebase
    const camera = new THREE.PerspectiveCamera(
      30, // Narrower field of view for better centering
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );

    // Adjust camera position based on avatar type
    if (avatarType === 'humanoid') {
      camera.position.z = 2.2; // Zoom out slightly to fit head in shorter container
      camera.position.y = 1.5; // Raise camera slightly to ensure better headroom
    } else {
      camera.position.z = 2.2; // Zoom out for XBOT/YBOT too
      camera.position.y = 1.5;
    }

    cameraRef.current = camera;

    console.log('📷 Camera position:', camera.position);
    console.log('📷 Camera field of view:', camera.fov);
    console.log('📷 Using 3D Avatar positioning approach');

    // Renderer - using proven reference setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Define the animate function using proven reference pattern
    const animateFunction = () => {
      const animSystem = animationSystemRef.current;
      if (animSystem.animations.length === 0) {
        animSystem.pending = false;
        return;
      }

      requestAnimationFrame(animateFunction);

      if (animSystem.animations[0].length) {
        if (!animSystem.flag) {
          if (animSystem.animations[0][0] === 'add-text') {
            setCurrentText(prev => prev + animSystem.animations[0][1]);
            animSystem.animations.shift();
          } else {
            // Process bone animations using proven pattern
            for (let i = 0; i < animSystem.animations[0].length;) {
              let [boneName, action, axis, limit, sign] = animSystem.animations[0][i];

              // Try to map the bone name using the bone mapping system
              let actualBoneName = boneName;
              if (animSystem.boneMapping && animSystem.boneMapping[boneName]) {
                actualBoneName = animSystem.boneMapping[boneName];
              }

              const bone = animSystem.avatar?.getObjectByName(actualBoneName);

              if (bone && bone[action]) {
                if (sign === "+" && bone[action][axis] < limit) {
                  bone[action][axis] += animSystem.speed;
                  bone[action][axis] = Math.min(bone[action][axis], limit);
                  i++;
                } else if (sign === "-" && bone[action][axis] > limit) {
                  bone[action][axis] -= animSystem.speed;
                  bone[action][axis] = Math.max(bone[action][axis], limit);
                  i++;
                } else {
                  animSystem.animations[0].splice(i, 1);
                }
              } else {
                // Skip invalid bone references
                console.log(`⚠️ Bone not found or invalid: ${boneName} -> ${actualBoneName}`);
                animSystem.animations[0].splice(i, 1);
              }
            }
          }
        }
      } else {
        // Empty animation array means pause between signs
        animSystem.flag = true;
        setTimeout(() => {
          animSystem.flag = false;
        }, animSystem.pause);
        animSystem.animations.shift();
      }

      if (animSystem.renderer && animSystem.scene && animSystem.camera) {
        animSystem.renderer.render(animSystem.scene, animSystem.camera);
      }
    };



    // Load avatar model - using reference pattern
    const loader = new GLTFLoader();

    // Set up DRACO loader for compressed models
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/'); // Use CDN
    loader.setDRACOLoader(dracoLoader);
    let modelPath;
    switch (avatarType) {
      case 'xbot':
        modelPath = xbotModel;
        break;
      case 'ybot':
        modelPath = ybotModel;
        break;
      case 'humanoid':
        modelPath = humanoidAvatarModel;
        console.log('🎭 Loading HumanoidAvatar model:', humanoidAvatarModel);
        break;
      default:
        modelPath = xbotModel; // fallback to xbot
    }

    console.log('🔄 Loading model:', modelPath, 'for avatar type:', avatarType);

    loader.load(
      modelPath,
      (gltf) => {
        console.log('✅ Model loaded successfully:', gltf);
        console.log('🎭 Avatar type:', avatarType);
        console.log('🔍 GLTF scene:', gltf.scene);
        console.log('🔍 GLTF scene children:', gltf.scene.children);

        // Use proven reference pattern
        gltf.scene.traverse((child) => {
          if (child.type === 'SkinnedMesh') {
            child.frustumCulled = false;
            console.log('🎭 Found SkinnedMesh:', child.name, child.position, child.scale);
          }
          if (child.type === 'Bone') {
            console.log('🦴 Found Bone:', child.name);
          }
        });

        const avatar = gltf.scene;

        // Debug: Check if avatar has any visible geometry
        let hasVisibleGeometry = false;
        avatar.traverse((child) => {
          if (child.type === 'Mesh' || child.type === 'SkinnedMesh') {
            hasVisibleGeometry = true;
            console.log('📦 Found visible geometry:', child.name, child.type);
          }
        });

        console.log('👁️ Has visible geometry:', hasVisibleGeometry);

        scene.add(avatar);
        avatarRef.current = avatar;
        setModelLoaded(true);

        // Position avatar based on type - now using same positioning as XBOT/YBOT
        if (avatarType === 'humanoid') {
          // Use same positioning as XBOT/YBOT since origin is now fixed
          avatar.position.set(0, 0, 0);
          avatar.rotation.set(0, 0, 0);
          avatar.scale.setScalar(1);

          console.log(`🎯 HumanoidAvatar positioned like XBOT/YBOT (origin fixed)`);
          console.log('📍 Position:', avatar.position);
          console.log('📍 Scale:', avatar.scale);
        } else {
          // XBOT/YBOT positioning - works well as is
          avatar.position.set(0, 0, 0);
          avatar.rotation.set(0, 0, 0);
          avatar.scale.setScalar(1);

          console.log(`🎯 ${avatarType} model positioned at origin`);
          console.log('📍 Position:', avatar.position);
          console.log('📍 Scale:', avatar.scale);
        }

        // Initialize animation system with avatar reference and animate function
        animationSystemRef.current.avatar = avatar;
        animationSystemRef.current.scene = scene;
        animationSystemRef.current.camera = camera;
        animationSystemRef.current.renderer = renderer;
        animationSystemRef.current.animate = animateFunction;

        // Get bone mapping for this avatar type
        animationSystemRef.current.boneMapping = getBoneMapping(avatarType, avatar);

        // For Humanoid model, check if we have enough bones for full animations
        if (avatarType === 'humanoid') {
          const boneMapping = animationSystemRef.current.boneMapping;
          const hasBasicBones = boneMapping.leftArm && boneMapping.rightArm && boneMapping.leftHand && boneMapping.rightHand;

          if (!hasBasicBones) {
            console.log('⚠️ Humanoid model missing basic bones, using fallback animation system');
            console.log('🔍 Available bones:', Object.keys(boneMapping).filter(key => boneMapping[key]));
            animationSystemRef.current.useFallbackAnimations = true;
          } else {
            console.log('✅ Humanoid model has sufficient bones for full animations');
            console.log('🔍 Mapped bones:', boneMapping);
            animationSystemRef.current.useFallbackAnimations = false;
          }
        }

        // Apply default pose after model load based on avatar type
        console.log('🎯 Applying default pose to:', avatarType);
        console.log('🔍 Available bones in model:');
        avatar.traverse((child) => {
          if (child.type === 'Bone') {
            console.log('🦴 Bone:', child.name);
          }
        });

        // Clear any existing animations first
        animationSystemRef.current.animations = [];
        animationSystemRef.current.pending = false;
        animationSystemRef.current.flag = false;

        // Use appropriate default pose based on avatar type
        if (avatarType === 'humanoid') {
          if (humanoidDefaultPose) {
            // Apply pose immediately
            humanoidDefaultPose(animationSystemRef.current);
            console.log('✅ HumanoidAvatar-specific default pose applied immediately');

            // Apply pose again after a delay to ensure it takes effect
            setTimeout(() => {
              humanoidDefaultPose(animationSystemRef.current);
              console.log('✅ HumanoidAvatar default pose applied again after delay');
            }, 1000);
          }
        } else {
          if (defaultPose) {
            defaultPose(animationSystemRef.current);
            console.log('✅ XBOT/YBOT default pose applied');
          }
        }

        // Start main render loop
        animate();
      },
      (progress) => {
        // Progress callback
        if (progress.lengthComputable) {
          const percentComplete = (progress.loaded / progress.total) * 100;
          console.log(`📦 Loading progress: ${percentComplete.toFixed(1)}%`);
        }
      },
      (error) => {
        console.error('❌ Error loading 3D model:', error);
        console.error('Model path:', modelPath);
        console.error('Avatar type:', avatarType);

        // Special error handling for HumanoidAvatar
        if (avatarType === 'humanoid') {
          console.error('🚨 HumanoidAvatar failed to load, this might be a model issue');
          console.error('💡 Try using a different HumanoidAvatar model or check the file');
        }

        setModelError(error);
        animate(); // Still animate for fallback
      }
    );

    // Main render loop - using proven reference pattern
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      // Render the scene
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };

    // Handle window resize
    const handleResize = () => {
      if (mountRef.current && camera && renderer) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight || 320;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);

        // Responsive Camera Positioning
        if (window.innerWidth >= 640) {
          // Desktop/Tablet: Closer camera for larger avatar
          if (avatarType === 'humanoid') {
            camera.position.z = 1.6;
            camera.position.y = 1.35;
          } else {
            camera.position.z = 1.6;
            camera.position.y = 1.4;
          }
        } else {
          // Mobile: Zoomed out to prevent cropping
          camera.position.z = 2.2;
          camera.position.y = 1.5;
        }
      }
    };
    window.addEventListener('resize', handleResize);

    // Resize observer to catch container size changes
    const ro = new ResizeObserver(() => handleResize());
    if (mountRef.current) ro.observe(mountRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mountRef.current && renderer) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer?.dispose();
      dracoLoader?.dispose();
      ro.disconnect?.();
    };
  }, [avatarType]);

  // Handle text changes and trigger animations
  // Track the last TEXT we started animating (not display text)
  const lastAnimatedTextRef = useRef('');

  useEffect(() => {
    /* 
       NOTE: We removed the check `text !== lastAnimatedTextRef.current` here 
       because we want to allow `performSignLanguageAnimation` to handle the diff logic internally.
       Also, relying on the Ref for the dependency array effect skip is risky if the ref updates inside.
       We will trust `performSignLanguageAnimation` to be smart.
    */
    if (text && avatarRef.current && isActive) {
      // lastAnimatedTextRef.current is updated INSIDE performSignLanguageAnimation now
      setCurrentText(''); // Clear display text for new animation
      performSignLanguageAnimation(text);
    }
  }, [text, isActive]);

  // Handle transition to sign language pose when voice starts (HumanoidAvatar only)
  useEffect(() => {
    if (avatarType === 'humanoid' && isActive && !hasTransitionedToSignPose && avatarRef.current) {
      console.log('🎭 Voice detected - transitioning HumanoidAvatar to sign language pose');
      setHasTransitionedToSignPose(true);

      // Add a small delay to ensure the avatar is fully loaded
      setTimeout(() => {
        transitionToSignLanguagePose(animationSystemRef.current);
      }, 500);
    }
  }, [isActive, avatarType, hasTransitionedToSignPose]);

  // Reset transition state when avatar type changes
  useEffect(() => {
    setHasTransitionedToSignPose(false);
  }, [avatarType]);

  const performSignLanguageAnimation = (inputText) => {
    // REMOVED: if (isAnimating) return; 
    // This was blocking new animations from queuing!
    if (!avatarRef.current) {
      console.warn('⚠️ Avatar not loaded yet, cannot animate');
      return;
    }

    console.log(`🎭 Starting animation for: "${inputText}"`);
    setIsAnimating(true);
    const animSystem = animationSystemRef.current;

    let textToAnimate = inputText;
    const lastText = lastAnimatedTextRef.current || '';

    // Check if new text is just an extension of previous text
    if (inputText.toLowerCase().startsWith(lastText.toLowerCase().trim())) {
      // It's an extension, only animate the NEW part
      const diff = inputText.slice(lastText.length).trim();
      if (!diff) {
        console.log('🎭 Text unmatched or empty diff, skipping');
        return;
      }
      console.log(`🎭 Incremental animation detected. Diff: "${diff}"`);
      textToAnimate = diff;
      // Do NOT clear existing animations if it's an extension and they are still running
      // But we generally want to append.
    } else {
      // New sentence or completely different text - Clear previous
      console.log('🎭 New context detected, clearing previous animations');
      animSystem.animations = [];
    }

    // Update ref to current FULL text for next comparison
    lastAnimatedTextRef.current = inputText;

    // Simple text processing - split into words and characters
    const inputWords = textToAnimate.toUpperCase().split(' ').filter(w => w.trim());

    inputWords.forEach((word) => {
      if (wordAnimations[word] && typeof wordAnimations[word] === 'function') {
        // Known word animation
        animSystem.animations.push(['add-text', word + ' ']);
        wordAnimations[word](animSystem);
      } else {
        // Spell out word letter by letter
        word.split('').forEach((char, index) => {
          if (alphabetAnimations[char] && typeof alphabetAnimations[char] === 'function') {
            if (index === word.length - 1) {
              animSystem.animations.push(['add-text', char + ' ']);
            } else {
              animSystem.animations.push(['add-text', char]);
            }
            alphabetAnimations[char](animSystem);
          } else if (animSystem.useFallbackAnimations) {
            // Use fallback animation for unknown characters
            if (index === word.length - 1) {
              animSystem.animations.push(['add-text', char + ' ']);
            } else {
              animSystem.animations.push(['add-text', char]);
            }
            fallbackAlphabetGeneric(animSystem, char);
          }
        });
      }
    });

    console.log(`📊 Queued ${animSystem.animations.length} animation steps for "${inputText}"`);

    // Start animation if not already running
    if (!animSystem.pending) {
      animSystem.pending = true;
      animSystem.animate();
      console.log('▶️ Started animation loop');
    } else {
      console.log('🔄 Animation loop already running, animations queued');
    }

    // Calculate proper animation duration based on animation system
    const animationCount = animSystem.animations.length;
    const totalDuration = (animationCount * animSystem.pause) + (animationCount * 1000); // pause + animation time

    console.log(`⏱️ Estimated animation duration: ${(totalDuration / 1000).toFixed(1)}s`);

    setTimeout(() => {
      setIsAnimating(false);
      console.log(`✅ Animation complete for: "${inputText}"`);
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, totalDuration);
  };

  // Fallback interface when 3D model fails to load
  if (modelError) {
    return (
      <div
        ref={mountRef}
        className="w-full h-80 border-2 border-red-500 rounded-lg overflow-hidden relative bg-white flex items-center justify-center flex-col"
      >
        <div className="text-center p-5">
          <div className="text-5xl mb-4">😕</div>
          <h3 className="text-xl font-bold text-gray-800 mb-3">
            3D Avatar Model Could Not Load
          </h3>
          <p className="text-gray-600 mb-4 text-sm">
            The 3D avatar model failed to load.<br />
            <span className="text-red-600 font-semibold">{modelError?.message || 'Unknown error.'}</span>
          </p>
          <p className="text-xs text-gray-500 mb-2">
            Make sure <span className="font-mono">xbot.glb</span>, <span className="font-mono">ybot.glb</span>, and <span className="font-mono">HumanoidAvatar.compressed.glb</span> exist in <span className="font-mono">src/assets/models/</span>.<br />
            If you just added them, restart the dev server.
          </p>
          {currentText && (
            <div className="p-3 bg-blue-50 rounded-md border border-blue-200 mb-4">
              <span className="font-semibold">Text to translate:</span> {currentText}
            </div>
          )}
          <div className="px-4 py-2 bg-blue-600 text-white rounded-md text-xs">
            Demo Mode - Text Translation Ready
          </div>
        </div>
      </div>
    );
  }

  // Google Meet-like loading spinner
  if (!modelLoaded && !modelError) {
    return (
      <div
        ref={mountRef}
        className="w-full h-80 border-2 border-blue-500 rounded-lg overflow-hidden relative bg-white flex items-center justify-center"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <svg className="animate-spin h-10 w-10 text-blue-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <div className="text-gray-700 text-base font-medium">Loading 3D Avatar...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="w-full h-full border-2 border-blue-500 rounded-lg overflow-hidden relative"
    >
      {!modelLoaded && !modelError && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-center">
          <div className="text-3xl mb-2">⏳</div>
          Loading 3D Avatar...
        </div>
      )}

      {isAnimating && (
        <div className="absolute top-3 left-3 bg-blue-600/90 text-white px-2 py-1 rounded text-xs">
          Translating...
        </div>
      )}


      {/* YouTube-style caption - clean, minimal, positioned above controls */}
      {text && isActive && (
        <div className="absolute bottom-30 left-1/2 transform -translate-x-1/2">
          <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-md shadow-lg">
            <div className="text-sm md:text-base font-medium text-center max-w-lg">
              {text.trim()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignLanguageAvatar;