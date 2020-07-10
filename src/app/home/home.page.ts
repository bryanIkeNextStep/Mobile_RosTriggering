import { Component, Renderer2 } from '@angular/core';
import * as ROSLIB from 'roslib';

import { HttpClient } from '@angular/common/http';
import { GlobalConstants } from '../common/global-constants';
import { Plugins } from '@capacitor/core';
import { AlertController, LoadingController } from '@ionic/angular';
import { BarcodeScanner, BarcodeScannerOptions } from '@ionic-native/barcode-scanner/ngx';

const { Storage } = Plugins;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  constructor(private barcodeCtrl: BarcodeScanner, private http: HttpClient, private renderer: Renderer2, private alertCtrl: AlertController, private loadingCtrl: LoadingController) { }

  //measurements vars
  x: any = 0;
  y: any;
  z: any;
  weight: any;
  reference_number: string = "";

  ipAddress: string = "";

  //upload settings check vars
  uploadChecked: boolean;
  refChecked: boolean;
  localSaveChecked: boolean;

  // //upload user info vars
  settings_userId: string = "";
  settings_companyId: string = "";
  settings_terminalId: string = "";
  settings_scannerId: string = "";
  settings_companyName: string = "";
  settings_distanceToFloor: string = "";

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
    GlobalConstants.reference_number = "";

    await this.setup();
    await this.getCloudSettings();

    this.uploadChecked = GlobalConstants.isUploadChecked;
    this.refChecked = GlobalConstants.isRefChecked;
    this.localSaveChecked = GlobalConstants.isLocalSaveChecked

    var refSection = document.getElementById("reference-number-section");

    if(this.refChecked) {
      refSection.classList.remove("hide");
      refSection.classList.add("show");
    }
    else if(this.refChecked == false) {

      refSection.classList.add("hide");
      refSection.classList.remove("show");
    }

    this.ipAddress = GlobalConstants.ipAddress;
    this.settings_userId = GlobalConstants.settings_userId;
    this.settings_companyId = GlobalConstants.settings_companyId;
    this.settings_terminalId = GlobalConstants.settings_terminalId;
    this.settings_scannerId = GlobalConstants.settings_scannerId;
    this.settings_companyName = GlobalConstants.settings_companyName;
    this.settings_distanceToFloor = GlobalConstants.settings_distanceToFloor;

    this.connectRos();
  }

  async getCloudSettings() {
    const { value } = await Storage.get({ key: "fs_ros_cloudSettings" });
    var settings = JSON.parse(value);

    if(settings) {
      GlobalConstants.isUploadChecked = settings.upload;
      GlobalConstants.isRefChecked = settings.refNum;
      GlobalConstants.isLocalSaveChecked = settings.localSave;
  
      GlobalConstants.ipAddress = settings.ipAddress;
      GlobalConstants.settings_userId = settings.userId;
      GlobalConstants.settings_companyId = settings.companyId;
      GlobalConstants.settings_terminalId = settings.terminalId;
      GlobalConstants.settings_scannerId = settings.scannerId;
      GlobalConstants.settings_companyName = settings.companyName;
    }
  }

  async getCameraSettings() {
    const { value } = await Storage.get({ key: "fs_ros_cameraSettings" });
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

    var reference_number = document.getElementById("reference-number-section");

    if(GlobalConstants.isRefChecked) {
      reference_number.classList.remove("hide");
      reference_number.classList.add("show");
    }
    else if(GlobalConstants.isRefChecked == false) {
      reference_number.classList.add("hide");
      reference_number.classList.remove("show");
    }
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
    this.ros = new ROSLIB.Ros();
    //Raspberry Pi connection
    // this.ros.connect('ws://192.168.0.196:9090');

    var imgSection = document.getElementById("imgSection");


    try {
      this.ros.connect(`ws://${this.ipAddress}:9090`);
      this.createRosTopics(imgSection, this.renderer, this.image, this.x, this.y, this.z, this.weight, this.renderer.setAttribute, this.changeSectionColor, this.getCloudSettings, this.http, this.loadingCtrl, this.alertCtrl);
    } catch (error) {
      //This means that connection to the socket did not connect
      imgSection.innerHTML = "";

      var errorText = this.renderer.createElement("h1");
      this.renderer.addClass(errorText, "bold");
      this.renderer.addClass(errorText, "md-font-size");
      this.renderer.addClass(errorText, "white-text");
      errorText.innerHTML = "Can't connect to ipaddress";

      setTimeout(function() {
        var statusSection = document.getElementById("status-section");
        statusSection.classList.remove("color-yellow");
        statusSection.classList.add("color-crimson");

        var statusText = document.getElementById("status");
        statusText.innerHTML = "ERROR!";

        imgSection.appendChild(errorText);
      }, 500);
    }
  }

  changeSectionColor(colorToShow) {
    var statusSection = document.getElementById("status-section");

    statusSection.classList.remove("color-yellow");
    statusSection.classList.remove("color-crimson");
    statusSection.classList.remove("color-green");
    statusSection.classList.remove("color-alt-blue");

    statusSection.classList.add(colorToShow);
  }

  createRosTopics(imgSection, renderer, image, x, y, z, weight, setAttribute, changeSectionColor, getCloudSettings, http, loadingCtrl, alertCtrl) {
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

      imgSection.innerHTML = "";

      var newImg = renderer.createElement("img");
      renderer.setAttribute(newImg, "id", "sensor-image");
      renderer.setAttribute(newImg, "src", imageData);
      renderer.addClass(newImg, "sensor-image");

      imgSection.appendChild(newImg);
    });

    this.trigger_sub.subscribe(function (message) {
      var statusSection = document.getElementById("status-section");
      var statusText = document.getElementById("status");

      changeSectionColor("color-alt-blue");

      statusText.innerHTML = "SCANNING";
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

          var image = document.getElementById("sensor-image").getAttribute("src");

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

    async function fullSend(image, http) {
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

        uploadToServer(getCloudSettings, base64_arr, GlobalConstants.reference_number, http, loadingCtrl, alertCtrl);
      }

      lengthElem.innerHTML = x;
      widthElem.innerHTML = y;
      heightElem.innerHTML = z;
      weightElem.innerHTML = weight;

      statusText.innerHTML = "READY";
      changeSectionColor("color-green")
    }

    async function uploadToServer(getCloudSettings, base64_arr, reference_number, http, loadingCtrl, alertCtrl) {
      var loader = await loadingCtrl.create({
        message: "Uploading Scan"
      });

      await loader.present();

      getCloudSettings();

      var length = parseInt(document.getElementById("length").innerHTML).toFixed();
      var width = parseInt(document.getElementById("width").innerHTML).toFixed();
      var height = parseInt(document.getElementById("height").innerHTML).toFixed();
      var weight = parseInt(document.getElementById("weight").innerHTML).toFixed();

      console.log("ref_num: " + reference_number);

      var proNum;

      if(GlobalConstants.isRefChecked) {
        proNum = reference_number;
      }
      else {
        proNum = "0";
      }

      var data = {
        company_id: GlobalConstants.settings_companyId,
        user_id: GlobalConstants.settings_userId,
        pro_number: proNum,
        base64: base64_arr,
        weight: weight,
        width: width,
        len: length,
        height: height,
        scanned_terminal_id: -1,
        scanner_id: -1
      }

      console.log(data);

      http.post("https://freightsnap-proto.herokuapp.com/addShipment", data, {
        "Access-Control-Allow-Origin": "http://localhost:8100",
        "Access-Control-Allow-Credentials": "true",
        "Accept": "application/x-www-form-urlencoded",
        "Content-Type": "application/x-www-form-urlencoded"
      }).subscribe(async (result) => {
        console.log("DONE!");
        await loader.dismiss();

        var uploadAlert = await alertCtrl.create({
          message: "Scan Was Uploaded!",
          buttons: [
            {
              text: "OK",
              handler: async () => {
                return (await uploadAlert).dismiss();
              }
            }
          ]
        });
        
        return (await uploadAlert).present();
      });
    }
  }

  async scan() {
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

  async saveCloudSettings() {
    console.log(`ipAddress: ${this.ipAddress} user: ${this.settings_userId} company: ${this.settings_companyId} terminal: ${this.settings_terminalId} scanner: ${this.settings_scannerId} name: ${this.settings_companyName}`);

    var settings = {
      upload: this.uploadChecked,
      refNum: this.refChecked,
      localSave: this.localSaveChecked,
      ipAddress: this.ipAddress,
      userId: this.settings_userId,
      companyId: this.settings_companyId,
      terminalId: this.settings_terminalId,
      scannerId: this.settings_scannerId,
      companyName: this.settings_companyName
    }

    console.log(settings);

    await Storage.set({
      key: "fs_ros_cloudSettings",
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

    this.getCloudSettings();

    return (await newAlert).present();
  }

  cancelSettings() {
    this.showHome();
  }

  async saveCameraSettings() {
    var settings = {
      dtf: this.settings_distanceToFloor
    }

    await Storage.set({
      key: "fs_ros_cameraSettings",
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

    this.getCloudSettings();

    return (await newAlert).present();
  }

  barcodeScan() {
    const options: BarcodeScannerOptions = {
      preferFrontCamera: false,
      showFlipCameraButton: true,
      showTorchButton: true,
      torchOn: false,
      prompt: 'Place a barcode inside the scan area',
      resultDisplayDuration: 500,
      formats: 'PDF_417,CODABAR,EAN_8,UPC_A,UPC_E,EAN_8,EAN_13,CODE_39,CODE_93,CODE_128,',
      orientation: 'portrait'
    };

    this.barcodeCtrl.scan(options).then(barcodeData => {
      this.reference_number = barcodeData.text;

      GlobalConstants.reference_number = this.reference_number;
    }).catch(err => {
      alert(err);
    });
  }
}
