var container, scene, camera, renderer, controls, stats, uniforms_flame, uniforms_smoke;
var flameTTL = 1.7;
var smokeTTL = 7.4;
var Speed = 25.0;
var going = true;
var originalAlpha = 0.6;
var testAlphaFlame = 0.6;
var testAlphaSmoke = 0.6;
var numFlameParticles = 15000;
var maxNumFlameParticles = 40000;
var numSmokeParticles = 50000;
var maxNumSmokeParticles = 100000;
var flameStartingHeight = 101;
var smokeStartingHeight = flameStartingHeight+(flameTTL*Speed) - 5; //Il fumo deve partire dalla punta della fiamma
var flameSize = 7;
var smokeSize = 4;

var flameSTconst = flameTTL * Speed;
var smokeSTconst = smokeTTL * Speed;


$(document).ready(function(){
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
    var lookingPosition = new THREE.Vector3(scene.position.x, scene.position.y + 100, scene.position.z);
    
    // RENDERER
    renderer = new THREE.WebGLRenderer( {antialias:true} );

    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    container = document.getElementById( 'WebGL' );
    container.appendChild( renderer.domElement );

    // EVENTS
    THREEx.WindowResize(renderer, camera);
    THREEx.FullScreen.bindKey({ charCode : 'f'.charCodeAt(0) }); // Va fullscreen se si preme f

    var keyboard = new THREEx.KeyboardState();

    window.addEventListener('keydown', function(event){
        if (event.repeat) {
            return;
        }
        var key     = "space";
        var pressed = keyboard.pressed(key);
        //console.log("key", key, "pressed", pressed);
        if(pressed){
            going = !going;
            //console.log("going", going);
        }
    })

    // CONTROLS
    controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.minDistance = 50;
    controls.maxDistance = 500;
    controls.center = lookingPosition;
    
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
    var flameData = createFlameParticles(numFlameParticles);
    var smokeData = createSmokeParticles(numSmokeParticles);

    // add attributes
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
    flameColor[0] = 1;
    flameColor[1] = 1;
    flameColor[2] = 1;

    uniforms_flame = {
        t: {value: 0.0},
        texture: { type: 't', value: new THREE.TextureLoader().load("images/flame.png") },
        customOpacity: {value: 1.0},
        customColor: {value: flameColor},
        timeLife: {value: flameTTL},
        speed: {value: Speed},
    };

    var smokeColor = new Float32Array(3);
    smokeColor[0] = 1;
    smokeColor[1] = 1;
    smokeColor[2] = 1;

    uniforms_smoke = {
        t: {value: 0.0},
        texture: { type: 't', value: new THREE.TextureLoader().load("images/smokeparticle.png") },
        customOpacity: {value: 1.0},
        customColor: {value: smokeColor},
        timeLife: {value: smokeTTL},
        speed: {value: Speed},
        posOffset: {value: 0.0},
    };   

    var flameMaterial = new THREE.ShaderMaterial({
            uniforms: uniforms_flame,
            vertexShader: flameVertexShader,
            fragmentShader: flameFragmentShader,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            alphaTest: testAlphaFlame,
            transparent: true,
        });
    var smokeMaterial = new THREE.ShaderMaterial({
            uniforms: uniforms_smoke,
            vertexShader: smokeVertexShader,
            fragmentShader: smokeFragmentShader,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            alphaTest: testAlphaSmoke,
            transparent: true,
        });

    var flame = new THREE.Points(flameGeometry, flameMaterial);
    var smoke = new THREE.Points(smokeGeometry, smokeMaterial);
    flame.sortParticles = true; // the default is false
    smoke.sortParticles = true; // the default is false

    scene.add(flame);
    scene.add(smoke);

    // GUI
    
    var guiControls = new function (){ 
        this.FlameParticles = numFlameParticles;
        this.SmokeParticles = numSmokeParticles;
        this.FlameDimension = flameSize;
        this.FlameTimeLife = flameTTL;
        this.FlameOpacity = 1.0;
        this.SmokeDimension = smokeSize;
        this.SmokeOpacity = 1.0;
        this.SmokeTimeLife = smokeTTL;
        this.toggleMovement = function(){
            going = !going;
        }
        this.Speed = Speed;
    }; //Valori da cambiare una volta fatto lo shader

    datGui = new dat.GUI();  

    var flameFolder = datGui.addFolder('Flame');
    var smokeFolder = datGui.addFolder('Smoke');    
    
    flameFolder.add(guiControls, 'FlameParticles', 100, maxNumFlameParticles).onFinishChange(function(newValue){
        numFlameParticles = newValue;

        var newData = createFlameParticles(newValue);

        flameGeometry.removeAttribute('position');
        flameGeometry.removeAttribute('customSize');
        flameGeometry.removeAttribute('customAngle');
        flameGeometry.removeAttribute('timeOffset');

        flameGeometry.addAttribute('position', new THREE.BufferAttribute(newData.positions, 3));
        flameGeometry.addAttribute('customSize', new THREE.BufferAttribute(newData.sizes, 1));
        flameGeometry.addAttribute('customAngle', new THREE.BufferAttribute(newData.angles, 1));
        flameGeometry.addAttribute('timeOffset', new THREE.BufferAttribute(newData.timeOffsets, 1));

        flameGeometry.attributes.position.needsUpdate = true;
        flameGeometry.attributes.customSize.needsUpdate = true;
        flameGeometry.attributes.customAngle.needsUpdate = true;
        flameGeometry.attributes.timeOffset.needsUpdate = true;
	});
    flameFolder.add(guiControls, 'FlameDimension', 2, 15).onFinishChange(function(newValue){
        flameSize = newValue;

        for (i=0; i < numFlameParticles; i++){
            flameGeometry.attributes.customSize.array[i] = random_range(1, newValue);
        }
        flameGeometry.attributes.customSize.needsUpdate = true;
    });
    flameFolder.add(guiControls, 'FlameTimeLife', 0, 10).onFinishChange(function(newValue){
        var oldH = flameStartingHeight + (flameTTL*Speed) - 5;
        uniforms_flame.timeLife.value = newValue;
        flameTTL = newValue;

        flameSTconst = flameTTL * Speed;

    	for (i=0; i < numFlameParticles; i++){
            flameGeometry.attributes.timeOffset.array[i] = random_range(0, newValue);
        }
        flameGeometry.attributes.timeOffset.needsUpdate = true;

        var newH = flameStartingHeight + (flameTTL*Speed) - 5;
        var diff = newH - oldH;
        uniforms_smoke.posOffset.value += diff;
    });
    flameFolder.add(guiControls, 'FlameOpacity', 0, 1).onFinishChange(function(newValue){
        uniforms_flame.customOpacity.value = newValue;
        testAlphaFlame = originalAlpha * newValue;

    });
    smokeFolder.add(guiControls, 'SmokeParticles', 100, maxNumSmokeParticles).onFinishChange(function(newValue){
        numSmokeParticles = newValue;

        var newData = createSmokeParticles(newValue);

        smokeGeometry.removeAttribute('position');
        smokeGeometry.removeAttribute('customSize');
        smokeGeometry.removeAttribute('customAngle');
        smokeGeometry.removeAttribute('timeOffset');

        smokeGeometry.addAttribute('position', new THREE.BufferAttribute(newData.positions, 3));
        smokeGeometry.addAttribute('customSize', new THREE.BufferAttribute(newData.sizes, 1));
        smokeGeometry.addAttribute('customAngle', new THREE.BufferAttribute(newData.angles, 1));
        smokeGeometry.addAttribute('timeOffset', new THREE.BufferAttribute(newData.timeOffsets, 1));

        smokeGeometry.attributes.position.needsUpdate = true;
        smokeGeometry.attributes.customSize.needsUpdate = true;
        smokeGeometry.attributes.customAngle.needsUpdate = true;
        smokeGeometry.attributes.timeOffset.needsUpdate = true;
    });
    smokeFolder.add(guiControls, 'SmokeDimension', 2, 15).onFinishChange(function(newValue){
        smokeSize = newValue;

        for (i=0; i < numSmokeParticles; i++){
            smokeGeometry.attributes.customSize.array[i] = random_range(1, newValue);
        }
        smokeGeometry.attributes.customSize.needsUpdate = true;
    });
    smokeFolder.add(guiControls, 'SmokeTimeLife', 0, 10).onFinishChange(function(newValue){
        uniforms_smoke.timeLife.value = newValue;
        smokeTTL = newValue;

        smokeSTconst = smokeTTL * Speed;

        for (i=0; i < numSmokeParticles; i++){
            smokeGeometry.attributes.timeOffset.array[i] = random_range(0, newValue);
        }
        smokeGeometry.attributes.timeOffset.needsUpdate = true;
    });
    smokeFolder.add(guiControls, 'SmokeOpacity', 0, 1).onFinishChange(function(newValue){
		uniforms_smoke.customOpacity.value = newValue;
        testAlphaSmoke = originalAlpha * newValue;   
	});


    datGui.add(guiControls, 'toggleMovement').name("ToggleMovement");
    datGui.add(guiControls, 'Speed', 1, 50).onFinishChange(function(newValue){
        Speed = newValue;
        uniforms_smoke.speed.value = newValue;
        uniforms_flame.speed.value = newValue; 

        flameTTL = flameSTconst / newValue;
        smokeTTL = smokeSTconst / newValue;

        uniforms_smoke.timeLife.value = smokeTTL;

        for (i=0; i < numSmokeParticles; i++){
            smokeGeometry.attributes.timeOffset.array[i] = random_range(0, smokeTTL);
        }
        smokeGeometry.attributes.timeOffset.needsUpdate = true;

        uniforms_flame.timeLife.value = flameTTL;

        for (i=0; i < numFlameParticles; i++){
            flameGeometry.attributes.timeOffset.array[i] = random_range(0, flameTTL);
        }
        flameGeometry.attributes.timeOffset.needsUpdate = true;
    });
    datGui.open(); 
}


function render(){
    //aggiorno tempo
    if(going){
        uniforms_flame.t.value += 1.0/60.0;
        uniforms_smoke.t.value += 1.0/60.0;
    }

    stats.update(); // aggiorna statistiche
    controls.update(); //aggiorna i controlli della vista e camera
    renderer.render( scene, camera ); //render del frame
    requestAnimationFrame(render); //alla prossima necessità di render passo la funzione render stessa che viene chiamata come callback
}

function flameBufferPos(n){
    var pos = new Float32Array(n*3);

    for (i=0; i < n; i++){
        pos[i*3] = 0;
        pos[i*3+1] = flameStartingHeight;
        pos[i*3+2] = 0;
    }

    return pos;
}


function createFlameParticles(n){
    var pos = flameBufferPos(n);

    var siz = new Float32Array(n);

    for (i=0; i < n; i++){
        siz[i] = random_range(1,flameSize);
    }

    var ang = new Float32Array(n);

    for (i=0; i < n; i++){
        ang[i] = random_range(0,2*Math.PI);
    }

    var to = new Float32Array(n);

    for (i=0; i < n; i++){
        to[i] = random_range(0,flameTTL);
    }

    return {positions: pos, sizes: siz, angles: ang, timeOffsets: to};
}

function smokeBufferPos(n){
    var pos = new Float32Array(n*3);

    for (i=0; i < n; i++){
        pos[i*3] = 0;
        pos[i*3+1] = smokeStartingHeight;
        pos[i*3+2] = 0;
    }

    return pos;
}

function createSmokeParticles(n){
    var pos = smokeBufferPos(n);

    var siz = new Float32Array(n);

    for (i=0; i < n; i++){
        siz[i] = random_range(1,smokeSize);
    }

    var ang = new Float32Array(n);

    for (i=0; i < n; i++){
        ang[i] = random_range(0,2*Math.PI);
    }

    var to = new Float32Array(n);

    for (i=0; i < n; i++){
        to[i] = random_range(0,smokeTTL);
    }
    return {positions: pos, sizes: siz, angles: ang, timeOffsets: to};
}

