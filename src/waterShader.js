import { Color, NormalBlending, ShaderMaterial, Vector2, Vector4, Vector3, TextureLoader, RepeatWrapping } from "three";
import NORMAL from './waterNormal.jpeg'
import DUDV from './dudv.jpeg'
const vs = `
uniform float time;

uniform vec3 lightPos;
uniform vec3 vCameraPosition;
varying vec2 vUv; 
varying float level;
varying vec4 clipSpace;
varying vec3 vWorldPosition;
varying vec4 viewPosition;
varying vec3 vNormal;
varying vec3 TangentLightPos;
varying vec3 TangentViewPos;
varying vec3 TangentFragPos;
attribute vec3 tangent;
void main(){

    vUv = uv;
   


   vec3 v = position;
    vec3 wave = sin(vNormal+v*42.+time*0.5)*0.005;
    v+=wave;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  
    level = vWorldPosition.y;
    viewPosition =  modelViewMatrix * vec4( v, 1.0 );
    clipSpace = projectionMatrix *viewPosition;


    mat3 Nmatrix = transpose(inverse(mat3(modelMatrix)));
    vNormal = normalize(Nmatrix*normal);

    vec3 T = normalize(Nmatrix * tangent.xyz);
    vec3 N = normalize(Nmatrix * normal);
    T = normalize(T - dot(T, N) * N);
    vec3 B = cross(N, T);
    
    mat3 TBN = transpose(mat3(T, B, N));
        
    TangentLightPos = TBN * lightPos;
    TangentViewPos  = TBN * vCameraPosition;
    TangentFragPos  = TBN * vWorldPosition;


    gl_Position = projectionMatrix *viewPosition;
}`;

