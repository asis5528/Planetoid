import * as THREE from "three";
import { Shaders } from "./Shader.js";
import NORMAL from './oceanNormal.jpeg'
import NORMAL2 from './oceanNormal2.jpeg'
import DUDV from './dudv1.jpeg'
import FOAM from './foam.png'
import {makeWaterMaterial} from "./waterShader.js";
import {makeCloudMaterial} from "./cloudShader.js";
import {GetFrustumCorners} from "./utils.js";

let shaders = new Shaders();


export class RenderPipeline {
    constructor(scene, camera, renderer) {
        let frustumCorners = GetFrustumCorners(camera);
        console.log(frustumCorners)
        //console.log(camera.aspect)
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;

        this.mainLight = new THREE.DirectionalLight(0xffffff, 4);
        this.mainLight.position.set(10, 10, 10);
      
        this.hemisphereLight = new THREE.HemisphereLight(0xddeeff, 0x202020, 0.7);
        this.scene.add(this.mainLight,this.hemisphereLight);



        this.RT1 = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        this.RT1.depthBuffer = true;
        this.RT1.depthTexture = new THREE.DepthTexture();
        this.RT2 = new THREE.WebGLMultisampleRenderTarget(window.innerWidth, window.innerHeight);
        this.RT2.depthBuffer = true;
        this.RT2.depthTexture = new THREE.DepthTexture();
        this.RT2.depthTexture.type = THREE.UnsignedIntType;
        //this.RT2.depthBuffer = true;
        //this.RT2.depthTexture = new THREE.DepthTexture();

        this.normalTexture = new THREE.TextureLoader().load(NORMAL);
        this.normalTexture2 = new THREE.TextureLoader().load(NORMAL2);
        this.foamTexture = new THREE.TextureLoader().load(FOAM);
        this.dudv = new THREE.TextureLoader().load(DUDV);
        this.dudv.wrapS = THREE.RepeatWrapping;
        this.dudv.wrapT = THREE.RepeatWrapping;
        this.normalTexture.wrapS = THREE.RepeatWrapping;
        this.normalTexture.wrapT = THREE.RepeatWrapping;
        this.normalTexture2.wrapS = THREE.RepeatWrapping;
        this.normalTexture2.wrapT = THREE.RepeatWrapping;
        this.foamTexture.wrapS = THREE.RepeatWrapping;
        this.foamTexture.wrapT = THREE.RepeatWrapping;
        this.waterUniforms = {
            waterDepth: {
                value: this.RT1.depthTexture
            },
            refractionTexture: {
                value: this.RT1.texture
            },
            waterNormal :{
                value:this.normalTexture
            },
            foamNoise :{
                value:this.foamTexture
            }
            , time: { value: 0.0 }, 
            camPos: { value: new THREE.Vector3(0, 0, 0)} ,
            sunPos:{ value: this.mainLight.position}
        }
        const waterMaterial = new THREE.ShaderMaterial({
            uniforms: this.waterUniforms,
            fragmentShader: shaders.waterFragmentShader(),
            vertexShader: shaders.waterVertexShader(), transparent: true

        });

        
        const waterMaterial2 = makeWaterMaterial();
        waterMaterial2.uniforms.tDepthTexture.value = this.RT1.depthTexture;
        waterMaterial2.uniforms.tRefraction.value = this.RT1.texture;
        waterMaterial2.uniforms.tNormalMap.value = this.normalTexture;
        waterMaterial2.uniforms.tDudvMap.value = this.dudv;
        waterMaterial2.uniforms.tNormalMap2.value = this.normalTexture2;
        const cloudMaterial = makeCloudMaterial();

        const geometry = new THREE.SphereBufferGeometry(1.99, 140, 140);
        geometry.computeTangents();

        const plane2 = new THREE.PlaneBufferGeometry(5, 5,15.);
        const cube = new THREE.BoxBufferGeometry(10,10,10);
        this.cube = new THREE.Mesh(cube,cloudMaterial)
        this.water = new THREE.Mesh(geometry, waterMaterial2);
        //this.water.rotation.set(-3.1415/2.,0,0.);
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
            },res:{
                value: new THREE.Vector2(0,0)
            }
        };

        this.postMat = new THREE.ShaderMaterial({
            uniforms: Postuniforms,
            fragmentShader: shaders.postFragmentShader(),
            vertexShader: shaders.postVertexShader()
        });



        const plane = new THREE.PlaneBufferGeometry(2, 2);
        this.quad = new THREE.Mesh(plane, cloudMaterial);
        this.quad.material.uniforms.frustumCorners.value  = frustumCorners;
        this.quad.material.uniforms.sceneTexture.value = this.RT2.texture;
        this.quad.material.uniforms.depthTexture.value = this.RT2.depthTexture;
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
        this.postMat.uniforms.res.value.x = window.innerWidth;
        this.postMat.uniforms.res.value.y = window.innerHeight;
        this.waterUniforms.time.value += 0.1;
        let cameraPosition = new THREE.Vector3();
        this.camera.getWorldPosition(cameraPosition)

        this.quad.material.uniforms.viewInverse.value = this.camera.matrixWorldInverse
       this.quad.material.uniforms.camPos.value = cameraPosition;
       this.quad.material.uniforms.time.value = this.waterUniforms.time.value;

        this.waterUniforms.camPos.value = cameraPosition;
        this.water.material.uniforms.vCameraPosition.value = cameraPosition;
        this.water.material.uniforms.time.value += 0.1;
        this.water.visible = false;
        this.renderer.setRenderTarget(this.RT1);
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(null);

        this.water.visible = true;
        this.renderer.setRenderTarget(this.RT2);
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(null);

        this.renderer.render(this.postScene, this.postCamera);

    }
}