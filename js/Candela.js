
var container, scene, camera, renderer, controls, stats, uniforms_flame, uniforms_smoke;
var TTL = 3.5;
var Speed = 10.0;

$(document).ready(function(){
    var keyboard = new THREEx.KeyboardState();
    var clock = new THREE.Clock();

    //Configura la scena, inizializza gli shader, crea la GUI
    init();

    //metodo che fa il render frame per frame.
    render();
});

function init() 
{
    // SCENE
    scene = new THREE.Scene();
    
    // CAMERA
    var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
    var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 2, FAR = 5000;
    camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
    scene.add(camera);
    camera.position.set(0,200,400);
    camera.lookAt(scene.position);
    
    // RENDERER
    renderer = new THREE.WebGLRenderer( {antialias:true} );

    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    container = document.getElementById( 'WebGL' );
    container.appendChild( renderer.domElement );

    // EVENTS
    THREEx.WindowResize(renderer, camera);
    THREEx.FullScreen.bindKey({ charCode : 'f'.charCodeAt(0) }); // Va fullscreen se si preme f

    // CONTROLS
    controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.minDistance = 100;
    controls.maxDistance = 500;
    
    // STATS
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.bottom = '0px';
    stats.domElement.style.zIndex = 100;
    container.appendChild( stats.domElement );
    
    // LIGHT
    var light = new THREE.PointLight(0xffffff);
    // light.position.set(100,250,100);
    light.position.set(0,250,0);
    scene.add(light);

    var ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // FLOOR
    var floorTexture = new THREE.TextureLoader().load( 'images/table.jpg' )
    //var floorTexture = new THREE.ImageUtils.loadTexture( 'images/table.jpg' );
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping; //forse meglio qualcos'altro e trovare un'immagine piu ad alta risoluzione
    floorTexture.repeat.set( 10, 10 );
    var floorMaterial = new THREE.MeshBasicMaterial( { color: 0xCCCCCC, map: floorTexture, side: THREE.DoubleSide } ); // Colore sul pavimento
    var floorGeometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);
    var floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = -5;
    floor.rotation.x = Math.PI / 2;
    scene.add(floor);

    // SKYBOX/FOG
    var skyBoxGeometry = new THREE.CubeGeometry( 4000, 4000, 4000 );
    var skyBoxMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, side: THREE.BackSide } );
    var skyBox = new THREE.Mesh( skyBoxGeometry, skyBoxMaterial );
    scene.add(skyBox);

    // Add Candle Object
    console.log("Inserting obj")
    var manager = new THREE.LoadingManager();
    manager.onProgress = function ( item, loaded, total ) {
        console.log( item, loaded, total );
    };
    var mtlLoader = new THREE.MTLLoader(manager);
    mtlLoader.setPath( 'obj/' );
    mtlLoader.load( 'CandleStick.mtl', function( materials ) {
        materials.preload();
        var objLoader = new THREE.OBJLoader(manager);
        objLoader.setMaterials( materials );
        objLoader.setPath( 'obj/' );
        objLoader.load( 'CandleStick.obj', function ( object ) {
            object.position.y = 0;
            object.position.x = 0;
            object.position.z = 0;
            object.scale.x = 20;
            object.scale.y = 20;
            object.scale.z = 20;
            scene.add( object );
        }, function(){}, function(){} );
    });

    // Init Particles and load shaders

    var flameGeometry = new THREE.BufferGeometry();
    var smokeGeometry = new THREE.BufferGeometry();

    // Generate initial particle positions
    var flameData = createFlameParticles(40000);
    var smokeData = createSmokeParticles(40000);

    // add the position to the vertex shader
    flameGeometry.addAttribute('position', new THREE.BufferAttribute(flameData.positions, 3));
    flameGeometry.addAttribute('customSize', new THREE.BufferAttribute(flameData.sizes, 1));
    flameGeometry.addAttribute('customAngle', new THREE.BufferAttribute(flameData.angles, 1));
    flameGeometry.addAttribute('timeOffset', new THREE.BufferAttribute(flameData.timeOffsets, 1));
    smokeGeometry.addAttribute('position', new THREE.BufferAttribute(smokeData.positions, 3));
    smokeGeometry.addAttribute('customSize', new THREE.BufferAttribute(smokeData.sizes, 1));
    smokeGeometry.addAttribute('customAngle', new THREE.BufferAttribute(smokeData.angles, 1));
    smokeGeometry.addAttribute('timeOffset', new THREE.BufferAttribute(smokeData.timeOffsets, 1));

    var flameVertexShader = document.getElementById('vertex_flame').textContent;
    var smokeVertexShader = document.getElementById('vertex_smoke').textContent;    

    var flameFragmentShader = document.getElementById('fragment_flame').textContent;
    var smokeFragmentShader = document.getElementById('fragment_smoke').textContent;

    var flameColor = new Float32Array(3);
    flameColor[0] = 255;
    flameColor[1] = 0;
    flameColor[2] = 0;

    uniforms_flame = {
        t: {value: 0.0},
        texture: { type: 't', value: new THREE.TextureLoader().load("images/flame.png") },
        customOpacity: {value: 0.7},
        customColor: {value: flameColor},
        timeLife: {value: TTL},
        speed: {value: Speed},
    };

    var smokeColor = new Float32Array(3);
    smokeColor[0] = 250;
    smokeColor[1] = 250;
    smokeColor[2] = 250;

    uniforms_smoke = {
        t: {value: 0.0},
        texture: { type: 't', value: new THREE.TextureLoader().load("images/smokeparticle.png") },
        customOpacity: {value: 0.7},
        customColor: {value: smokeColor},
        timeLife: {value: TTL},
        speed: {value: Speed},
    };   

    var flameMaterial = new THREE.ShaderMaterial({
            uniforms: uniforms_flame,
            vertexShader: flameVertexShader,
            fragmentShader: flameFragmentShader,
            blending: THREE.AdditiveBlending,
            transparent: true,
        });
    var smokeMaterial = new THREE.ShaderMaterial({
            uniforms: uniforms_smoke,
            vertexShader: smokeVertexShader,
            fragmentShader: smokeFragmentShader,
            blending: THREE.AdditiveBlending,
            transparent: true,
        });

    var flame = new THREE.Points(flameGeometry, flameMaterial);
    var smoke = new THREE.Points(smokeGeometry, smokeMaterial);

    scene.add(flame);
    scene.add(smoke);

    // GUI
    
    var guiControls = new function (){ 
        this.FlameParticles = 1000;
        this.SmokeParticles = 1000;
        this.FlameDimension = 8.0;
        this.timeLife = 3.5;
        this.FlameOpacity = 1.0;
        this.SmokeDimension = 8.0
        this.SmokeOpacity = 0.5;
        this.Time_Steam = 2.5;
    }; //Valori da cambiare una volta fatto lo shader

    datGui = new dat.GUI();  

    var flameFolder = datGui.addFolder('Flame');
    var smokeFolder = datGui.addFolder('Smoke');    
    
    flameFolder.add(guiControls, 'FlameParticles', 100, 100000).onFinishChange(function(newValue){
        //cabia particelle

    });
    flameFolder.add(guiControls, 'FlameDimension', 8, 100).onFinishChange(function(newValue){
        //cabia particelle
    });
    flameFolder.add(guiControls, 'timeLife', 0, 10).onFinishChange(function(newValue){
        uniforms_flame.timeLife.value = newValue;

    });
    flameFolder.add(guiControls, 'FlameOpacity', 0, 1).onFinishChange(function(newValue){
        uniforms_flame.customOpacity.value = newValue;

    });
    smokeFolder.add(guiControls, 'SmokeParticles', 100, 100000).onFinishChange(function(){
        //cabia particelle
    });
    smokeFolder.add(guiControls, 'SmokeDimension', 8, 100).onFinishChange(function(newValue){
        
    });
    smokeFolder.add(guiControls, 'SmokeOpacity', 0, 1).onFinishChange(function(newValue){
		uniforms_smoke.customOpacity.value = newValue;    
	});
    
    datGui.open(); 
}


