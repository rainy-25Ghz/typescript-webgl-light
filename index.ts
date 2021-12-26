// Import stylesheets
import { m4 } from './m4';
import './style.css';
console.log(m4);
function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
  // Lookup the size the browser is displaying the canvas in CSS pixels.
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;

  // Check if the canvas is not the same size.
  const needResize =
    canvas.width !== displayWidth || canvas.height !== displayHeight;

  if (needResize) {
    // Make the canvas the same size
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
  return needResize;
}
function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
) {
  let shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}
function createProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
) {
  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  let success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

function createProgramFromSources(
  gl: WebGL2RenderingContext,
  srcs: [vertexShaderSource: string, fragmentShaderSource: string]
) {
  let vertexShader = createShader(gl, gl.VERTEX_SHADER, srcs[0]);
  let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, srcs[1]);
  let program = createProgram(gl, vertexShader, fragmentShader);
  return program;
}

const vertexShaderSource = `#version 300 es
 
in vec4 a_position;
in vec3 a_normal;
 
uniform vec3 u_lightWorldPosition;//光源位置
uniform vec3 u_viewWorldPosition;//相机位置
uniform mat4 u_world;
uniform mat4 u_worldViewProjection;
uniform mat4 u_worldInverseTranspose;
 
out vec3 v_normal;
out vec3 v_surfaceToLight;
out vec3 v_surfaceToView;//表面到相机的向量
void main() {
  // 将位置和矩阵相乘
  gl_Position = u_worldViewProjection * a_position;
 
  // 调整法向量并传递给片断着色器
  v_normal = mat3(u_worldInverseTranspose) * a_normal;
 
  // 计算表面的世界坐标
  vec3 surfaceWorldPosition = (u_world * a_position).xyz;
 
  // 计算表面到光源的方向
  // 传递给片断着色器
  v_surfaceToLight = u_lightWorldPosition - surfaceWorldPosition;

  // 计算表面到相机的方向
  // 然后传递到片断着色器
  v_surfaceToView = u_viewWorldPosition - surfaceWorldPosition;
}`;

