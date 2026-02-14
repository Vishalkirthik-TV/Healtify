'use client';

import React, { useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, OrbitControls, Html } from '@react-three/drei';
import { SignAnimator, Sign_Default } from '@/lib/SignAnimator';

interface DeafAvatarProps {
  onAnimatorReady: (animator: SignAnimator) => void;
}

function YBotModel({
  onAnimatorReady
}: {
  onAnimatorReady: (animator: SignAnimator) => void;
}) {
  const { scene } = useGLTF('/models/ybot.glb');
  const animatorRef = useRef<SignAnimator | null>(null);

  useEffect(() => {
    if (scene && !animatorRef.current) {
      console.log('[DeafAvatar] YBot Loaded. Initializing SignAnimator.');

      // Initialize Animator
      const animator = new SignAnimator(scene);
      animatorRef.current = animator;
      onAnimatorReady(animatorRef.current);

      // Load Animation Library from JSON
      animatorRef.current.loadLibrary().then(() => {
        console.log('DeafAvatar: Sign Library Loaded');
      });

      // Fix Orientation: Correcting Z-up to Y-up often requires -90 deg rotation.
      scene.rotation.set(0, 0, 0);

      // Trigger Startup Animation (Default Pose from Sign-Kit)
      console.log('DeafAvatar: Triggering Default Pose');
      if (animatorRef.current) {
        Sign_Default(animatorRef.current);
      }
    }
  }, [scene, onAnimatorReady]);

  // Adjust rotation (X: -90 degrees)
  // Raising position Y from -1.0 to -0.5 to fix "bottom" issue
  return (
    <primitive
      object={scene}
      position={[0, -0.6, 0]}
      scale={[1.2, 1.2, 1.2]}
      rotation={[-Math.PI / 2, 0, 0]}
    />
  );
}

export function DeafAvatar({ onAnimatorReady }: DeafAvatarProps) {
  return (
    <div className="h-full w-full overflow-hidden rounded-xl border border-white/5 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/80 via-slate-900 to-black shadow-2xl">
      <Canvas camera={{ position: [0, 1.5, 2.5], fov: 50 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[0, 2, 5]} intensity={2} />
        <pointLight position={[-2, 1, 3]} intensity={1} color="white" />
        <pointLight position={[2, 1, 3]} intensity={1} color="white" />

        <Suspense
          fallback={
            <Html center>
              <div className="text-white">Loading YBot...</div>
            </Html>
          }
        >
          <YBotModel onAnimatorReady={onAnimatorReady} />
        </Suspense>

        <Environment preset="city" />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          target={[0, 1.4, 0]}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2}
        />
        {/* Removed Debug Helpers for cleaner UI */}
      </Canvas>
      <div className="absolute right-4 bottom-4 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
        Deaf Mode Active
      </div>
    </div>
  );
}