function render(){
    //aggiorno tempo
    uniforms_flame.t.value += 1.0/60.0;
    uniforms_smoke.t.value += 1.0/60.0;

    stats.update(); // aggiorna statistiche
    controls.update(); //aggiorna i controlli della vista e camera
    renderer.render( scene, camera ); //render del frame
    requestAnimationFrame(render); //alla prossima necessità di render passo la funzione render stessa che viene chiamata come callback
}


function createFlameParticles(n){
    var pos = new Float32Array(n*3);
    for (i=0; i < n; i++){
        pos[i*3] = 0;
        pos[i*3+1] = 100;
        pos[i*3+2] = 0;
    }

    var siz = new Float32Array(n);

    for (i=0; i < n; i++){
        siz[i] = random_range(1,4);
    }

    var ang = new Float32Array(n);

    for (i=0; i < n; i++){
        ang[i] = random_range(0,7);
    }

    var to = new Float32Array(n);

    for (i=0; i < n; i++){
        to[i] = random_range(0,TTL);
    }

    return {positions: pos, sizes: siz, angles: ang, timeOffsets: to};
}

function createSmokeParticles(n){
    var pos = new Float32Array(n*3);
    for (i=0; i < n; i++){
        pos[i*3] = 0;
        pos[i*3+1] = 120;
        pos[i*3+2] = 0;
    }

    var siz = new Float32Array(n);

    for (i=0; i < n; i++){
        siz[i] = random_range(1,4);
    }

    var ang = new Float32Array(n);

    for (i=0; i < n; i++){
        ang[i] = random_range(0,7);
    }

    var to = new Float32Array(n);

    for (i=0; i < n; i++){
        to[i] = random_range(0,TTL);
    }
    return {positions: pos, sizes: siz, angles: ang, timeOffsets: to};
}

