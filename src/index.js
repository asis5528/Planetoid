


import * as THREE from "three";
import PLANET from './planet2.gltf'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import OrbitControls from "three-orbitcontrols";


import { Shaders } from "./Shader.js";
import { RenderPipeline } from "./renderPipeline.js";
import { MaterialLoader, MeshStandardMaterial } from "three";



let shaders = new Shaders();
let container;
let camera;
let renderer;
let scene;
let mesh;
let controls;
let renderPipeline;
function init() {
  container = document.querySelector("#scene-container");

  // Creating the scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color("skyblue");
  
  createCamera();
  createLights();
  createMeshes();
  createControls();
  createRenderer();
  renderPipeline = new RenderPipeline(scene, camera, renderer);
  renderer.setAnimationLoop(() => {
    update();
    render();
  });
}

function createCamera() {
  const fov = 100;
  const aspect = container.clientWidth / container.clientHeight;
  const near = 0.1;
  const far = 100;
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(-2, 2, 5);
}

function createLights() {
  
}

function createMeshes() {
  //const textureLoader = new TextureLoader();
 // const texture = textureLoader.load("./src/uv_test_bw_1024.png");
  //texture.encoding = sRGBEncoding;
    //texture.anisotropy = 16;
    let un = {};
    const material = new THREE.ShaderMaterial({
        uniforms: un,
        fragmentShader: shaders.fragmentShader(),
        vertexShader: shaders.vertexShader()

    }); 
  
    let cub = new THREE.BoxBufferGeometry(0.2,0.2,0.2);
    let cubMat = new THREE.MeshStandardMaterial();
    let cube = new THREE.Mesh(cub,cubMat);
    cube.position.set(2,0,0);
    scene.add(cube);

    const loader = new GLTFLoader();
    loader.load(
      // resource URL
      PLANET,
      // called when the resource is loaded
      function ( gltf ) {
        console.log(gltf.scene);
        gltf.scene.traverse(function(child) {

          if(child.isMesh){
            child.scale.set(2,2,2);
            
            child.material = new MeshStandardMaterial({color: new THREE.Color(0.66,0.55,0.3)});
            console.log(child.material)
          }

        });
        scene.add( gltf.scene );
    
        
    
      },
      // called while loading is progressing
      function ( xhr ) {
    
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
    
      },
      // called when loading has errors
      function ( error ) {
      console.log(error)
        console.log( 'An error happened' );
    
      }
    );


    const geometry = new THREE.SphereBufferGeometry(2, 140, 140);
  //const material = new MeshStandardMaterial({ });
    mesh = new THREE.Mesh(geometry, material);
    
  //scene.add(mesh);
}

function createRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.gammaFactor = 2.2;
  renderer.gammaOutput = true;
  renderer.physicallyCorrectLights = true;

  container.appendChild(renderer.domElement);
}

function createControls() {
  controls = new OrbitControls(camera, container);
}

function update() {
  // mesh.rotation.x += 0.01;
  // mesh.rotation.y += 0.01;
  // mesh.rotation.z += 0.01;
}

function render() {
    // renderer.render(scene, camera);

    renderPipeline.update(1.);
}

init();

function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;

  // Update camera frustum
  camera.updateProjectionMatrix();

  renderer.setSize(container.clientWidth, container.clientHeight);
}
window.addEventListener("resize", onWindowResize, false);