const fs = `
uniform vec3 waterColor;
uniform vec3 shoreColor;

uniform float fScattering;


uniform sampler2D tDepthTexture;
uniform sampler2D tNormalMap;
uniform sampler2D tNormalMap2;
uniform sampler2D tDudvMap;
uniform sampler2D tRefraction;



uniform vec2 vScreenResolution;

uniform float fCameraNear;
uniform float fCameraFar;
uniform vec3 vCameraPosition;


uniform float time;

uniform float fWaveAmplitude;
uniform float fWaveSpeed;
uniform float fWaveFrequency;

uniform vec2 vShoreDepthTransition;

uniform vec3 lightPos;
uniform float distortionFrequency;  
uniform float normalMapDistortionIntensity;
uniform float normalMapUvTilling;
uniform float FoamDistortionIntensity;
uniform float shoreLineLength;
uniform vec3 specularColor;

varying vec2 vUv;
varying vec3 vNormal;
varying vec4 clipSpace;
varying float level;
varying vec3 vWorldPosition;
varying vec4 viewPosition;
varying vec3 TangentLightPos;
varying vec3 TangentViewPos;
varying vec3 TangentFragPos;
#define F length(.5-fract(caustic.xyz*=mat3(-2,-1,2, 3,-2,1, 1,2,2)*

float depthToLinear( float z, float cameraNear, float cameraFar ) {
    float z_n = 2.0 * z - 1.0;
    
    float z_e = 2.0 * cameraNear * cameraFar / (cameraFar + cameraNear - z_n * (cameraFar - cameraNear));

    return z_e;
}
	        

float hash(vec3 p3){
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3,p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}


float noise(vec3 x){
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0, 0, 0)), 
                       hash(i+vec3(1, 0, 0)),f.x),
                   mix(hash(i+vec3(0, 1, 0)), 
                       hash(i+vec3(1, 1, 0)),f.x),f.y),
               mix(mix(hash(i+vec3(0, 0, 1)), 
                       hash(i+vec3(1, 0, 1)),f.x),
                   mix(hash(i+vec3(0, 1, 1)), 
                       hash(i+vec3(1, 1, 1)),f.x),f.y),f.z);
}
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

void main(){

    //compute view depth
    vec2 uv = clipSpace.xy/clipSpace.w;
    uv*=0.5;
    uv+=0.5;
    float Vnoise = noise(vWorldPosition.xyz*51.+time*0.1);
    Vnoise = noise(vWorldPosition.xyz*55.+time*0.1+vec3(Vnoise*2.,Vnoise*1.,0.));
    uv+=sin(vWorldPosition.xy*152.+time*0.5)*(0.002/length(vCameraPosition));
    uv+=(Vnoise*0.01)/length(vCameraPosition);
    vec2 longitudeLatitude = vec2(
        (atan(vWorldPosition.y, vWorldPosition.x) / 3.1415926 + 1.0) * 0.5, 
         1.0 - acos(vWorldPosition.z) / 3.1415926);

    //getting distortion data from dudvmap
    vec2 distortion = texture2D(tDudvMap,vec2(vUv.x*distortionFrequency+time*0.01,vUv.y*distortionFrequency)).rg*0.1;
    distortion = vUv+vec2(distortion.x,distortion.y+time*0.01);

    //double distortion(sampling dudv map from previous distorted value)
    vec2 totaldistortion = (texture2D(tDudvMap,distortion).rg*2.0-1.0)*0.1;
    //uv+=totaldistortion*12.1;

    float screenEnvDepth = texture2D(tDepthTexture, uv ).x;
    
    float screenEnvDepthLinear = depthToLinear(screenEnvDepth, fCameraNear, fCameraFar);
    
    float objectDepth = gl_FragCoord.z;
    
    float objectDepthLinear = depthToLinear(objectDepth, fCameraNear, fCameraFar);

    float viewDepth = screenEnvDepthLinear - objectDepthLinear;
    
    if(viewDepth < 0.0){
        discard;
    }
   
   
  

    //sample water depth relative to the sky
    vec2 depthUV = longitudeLatitude;

   

    

    //sampling normal map using distorted uv map
    vec2 normalUV = vUv;
    normalUV+=time*0.0009;
    vec3 normal = texture2D(tNormalMap,normalUV*0.2*normalMapUvTilling+Vnoise*normalMapDistortionIntensity*0.00).rgb;
    normal = normalize(normal * 2.0 - 1.0);  // this normal is in tangent space
   // normal =vec3(normal.r*2.0-1.0,normal.b,normal.g*2.0-1.0);
   // normal =  normalize(normal+normalize(vNormal));

    vec3 normal2 = texture2D(tNormalMap2,normalUV*0.2*normalMapUvTilling+Vnoise*normalMapDistortionIntensity*0.003).rgb;
    normal2 = normalize(normal2 * 2.0 - 1.0);
   // normal2 =vec3(normal2.r*2.0-1.0,normal2.b,normal2.g*2.0-1.0);
    //normal2 =  normalize(normal2+normalize(vNormal));

   // normal = normalize(vNormal+pow(Vnoise,0.2));

    

    //applying distortion to textureCoordinate for sampling height map
    depthUV+=Vnoise*FoamDistortionIntensity;
    depthUV = clamp(depthUV,0.001,0.99);

    
    
    //getting distance from water plane to terrain
    float depth = viewDepth;
    //if distance is less than something from water to terrain,make them 1 if not 0(so that foam is formed in shoreline)
    //depth = smoothstep(0.2,0.1,depth);
    
    float shoreLine = smoothstep(Vnoise*0.1+0.15,Vnoise*0.1+0.1,depth/0.1)*smoothstep(0.2+0.5,0.2-0.3,depth/0.1);
    shoreLine = clamp(shoreLine,0.,1.);
    //View Direction vector
    vec3 camDir = normalize(TangentViewPos-TangentFragPos);
    vec3 camDir2 = normalize(vCameraPosition-vWorldPosition);

    //Light to object direction vector
    vec3 lightDir = normalize(TangentLightPos-TangentFragPos);


    float diff = max(dot(lightDir,normal2),0.)*0.8+0.2;
    //angle between camera direction and water(plane) normal
    float viewAngle = dot((camDir2),normalize(vNormal));
   // normal = mix(normal,normalize(vNormal),clamp(viewAngle*depth*12.,0.,1.));
   // normal2 = mix(normal2,normalize(vNormal),clamp(viewAngle*depth*12.,0.,1.));


    //ScreenSpace circular gradient distance
    float ScreenSpaceCircularDistance = pow(smoothstep(1.2,0.1,length(viewPosition.xy)),1./2.2);

    //according to depth of water in view space,mixing water color and water color with slightly blue component increased
    vec3 finalwaterColor = mix(vec3(waterColor.x,waterColor.y,waterColor.z*1.5),waterColor,clamp(viewDepth,0.,1.));

    //according to angle between camera and plane normal of water mix two colors
    finalwaterColor = mix(vec3(finalwaterColor.x,finalwaterColor.y,finalwaterColor.z/1.3),finalwaterColor,1.-viewAngle);

    //according to screenspace circular distance mix two colors
    finalwaterColor = mix(vec3(finalwaterColor.x,finalwaterColor.y*1.6,finalwaterColor.z*1.2),finalwaterColor,viewAngle)*diff;

    //vec2 iUv = vec2()
    //calculating caustic effect
    vec4 caustic = vec4(time*22.);
    caustic.xyz = (vec3(vWorldPosition.xy,depth*4.)+time*0.005)*200.*(sin(1.*.5)+2.)/50.;
    caustic = pow(min(min(F.5)),F.4))),F.3))), 7.)*25.+vec4(0.);

    //adding caustic to water
    finalwaterColor+=caustic.x*0.7*(viewAngle*viewAngle)*vec3(0.4,0.6,0.5)*1.5;

    //calculating specular from light
    vec3 reflectDir = reflect(-camDir, normal);
    vec3 halfwayDir = normalize(camDir + camDir);  
    vec3 reflectedLight = reflect(-camDir,camDir);
    float specular = max(dot(normal2,halfwayDir),0.0);
    
    //adding specular intensity to water
    
    
    //Add final water color with foam
    gl_FragColor = mix(vec4(finalwaterColor,1.),vec4(vec3(0.9),1.),0.);

    //making water sliglty transparent,Also when angle between camera vector and normal of water is zero make it not transparent(same like fresnel effect)
    gl_FragColor.a  = 1.0*((1.-viewAngle*0.2)+0.1)+depth-ScreenSpaceCircularDistance*0.05;

    //making very small portion of intersection of water to terrain transparent,so that it will look smooth intersection between terrain and water
    gl_FragColor.a *= 1.-smoothstep(0.05,0.000,viewDepth);
    vec3 waterColor2 = mix(gl_FragColor.rgb,vec3(0.0,0.5,0.7)*1.2,max(viewAngle-0.2,0.));
    vec3 refraction = texture2D(tRefraction,uv).rgb*0.8;
    waterColor2 = mix(refraction,waterColor2,clamp(length(vCameraPosition)*0.25+(1.-max(viewAngle+0.5,0.)),0.,1.));
    gl_FragColor.rgb = vec3(mix(gl_FragColor.rgb,waterColor2,clamp(depth*15.,0.,1.)))*1.5;
    gl_FragColor.rgb += vec3(pow(specular,324.))*specularColor*0.9;
    gl_FragColor.rgb = pow(gl_FragColor.rgb,vec3(1./1.2))*1.0;
   // gl_FragColor.rgb = vec3(1.-max(viewAngle,0.));
   //gl_FragColor.rgb = vec3(viewAngle*depth*12.);
   // gl_FragColor.a = 1.;

}
`;

