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
  var lives = 2;
  var bacRemaining = 20;
  var score = 0;
  var bacAlive = 0;
  var clickedPoints = [];
  var gameIsLit = true; //🔥
  var canvas = document.getElementById('game-surface');

  // Create 2D Canvas for text
  var textCanvas = document.getElementById('text');
  var ctx = textCanvas.getContext('2d')

  // Set font for text Canvas
  ctx.font = "20px Verdana";
  ctx.textAlign = "center";

  document.body.style.margin = 0;
  canvas.width = 1000;
  canvas.height = 800;

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
  document.getElementById("lighting").onclick = function(e) {toggleLighting(e)};

  function toggleLighting(e) {
    console.log(e);
    if(gameIsLit){
      gameIsLit = false;
      e.target.textContent = "Off";
      e.target.style.color = "red";
    } else {
      gameIsLit = true;
      e.target.textContent = "On";
      e.target.style.color = "green";
    }
  }

  draw();

  function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(glEnv.uniforms.viewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(glEnv.uniforms.projectionMatrix, false,
                        projectionMatrix);

    if(gameIsLit){
      gl.uniform3fv(glEnv.uniforms.light_point, lightPoint);
      gl.uniform3fv(glEnv.uniforms.light_colour, lightColour);
    } else {
      gl.uniform3fv(glEnv.uniforms.light_colour, [0.0, 0.0, 0.0]);
    }

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
      let bucket = Array.from(bacteriumIds);
      let id = bucket[Math.floor(Math.random() * bucket.length)];

      bacteriumIds.delete(id);
      return id;
    }

  function spawnBacteria() {
    let frequency = 64;
    let radius = 0.05;

    if (Math.random() < 1.0 / frequency && bacterium.length < maxBacteria) {
      let r = vec3.fromValues(Math.random() - 0.5,
                              Math.random() - 0.5,
                              Math.random() - 0.5);
      vec3.normalize(r, r);

      let id = nextId();
      let colours = bacColMap.get(id);

      if(colours){
        let bacteria = new Sphere(glEnv,
                                  sphereRes,
                                  r,
                                  radius,
                                  colours[0],
                                  colours[1],
                                  undefined,
                                  undefined,
                                  0.02);
        bacteria.id = id;

        let pole = vec3.fromValues(0.0, 0.0, 1.0);

        if (!vec3.equals(r, pole)) {
          let axis = vec3.cross(vec3.create(), pole, r);
          vec3.normalize(axis, axis);

          let angle = Math.acos(vec3.dot(pole, r));
          bacteria.rotation = mat4.rotate(mat4.create(), mat4.create(),
                                          angle, axis);
          bacteria.buildModel();
        }
        bacAlive++;
        bacterium.push(bacteria);
      }
    }
  }

  function growBacteria() {
    let incScalar = 0.0005;
    let inc = vec3.fromValues(incScalar, incScalar, incScalar);
    let max = incScalar *  5000;

    bacterium.forEach(function(bacteria){
      if (bacteria.scale[0] < max) {
        bacteria.radius += incScalar;
        vec3.add(bacteria.scale, bacteria.scale, inc);
        //vec3.add(bacteria.translation, bacteria.translation, plus);
        bacteria.buildModel();
      }
      if(bacteria.radius >= 0.35) {
        let id = bacteria.id;
        bacAlive--;
        lives--;
        bacterium.splice(bacterium.indexOf(bacteria), 1);
        bacteriumIds.add(id);
      }
    });
  }

  function gameLoop() {

    document.getElementById('scoreDisplay').innerHTML=score;
		document.getElementById('bacRemaining').innerHTML=bacRemaining;
		document.getElementById('lives').innerHTML=lives;
    if(!winOrLose()){

      if(bacRemaining>0+bacAlive) {
        spawnBacteria();
      }

      growBacteria();
      collisionCheck();
      consumeBacteria();
      updateText();
      draw();
      requestAnimationFrame(gameLoop);
    }
  }

  function click() {
    return function(event) {
      let offset = elementOffset(event.target);
      let x = event.clientX - offset.x;
      let y = event.target.height - (event.clientY - offset.y);

      let colour = new Uint8Array(4);
      falseDraw();
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, colour);

      let id = colour2id(colour);

      let hit = false;
      let scoreInc = 0;

      for (let i = 0; i < bacterium.length; i++){
        if (bacterium[i].id == id){
          hit = true;
          scoreInc = Math.round(2/bacterium[i].radius);
          score += scoreInc
          bacRemaining--;
          bacAlive--;
          clickedPoints.push({
  					pts: "+" + scoreInc,
  					x: event.clientX,
  					y: event.clientY,
  					dY: 0,
  					color: "rgba(0,200,0,"
  				});
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

        let offset = elementOffset(event.target);

        let height = event.target.height;

        let point = {
          x: (event.clientX - offset.x) - arcBall.centre[0],
          y: (height - (event.clientY - offset.y)) - arcBall.centre[1],
          z: 0
        };

        arcBall.matrix_stash = mat4.copy(mat4.create(), viewMatrix);

        let d2 = point.x * point.x + point.y * point.y;
        let r2 = arcBall.radius * arcBall.radius;
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
        let offset = elementOffset(event.target);

        let height = event.target.height;

        let point = {
          x: (event.clientX - offset.x) - arcBall.centre[0],
          y: (height - (event.clientY - offset.y)) - arcBall.centre[1],
          z: 0
        };

        let d2 = point.x * point.x + point.y * point.y;
        let r2 = arcBall.radius * arcBall.radius;
        if (d2 < r2){
          point.z = Math.sqrt(r2 - d2);
        }

        arcBall.end = vec3.fromValues(point.x, point.y, point.z);
        vec3.normalize(arcBall.end, arcBall.end);

        let axis = vec3.cross(vec3.create(), arcBall.start, arcBall.end);
        let angle = Math.acos(vec3.dot(arcBall.start, arcBall.end));

        if (vec3.equals(arcBall.start, arcBall.end)) {
          mat4.copy(viewMatrix, arcBall.matrix_stash);
        } else {
          let transform = mat4.create();

          // Translate into ball.
          let transIn = mat4.translate(mat4.create(), mat4.create(),
                                            vec3.fromValues(0.0, 0.0, 3.0));

          let rot = mat4.rotate(mat4.create(), mat4.create(), angle, axis);

          // Translate out of ball.
          let transOut = mat4.translate(mat4.create(), mat4.create(),
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
      console.log(clickedPoints);
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

  function updateText() {
    for(i in clickedPoints) {
      let text = clickedPoints[i];
      text.dY--;

      if(text.dY <= -50) {
        clickedPoints.splice(i,1);
      } else {
        // Clear canvas only around specific text
        ctx.clearRect(text.x - 25, text.y + text.dY - 20, text.x + 20, text.y + 20);
        // Alpha of the points approaches zero as it reaches its max change in y to simulate a fade out
        ctx.fillStyle = text.color + (1.0 - (text.dY * -0.02) + ")");
        // Print the points awarded and move them upwards
        ctx.fillText(text.pts, text.x, text.y + text.dY);
      }
    }
  }

  function consumeBacteria() {
    let decScalar = -0.0030;
    let dec = vec3.fromValues(decScalar, decScalar, decScalar);
    for(i in bacterium){
      for(j in bacterium[i].consuming) {
        let consumed = bacterium[i].consuming[j];
        consumed.radius -= 0.0015;
        vec3.add(consumed.scale, consumed.scale, dec);
        vec3.add(consumed.translation, consumed.translation, normalize3D(bacterium[i].centre, consumed.centre));
        //vec3.add(bacteria.translation, bacteria.translation, plus);
        if(consumed.radius <= 0.0) {
          let id = consumed.id;
          bacAlive--;
          bacterium.splice(bacterium.indexOf(consumed), 1);
          bacterium[i].consuming.splice(j, 1);
          bacteriumIds.add(id);
        }
        consumed.buildModel();
      }
    }
  }

  function winOrLose() {
    if(bacRemaining <= 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      clickedPoints = [];
      ctx.fillStyle = "rgba(0, 255, 0, 1.0)";
			ctx.font = "80px Verdana";
			ctx.fillText("You win!", canvas.width/2, canvas.height/2);
      return true;
    }
    if(lives<=0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      clickedPoints = [];
      bacterium = [];
      draw();
      ctx.fillStyle = "rgba(255, 0, 0, 1.0)";
			ctx.font = "80px Verdana";
			ctx.fillText("You Lose.", canvas.width/2, canvas.height/2);
      return true;
    }
    return false;
  }

  gameLoop();
}

// Converts an id to a colour
function id2colour(id) {
  if (id > 2<< (8 * 3)) return vec4.fromValues(0.0, 0.0, 0.0, 1.0);
  let a = (id >> (8 * 0)) & (255);
  let b = (id >> (8 * 1)) & (255);
  let c = (id >> (8 * 2)) & (255);
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

function distance3D(vec1, vec2) {
  return Math.sqrt(Math.pow(vec2[0]-vec1[0], 2) + Math.pow(vec2[1]-vec1[1], 2) + Math.pow(vec2[2]-vec1[2], 2))
}

function normalize3D(vec1, vec2) {
  let m = distance3D(vec1, vec2);
  return[((vec1[0]-vec2[0])/m)/400, ((vec1[1]-vec2[1])/m)/400, ((vec1[2]-vec2[2])/m)/400];
}
