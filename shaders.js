var vertexShaderCode =
[
  'uniform mat4 vs_modelMatrix;',
  'uniform mat4 vs_viewMatrix;',
  'uniform mat4 vs_projectionMatrix;',
  '',
  'uniform float vs_one_colour;',
  'uniform float vs_use_texture;',
  '',
  'uniform vec4 vs_single_colour;',
  '',
  'attribute vec4 vs_point;',
  'attribute vec4 vs_colour;',
  'attribute vec3 vs_normal;',
  '',
  'attribute vec2 vs_tex_coord;',
  '',
  'uniform vec3 vs_light_point;',
  'uniform vec3 vs_light_colour;',
  'uniform float vs_light_ambient;',
  'uniform float vs_light_diffuse;',
  'uniform float vs_light_specular;',
  '',
  'varying vec4 fs_point;',
  '',
  'varying vec4 fs_colour;',
  'varying float fs_one_colour;',
  'varying float fs_use_texture;',
  'varying vec4 fs_single_colour;',
  '',
  'varying vec3 fs_normal;',
  'varying vec3 fs_light_point;',
  'varying vec3 fs_light_colour;',
  '',
  'varying float fs_light_ambient;',
  'varying float fs_light_diffuse;',
  'varying float fs_light_specular;',
  '',
  'varying vec3 fs_view_point;',
  '',
  'varying vec2 fs_tex_coord;',
  '',
  'void  main() {',
    'gl_Position = vs_projectionMatrix * vs_viewMatrix * vs_modelMatrix * vs_point;',
    '',
    'fs_point = vs_viewMatrix * vs_modelMatrix * vs_point;',
    '',
    'fs_colour = vs_colour;',
    'fs_one_colour = vs_one_colour;',
    'fs_use_texture = vs_use_texture;',
    'fs_single_colour = vs_single_colour;',
    '',
    'fs_normal = normalize(vec3(vs_viewMatrix * vs_modelMatrix * vec4(vs_normal, 0.0)));',
    '',
    'fs_light_point = vs_light_point;',
    'fs_light_colour = vs_light_colour;',
    '',
    'fs_light_ambient = vs_light_ambient;',
    'fs_light_diffuse = vs_light_diffuse;',
    'fs_light_specular = vs_light_specular;',
    '',
    'fs_view_point = -vec3(vs_viewMatrix * vec4(0.0, 0.0, 0.0, 1.0));',
    '',
    'fs_tex_coord = vs_tex_coord;',
    '}'
].join('\n');

var fragmentShaderCode =
[
  'precision mediump float;',
  '',
  'varying vec4 fs_point;',
  '',
  'varying vec4 fs_colour;',
  '',
  'varying float fs_one_colour;',
  'varying float fs_use_texture;',
  '',
  'varying vec4 fs_single_colour;',
  '',
  'varying vec3 fs_normal;',
  '',
  'varying vec2 fs_tex_coord;',
  '',
  'varying vec3 fs_light_point;',
  'varying vec3 fs_light_colour;',
  '',
  'varying float fs_light_ambient;',
  'varying float fs_light_diffuse;',
  'varying float fs_light_specular;',
  '',
  'varying vec3 fs_view_point;',
  '',
  'uniform sampler2D fs_texture_sampler;',
  '',
  'void main() {',
  '',
    'vec4 light_colour = vec4(fs_light_colour, 1.0);',
    'vec3 light_delta = fs_light_point - fs_point.xyz;',
    'vec3 light_direction = normalize(light_delta);',
    '',
    'if (fs_use_texture > 0.5) {',
      'gl_FragColor = texture2D(fs_texture_sampler, fs_tex_coord);',
    '} else if (fs_one_colour > 0.5) {',
      'gl_FragColor = fs_single_colour;',
    '} else {',
      'float cosAngle = clamp(dot(light_direction, fs_normal), 0.0, 1.0);',
      'float cosReflect = clamp(dot(reflect(-light_direction, fs_normal), normalize(fs_view_point)), 0.0, 1.0);',
      '',
      'gl_FragColor =',
          'fs_light_ambient * fs_colour +',
          'fs_light_diffuse * fs_colour * light_colour * cosAngle +',
          'fs_light_specular * fs_colour * light_colour * pow(cosReflect, 5.0);',
          '',
      'gl_FragColor.w = fs_colour.w;',
    '}',
  '}'
].join('\n');