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
  private websocket;
  private camera;
  private target;
  private renderer;
  private scene;
  private MAP:any = {};

  private rotating: boolean = false;

  public color: string;
  public roughness: number = 0.5; 
  public metalness: number = 0.5; 


  constructor(private cpService: ColorPickerService, private gameSettings: GameSettings){
    this.color = this.gameSettings.startColor;
  }

  rotateMap(deltaX){
    var rotSpeed = 0.7 * deltaX;
    var x = this.camera.position.x;
    var z = this.camera.position.z;
    this.camera.position.x = x * Math.cos(rotSpeed) + z * Math.sin(rotSpeed);
    this.camera.position.z = z * Math.cos(rotSpeed) - x * Math.sin(rotSpeed);
    this.camera.lookAt(this.target);
    this.render();
  }

  updateCubeMaterialColor($event){
    this.color = $event as string;
    this.cubeMaterial = this.getCubeMaterial();
  }

  getCubeMaterial(color=null){
    if (color)
      return new THREE.MeshStandardMaterial({
        color: color, 
        roughness: 0.5,
        metalness: 0.5
      });
    return new THREE.MeshStandardMaterial({
      color: this.color, 
      roughness: 0.5,
      metalness: 0.5
    });
  }

  ngOnInit() {
    var that = this;
    this.websocket = new $WebSocket(this.gameSettings.websocketUrl, [this.gameSettings.websocketProtocol]);
    this.websocket.onMessage(
    (msg: MessageEvent)=> {
        var craft = JSON.parse(msg.data);
        if (!craft.position) {
          for (var key in craft)
            craftVoxel(craft[key], true);
        }
        else
          craftVoxel(craft, true);
        that.render();
      }, {autoApply: false}
    );
  
    // INIT VARS 
    var container = document.getElementById('gameCanvas');
    document.body.appendChild( container );
    var plane, cube;
    var mouse, raycaster, isShiftDown = false;

    var rollOverMesh, rollOverMaterial;
    var cubeGeo;

    var objects = [];
    this.target =  new THREE.Vector3();
    this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
    this.camera.position.set( 500, 800, 1300 );
    this.camera.lookAt(this.target);
    this.scene = new THREE.Scene();

    // roll-over helpers
    var rollOverGeo = new THREE.BoxGeometry( 50, 50, 50 );
    rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.3, transparent: true } );
    rollOverMesh = new THREE.Mesh( rollOverGeo, rollOverMaterial );
    this.scene.add( rollOverMesh );

    // cubes
    cubeGeo = new THREE.BoxGeometry( 50, 50, 50 );
    this.cubeMaterial = this.getCubeMaterial();

    //GRID
    var gridHelper = new THREE.GridHelper( 1000, 20 );
    this.scene.add( gridHelper );

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    var geometry = new THREE.PlaneBufferGeometry( 1000, 1000 );
    geometry.rotateX( - Math.PI / 2 );

    plane = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { visible: false } ) );
    this.scene.add( plane );

    objects.push( plane );

    // Lights
    var ambientLight = new THREE.AmbientLight(0x606060, 0.7);
    this.scene.add( ambientLight );

    var directionalLight = new THREE.DirectionalLight( 0xffffff);
    directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
    this.scene.add( directionalLight );

    var p1 = new THREE.PointLight(0xffffff, 0.5);
    var p2 = p1.clone();
    var p3 = p1.clone();
    var p4 = p1.clone();
    var p5 = p1.clone();
    p2.position.set(-500, 0, 500);
    p3.position.set(-500, 0, -500);
    p4.position.set(500, 0, 500);
    p5.position.set(500, 0, -500);
    //this.scene.add(p1);
    this.scene.add(p2);
    this.scene.add(p3);
    this.scene.add(p4);
    this.scene.add(p5);

    this.renderer = new THREE.WebGLRenderer( { antialias: true } );
    this.renderer.setClearColor( 0xf0f0f0 );
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( this.renderer.domElement );

    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
    document.addEventListener( 'mousedown', onDocumentMouseDown, false );
    document.addEventListener( 'keydown', onDocumentKeyDown, false );
    document.addEventListener( 'keyup', onDocumentKeyUp, false );
    window.addEventListener( 'resize', onWindowResize, false );

    function onWindowResize() {
      that.camera.aspect = window.innerWidth / window.innerHeight;
      that.camera.updateProjectionMatrix();
      that.renderer.setSize( window.innerWidth, window.innerHeight );

    }

    function onDocumentMouseMove( event ) {

      event.preventDefault();

      mouse.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );

      raycaster.setFromCamera( mouse, that.camera );

      var intersects = raycaster.intersectObjects( objects );

      if ( intersects.length > 0 ) {

        var intersect = intersects[ 0 ];

        rollOverMesh.position.copy( intersect.point ).add( intersect.face.normal );
        rollOverMesh.position.divideScalar( 50 ).floor().multiplyScalar( 50 ).addScalar( 25 );

      }

      that.render();

    }

    function onDocumentMouseDown( event ) {

      event.preventDefault();

      mouse.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );

      raycaster.setFromCamera( mouse, that.camera );

      var intersects = raycaster.intersectObjects( objects );

      if ( intersects.length > 0 ) {

        var intersect = intersects[ 0 ];
        var voxel = new THREE.Mesh( cubeGeo, rollOverMaterial );
        voxel.position.copy( intersect.point ).add( intersect.face.normal );
        voxel.position.divideScalar( 50 ).floor().multiplyScalar( 50 ).addScalar( 25 );
        var obj = {position: voxel.position, color: that.color, deleted: false};

        // delete cube
        if ( isShiftDown ) {
          if (intersect.object != plane) {
            var del = {position: intersect.object.position, deleted: true}
            that.websocket.send(del, WebSocketSendMode.Direct);
          }

        // create cube
        } else {
          that.websocket.send(obj, WebSocketSendMode.Direct);
          //craftVoxel(voxel, false);
          //setTimeout(() => that.scene.remove(voxel), that.gameSettings.detroyTimeout);
        }
        that.render();
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

    function craftVoxel(craft, save = true) {
      if (!craft)
        return;
      var voxel = new THREE.Mesh( cubeGeo, that.getCubeMaterial(craft.color));
      voxel.position.copy(craft.position);
      var stringKey = voxel.position.x + "," + voxel.position.y + "," + voxel.position.z;
      var obj = that.MAP[stringKey];
      if (obj && craft.deleted){
        that.scene.remove(obj);
        objects.splice( objects.indexOf(obj), 1 );
        delete(that.MAP[stringKey]);
      }
      else if (!craft.deleted)
      {
        that.scene.add(voxel);
        if (save){
          that.MAP[stringKey] = voxel;
          objects.push(voxel);
        }
      }
    }
  }

  render(){
    this.renderer.render(this.scene, this.camera);
  }

}