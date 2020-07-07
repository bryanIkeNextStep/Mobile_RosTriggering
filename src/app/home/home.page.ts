import { Component, Renderer2 } from '@angular/core';
import * as ROSLIB from 'roslib';

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { GlobalConstants } from '../common/global-constants';
import { Plugins } from '@capacitor/core';
import { AlertController } from '@ionic/angular';

const { Storage } = Plugins;


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  constructor(private http: HttpClient, private renderer: Renderer2, private alertCtrl: AlertController) { }

  //measurements vars
  x: any = 0;
  y: any;
  z: any;
  weight: any;
  reference_number: string = "";

  //upload settings check vars
  uploadChecked: boolean;
  refChecked: boolean;
  localSaveChecked: boolean;

  //upload user info vars
  settings_userId: string = "";
  settings_companyId: string = "";
  settings_terminalId: string = "";
  settings_scannerId: string = "";
  settings_companyName: string = "";

  //public ros vars
  ros: any;
  image: any;

  //ros listener vars
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

    this.uploadChecked = GlobalConstants.isUploadChecked;
    this.refChecked = GlobalConstants.isRefChecked;
    this.localSaveChecked = GlobalConstants.isLocalSaveChecked

    await this.setup();

  const { value } = await Storage.get({ key: 'fs_ros_userSettings' });
    var settings = JSON.parse(value);

    this.settings_userId = settings.userId;
    this.settings_companyId = settings.companyId;
    this.settings_terminalId = settings.terminalId;
    this.settings_scannerId = settings.scannerId;
    this.settings_companyName = settings.companyName;

    this.connectRos();
  }

  checkUploadSettings() {
    GlobalConstants.isUploadChecked = this.uploadChecked;
    console.log(this.uploadChecked);
    console.log(GlobalConstants.isUploadChecked);
  }

  checkRefSettings() {
    GlobalConstants.isRefChecked = this.refChecked;
    console.log(this.refChecked);
    console.log(GlobalConstants.isRefChecked);
  }

  checkLocalSaveSettings() {
    GlobalConstants.isLocalSaveChecked = this.localSaveChecked;
    console.log(this.localSaveChecked);
    console.log(GlobalConstants.isLocalSaveChecked);
  }

  setRefNumber() {
    GlobalConstants.reference_number = this.reference_number;
    console.log("Changed ref number to: " + this.reference_number);
  }

  setup() {
    changeSectionColor("color-yellow");
    var statusText = document.getElementById("status");
    statusText.innerHTML = "STARTING";

    setTimeout(function () {
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
    // this.ros.connect('ws://192.168.0.196:9090');
    this.ros.connect('ws://192.168.0.190:9090');

    this.ros.on('connection', function () {
      console.log("connected to websocket server")
    });

    this.ros.on('error', function (err) {
      console.log("error connecting to web socket server: ");
      console.log(err);
    });

    this.createRosTopics(this.image, this.x, this.y, this.z, this.weight, this.renderer.setAttribute, this.changeSectionColor, this.http);
  }

  changeSectionColor(colorToShow) {
    var statusSection = document.getElementById("status-section");

    statusSection.classList.remove("color-yellow");
    statusSection.classList.remove("color-crimson");
    statusSection.classList.remove("color-green");
    statusSection.classList.remove("color-alt-blue");

    statusSection.classList.add(colorToShow);
  }

  createRosTopics(image, x, y, z, weight, setAttribute, changeSectionColor, http) {
    this.settings_pub = new ROSLIB.Topic({
      ros: this.ros,
      name: '/settings',
      messageType: 'std_msgs/Bool'
    });
    //set up RBG image topic
    this.imageTopic = new ROSLIB.Topic({
      ros: this.ros,
      name: '/Image',
      messageType: 'sensor_msgs/CompressedImage'
    });
    //set up trigger pub topic
    this.trigger_pub = new ROSLIB.Topic({
      ros: this.ros,
      name: '/trigger',
      messageType: 'std_msgs/Bool'
    });
    //set up trigger sub topic
    this.trigger_sub = new ROSLIB.Topic({
      ros: this.ros,
      name: '/trigger',
      message_type: 'std_msgs/Bool'
    });
    //set up measurement sub topic
    this.listener = new ROSLIB.Topic({
      ros: this.ros,
      name: '/measurement',
      messageType: 'realsense2_camera/measurement'
    });
    //set up weight sub topic
    this.weight_sub = new ROSLIB.Topic({
      ros: this.ros,
      name: '/weight',
      messageType: 'std_msgs/Float64'
    });

    this.imageTopic.subscribe(function (message) {
      var imageData = "data:image/jpg;base64," + message.data;
      var imageElem = document.getElementById("sensor-image");
      setAttribute(imageElem, "src", imageData);
    });

    this.trigger_sub.subscribe(function (message) {
      var statusSection = document.getElementById("status-section");
      var statusText = document.getElementById("status");
      var referenceNum = document.getElementById("pro_number");

      changeSectionColor("color-alt-blue");

      statusText.innerHTML = "SCANNING";
      referenceNum.innerText = "";
    });

    this.weight_sub.subscribe(function (message) {
      document.getElementById("weight").innerText = message.data.toFixed(2);
    });

    this.listener.subscribe(function (message) {
      var statusSection = document.getElementById("status-section");
      var statusText = document.getElementById("status");
      var referenceNum = document.getElementById("pro_number");
      var length = document.getElementById("length");
      var width = document.getElementById("width");
      var height = document.getElementById("height");

      var M_Code = message.Code;

      switch (M_Code) {
        case 0:
          this.changeSectionColor("color-green");

          statusText.innerHTML = "READY";
          this.resetData();
          break;
        case 1:
          x = message.points.x;
          y = message.points.y;
          z = message.points.z;

          image = document.getElementById("sensor-image").getAttribute("src");

          fullSend(image, http);

          break;
        case 2:
          changeSectionColor("color-crimson");
          statusText.innerHTML = "NO OBJECT DETECTED. REMOVED BOX";
          this.resetData();
          break;
        case 3:
          changeSectionColor("color-crimson");
          statusText.innerHTML = "BOUNDRY ERROR. REMOVE BOX";
          this.resetData();
          break;
        case 4:
          changeSectionColor("color-crimson");
          statusText.innerHTML = "CENTER OBJECT ERROR. REMOVE BOX";
          this.resetData();
          break;
        default:
          changeSectionColor("color-green");
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

    function fullSend(image, http) {
      var lengthElem = document.getElementById("length");
      var widthElem = document.getElementById("width");
      var heightElem = document.getElementById("height");
      var weightElem = document.getElementById("weight");

      var statusText = document.getElementById("status");

      var isUploadChecked = GlobalConstants.isUploadChecked;
      var isRefChecked = GlobalConstants.isRefChecked;
      var isLocalSaveChecked = GlobalConstants.isLocalSaveChecked;

      var fileName = "";

      console.log(`upload: ${isUploadChecked} ref: ${isRefChecked} local: ${isLocalSaveChecked}`);

      if (isLocalSaveChecked) {
        console.log("local save here");

        if (isRefChecked) {
          fileName = `images/${this.reference_number}_${Date.now()}.jpg`;
        } else {
          fileName = `images/${Date.now()}.jpg`;
        }

        image = this.image.split(",")[1];
        console.log(typeof (fileName));;

        //fs.write file here
      }
      if (isUploadChecked) {
        var base64_arr = [image];

        uploadToServer(base64_arr, GlobalConstants.reference_number, http);
      }

      lengthElem.innerHTML = x;
      widthElem.innerHTML = y;
      heightElem.innerHTML = z;
      weightElem.innerHTML = weight;

      statusText.innerHTML = "READY";
      changeSectionColor("color-green")
    }

    function uploadToServer(base64_arr, reference_number, http) {
      console.log("upload");

      var data = {
        company_id: 603,
        user_id: 1043,
        pro_number: 12345216,
        base64: [],
        weight: 1,
        width: 1,
        len: 1,
        height: 1,
        scanned_terminal_id: -1,
        scanner_id: -1
      }

      http.post("https://freightsnap-proto.herokuapp.com/addShipment", data, {
        "Access-Control-Allow-Origin": "*",
        "Accept": "application/x-www-form-urlencoded",
        "Content-Type": "application/x-www-form-urlencoded"
      }).subscribe((result) => {
        console.log("DONE!");
      });
    }
  }

  scan() {
    console.log(GlobalConstants.isUploadChecked);

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

    if (pageToShow === "upload") {
      settingsTitle.innerHTML = "CLOUD SETTINGS";
    }
    else if (pageToShow === "camera") {
      settingsTitle.innerHTML = "CAMERA SETTINGS";
    }
    else if (pageToShow === "scale") {
      settingsTitle.innerHTML = "SCALE SETTINGS";
    }

    var elementToShow = document.getElementById(`setting-content-${pageToShow}`);
    elementToShow.classList.remove("hide");;
  }

  async saveSettings() {
    console.log(`user: ${this.settings_userId} company: ${this.settings_companyId} terminal: ${this.settings_terminalId} scanner: ${this.settings_scannerId} name: ${this.settings_companyName}`);

    var settings = {
      userId: this.settings_userId,
      companyId: this.settings_companyId,
      terminalId: this.settings_terminalId,
      scannerId: this.settings_scannerId,
      companyName: this.settings_companyName
    }

    await Storage.set({
      key: "fs_ros_userSettings",
      value: JSON.stringify(settings)
    });

    var newAlert = this.alertCtrl.create({
      message: "Settings Saved!",
      buttons: [
        {
          text: "OK",
          handler: async () => {
            return (await newAlert).dismiss();
          }
        }
      ]
    });

    return (await newAlert).present();
  }

  cancelSettings() {
    this.showHome();
  }
}
