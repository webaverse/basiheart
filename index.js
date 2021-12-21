import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
// import easing from './easing.js';
import metaversefile from 'metaversefile';
const {useApp, useInternals, useGeometries, useMaterials, useFrame, useActivate, useLoaders, usePhysics, addTrackedApp, useDefaultModules, useCleanup} = metaversefile;

// const localVector = new THREE.Vector3();

export default () => {
  const app = useApp();
  const {renderer, scene, camera} = useInternals();
  const physics = usePhysics();
  const {CapsuleGeometry} = useGeometries();
  const {WebaverseShaderMaterial} = useMaterials();

  const physicsIds = [];

  const _makeHeartMesh = () => {
    const factor = 1.;
    const radiusTop = 0.05 * factor;
    const radiusBottom = 0.05 * factor;
    const height = 0.2 * factor;
    const geometry = BufferGeometryUtils.mergeBufferGeometries([
      new CapsuleGeometry(radiusTop, radiusBottom, height),
      new CapsuleGeometry(radiusTop, radiusBottom, height)
        .applyMatrix4(
          new THREE.Matrix4()
            .compose(
              new THREE.Vector3(),
              new THREE.Quaternion()
                .setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI/2),
              new THREE.Vector3(1, 1, 1)
            )
        ),
      new CapsuleGeometry(radiusTop, radiusBottom, height)
        .applyMatrix4(
          new THREE.Matrix4()
            .compose(
              new THREE.Vector3(),
              new THREE.Quaternion()
                .setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI/2),
              new THREE.Vector3(1, 1, 1)
            )
        ),
    ]);
  
    const material = new WebaverseShaderMaterial({
      uniforms: {
        /* uBoundingBox: {
          type: 'vec4',
          value: new THREE.Vector4(
            boundingBox.min.x,
            boundingBox.min.y,
            boundingBox.max.x - boundingBox.min.x,
            boundingBox.max.y - boundingBox.min.y
          ),
          needsUpdate: true,
        }, */
        uTime: {
          type: 'f',
          value: 0,
          needsUpdate: true,
        },
        modelViewMatrixInverse: {
          type: 'm',
          value: new THREE.Matrix4(),
          needsUpdate: true,
        },
        projectionMatrixInverse: {
          type: 'm',
          value: new THREE.Matrix4(),
          needsUpdate: true,
        },
        viewport: {
          type: 'm',
          value: new THREE.Vector4(0, 0, 1, 1),
          needsUpdate: true,
        },
      },
      vertexShader: `\
        precision highp float;
        precision highp int;
  
        uniform float uTime;
        // uniform vec4 uBoundingBox;
        // varying vec3 vPosition;
        // varying vec3 vNormal;
        // attribute vec3 position2;
        // attribute float time;
        // varying vec3 vPosition2;
        varying vec3 vNormal;
        varying float vF;
  
        float getBezierT(float x, float a, float b, float c, float d) {
          return float(sqrt(3.) * 
            sqrt(-4. * b * d + 4. * b * x + 3. * c * c + 2. * c * d - 8. * c * x - d * d + 4. * d * x) 
              + 6. * b - 9. * c + 3. * d) 
              / (6. * (b - 2. * c + d));
        }
        float easing(float x) {
          return getBezierT(x, 0., 1., 0., 1.);
        }
        float easing2(float x) {
          return easing(easing(x));
        }
        
        // const float moveDistance = 20.;
        const float q = 0.1;
  
        void main() {
          float f = uTime < q ?
            easing(uTime/q)
          :
            1. - (uTime - q)/(1. - q);
          vec4 mvPosition = modelViewMatrix * vec4(
            position * (1. + f * 2.),
            1.
          );
          gl_Position = projectionMatrix * mvPosition;
          vNormal = normal;
          vF = f;
        }
      `,
      fragmentShader: `\
        precision highp float;
        precision highp int;
  
        #define PI 3.1415926535897932384626433832795
  
        uniform mat4 modelViewMatrixInverse;
        uniform mat4 projectionMatrixInverse;
        uniform vec4 viewport;
        // uniform vec4 uBoundingBox;
        // uniform float uTime;
        // uniform float uTimeCubic;
        // varying vec3 vPosition2;
        varying vec3 vNormal;
        varying float vF;
  
        vec3 hueShift( vec3 color, float hueAdjust ){
          const vec3  kRGBToYPrime = vec3 (0.299, 0.587, 0.114);
          const vec3  kRGBToI      = vec3 (0.596, -0.275, -0.321);
          const vec3  kRGBToQ      = vec3 (0.212, -0.523, 0.311);
  
          const vec3  kYIQToR     = vec3 (1.0, 0.956, 0.621);
          const vec3  kYIQToG     = vec3 (1.0, -0.272, -0.647);
          const vec3  kYIQToB     = vec3 (1.0, -1.107, 1.704);
  
          float   YPrime  = dot (color, kRGBToYPrime);
          float   I       = dot (color, kRGBToI);
          float   Q       = dot (color, kRGBToQ);
          float   hue     = atan (Q, I);
          float   chroma  = sqrt (I * I + Q * Q);
  
          hue += hueAdjust;
  
          Q = chroma * sin (hue);
          I = chroma * cos (hue);
  
          vec3    yIQ   = vec3 (YPrime, I, Q);
  
          return vec3( dot (yIQ, kYIQToR), dot (yIQ, kYIQToG), dot (yIQ, kYIQToB) );
        }
      
        float getBezierT(float x, float a, float b, float c, float d) {
          return float(sqrt(3.) * 
            sqrt(-4. * b * d + 4. * b * x + 3. * c * c + 2. * c * d - 8. * c * x - d * d + 4. * d * x) 
              + 6. * b - 9. * c + 3. * d) 
              / (6. * (b - 2. * c + d));
        }
        float easing(float x) {
          return getBezierT(x, 0., 1., 0., 1.);
        }
  
        const vec3 c2 = vec3(${new THREE.Color(0xef5350).toArray().join(', ')});
        const vec3 c1 = vec3(${new THREE.Color(0xff7043).toArray().join(', ')});
        // const float q = 0.7;
        // const float q2 = 0.9;
        
        void main() {
          vec4 ndcPos;
          ndcPos.xy = ((2.0 * gl_FragCoord.xy) - (2.0 * viewport.xy)) / (viewport.zw) - 1.;
          ndcPos.z = (2.0 * gl_FragCoord.z - gl_DepthRange.near - gl_DepthRange.far) /
              (gl_DepthRange.far - gl_DepthRange.near);
          ndcPos.w = 1.0;
  
          vec4 clipPos = ndcPos / gl_FragCoord.w;
          vec4 eyePos = projectionMatrixInverse * clipPos;
          
          vec3 p = (modelViewMatrixInverse * eyePos).xyz;
          p /= (1. + vF);
          vec3 p2 = p / 0.1;
          float d = length(p2);
          float cF = (1. - pow(d, 2.) / 5.) * 1.2 * vF;
          
          vec3 c = (c1 * (1. - d/0.1)) + (c2 * d/0.1);
          gl_FragColor = vec4(c * cF, 1.);
          gl_FragColor = sRGBToLinear(gl_FragColor);
        }
      `,
      // transparent: true,
      // polygonOffset: true,
      // polygonOffsetFactor: -1,
      // polygonOffsetUnits: 1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.update = () => {
      mesh.material.uniforms.uTime.value = (Date.now() % 1000) / 1000;
      mesh.material.uniforms.uTime.needsUpdate = true;
      
      mesh.material.uniforms.modelViewMatrixInverse.value
        .copy(camera.matrixWorldInverse)
        .multiply(mesh.matrixWorld)
        .invert();
      mesh.material.uniforms.modelViewMatrixInverse.needsUpdate = true;
  
      mesh.material.uniforms.projectionMatrixInverse.value
        .copy(camera.projectionMatrix)
        .invert();
      mesh.material.uniforms.projectionMatrixInverse.needsUpdate = true;
  
      // const renderer = getRenderer();
      mesh.material.uniforms.viewport.value.set(0, 0, renderer.domElement.width, renderer.domElement.height);
      mesh.material.uniforms.viewport.needsUpdate = true;
    };
    return mesh;
  };

  const heartMesh = _makeHeartMesh();
  app.add(heartMesh);
  heartMesh.frustumCulled = false;

  useFrame(() => {
    heartMesh.update();
  });
  
  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
  });

  return app;
};