import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

interface AvatarViewProps {
  isSpeaking: boolean;
}

const AvatarView: React.FC<AvatarViewProps> = ({ isSpeaking }) => {
  const webviewRef = useRef<WebView>(null);

  useEffect(() => {
    if (webviewRef.current) {
      const script = `
        if (window.setSpeaking) {
          window.setSpeaking(${isSpeaking});
        }
      `;
      webviewRef.current.injectJavaScript(script);
    }
  }, [isSpeaking]);

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
      <style>
        body { margin: 0; overflow: hidden; background-color: transparent; }
        canvas { display: block; }
      </style>
      <!-- Load Three.js from CDN -->
      <script type="importmap">
        {
          "imports": {
            "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
            "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
          }
        }
      </script>
    </head>
    <body>
      <script type="module">
        import * as THREE from 'three';
        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

        let scene, camera, renderer, model, mixer;
        let meshesWithMouthOpen = [];
        let isSpeaking = false;
        let clock = new THREE.Clock();
        let time = 0;

        function init() {
          // ... existing init code ...
          scene = new THREE.Scene();
          scene.background = null; 
          camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
          camera.position.set(0, 1.65, 0.4); 
          
          renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
          renderer.setSize(window.innerWidth, window.innerHeight);
          renderer.setPixelRatio(window.devicePixelRatio);
          document.body.appendChild(renderer.domElement);

          const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
          scene.add(ambientLight);
          const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
          dirLight.position.set(5, 10, 7.5);
          scene.add(dirLight);

          const loader = new GLTFLoader();
          const modelUrl = 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit,Oculus+Visemes,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown&textureSizeLimit=1024&textureFormat=png';
          
          loader.load(modelUrl, (gltf) => {
            model = gltf.scene;
            scene.add(model);

            model.traverse((child) => {
              if (child.isMesh && child.morphTargetDictionary) {
                if (child.morphTargetDictionary['mouthOpen'] !== undefined) {
                  meshesWithMouthOpen.push({
                    mesh: child,
                    index: child.morphTargetDictionary['mouthOpen']
                  });
                }
              }
            });
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: 'Model loaded, meshes: ' + meshesWithMouthOpen.length }));
          }, undefined, (error) => {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'Load Error: ' + error.message }));
          });

          window.addEventListener('resize', onWindowResize);
          animate();
        }

        function onWindowResize() {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function animate() {
          requestAnimationFrame(animate);
          
          const delta = clock.getDelta();
          time += delta * 15; // Slightly faster talking

          if (model && meshesWithMouthOpen.length > 0) {
             const value = isSpeaking ? (Math.sin(time) + 1) * 0.3 + 0.1 : 0;
             
             meshesWithMouthOpen.forEach(item => {
                // Smooth transition
                const current = item.mesh.morphTargetInfluences[item.index];
                item.mesh.morphTargetInfluences[item.index] = THREE.MathUtils.lerp(current, value, 0.2);
             });
          }
          
          if (model) {
             model.rotation.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.05;
          }

          renderer.render(scene, camera);
        }

        window.setSpeaking = (speaking) => {
          isSpeaking = speaking;
        };

        init();
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#a855f7', // Subtle purple glow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 15,
  },
  webview: {
    backgroundColor: 'transparent',
    flex: 1,
  },
});

export default AvatarView;
