import { Color, NormalBlending, ShaderMaterial, Vector2, Vector4, Vector3, TextureLoader, RepeatWrapping,BackSide, Matrix4 } from "three";
import NORMAL from './waterNormal.jpeg'
import DUDV from './dudv.jpeg'
import { GetFrustumCorners } from "./utils";
const vs = `
varying vec2 vUv;
varying vec3 rayOrigin;
varying vec3 rayDirection;
varying vec3 rayDir;
varying float n;
uniform vec3 camPos;
uniform mat4 frustumCorners;
uniform mat4 viewInverse;
vec3 dir[4] = vec3[4](vec3(-1.,1.,-1.),vec3(1.,1.,-1.),vec3(-1.,-1.,-1.),vec3(1.,-1.,-1.));

void main(){
    vUv = vec2(uv.x,uv.y);
    n = float(gl_VertexID);
     rayDir = (dir[gl_VertexID].xyz);
     rayDir = vec3(rayDir)*mat3(viewInverse);
    rayOrigin = vec3(camPos);
    rayDirection = (position*2.-rayOrigin);
    gl_Position = projectionMatrix *modelViewMatrix * vec4( position, 1.0 );
}`;

const fs = `

varying vec2 vUv;
varying vec3 rayOrigin;
varying vec3 rayDirection;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform vec3 camPos;
uniform sampler2D sceneTexture;
uniform sampler2D depthTexture;
uniform float time;
varying float n;
varying vec3 rayDir;
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

float rand(vec2 co) { return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453); }
float procDepth(vec3 localPos){
    vec4 frag = projectionMatrix*modelViewMatrix*vec4(localPos,1);
    frag/=frag.w;
    return (frag.z+1.)/2.;
}
float smin( float a, float b, float k )
{
    float h = max( k-abs(a-b), 0.0 )/k;
    return min( a, b ) - h*h*k*(1.0/4.0);
}
float sdBox( vec3 p, vec3 b )
{
  vec3 d = abs(p) - b;
  return length(max(d,0.0))
         + min(max(d.x,max(d.y,d.z)),0.0); 
}

float map(vec3 p){
    //p.x-=2.0;
    float d = length(p)-1.4;
 //   d = max(-length(p)-1.5,d);
    vec3 q = p*3.;
 //   q.x-=time*0.2;
    //q.y+=sin(q.x+q.z+time)*0.2;
    float a = time*0.05;
    q.xy*=mat2(cos(a),sin(a),-sin(a),cos(a));
    float n = noise(q);
    n = noise(q*0.3+n*2.+time*0.1);
 //  n = noise(p*2.+n*0.4);
 d+=n*0.4*sin(atan(q.x,q.y)*3.)*0.2;
    p.x-=1.5;
    p.y -=1.0;
    //p.x*=2.;
    float box = sdBox(p,vec3(0.5));
     //d = smin(d,box,0.001);
    
    return d;
}



vec4 volume(vec3 ro,vec3 rd,vec4 col,float z){
    
    float t = 0.;
    t = length(ro)-2.;
    float ran = rand(vUv);
    t+=ran*0.05;
    //t*=
    vec4 sum;
    vec3 rp;
    float tr = 1.;;
    float pap = 0.;
    for(int i= 0;i<32;i++){
        
    
        vec3 p = ro+rd*t;
       // p.z+=2.;
        float a = 0.9;
        p.yz*=mat2(cos(a),sin(a),-sin(a),cos(a));
        float h = 1.-map(p);
        
        vec4 col1 = vec4(h);
        //float k =  map1(p);
       // if(h<-z) col1 =vec4(1.,0.,0.,1.);
        if(h>0.001){
        
        vec4 c = mix(mix(vec4(0.2,0.2,0.2,1.),vec4(1.,1.,1.,1.),p.y),vec4(0.3,0.6,0.7,1.),p.x);
        c.rgb*=0.4;
        sum +=vec4(col1*1.)*vec4(0.2*c)*(1.-sum.a);
        if(t>z){ pap = t-z; break; }
       
        }
        float rnd = rand(p.xz);
        float stp = (0.025+rnd*0.00 ) ;
        tr*=exp(-h*stp*0.1);
        if(tr<0.01) break;
        //stp = pow(stp,2.7);
         //if(z<h) break;
         t+=stp;
       
    
    }
   // gl_FragDepth = procDepth(ro+rd*t);
   col*=1.+sum.a*1.0;
   sum = mix(col,sum,sum.a);
  tr = pow(tr,22.)*0.7;
  //sum = col*clamp(tr,0.,1.)+sum+pap;
    return vec4(sum);
}


float ray(vec3 ro,vec3 rd){
    float t = 0.;
    for(int i = 0;i<64;i++){
        vec3 p = ro+rd*t;
        float h = map(p);
        if(h<0.001) break;
        t+=h;
        if(t>20.) break;
    }
    if(t>20.) t = -1.;
    return t;

}

float depthToLinear( float z, float cameraNear, float cameraFar ) {
    float z_n = 2.0 * z - 1.0;
    
    float z_e = 2.0 * cameraNear * cameraFar / (cameraFar + cameraNear - z_n * (cameraFar - cameraNear));

    return z_e;
}



void main(){

    vec2 uv = vUv;
    vec2 id = floor(uv*6.);
    uv = fract(uv*6.);
    
    uv-=0.5;
    float sk = 0.005/dot(uv,uv)*5.;
    vec3 col = vec3(sk)*mix(mix(vec3(1.,0.5,0.7),vec3(0.3,0.7,0.5),mod(id.x,2.)),vec3(1.),mod(id.y,2.));
    //gl_FragDepth = gl_FragCoord.z-id.x;
   gl_FragColor = vec4(col,0.5);


   vec3 ro = vec3(camPos);
    
   vec3 rd = normalize(vec3(vUv,-1.));
  rd = normalize(rayDir);
   float c = dot(rayDirection,rayDirection); 
   /*
   float t = ray(ro,rd);
   col = vec3(0.);
   vec3 p = ro+rd*t;
   if(t>0.) col = vec3(-dot(rd,normalize(p)));
  // if(t>0.) col = vec3(1.,0.,0.);
  // if(t>0.) col = vec3(p);
   //gl_FragDepth = procDepth(p);
   
  
  
  
/*

   float t = ray(ro,rd);
   col = vec3(0.);
   vec3 p = ro+rd*t;
   if(t>0.) col = vec3(1.,0.,0.);
*/
float z = texture2D(depthTexture,vUv).r;
z = depthToLinear(z,0.1,100.);
vec4 sceneCol = texture2D(sceneTexture,vUv);

vec4 sum = volume(ro,rd,sceneCol,z);
   col = sum.rgb;
  // col = sceneCol.rgb;
   float cc = smoothstep(0.1,0.06,length(rayDir.xy));
  
  //col = texture2D(sceneTexture,vUv).rgb+col*0.0;
//col = vec3(z);
    gl_FragColor = vec4(col,1.);
    //gl_FragColor.rgb = vec3(n-1.7);
}
`;

/**
 *
 * @returns {ShaderMaterial}
 */
export function makeCloudMaterial() {



    
    const uniforms = {
        camPos: { value: new Vector3(0, 0, 0)} ,
        frustumCorners: {value:new Matrix4()},
        viewInverse:{value:new Matrix4()},
        sceneTexture: {value:null},
        depthTexture: {value:null},
        time:{value:0.0}
    };

    const material = new ShaderMaterial({
        vertexShader: vs,
        fragmentShader: fs,
        uniforms,
   //     side: BackSide,
       // transparent: false,
        //vertexColors: false
    });

    return material;
}
