import { Color, NormalBlending, ShaderMaterial, Vector2, Vector4, Vector3, TextureLoader, RepeatWrapping,BackSide } from "three";
import NORMAL from './waterNormal.jpeg'
import DUDV from './dudv.jpeg'
const vs = `
varying vec2 vUv;
varying vec3 rayOrigin;
varying vec3 rayDirection;

uniform vec3 camPos;

void main(){
    vUv = uv;
    
    rayOrigin = vec3(inverse( modelMatrix ) *vec4(camPos,1.));
    rayDirection = (position-rayOrigin);
    gl_Position = projectionMatrix *modelViewMatrix * vec4( position, 1.0 );
}`;

const fs = `

varying vec2 vUv;
varying vec3 rayOrigin;
varying vec3 rayDirection;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform vec3 camPos;

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
    p.x-=0.5;
    float d = length(p)-0.4;
    p.x-=1.5;
    p.y -=1.0;
    //p.x*=2.;
    float box = sdBox(p,vec3(0.5));
     //d = smin(d,box,0.001);
    
    return d;
}



vec4 volume(vec3 ro,vec3 rd){
    
    float t = 0.;
    vec4 sum;
    vec3 rp;
    for(int i= 0;i<123;i++){
        
    
        vec3 p = ro+rd*t;
        
        float a = 0.9;
        p.yz*=mat2(cos(a),sin(a),-sin(a),cos(a));
        float h = 1.-map(p);
        
        vec4 col1 = vec4(h);
        //float k =  map1(p);
       // if(h<-z) col1 =vec4(1.,0.,0.,1.);
        if(h>0.001){
        
        vec4 c = mix(mix(vec4(0.6,0.5,0.5,1.),vec4(1.,1.,1.,1.),p.y),vec4(0.3,0.6,0.7,1.),p.x);
        
        sum +=vec4(col1*1.)*vec4(c)*(1.-sum.a);
      
        //if(h<z*z)  break;
       // if(t>z) break;
        }
        //float rnd = rand(p.xz);
        float stp = (.5 ) ;
       
        t+=0.025;
       
    
    }
    gl_FragDepth = procDepth(ro+rd*t);
   //sum = mix(col,sum,sum.a);
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





void main(){

    vec2 uv = vUv;
    vec2 id = floor(uv*6.);
    uv = fract(uv*6.);
    
    uv-=0.5;
    float sk = 0.005/dot(uv,uv)*5.;
    vec3 col = vec3(sk)*mix(mix(vec3(1.,0.5,0.7),vec3(0.3,0.7,0.5),mod(id.x,2.)),vec3(1.),mod(id.y,2.));
    //gl_FragDepth = gl_FragCoord.z-id.x;
   gl_FragColor = vec4(col,0.5);


   vec3 ro = rayOrigin;
   vec3 rd = normalize(rayDirection);
   float c = dot(rayDirection,rayDirection); 
   /*
   float t = ray(ro,rd);
   col = vec3(0.);
   vec3 p = ro+rd*t;
   if(t>0.) col = vec3(-dot(rd,normalize(p)));
  // if(t>0.) col = vec3(1.,0.,0.);
  // if(t>0.) col = vec3(p);
   gl_FragDepth = procDepth(p);
   */
   col = volume(ro,rd).rgb;
   gl_FragDepth = 0.0;
   gl_FragColor = vec4(vec3(col),1.0);

}
`;

/**
 *
 * @returns {ShaderMaterial}
 */
export function makeCloudMaterial() {



    
    const uniforms = {
        camPos: { value: new Vector3(0, 0, 0)} 
    };

    const material = new ShaderMaterial({
        vertexShader: vs,
        fragmentShader: fs,
        uniforms,
        side: BackSide,
        transparent: true,
        vertexColors: false
    });

    return material;
}
