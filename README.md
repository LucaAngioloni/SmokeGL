# SmokeGL
[![Screen_Shot_2017-08-26_at_17.39.04.png](https://s28.postimg.org/obcpqp5ql/Screen_Shot_2017-08-26_at_17.39.04.png)](https://postimg.org/image/w43diobpl/)
***
## Smoke & Flame particles Systems

### Intent

- Reproduce the scene of a lit candle
- Flame and smoke represented as particles systems
- Use shaders and technologies studied to model the physical behaviour of the particles

### Project introduction

- A particle system is a convenient representation of a natural phenomena
- The natural phenomena to be reproduced are Smoke and Flames
- Creation of a pseudo-realistic scene simulating physics using random factors in the particles motion

#### Smoke

- Smoke is a collection of airborne solid and liquid particulates and gases emitted when a material undergoes combustion or pyrolysis.
- Smoke shape follows the standard convection-diffusion equation: 
    ∂C/∂t+u⃗ ⋅∇C=D∇2C ,
    where C is the smoke concentration and D is the diffusion coefficient of smoke.
- Smoke coming from a candle has a higher temperature than the surrounding, giving it lower density, which makes it rise. As it rises, it cools down, which also decrease the net force on the smoke particle. At the same time hotter smoke from below hits the smoke that is more stagnant causing random movements.

#### Flame

- A flame is the visible, gaseous part of a fire. It is caused by a highly exothermic reaction taking place in a thin zone.
- Flame color depends on several factors, the most important typically being black-body radiation and spectral band emission, with both spectral line emission and spectral line absorption playing smaller roles. In the most common type of flame, hydrocarbon flames, the most important factor determining color is oxygen supply and the extent of fuel-oxygen pre-mixing, which determines the rate of combustion and thus the temperature and reaction paths, thereby producing different color hues.

### Mockup

[![Screen_Shot_2017-08-26_at_17.39.36.png](https://s28.postimg.org/uqbqndcgd/Screen_Shot_2017-08-26_at_17.39.36.png)](https://postimg.org/image/v334tjuq1/)

- The project will be implemented using WebGL
- Smoke and flame particles will be managed through shaders
  - The physical model is simplified for this project purposes
- The scene surrounding smoke and flame will be represented using three.js library

##### Why [Three.js](https://threejs.org)

- Three.js is an Open Source javascript library that offers methods for interfacing WebGL core
- Three.js allows to create complex 3D animations and system that may be much difficult using only javascript
- A well explained documentation can be found [here](https://threejs.org/docs/)

###### How Three.js works 
 - An object is defined by a Geometry and a Material. Both class are available in lots of specialisations
   - Geometry is a set of vertices, disposed to represent a certain object
   - Material defines object’s properties (brightness, shadowing, texture, etc.)
 - Moreover other libraries are available to help managing camera or movements (Orbit Controls, Tween, etc…)
 
 All seems easy and amazing, but:
 
 - Geometry and Material classes carry on a useless baggage of informations
 - Fortunately it’s possible to define our own geometry and material using custom vertices sets and shaders
 - This strongly increase performances in a simple context like this (if all done correctly)
 
 ### Procedure
 - Shaders
   - Vertex Shaders
     - Attributes
       - particle starting position
       - particle size
       - particle trajectory angle
       - time offset (for continuous generation)
     - Uniforms
       - time t
       - time life (before regeneration)
       - speed
       - opacity
   - Fragment Shaders
     - Color
     - Texture
     
- Three.js
  - initialize scene
    - camera
    - light
    - box containing the scene
    - table
      - geometry
      - texturing
    - load candle obj created with blender
    - init of smoke and flame Geometry
      - setting first position e angle
      - linking attributes with shaders
      - setting and linking uniform variables
    - Audio

#### Scene

[![Screen_Shot_2017-08-26_at_17.41.29.png](https://s28.postimg.org/pvn3m7kgd/Screen_Shot_2017-08-26_at_17.41.29.png)](https://postimg.org/image/3jpastlc9/)

#### Flame formulation

- All N vertices start at same position at t=0
- Each one has a random angle α∈(0,360)
- Radius follows a curve obtained by regression on a set of hand picked points, depending on the time t. Radius also has a random component used to fill the flame.
- New position at t=t1 follows equation:
  - y = t
  - x = cos(α)*r
  - z = sin(α)*r
  
[![Screen_Shot_2017-08-26_at_17.41.39.png](https://s28.postimg.org/gl5xlk3f1/Screen_Shot_2017-08-26_at_17.41.39.png)](https://postimg.org/image/nodt168uh/)

#### Flame fragment shader

- Fragment shader is used to manage color and texture shape of flame particles
- A png image with alpha channel is used as texture
- Fragments outside a circle centred in gl_PointCoord are discarded to give an almost spherical shape to the particles
- Texture is centred and rotated according to the particle orientation and coordinates
- Particles are sorted (in the buffer arrays) along the camera view direction in order to make transparencies work

```html
<script type="x-shader/x-fragment" id="fragment_flame">
		uniform sampler2D texture;
		
		varying vec4 vColor;
		varying float vAngle;

		void main()
		{
			gl_FragColor = vColor;
			float c = cos(vAngle);
			float s = sin(vAngle);
			vec2 circCoord = 2.0 * gl_PointCoord - 1.0;
			if (dot(circCoord, circCoord) > 1.0) {
    			discard;
			}
			vec2 rotatedUV = vec2(c * (gl_PointCoord.x - 0.5) + s * (gl_PointCoord.y - 0.5) + 0.5,
			c * (gl_PointCoord.y - 0.5) - s * (gl_PointCoord.x - 0.5) + 0.5);
			vec4 rotatedTexture = texture2D( texture,  rotatedUV );
			if(rotatedTexture.a < 0.3){
				discard;
			}
			gl_FragColor = gl_FragColor * rotatedTexture;
		}
	</script>
```

#### Smoke Formulation

- Similar to flame model
- Radius: 0.5*(x)*sin(0.009*x2)
- New position at t=n follows  equation:
  - y = t
  - x = r*cos(t)+t*cos(t)2+sin(t)
  - z = t*sin(t)+t*sin(t)2

- High random component is added
 
[![Screen_Shot_2017-08-26_at_17.42.12.png](https://s28.postimg.org/846famyq5/Screen_Shot_2017-08-26_at_17.42.12.png)](https://postimg.org/image/gz79l5nih/)

#### Smoke fragment shader

- Fragment shader is used to manage color and texture shape of flame particles
- A png image with alpha channel is used as texture
- Fragments outside a circle centred in gl_PointCoord are discarded to give an almost spherical shape to the particles
- Texture is centred and rotated according to the particle orientation and coordinates
- Particles are sorted (in the buffer arrays) along the camera view direction in order to make transparencies work

```html
	<script type="x-shader/x-fragment" id="fragment_smoke">
		uniform sampler2D texture;
		
		varying vec4 vColor;
		varying float vAngle;

		void main()
		{
			gl_FragColor = vColor;
			float c = cos(vAngle);
			float s = sin(vAngle);
			vec2 circCoord = 2.0 * gl_PointCoord - 1.0;
			if (dot(circCoord, circCoord) > 1.0) {
    			discard;
			}
			vec2 rotatedUV = vec2(c * (gl_PointCoord.x - 0.5) + s * (gl_PointCoord.y - 0.5) + 0.5,
			c * (gl_PointCoord.y - 0.5) - s * (gl_PointCoord.x - 0.5) + 0.5);
			vec4 rotatedTexture = texture2D( texture,  rotatedUV );
			if(rotatedTexture.a < 0.3){
				discard;
			}
			gl_FragColor = gl_FragColor * rotatedTexture;
		}
	</script>
```
### Resulting Scene

[![Screen_Shot_2017-08-26_at_17.42.34.png](https://s28.postimg.org/vl3c6iqml/Screen_Shot_2017-08-26_at_17.42.34.png)](https://postimg.org/image/henlbafrd/)

### Mobile Ready

- New mobile device are optimised for graphics operations. This allows desktop-like performances.
- The project has been made mobile ready with touch event controls and great performances.
- Even on older generation devices ~60 fps are rendered.

[![Screen_Shot_2017-08-26_at_17.42.56.png](https://s28.postimg.org/5o4lwsgnh/Screen_Shot_2017-08-26_at_17.42.56.png)](https://postimg.org/image/3wbn1vxah/)

### Performances

- Using a MacBook Pro and Safari as reference:

| Smoke Vertices | Flame Vertices | Fps    |
|:--------------:|:--------------:|:------:|
| 50K            | 15K            | 60 fps |
| 100K           | 15K            | 60 fps |
| 100K           | 40K            | 60 fps |

- Using an iPhone 6S and Safari as reference:

| Smoke Vertices | Flame Vertices | Fps    |
|:--------------:|:--------------:|:------:|
| 50K            | 15K            | 60 fps |
| 100K           | 15K            | 60 fps |
| 100K           | 40K            | 60 fps |

### Conclusions

- An example is reachable at : [https://lucaangioloni.github.io/SmokeGL/](https://lucaangioloni.github.io/SmokeGL/)
- The system can reproduce different scenario, the only difference would be in formulas describing the event


## Presentation

A copy of this presentation can be found in different formats here:
- HTML website: https://lucaangioloni.github.io/SmokeGL/Presentazione/PresentazioneHTML/
- PDF: https://github.com/LucaAngioloni/SmokeGL/raw/master/Presentazione/Presentazione.pdf
- Keynote: https://github.com/LucaAngioloni/SmokeGL/raw/master/Presentazione/Presentazione.key

### Developed by Luca Angioloni and Francesco Pegoraro
