import { Component } from '@angular/core';
import * as ROSLIB from 'roslib';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  constructor() {}

  ros: any;

  ngOnInit() {
    this.connectRos();
  }

  connectRos() {
    this.ros = new ROSLIB.Ros({
      url : "ws://localhost:9090" 
    });

    // this.ros.connect("ws://localhost:9090")

    this.ros.on('connection', function() {
      console.log("connected to websocket server")
    });

    this.ros.on('error', function(err) {
      console.log("error connecting to web socket server: ");
      console.log(err);
    })
  }

  scan(){
    // var trigger_pub = new ROSLIB.Topic({
    //   ros : this.ros,
    //   name: "/trigger",
    //   messageType : "/std_msgs/Bool"
    // });

    // var trigger = new ROSLIB.Message({
    //   data : true
    // })
    // trigger_pub.publish(trigger)  
  }

  showSettings() {
    var home = document.getElementById("home-section");
    var settings = document.getElementById("settings-section");

    home.classList.add("hide");
    settings.classList.remove("hide");
  }

  showHome() {
    var home = document.getElementById("home-section");
    var settings = document.getElementById("settings-section");

    home.classList.remove("hide");
    settings.classList.add("hide");
  }

  showSettingsPage(pageToShow) {
    var upload = document.getElementById("setting-content-upload");
    var camera = document.getElementById("setting-content-camera");
    var scale = document.getElementById("setting-content-scale");
    var settingsTitle = document.getElementById("settings-title");

    upload.classList.add("hide");
    camera.classList.add("hide");
    scale.classList.add("hide");

    if(pageToShow === "upload"){
      settingsTitle.innerHTML = "CLOUD SETTINGS";
    }
    else if(pageToShow === "camera"){
      settingsTitle.innerHTML = "CAMERA SETTINGS";
    }
    else if(pageToShow === "scale"){
      settingsTitle.innerHTML = "SCALE SETTINGS";
    }

    var elementToShow = document.getElementById(`setting-content-${pageToShow}`);
    elementToShow.classList.remove("hide");;
  }
}