const fragmentShaderSource = `#version 300 es
precision highp float;
 
// 从顶点着色器中传入的值
in vec3 v_normal;
in vec3 v_surfaceToLight;
in vec3 v_surfaceToView; 

uniform vec4 u_color;//F的颜色
uniform float u_shininess;//反光度,影响镜面高光的半径
uniform vec3 u_lightColor;//点光源颜色
uniform vec3 u_specularColor;//镜面高光颜色
 
// 定义一个传递到片段着色器的颜色变量
out vec4 outColor;
 
void main() {
  // 由于 v_normal 是可变量，所以经过插值后不再是单位向量，
  // 单位化后会成为单位向量
  vec3 normal = normalize(v_normal);
 
  vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
  vec3 surfaceToViewDirection = normalize(v_surfaceToView);
  vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);//如果相机正对反射光线的方向，那么高光最强为1
  //如果我们知道了物体表面到光源的方向（刚刚已经计算过了）， 加上物体表面到视区/眼睛/相机的方向，再除以 2 得到 halfVector 向量， 将这个向量和法向量比较，如果方向一致，那么光线就会被反射到眼前。 那么如何确定方向是否一致呢？用之前的点乘就可以了。1 表示相符， 0 表示垂直，-1 表示相反。

  float light = dot(v_normal, surfaceToLightDirection);
  float specular = 0.0;
  if (light > 0.0) {
    specular = pow(dot(normal, halfVector), u_shininess);//如果shininess越大，specular越大
  }
  outColor = u_color;
 
  // 只将颜色部分（不包含 alpha） 和光照相乘
  outColor.rgb *= light * u_lightColor;
 
  // 和高光*高光颜色相加
  outColor.rgb += specular * u_specularColor;
}`;
function main() {
  let lightingColor = [1, 1, 1];
  const lightingColorInput = document.getElementById(
    'color'
  ) as HTMLSelectElement;
  lightingColorInput.addEventListener('change', (e) => {
    switch (lightingColorInput.value) {
      case 'red':
        lightingColor = [1, 0.6, 0.6];
        break;
      case 'green':
        lightingColor = [0.6, 1, 0.6];
        break;
      case 'blue':
        lightingColor = [0.6, 0.6, 1];
        break;
      case 'white':
        lightingColor = [1, 1, 1];
        break;
    }
    drawScene();
  });
  let specularColor = [1, 1, 1];
  const specularColorInput = document.getElementById(
    'specular-color'
  ) as HTMLSelectElement;
  specularColorInput.addEventListener('change', (e) => {
    switch (specularColorInput.value) {
      case 'red':
        specularColor = [1, 0.2, 0.2];
        break;
      case 'green':
        specularColor = [0.2, 1, 0.2];
        break;
      case 'blue':
        specularColor = [0.2, 0.2, 1];
        break;
      case 'white':
        specularColor = [1, 1, 1];
        break;
    }
    drawScene();
  });

  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  let shininessInput = document.getElementById('shininess') as HTMLInputElement;
  let shininessLabel = document.getElementById(
    'shininess-label'
  ) as HTMLDivElement;
  let fRotationInput = document.getElementById('fRotation') as HTMLInputElement;
  let degLabel = document.getElementById('deg') as HTMLDivElement;
  let gl = canvas.getContext('webgl2');
  if (!gl) {
    prompt(
      '您的设备不支持webgl2 😵😵😵, 如果是ios15，请开启safari实验功能中的webgl2'
    );
    return;
  }
  let program = createProgramFromSources(gl, [
    vertexShaderSource,
    fragmentShaderSource,
  ]);

  //获取attribute、uniform的位置
  // look up where the vertex data needs to go.
  let viewWorldPositionLocation = gl.getUniformLocation(
    program,
    'u_viewWorldPosition'
  );
  let positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  let normalAttributeLocation = gl.getAttribLocation(program, 'a_normal');
  // look up uniform locations
  let worldViewProjectionLocation = gl.getUniformLocation(
    program,
    'u_worldViewProjection'
  );
  let worldInverseTransposeLocation = gl.getUniformLocation(
    program,
    'u_worldInverseTranspose'
  );
  let colorLocation = gl.getUniformLocation(program, 'u_color');
  let lightWorldPositionLocation = gl.getUniformLocation(
    program,
    'u_lightWorldPosition'
  );
  let worldLocation = gl.getUniformLocation(program, 'u_world');
  let shininessLocation = gl.getUniformLocation(program, 'u_shininess');
  let lightingColorLocation = gl.getUniformLocation(program, 'u_lightColor');
  let specularColorLocation = gl.getUniformLocation(program, 'u_specularColor');
  //创建一个vao对象,VAO 记录的是vertex attribute 的格式，由 glVertexAttribPointer 设置。vertex attribute 对应的 VBO 的名字, 由一对 glBindBuffer 和  glVertexAttribPointer 设置。

  // A Vertex Array Object (VAO) is an OpenGL Object that stores all of the state needed to supply vertex data (with one minor exception noted below). It stores the format of the vertex data as well as the Buffer Objects (see below) providing the vertex data arrays.
  // Create a vertex array object (attribute state)
  let vao = gl.createVertexArray();

  // and make it the one we're currently working with
  gl.bindVertexArray(vao);

  //创建一个顶点位置buffer
  let positionBuffer = gl.createBuffer();
  // Turn on the attribute
  gl.enableVertexAttribArray(positionAttributeLocation);

  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // Set Geometry. 设置顶点数据
  setGeometry(gl);
  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  let size = 3; // 3 components per iteration
  let type = gl.FLOAT; // the data is 32bit floats
  let normalize = false; // don't normalize the data，这里不用正则化是因为
  let stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
  let offset = 0; // start at the beginning of the buffer
  gl.vertexAttribPointer(
    positionAttributeLocation,
    size,
    type,
    normalize,
    stride,
    offset
  );

  //设置F的法线数据
  // create the normalr buffer, make it the current ARRAY_BUFFER
  // and copy in the normal values
  let normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  setNormals(gl);

  // Turn on the attribute
  gl.enableVertexAttribArray(normalAttributeLocation);

  // Tell the attribute how to get data out of colorBuffer (ARRAY_BUFFER)
  let size_ = 3; // 3 components per iteration
  let type_ = gl.FLOAT; // the data is 32bit floats
  let normalize_ = false; // don't normalize the data
  let stride_ = 0; // 0 = move forward size * sizeof(type) each iteration to get the next color
  let offset_ = 0; // start at the beginning of the buffer
  gl.vertexAttribPointer(
    normalAttributeLocation,
    size_,
    type_,
    normalize_,
    stride_,
    offset_
  );

  function radToDeg(r) {
    return (r * 180) / Math.PI;
  }

  function degToRad(d) {
    return (d * Math.PI) / 180;
  }

  // First let's make some variables
  // to hold the translation,
  let fieldOfViewRadians = degToRad(60);
  let fRotationRadians = 0; //F绕y轴旋转的角度
  let shininess = 150; //shiness，影响镜面高光的散射/半径，值越小半径越大。
  shininessLabel.innerText = `反光度:${shininess}`;
  shininessInput.addEventListener('input', (e) => {
    shininess = parseInt(shininessInput.value);
    shininessLabel.innerText = `反光度:${shininess}`;
    drawScene();
  });
  degLabel.innerText = `绕Y轴角度:${radToDeg(fRotationRadians)}`;
  fRotationInput.addEventListener('input', () => {
    fRotationRadians = degToRad(parseInt(fRotationInput.value));
    degLabel.innerText = `绕Y轴角度:${Math.floor(radToDeg(fRotationRadians))}`;
    drawScene();
  });
  drawScene();
  function drawScene() {
    resizeCanvasToDisplaySize(gl.canvas as HTMLCanvasElement);
    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // turn on depth testing
    gl.enable(gl.DEPTH_TEST);
    // tell webgl to cull faces
    gl.enable(gl.CULL_FACE);
    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);
    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao);

    //matrix计算后传给shader
    let aspect =
      (gl.canvas as HTMLCanvasElement).clientWidth /
      (gl.canvas as HTMLCanvasElement).clientHeight;
    let zNear = 1;
    let zFar = 2000;
    let projectionMatrix = m4.perspective(
      fieldOfViewRadians,
      aspect,
      zNear,
      zFar
    );

    // Compute the camera's matrix
    let camera = [100, 150, 200];
    let target = [0, 35, 0];
    let up = [0, 1, 0];
    let cameraMatrix = m4.lookAt(camera, target, up);

    // Make a view matrix from the camera matrix.
    let viewMatrix = m4.inverse(cameraMatrix);

    // create a viewProjection matrix. This will both apply perspective
    // AND move the world so that the camera is effectively the origin
    let viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

    // Draw a F at the origin with rotation
    let worldMatrix = m4.yRotation(fRotationRadians);
    let worldViewProjectionMatrix = m4.multiply(
      viewProjectionMatrix,
      worldMatrix
    );
    let worldInverseMatrix = m4.inverse(worldMatrix);
    //计算这个矩阵是为了让法线不被变形
    let worldInverseTransposeMatrix = m4.transpose(worldInverseMatrix);
    
    // Set the matrices
    gl.uniformMatrix4fv(worldLocation, false, worldMatrix);
    gl.uniformMatrix4fv(
      worldViewProjectionLocation,
      false,
      worldViewProjectionMatrix
    );
    gl.uniformMatrix4fv(
      worldInverseTransposeLocation,
      false,
      worldInverseTransposeMatrix
    );

    //设置颜色浅绿色
    // Set the color to use
    gl.uniform4fv(colorLocation, [0.2, 1, 0.2, 1]);

    // set the light position
    gl.uniform3fv(lightWorldPositionLocation, [20, 30, 60]);

    gl.uniform3fv(viewWorldPositionLocation, camera);

    gl.uniform1f(shininessLocation, shininess);

    gl.uniform3fv(lightingColorLocation, lightingColor);

    gl.uniform3fv(specularColorLocation, specularColor);

    //绘制三角形
    // Draw the geometry.
    let primitiveType = gl.TRIANGLES;
    let offset = 0;
    let count = 16 * 6;
    gl.drawArrays(primitiveType, offset, count);
  }
}

