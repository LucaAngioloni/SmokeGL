$(document).ready(function() {
    var container, scene, camera, renderer, controls, stats;
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

    // add attributes

    var flameVertexShader = document.getElementById('vertex_flame').textContent;
    var smokeVertexShader = document.getElementById('vertex_smoke').textContent;    

    var flameFragmentShader = document.getElementById('fragment_flame').textContent;
    var smokeFragmentShader = document.getElementById('fragment_smoke').textContent;    

    var flameMaterial = new THREE.ShaderMaterial({
            uniforms: {
                texture: { type: 't', value: new THREE.TextureLoader().load("images/flame.png") }
            },
            vertexShader: flameVertexShader,
            fragmentShader: flameFragmentShader,
        });
    var smokeMaterial = new THREE.ShaderMaterial({
            uniforms: {
                texture: { type: 't', value: new THREE.TextureLoader().load("images/smokeparticle.png") }
            },
            vertexShader: smokeVertexShader,
            fragmentShader: smokeFragmentShader,
        });

    var flame = new THREE.Points(flameGeometry, flameMaterial);
    var smoke = new THREE.Points(smokeGeometry, smokeMaterial);

    scene.add(flame);
    scene.add(smoke);

    // GUI
    
    var guiControls = new function () { 
        this.FlameParticles = 1000;
        this.SmokeParticles = 1000;
        this.FlameDimension = 8.0;
        this.FlameOpacity = 1.0;
        this.SmokeDimension = 8.0
        this.SmokeOpacity = 0.5;
        this.Time_Steam = 2.5;
    }; //Valori da cambiare una volta fatto lo shader

    datGui = new dat.GUI();  

    var flameFolder = datGui.addFolder('Flame');
    var smokeFolder = datGui.addFolder('Smoke');    
    
    flameFolder.add(guiControls, 'FlameParticles', 100, 100000).onFinishChange(function(){
        //cabia particelle
    });
    flameFolder.add(guiControls, 'FlameDimension', 8, 100).onFinishChange(function(){
        //cabia particelle
    });
    flameFolder.add(guiControls, 'FlameOpacity', 0, 1).onFinishChange(function(){
        //cabia particelle
    });
    smokeFolder.add(guiControls, 'SmokeParticles', 100, 100000).onFinishChange(function(){
        //cabia particelle
    });
    smokeFolder.add(guiControls, 'SmokeDimension', 8, 100).onFinishChange(function(){
        //cabia particelle
    });
    smokeFolder.add(guiControls, 'SmokeOpacity', 0, 1).onFinishChange(function(){
        //cabia particelle
    });
    
    datGui.open(); 
}


function render() 
{
    stats.update(); // aggiorna statistiche
    controls.update(); //aggiorna i controlli della vista e camera
    renderer.render( scene, camera ); //render del frame
    requestAnimationFrame(render); //alla prossima necessità di render passo la funzione render stessa che viene chiamata come callback
}

