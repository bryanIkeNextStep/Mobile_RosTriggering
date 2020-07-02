import { Component, Renderer2 } from '@angular/core';
import * as ROSLIB from 'roslib';

import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  constructor(private http: HttpClient, private renderer: Renderer2) {}

  x: any = 0;
  y: any;
  z: any;
  weight: any;

  ros: any;

  ngOnInit() {
    // this.http.post("http://localhost:3000/ros/createServer", {
    //   x: this.x,
    //   y: this.y,
    //   z: this.z,
    //   weight: this.weight
    // }).subscribe((data) => {
    //   console.log("DONE!");
    // });

    this.connectRos();
  }

  connectRos() {
    // this.http.get("https://freightsnap-proto.herokuapp.com/ros/connectWS/192.168.0.190").subscribe((data) => {
    //   console.log("DONE!");
    // });

    // this.http.get("http://localhost:3000/ros/connectWS/192.168.0.190").subscribe((data) => {
    //   console.log("DONE!");
    // });

    this.ros = new ROSLIB.Ros();
    this.ros.connect('ws://192.168.0.190:9090');

    this.ros.on('connection', function() {
      console.log("connected to websocket server")
    });

    this.ros.on('error', function(err) {
      console.log("error connecting to web socket server: ");
      console.log(err);
    });

    this.createRosTopics(this.renderer.setAttribute);
  }

  createRosTopics(setAttribute) {
    var settings_pub = new ROSLIB.Topic({
      ros	: this.ros,
      name : '/settings',
      messageType : 'std_msgs/Bool'
    });
    //set up RBG image topic
    var imageTopic = new ROSLIB.Topic({
        ros : this.ros,
        name : '/Image',
        messageType : 'sensor_msgs/CompressedImage'
    });
    //set up trigger pub topic
    var trigger_pub = new ROSLIB.Topic({
      ros	: this.ros,
      name : '/trigger',
      messageType : 'std_msgs/Bool'
    });
    //set up trigger sub topic
    var trigger_sub = new ROSLIB.Topic({
      ros : this.ros,
      name : '/trigger',
      message_type : 'std_msgs/Bool'
    });
    //set up measurement sub topic
    var listener = new ROSLIB.Topic({
      ros : this.ros,
      name : '/measurement',
        messageType : 'realsense2_camera/measurement' //for using realsense
        //messageType : 'astra_camera/measurement' //for using orbbec
        // messageType : 'geometry_msgs/Point' //for testing
    });
    //set up weight sub topic
    var weight_sub = new ROSLIB.Topic({
      ros : this.ros,
      name : '/weight',
      messageType : 'std_msgs/Float64'
    });

    imageTopic.subscribe(function(message) {
      var imageData = "data:image/jpg;base64," + message.data;
      var image = document.getElementById("sensor_image");
      setAttribute(image, "src", imageData);
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
