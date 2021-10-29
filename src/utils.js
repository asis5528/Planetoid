import { Color, NormalBlending, ShaderMaterial, Vector2, Vector4, Vector3, TextureLoader, RepeatWrapping,Matrix4,MathUtils } from "three";


/**
 *
 * @returns {Matrix4}
 */

/*
 private Matrix4x4 GetFrustumCorners(Camera cam)
 {
     float camFov = cam.fieldOfView;
     float camAspect = cam.aspect;
 
     Matrix4x4 frustumCorners = Matrix4x4.identity;
 
     float fovWHalf = camFov * 0.5f;
 
     float tan_fov = Mathf.Tan(fovWHalf * Mathf.Deg2Rad);
 
     Vector3 toRight = Vector3.right * tan_fov * camAspect;
     Vector3 toTop = Vector3.up * tan_fov;
 
     Vector3 topLeft = (-Vector3.forward - toRight + toTop);
     Vector3 topRight = (-Vector3.forward + toRight + toTop);
     Vector3 bottomRight = (-Vector3.forward + toRight - toTop);
     Vector3 bottomLeft = (-Vector3.forward - toRight - toTop);
 
     frustumCorners.SetRow(0, topLeft);
     frustumCorners.SetRow(1, topRight);
     frustumCorners.SetRow(2, bottomRight);
     frustumCorners.SetRow(3, bottomLeft);
 
     return frustumCorners;
 }
*/
export function GetFrustumCorners(cam) {


    const near = cam.near;
		let top =  Math.tan( MathUtils.DEG2RAD * 0.5 * cam.fov ) ;
		let height = 2 * top;
		let width = cam.aspect * height;
		let left = - 0.5 * width;


    let frustumCorners = new Matrix4();
    let fovHalf = cam.fov*0.5;
    let tan_fov = 0.1*Math.tan(MathUtils.DEG2RAD*fovHalf)/cam.zoom;
    let toRight =  new Vector3(1* top * cam.aspect,0,0);
    let toTop = new Vector3(0,1* top ,0) ;
    
    let topLeft =  new Vector3(0- toRight.x + toTop.x,0- toRight.y + toTop.y,-1- toRight.z + toTop.z);
     let topRight = new Vector3(0+ toRight.x + toTop.x,0+ toRight.y + toTop.y,-1+ toRight.z + toTop.z);
     let bottomRight = new Vector3(0+ toRight.x - toTop.x,0+ toRight.y - toTop.y,-1+ toRight.z - toTop.z);
     let bottomLeft = new Vector3(0- toRight.x - toTop.x,0- toRight.y - toTop.y,-1- toRight.z - toTop.z);
     frustumCorners.set(topLeft.x,topLeft.y,topLeft.z,0,
                        topRight.x,topRight.y,topRight.z,0,
                        bottomLeft.x,bottomLeft.y,bottomLeft.z,0,
                        bottomRight.x,bottomRight.y,bottomRight.z,0,)

                        
                        frustumCorners.transpose()
    

    return frustumCorners;
}
