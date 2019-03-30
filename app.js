// MIT License

// Copyright (c) 2019 Blake McDonald, Panteli Marinis, Trevor Barnwell

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

var main = function(){
  var maxBacteria = 10;
  var canvas = document.getElementById("game-surface");
  document.body.style.margin = 0;
  canvas.width = document.body.clientWidth;
  canvas.height = document.body.clientHeight;

  // Lighting location and colour
  let lightPoint = vec3.fromValues(2.0, 2.0, 2.0);
  let lightColour = vec3.fromValues(1.0, 1.0, 1.0);

  let sphereRes = 5;

  let arcBall = {
    centre: vec2.fromValues(canvas.width / 2, canvas.height / 2),
    radius: (Math.min(canvas.width, canvas.height) - 10) / 2.0
  };

  // WebGL Initialization
  let gl = canvas.getContext("webgl");

  let clearColor = [0.2, 0.2, 0.2, 1.0];

  gl.clearColor(clearColor[0],
                clearColor[1],
                clearColor[2],
                clearColor[3]);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  var uniforms = [
    "modelMatrix",
    "viewMatrix",
    "projectionMatrix",

    "one_colour",
    "single_colour",

    "light_point",
    "light_colour",

    "light_ambient",
    "light_diffuse",
    "light_specular",
  ];

  var attributes = [
    "point",
    "colour",

    "normal"
  ];

  let glEnv = new GLEnvironment(gl,
      vertexShaderCode, fragmentShaderCode,
      uniforms, attributes);

  gl.useProgram(glEnv.shader);
  gl.uniform1f(glEnv.uniforms.one_colour, 0.0);

  let ball = new Sphere(glEnv, sphereRes);
  let bacterium = [];

  // View Matrix Initialization
  let lookFrom = [0.0, 0.0, 3.0];
  let lookAt = [0.0, 0.0, 0.0];
  let up = [0.0, 1.0, 0.0];

  let viewMatrix = mat4.create();
  mat4.lookAt(viewMatrix, lookFrom, lookAt, up);

  // Projection Matrix Initialization
  var fov = glMatrix.toRadian(60);
  var width = canvas.width;
  var height = canvas.height;
  var aspect = width/height;
  var near = 0.1;
  var far = 100.0;

  let projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, fov, aspect, near, far);

  let bacteriumIds = new Set();
  for (var i = 0; i < maxBacteria; i++) {
    bacteriumIds.add(i + 2);
  }

  maxBacteria = bacteriumIds.size;

  // Map for bacteria colours
  var bacColMap = new Map();

  var idIterate = bacteriumIds.entries();

  for (let i = 0; i < bacteriumIds.size; i++) {
    let hue =  i * 360.0 / bacteriumIds.size;

    let stop = hsl2rgb([hue, 1.0, 0.8 - 0.2 * (i % 2)]);
    let start = hsl2rgb([hue, 1.0, 0.4 - 0.2 * (i % 2)]);

    bacColMap.set(idIterate.next().value[0], [
      vec4.fromValues(start[0], start[1], start[2], 1.0),
      vec4.fromValues(stop[0], stop[1], stop[2], 1.0)
    ]);
  }

  // Add mouse handlers to Canvas
  canvas.addEventListener('click', click());
  canvas.addEventListener('mousemove', mouseMove());
  canvas.addEventListener('mousedown', mouseDown());
  canvas.addEventListener('mouseup', mouseUp());
  // Disable context menu
  document.oncontextmenu = function() {
    return false;
  }

  draw();

  function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(glEnv.uniforms.viewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(glEnv.uniforms.projectionMatrix, false,
                        projectionMatrix);

    gl.uniform3fv(glEnv.uniforms.light_point, lightPoint);
    gl.uniform3fv(glEnv.uniforms.light_colour, lightColour);

    ball.draw();

    bacterium.forEach(function(bacteria){bacteria.draw();});
  }

  function falseDraw() {
    gl.uniform1f(glEnv.uniforms.one_colour, 1.0);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    draw();
    gl.clearColor(clearColor[0],
                  clearColor[1],
                  clearColor[2],
                  clearColor[3]);
    gl.uniform1f(glEnv.uniforms.one_colour, 0.0);
}
    function nextId() {
      var bucket = Array.from(bacteriumIds);
      var id = bucket[Math.floor(Math.random() * bucket.length)];

      bacteriumIds.delete(id);
      return id;
    }

  function spawnBacteria() {
    var frequency = 64;
    var radius = 0.05;

    if (Math.random() < 1.0 / frequency && bacterium.length < maxBacteria) {
      var r = vec3.fromValues(Math.random() - 0.5,
                              Math.random() - 0.5,
                              Math.random() - 0.5);
      vec3.normalize(r, r);

      var id = nextId();
      var colours = bacColMap.get(id);

      var bacteria = new Sphere(glEnv,
                                sphereRes,
                                r,
                                radius,
                                colours[0],
                                colours[1],
                                undefined,
                                undefined,
                                0.02);
      bacteria.id = id;

      var pole = vec3.fromValues(0.0, 0.0, 1.0);

      if (!vec3.equals(r, pole)) {
        var axis = vec3.cross(vec3.create(), pole, r);
        vec3.normalize(axis, axis);

        var angle = Math.acos(vec3.dot(pole, r));
        bacteria.rotation = mat4.rotate(mat4.create(), mat4.create(),
                                        angle, axis);
        bacteria.buildModel();
      }

      bacterium.push(bacteria);
    }
  }

  function growBacteria() {
    var incScalar = 0.0005;
    var inc = vec3.fromValues(incScalar, incScalar, incScalar);
    var max = incScalar *  5000;

    bacterium.forEach(function(bacteria){
      if (bacteria.scale[0] < max) {
        bacteria.radius += incScalar;
        vec3.add(bacteria.scale, bacteria.scale, inc);
        //vec3.add(bacteria.translation, bacteria.translation, plus);
        bacteria.buildModel();
      }
    });
  }

  function gameLoop() {
    spawnBacteria();
    growBacteria();
    collisionCheck();
    consumeBacteria();
    draw();

    requestAnimationFrame(gameLoop);
  }

  function click() {
    return function(event) {
      var offset = elementOffset(event.target);
      var x = event.clientX - offset.x;
      var y = event.target.height - (event.clientY - offset.y);

      var colour = new Uint8Array(4);
      falseDraw();
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, colour);

      var id = colour2id(colour);

      var hit = false;

      for (var i = 0; i < bacterium.length; i++){
        if (bacterium[i].id == id){
          hit = true;
          bacterium.splice(i, 1);
          bacteriumIds.add(id);
          break;
        }
      }
      draw();
    };
  }

  function mouseDown() {
    return function(event) {
      if (event.button == 2){

        var offset = elementOffset(event.target);

        var height = event.target.height;

        var point = {
          x: (event.clientX - offset.x) - arcBall.centre[0],
          y: (height - (event.clientY - offset.y)) - arcBall.centre[1],
          z: 0
        };

        arcBall.matrix_stash = mat4.copy(mat4.create(), viewMatrix);

        var d2 = point.x * point.x + point.y * point.y;
        var r2 = arcBall.radius * arcBall.radius;
        if (d2 < r2){
          point.z = Math.sqrt(r2 - d2);
        }

        arcBall.start = vec3.fromValues(point.x, point.y, point.z);
        vec3.normalize(arcBall.start, arcBall.start);
      }
    }
  }

  function mouseMove() {
    return function(event) {
      if ((event.buttons & 2) == 2 && arcBall.start != null) {
        var offset = elementOffset(event.target);

        var height = event.target.height;

        var point = {
          x: (event.clientX - offset.x) - arcBall.centre[0],
          y: (height - (event.clientY - offset.y)) - arcBall.centre[1],
          z: 0
        };

        var d2 = point.x * point.x + point.y * point.y;
        var r2 = arcBall.radius * arcBall.radius;
        if (d2 < r2){
          point.z = Math.sqrt(r2 - d2);
        }

        arcBall.end = vec3.fromValues(point.x, point.y, point.z);
        vec3.normalize(arcBall.end, arcBall.end);

        var axis = vec3.cross(vec3.create(), arcBall.start, arcBall.end);
        var angle = Math.acos(vec3.dot(arcBall.start, arcBall.end));

        if (vec3.equals(arcBall.start, arcBall.end)) {
          mat4.copy(viewMatrix, arcBall.matrix_stash);
        } else {
          var transform = mat4.create();

          // Translate into ball.
          var transIn = mat4.translate(mat4.create(), mat4.create(),
                                            vec3.fromValues(0.0, 0.0, 3.0));

          var rot = mat4.rotate(mat4.create(), mat4.create(), angle, axis);

          // Translate out of ball.
          var transOut = mat4.translate(mat4.create(), mat4.create(),
                                             vec3.fromValues(0.0, 0.0, -3.0));


          mat4.mul(transform, transIn, transform);
          mat4.mul(transform, rot, transform);
          mat4.mul(transform, transOut, transform);
          mat4.mul(viewMatrix, transform, arcBall.matrix_stash);
        }
      }
    }
  }

  function mouseUp() {
    return function(event) {
      console.log(bacterium);
      if ((event.button & 2) == 2){
        arcBall.start = undefined;
      }
    }
  }

  function collisionCheck() {
    if(bacterium.length > 1) {
      for(let i = 0; i < bacterium.length - 2; i++) {
          for(let j = i+1; j < bacterium.length; j++) {
            if(!bacterium[i].consuming.includes(bacterium[j]) && !bacterium[j].consuming.includes(bacterium[i])) {
              if(distance3D(bacterium[i].centre, bacterium[j].centre) <= bacterium[i].radius + bacterium[j].radius) {
                if(bacterium[i].radius > bacterium[j].radius){
                  bacterium[i].consuming.push(bacterium[j]);
                } else {
                  bacterium[j].consuming.push(bacterium[i]);
                }
              }
            }
          }
        }
      }
    }

  function consumeBacteria() {

  }

  gameLoop();
}

