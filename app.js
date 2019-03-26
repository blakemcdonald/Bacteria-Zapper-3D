// MIT License

// Copyright (c) 2016 Trevor Barnwell

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


/** The application's entry point.
*/
var main = function(){
  var max_bacteria = 10;
  var canvas = document.getElementById("game-surface");
  document.body.style.margin = 0;
  canvas.width = document.body.clientWidth;
  canvas.height = document.body.clientHeight;

  // Lighting location and colour
  let light_point = vec3.fromValues(2.0, 2.0, 2.0);
  let light_colour = vec3.fromValues(1.0, 1.0, 1.0);

  let sphere_resolution = 5;

  let arc_ball = {
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

  let gle = new GLEnvironment(gl,
      vertexShaderCode, fragmentShaderCode,
      uniforms, attributes);

  gl.useProgram(gle.shader);
  gl.uniform1f(gle.uniforms.one_colour, 0.0);

  let ball = new Sphere(gle, sphere_resolution);
  let bacterium = [];

  // View Matrix Initialization
  let look_from = [0.0, 0.0, 3.0];
  let look_at = [0.0, 0.0, 0.0];
  let up = [0.0, 1.0, 0.0];

  let viewMatrix = mat4.create();
  mat4.lookAt(viewMatrix, look_from, look_at, up);

  // Projection Matrix Initialization
  var fov = glMatrix.toRadian(60);
  var width = canvas.width;
  var height = canvas.height;
  var aspect = width/height;
  var near = 0.1;
  var far = 100.0;

  let projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, fov, aspect, near, far);

  let bacterium_ids = new Set();
  for (var i = 0; i < max_bacteria; i++) {
    bacterium_ids.add(i + 2);
  }

  max_bacteria = bacterium_ids.size;

  var bacteria_colour_map = new Map();
  let id_counter = 2;

  var id_iterate = bacterium_ids.entries();

  for (let i = 0; i < bacterium_ids.size; i++) {
    let hue =  i * 360.0 / bacterium_ids.size;

    let stop = hsl2rgb([hue, 1.0, 0.8 - 0.2 * (i % 2)]);
    let start = hsl2rgb([hue, 1.0, 0.4 - 0.2 * (i % 2)]);

    bacteria_colour_map.set(id_iterate.next().value[0], [
      vec4.fromValues(start[0], start[1], start[2], 1.0),
      vec4.fromValues(stop[0], stop[1], stop[2], 1.0)
    ]);
  }

  // Add mouse handlers to Canvas
  canvas.addEventListener('click', build_click());
  canvas.addEventListener('mousemove', build_mousemove());
  canvas.addEventListener('mousedown', build_mousedown());
  canvas.addEventListener('mouseup', build_mouseup());

  draw();

  function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(gle.uniforms.viewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(gle.uniforms.projectionMatrix, false,
                        projectionMatrix);

    gl.uniform3fv(gle.uniforms.light_point, light_point);
    gl.uniform3fv(gle.uniforms.light_colour, light_colour);

    ball.draw();

    bacterium.forEach(function(bacteria){bacteria.draw();});
  }

  function false_draw() {
    gl.uniform1f(gle.uniforms.one_colour, 1.0);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    draw();
    gl.clearColor(clearColor[0],
                  clearColor[1],
                  clearColor[2],
                  clearColor[3]);
    gl.uniform1f(gle.uniforms.one_colour, 0.0);
}
    function _next_id() {
      var bucket = Array.from(bacterium_ids);
      var id = bucket[Math.floor(Math.random() * bucket.length)];

      bacterium_ids.delete(id);
      return id;
    }

  function _spawn_bacteria() {
    var frequency = 64;
    var radius = 0.05;

    if (Math.random() < 1.0 / frequency && bacterium.length < max_bacteria) {
      var r = vec3.fromValues(Math.random() - 0.5,
                              Math.random() - 0.5,
                              Math.random() - 0.5);
      vec3.normalize(r, r);

      var id = _next_id();
      var colours = bacteria_colour_map.get(id);

      var bacteria = new Sphere(gle,
                                sphere_resolution,
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

  function _grow_bacteria() {
    var plus_scalar = 0.0005;
    var plus = vec3.fromValues(plus_scalar, plus_scalar, plus_scalar);
    var maximum= plus_scalar *  5000;

    bacterium.forEach(function(bacteria){
      if (bacteria.scale[0] < maximum) {
        vec3.add(bacteria.scale, bacteria.scale, plus);
        //vec3.add(bacteria.translation, bacteria.translation, plus);
        bacteria.buildModel();
      }
    });
  }

  function gameLoop() {
    _spawn_bacteria();
    _grow_bacteria();
    draw();

    requestAnimationFrame(gameLoop);
  }

  function build_click() {
    return function(event) {
      var offset = element_offset(event.target);
      var x = event.clientX - offset.x;
      var y = event.target.height - (event.clientY - offset.y);

      var colour = new Uint8Array(4);
      false_draw();
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, colour);

      var id = colour2id(colour);

      var hit = false;

      for (var i = 0; i < bacterium.length; i++){
        if (bacterium[i].id == id){
          hit = true;
          bacterium.splice(i, 1);
          bacterium_ids.add(id);
          break;
        }
      }
      draw();
    };
  }

  function build_mousedown() {
    return function(event) {
      if (event.button == 2){

        var offset = element_offset(event.target);

        var height = event.target.height;

        var point = {
          x: (event.clientX - offset.x) - arc_ball.centre[0],
          y: (height - (event.clientY - offset.y)) - arc_ball.centre[1],
          z: 0
        };

        arc_ball.matrix_stash = mat4.copy(mat4.create(), viewMatrix);

        var d2 = point.x * point.x + point.y * point.y;
        var r2 = arc_ball.radius * arc_ball.radius;
        if (d2 < r2){
          point.z = Math.sqrt(r2 - d2);
        }

        arc_ball.start = vec3.fromValues(point.x, point.y, point.z);
        vec3.normalize(arc_ball.start, arc_ball.start);
      }
    }
  }

  function build_mousemove() {
    return function(event) {
      if ((event.buttons & 2) == 2 && arc_ball.start != null) {
        var offset = element_offset(event.target);

        var height = event.target.height;

        var point = {
          x: (event.clientX - offset.x) - arc_ball.centre[0],
          y: (height - (event.clientY - offset.y)) - arc_ball.centre[1],
          z: 0
        };

        var d2 = point.x * point.x + point.y * point.y;
        var r2 = arc_ball.radius * arc_ball.radius;
        if (d2 < r2){
          point.z = Math.sqrt(r2 - d2);
        }

        arc_ball.end = vec3.fromValues(point.x, point.y, point.z);
        vec3.normalize(arc_ball.end, arc_ball.end);

        var axis = vec3.cross(vec3.create(), arc_ball.start, arc_ball.end);
        var angle = Math.acos(vec3.dot(arc_ball.start, arc_ball.end));

        if (vec3.equals(arc_ball.start, arc_ball.end)) {
          mat4.copy(viewMatrix, arc_ball.matrix_stash);
        } else {
          var transform = mat4.create();

          // Translate into ball.
          var translate_in = mat4.translate(mat4.create(), mat4.create(),
                                            vec3.fromValues(0.0, 0.0, 3.0));

          var rot = mat4.rotate(mat4.create(), mat4.create(), angle, axis);

          // Translate out of ball.
          var translate_out = mat4.translate(mat4.create(), mat4.create(),
                                             vec3.fromValues(0.0, 0.0, -3.0));


          mat4.mul(transform, translate_in, transform);
          mat4.mul(transform, rot, transform);
          mat4.mul(transform, translate_out, transform);
          mat4.mul(viewMatrix, transform, arc_ball.matrix_stash);
        }
      }
    }
  }

  function build_mouseup() {
    return function(event) {
      if ((event.button & 2) == 2){
        arc_ball.start = undefined;
      }
    }
  }
  gameLoop();
}
