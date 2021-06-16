import * as THREE from "three";
import { Shaders } from "./Shader.js";

let shaders = new Shaders();
export class RenderPipeline {
    constructor(scene,camera,renderer) {
        this.scene = scene;
       this.renderer = renderer;
        this.camera = camera;
        this.RT1 = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        this.RT1.depthBuffer = true;
        this.RT1.depthTexture = new THREE.DepthTexture();
        this.RT2 = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        
        this.waterUniforms = {
            waterDepth: {
                value: this.RT1.depthTexture
            },
            refractionTexture: {
                value: this.RT1.texture
            }, time: {value:0.0},camPos:{value:THREE.Vector3(0,0,0)}
        }
        const waterMaterial = new THREE.ShaderMaterial({
            uniforms: this.waterUniforms,
            fragmentShader: shaders.waterFragmentShader(),
            vertexShader: shaders.waterVertexShader(), transparent: true

        });

        const geometry = new THREE.SphereBufferGeometry(1.99, 140, 140);
        this.water = new THREE.Mesh(geometry, waterMaterial);
        this.scene.add(this.water);
        //const material = new MeshStandardMaterial({ });
      //  mesh = new Mesh(geometry, material);


        this.postScene = new THREE.Scene();
        this.postCamera = new THREE.OrthographicCamera(
            -1, // left
            1, // right
            1, // top
            -1, // bottom
            -1, // near,
            1 // far
        );
        let Postuniforms = {
            sceneTexture: {
                value: this.RT2.texture
            },
            };
       
        this.postMat = new THREE.ShaderMaterial({
            uniforms: Postuniforms,
            fragmentShader: shaders.postFragmentShader(),
            vertexShader: shaders.postVertexShader()
            });

  
 
        const plane = new THREE.PlaneBufferGeometry(2, 2);
        this.quad = new THREE.Mesh(plane, this.postMat);
        this.quad.position.z = -1;
        this.postScene.add(this.quad);

       // console.log(renderer);

    }
    resize() {
        this.RT1.setSize(window.innerWidth, window.innerHeight);
        this.RT2.setSize(window.innerWidth, window.innerHeight);
        //this.RT1.re

    }
    update(delta) {
        this.waterUniforms.time.value += 0.1;
        let cameraPosition= new THREE.Vector3();
         this.camera.getWorldPosition(cameraPosition)
   
         this.waterUniforms.camPos.value = cameraPosition;
        this.renderer.setRenderTarget(this.RT1);
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(null);


        this.renderer.setRenderTarget(this.RT2);
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(null);

       this.renderer.render(this.postScene, this.postCamera);

    }
}