// Converts an id to a colour
function id2colour(id) {
  if (id > 2<< (8 * 3)) return vec4.fromValues(0.0, 0.0, 0.0, 1.0);
  var a = (id >> (8 * 0)) & (255);
  var b = (id >> (8 * 1)) & (255);
  var c = (id >> (8 * 2)) & (255);
  return vec4.fromValues(a / 255.0, b / 255.0, c / 255.0, 1.0);
}

// Converts a colour to an id.
function colour2id(colour) {
  return (colour[0] << (8 * 0)) |
         (colour[1] << (8 * 1)) |
         (colour[2] << (8 * 2));
}

// Converts a colour in hsl to rgb.
function hsl2rgb(hsl) {
  var h = hsl[0];
  var s = hsl[1];
  var l = hsl[2];

  var hp = h / 60;
  var f = Math.floor(hp);
  var c = (1 - Math.abs(2 * l - 1)) * s;
  var x = c * (1 - Math.abs(hp % 2 - 1));
  var m = l - 0.5 * c;

  var r = m;
  var g = m;
  var b = m;

  switch(f) {
    case 0:
      r += c;
      g += x;
      break;
    case 1:
      r += x;
      g += c;
      break;
    case 2:
      g += c;
      b += x;
      break;
    case 3:
      g += x;
      b += c;
      break;
    case 4:
      r += x;
      b += c;
      break;
    case 5:
      r += c;
      b += x;
      break;
  }

  return [r, g , b];
}

// Gets the window offset
function elementOffset(element) {
  var x = 0;
  var y = 0;

  while (element != null){
    x += element.offsetTop;
    y += element.offsetLeft;
    element = element.parentElement;
  }
  return {x:x, y:y};
}

function distance3D(pts1, pts2) {
  return Math.sqrt(Math.pow(pts2[0]-pts1[0], 2) + Math.pow(pts2[1]-pts1[1], 2) + Math.pow(pts2[2]-pts1[2], 2))
}