/**
 *
 * @returns {ShaderMaterial}
 */
export function makeWaterMaterial() {



    const normalMap = new TextureLoader().load(NORMAL);
    //console.log(normalMap);
    const dudv = new TextureLoader().load(DUDV);
    normalMap.wrapS = RepeatWrapping;
    normalMap.wrapT = RepeatWrapping;
    dudv.wrapS = RepeatWrapping;
    dudv.wrapT = RepeatWrapping;
    const uniforms = {
        lightPos: {
            type: 'v3',
            value: new Vector3(10., 10.,0.)
        },
        distortionFrequency: {
            type: 'f',
            value: 17.
        },
        normalMapDistortionIntensity: {
            type: 'f',
            value: 5.
        },
        normalMapUvTilling: {
            type: 'f',
            value: 23.
        },
        FoamDistortionIntensity: {
            type: 'f',
            value: 1.0
        },
        shoreLineLength: {
            type: 'f',
            value: 0.0
        },
        specularColor: {
            type: 'v3',
            value: new Vector3(1., 1.0, 1.0)
        },
        time: {
            type: 'f',
            value: 0
        },
        fCameraNear: {
            type: 'f',
            value: 0.1
        },
        fCameraFar: {
            type: 'f',
            value: 100
        },
        vCameraPosition: {
            type: 'v3',
            value: new Vector3()
        },
        tDepthTexture: {
            type: 't',
            value: null
        },
        tRefraction: {
            type: 't',
            value: null
        },
        tNormalMap: {
            type: 't',
            value: normalMap
        },
        tNormalMap2: {
            type: 't',
            value: normalMap
        },
        tDudvMap: {
            type: 't',
            value: dudv
        },
        vScreenResolution: {
            type: 'v2',
            value: new Vector2()
        },
        waterColor: {
            type: 'c',
            value: new Color(0.5,0.5,0.7)
        },
        shoreColor: {
            type: 'c',
            value: new Color(0x95cad9)
        },
        fWaveSpeed: {
            type: 'f',
            value: 1.8,
        },
        fScattering: {
            type: 'f',
            value: 1.2
        },
        fWaveAmplitude: {
            type: 'f',
            value: 0.3
        },
        fWaveFrequency: {
            type: 'f',
            value: 3
        },
        vShoreDepthTransition: {
            type: 'v2',
            value: new Vector2(0.7, 2)
        }
    };

    const material = new ShaderMaterial({
        vertexShader: vs,
        fragmentShader: fs,
        uniforms,
        blending: NormalBlending,
        lights: false,
        fog: false,
        depthTest: true,
        transparent: true,
        vertexColors: false,
        vertexTangents:true
    });

    return material;
}
