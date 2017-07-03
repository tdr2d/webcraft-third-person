import { Component, OnInit } from '@angular/core';
import * as THREE from 'three';
import {NgForm} from '@angular/forms';
import {ColorPickerService} from 'angular2-color-picker';
import {$WebSocket, WebSocketSendMode} from 'angular2-websocket/angular2-websocket';
import {GameSettings} from './gameSettings';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css'],
  providers: [GameSettings]
})
export class GameComponent implements OnInit {

  private cubeMaterial;
  private color: string;
  private websocket;

  constructor(private cpService: ColorPickerService, private gameSettings: GameSettings){
    this.color = this.gameSettings.startColor;
  }

  updateCubeMaterialColor($event){
    this.color = $event as string;
    this.cubeMaterial = new THREE.MeshLambertMaterial({color: this.color})
  }

  ngOnInit() {
    var that = this;
    this.websocket = new $WebSocket(this.gameSettings.websocketUrl, [this.gameSettings.websocketProtocol]);
    this.websocket.onMessage(
    (msg: MessageEvent)=> {
        var craft = JSON.parse(msg.data);
        console.log(craft);
        if (!craft.position) {

          console.log("Map received");
          for (var key in craft)
            craftVoxel(craft[key]);

        }
        else
          craftVoxel(craft);

        render();
      }, {autoApply: false}
    );
  
    // INIT VARS 
    var radius = 900;
    var angle = 0;
    var constant = 1;
    var that = this;
    var container = document.createElement( 'div' );;
    document.body.appendChild( container );
    var camera, scene, renderer;
    var plane, cube;
    var mouse, raycaster, isShiftDown = false;

    var rollOverMesh, rollOverMaterial;
    var cubeGeo;

    var objects = [];
    var target =  new THREE.Vector3();
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.set( 500, 800, 1300 );
    camera.lookAt(target);
    scene = new THREE.Scene();

    // roll-over helpers

    var rollOverGeo = new THREE.BoxGeometry( 50, 50, 50 );
    rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.3, transparent: true } );
    rollOverMesh = new THREE.Mesh( rollOverGeo, rollOverMaterial );
    scene.add( rollOverMesh );

    // cubes

    cubeGeo = new THREE.BoxGeometry( 50, 50, 50 );
    this.cubeMaterial = new THREE.MeshLambertMaterial( {color: this.color} );
    console.log(this.cubeMaterial);
    //GRID
    var gridHelper = new THREE.GridHelper( 1000, 20 );
    scene.add( gridHelper );

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    var geometry = new THREE.PlaneBufferGeometry( 1000, 1000 );
    geometry.rotateX( - Math.PI / 2 );

    plane = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { visible: false } ) );
    scene.add( plane );

    objects.push( plane );

    // Lights

    var ambientLight = new THREE.AmbientLight( 0x606060 );
    scene.add( ambientLight );

    var directionalLight = new THREE.DirectionalLight( 0xffffff );
    directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
    scene.add( directionalLight );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setClearColor( 0xf0f0f0 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );

    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
    document.addEventListener( 'mousedown', onDocumentMouseDown, false );
    document.addEventListener( 'keydown', onDocumentKeyDown, false );
    document.addEventListener( 'keyup', onDocumentKeyUp, false );
    window.addEventListener( 'resize', onWindowResize, false );
    document.addEventListener( 'mousewheel', onMouseWheel, false );

    function onMouseWheel(event) {
      if (event.deltaX != 0){
        var rotSpeed = 0.001 * event.deltaX;
        var x = camera.position.x;
        var z = camera.position.z;
        camera.position.x = x * Math.cos(rotSpeed) + z * Math.sin(rotSpeed);
        camera.position.z = z * Math.cos(rotSpeed) - x * Math.sin(rotSpeed);
        camera.lookAt( target);
      }
      else if (event.deltaY != 0){
        var rotSpeed = 0.001 * event.deltaX;
        var y = camera.position.y;
        var z = camera.position.z;
        camera.position.y = y * Math.cos(rotSpeed) + z * Math.sin(rotSpeed);
        camera.position.z = z * Math.cos(rotSpeed) + y * Math.sin(rotSpeed);
        camera.lookAt( target);
      }
      render();
    }

    function onWindowResize() {

      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize( window.innerWidth, window.innerHeight );

    }

    function onDocumentMouseMove( event ) {

      event.preventDefault();

      mouse.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );

      raycaster.setFromCamera( mouse, camera );

      var intersects = raycaster.intersectObjects( objects );

      if ( intersects.length > 0 ) {

        var intersect = intersects[ 0 ];

        rollOverMesh.position.copy( intersect.point ).add( intersect.face.normal );
        rollOverMesh.position.divideScalar( 50 ).floor().multiplyScalar( 50 ).addScalar( 25 );

      }

      render();

    }

    function onDocumentMouseDown( event ) {

      event.preventDefault();

      mouse.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );

      raycaster.setFromCamera( mouse, camera );

      var intersects = raycaster.intersectObjects( objects );

      if ( intersects.length > 0 ) {

        var intersect = intersects[ 0 ];

        // delete cube

        if ( isShiftDown ) {

          if ( intersect.object != plane ) {

            scene.remove( intersect.object );
            objects.splice( objects.indexOf( intersect.object ), 1 );

          }

        // create cube

        } else {

          var voxel = new THREE.Mesh( cubeGeo, rollOverMaterial );
          voxel.position.copy( intersect.point ).add( intersect.face.normal );
          voxel.position.divideScalar( 50 ).floor().multiplyScalar( 50 ).addScalar( 25 );
          var obj = {position: voxel.position, color: that.color};
          that.websocket.send(obj, WebSocketSendMode.Direct);
          scene.add( voxel );
          setTimeout(() => scene.remove(voxel), that.gameSettings.detroyTimeout);
        }

        render();

      }

    }

    function onDocumentKeyDown( event ) {

      switch( event.keyCode ) {

        case 16: isShiftDown = true; break;

      }

    }

    function onDocumentKeyUp( event ) {

      switch ( event.keyCode ) {

        case 16: isShiftDown = false; break;

      }

    }

    function render() {
      renderer.render( scene, camera );
    }

    function craftVoxel(craft, save = true) {
      var voxel = new THREE.Mesh( cubeGeo, new THREE.MeshLambertMaterial({color: craft.color}));
      voxel.position.copy(craft.position);
      scene.add( voxel );
      if (save)
        objects.push( voxel );
    }
  }

}