//设置F的顶点几何数据
// Fill the current ARRAY_BUFFER buffer
// with the values that define a letter 'F'.
function setGeometry(gl) {
  let positions = new Float32Array([
    // left column front
    0, 0, 0, 0, 150, 0, 30, 0, 0, 0, 150, 0, 30, 150, 0, 30, 0, 0,

    // top rung front
    30, 0, 0, 30, 30, 0, 100, 0, 0, 30, 30, 0, 100, 30, 0, 100, 0, 0,

    // middle rung front
    30, 60, 0, 30, 90, 0, 67, 60, 0, 30, 90, 0, 67, 90, 0, 67, 60, 0,

    // left column back
    0, 0, 30, 30, 0, 30, 0, 150, 30, 0, 150, 30, 30, 0, 30, 30, 150, 30,

    // top rung back
    30, 0, 30, 100, 0, 30, 30, 30, 30, 30, 30, 30, 100, 0, 30, 100, 30, 30,

    // middle rung back
    30, 60, 30, 67, 60, 30, 30, 90, 30, 30, 90, 30, 67, 60, 30, 67, 90, 30,

    // top
    0, 0, 0, 100, 0, 0, 100, 0, 30, 0, 0, 0, 100, 0, 30, 0, 0, 30,

    // top rung right
    100, 0, 0, 100, 30, 0, 100, 30, 30, 100, 0, 0, 100, 30, 30, 100, 0, 30,

    // under top rung
    30, 30, 0, 30, 30, 30, 100, 30, 30, 30, 30, 0, 100, 30, 30, 100, 30, 0,

    // between top rung and middle
    30, 30, 0, 30, 60, 30, 30, 30, 30, 30, 30, 0, 30, 60, 0, 30, 60, 30,

    // top of middle rung
    30, 60, 0, 67, 60, 30, 30, 60, 30, 30, 60, 0, 67, 60, 0, 67, 60, 30,

    // right of middle rung
    67, 60, 0, 67, 90, 30, 67, 60, 30, 67, 60, 0, 67, 90, 0, 67, 90, 30,

    // bottom of middle rung.
    30, 90, 0, 30, 90, 30, 67, 90, 30, 30, 90, 0, 67, 90, 30, 67, 90, 0,

    // right of bottom
    30, 90, 0, 30, 150, 30, 30, 90, 30, 30, 90, 0, 30, 150, 0, 30, 150, 30,

    // bottom
    0, 150, 0, 0, 150, 30, 30, 150, 30, 0, 150, 0, 30, 150, 30, 30, 150, 0,

    // left side
    0, 0, 0, 0, 0, 30, 0, 150, 30, 0, 0, 0, 0, 150, 30, 0, 150, 0,
  ]);
  //这一步是为了让F在视野居中
  let matrix = m4.xRotation(Math.PI);
  matrix = m4.translate(matrix, -50, -75, -15);

  for (let ii = 0; ii < positions.length; ii += 3) {
    let vector = m4.transformVector(matrix, [
      positions[ii + 0],
      positions[ii + 1],
      positions[ii + 2],
      1,
    ]);
    positions[ii + 0] = vector[0];
    positions[ii + 1] = vector[1];
    positions[ii + 2] = vector[2];
  }
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
}

//设置F的法线数据
function setNormals(gl: WebGL2RenderingContext) {
  var normals = new Float32Array([
    // left column front
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,

    // top rung front
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,

    // middle rung front
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,

    // left column back
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,

    // top rung back
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,

    // middle rung back
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,

    // top
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,

    // top rung right
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,

    // under top rung
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,

    // between top rung and middle
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,

    // top of middle rung
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,

    // right of middle rung
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,

    // bottom of middle rung.
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,

    // right of bottom
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,

    // bottom
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,

    // left side
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
}

main();
