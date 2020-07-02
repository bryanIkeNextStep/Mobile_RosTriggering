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
  reference_number: 123;

  ros: any;
  image: any;

  settings_pub: any;
  imageTopic: any;
  trigger_pub: any;
  trigger_sub: any;
  listener: any;
  weight_sub: any;

  async ngOnInit() {
    // this.http.post("http://localhost:3000/ros/createServer", {
    //   x: this.x,
    //   y: this.y,
    //   z: this.z,
    //   weight: this.weight
    // }).subscribe((data) => {
    //   console.log("DONE!");
    // });

    await this.setup();
    this.connectRos();
  }

  setup() {
    changeSectionColor("color-yellow");
    var statusText = document.getElementById("status");
    statusText.innerHTML = "STARTING";
    
    setTimeout(function() {
    changeSectionColor("color-green");
      statusText.innerHTML = "READY";
    }, 500);

    function changeSectionColor(colorToShow) {
      var statusSection = document.getElementById("status-section");
  
      statusSection.classList.remove("color-yellow");
      statusSection.classList.remove("color-crimson");
      statusSection.classList.remove("color-green");
      statusSection.classList.remove("color-alt-blue");
  
      statusSection.classList.add(colorToShow);
    }
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

    this.createRosTopics(this.image, this.x, this.y, this.z, this.weight, this.renderer.setAttribute, this.changeSectionColor);
  }

  changeSectionColor(colorToShow) {
    var statusSection = document.getElementById("status-section");

    statusSection.classList.remove("color-yellow");
    statusSection.classList.remove("color-crimson");
    statusSection.classList.remove("color-green");
    statusSection.classList.remove("color-alt-blue");

    statusSection.classList.add(colorToShow);
  }

  createRosTopics(image, x, y, z, weight, setAttribute, changeSectionColor) {
    this.settings_pub = new ROSLIB.Topic({
      ros	: this.ros,
      name : '/settings',
      messageType : 'std_msgs/Bool'
    });
    //set up RBG image topic
    this.imageTopic = new ROSLIB.Topic({
        ros : this.ros,
        name : '/Image',
        messageType : 'sensor_msgs/CompressedImage'
    });
    //set up trigger pub topic
    this.trigger_pub = new ROSLIB.Topic({
      ros	: this.ros,
      name : '/trigger',
      messageType : 'std_msgs/Bool'
    });
    //set up trigger sub topic
    this.trigger_sub = new ROSLIB.Topic({
      ros : this.ros,
      name : '/trigger',
      message_type : 'std_msgs/Bool'
    });
    //set up measurement sub topic
    this.listener = new ROSLIB.Topic({
      ros : this.ros,
      name : '/measurement',
        messageType : 'realsense2_camera/measurement'
    });
    //set up weight sub topic
    this.weight_sub = new ROSLIB.Topic({
      ros : this.ros,
      name : '/weight',
      messageType : 'std_msgs/Float64'
    });

    this.imageTopic.subscribe(function(message) {
      var imageData = "data:image/jpg;base64," + message.data;
      var image = document.getElementById("sensor_image");
      setAttribute(image, "src", imageData);
    });

    this.trigger_sub.subscribe(function(message) {
      var statusSection = document.getElementById("status-section");
      var statusText = document.getElementById("status");
      var referenceNum = document.getElementById("pro_number");

      changeSectionColor("color-alt-blue");

      statusText.innerHTML = "SCANNING";
      referenceNum.innerText = "";
    });

    this.weight_sub.subscribe(function(message) {
      document.getElementById("weight").innerText = message.data.toFixed(2);
    });

    this.listener.subscribe(function(message) {
      var statusSection = document.getElementById("status-section");
      var statusText = document.getElementById("status");
      var referenceNum = document.getElementById("pro_number");
      var length = document.getElementById("length");
      var width = document.getElementById("width");
      var height = document.getElementById("height");

      var M_Code = message.Code;

      switch(M_Code) {
        case 0:
          this.changeSectionColor("color-green");

          statusText.innerHTML = "READY";
          this.resetData();
          break;
        case 1:
          x = message.points.x;
          y = message.points.y;
          z = message.points.z;

          image = document.getElementById("sensor-image");

          var isRefChecked = true;

          fullSend();

          break;
        case 2:
          this.changeSectionColor("color-crimson");
          statusText.innerHTML = "NO OBJECT DETECTED. REMOVED BOX";
          this.resetData();
          break;
        case 3: 
          this.changeSectionColor("color-crimson");
          statusText.innerHTML = "BOUNDRY ERROR. REMOVE BOX";
          this.resetData();
          break;
        case 4:
          this.changeSectionColor("color-crimson");
          statusText.innerHTML = "CENTER OBJECT ERROR. REMOVE BOX";
          this.resetData();
          break;
        default:
          this.changeSectionColor("color-green");
          statusText.innerHTML = "READY";
          this.resetData();
          break;
      }
    });

    function resetData() {
      var length = document.getElementById("length");
      var width = document.getElementById("width");
      var height = document.getElementById("height");
      var referenceNum = document.getElementById("pro_number");
  
      referenceNum.innerHTML = "";
      length.innerHTML = "0";
      width.innerHTML = "0";
      height.innerHTML = "0";
    }

    function fullSend() {
      var lengthElem = document.getElementById("length");
      var widthElem = document.getElementById("width");
      var heightElem = document.getElementById("height");
      var weightElem = document.getElementById("weight");
      
      var statusText = document.getElementById("status");

      
      statusText.innerHTML = "READY";
      changeSectionColor("color-green")
      // var imgCpy = this.image;
      var isSaveChecked = false;
      var isRefChecked = true;
      var fileName = "";
  
      if(isSaveChecked) {
        if(isRefChecked) {
          fileName = `images/${this.reference_number}_${Date.now()}.jpg`;
        } else {
          fileName = `images/${Date.now()}.jpg`;
        }
  
        this.image = this.image.split(",")[1];
        console.log(typeof(fileName));;
        
        //fs.write file here
      }
  
      lengthElem.innerHTML = x;
      widthElem.innerHTML = y;
      heightElem.innerHTML = z;
      weightElem.innerHTML = weight;
    }
  }

  scan() {
    var statusText = document.getElementById("status");

    var trigger = new ROSLIB.Message({
      data: true
    });

    this.trigger_pub.publish(trigger);
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
