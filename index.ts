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
 
uniform vec3 u_lightWorldPosition;
 
uniform mat4 u_world;
uniform mat4 u_worldViewProjection;
uniform mat4 u_worldInverseTranspose;
 
out vec3 v_normal;
out vec3 v_surfaceToLight;
 
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
}`;

const fragmentShaderSource = `#version 300 es
precision highp float;
 
// 从顶点着色器中传入的值
in vec3 v_normal;
in vec3 v_surfaceToLight;
 
uniform vec4 u_color;
 
// 定义一个传递到片段着色器的颜色变量
out vec4 outColor;
 
void main() {
  // 由于 v_normal 是可变量，所以经过插值后不再是单位向量，
  // 单位化后会成为单位向量
  vec3 normal = normalize(v_normal);
 
  vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
 

  float light = dot(v_normal, surfaceToLightDirection);
 
  outColor = u_color;
 
  // 只将颜色部分（不包含 alpha） 和光照相乘
  outColor.rgb *= light;
}`;
function main() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  let gl = canvas.getContext('webgl2');
  if (!gl) {
    return;
  }
  let program = createProgramFromSources(gl, [
    vertexShaderSource,
    fragmentShaderSource,
  ]);

  //获取attribute、uniform的位置
  // look up where the vertex data needs to go.
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

  //创建一个vao对象
}

//设置F的顶点几何数据
// Fill the current ARRAY_BUFFER buffer
// with the values that define a letter 'F'.
function setGeometry(gl) {
  var positions = new Float32Array([
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
}

//设置F的法线数据
function setNormals(gl) {
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
