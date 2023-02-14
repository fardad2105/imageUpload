import { Component } from '@angular/core';
import {
  ActionSheetController,
  LoadingController,
  Platform,
} from '@ionic/angular';
import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from '@capacitor/camera';
import { Directory, Filesystem, ReadFileResult } from '@capacitor/filesystem';

const IMAGE_DIR = 'stored-images';

export interface LocalFile {
  name: string,
  path: string,
  data: string
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  images: LocalFile[] = [];

  constructor(
    private actionsheet: ActionSheetController,
    private platform: Platform,
    private loadingCtrl: LoadingController
  ) {}

  async selectImageOptions() {
    const actionsheet = await this.actionsheet.create({
      header: 'Select Image Source',
      buttons: [
        {
          text: 'Select Image from Gallery',
          handler: () => {
            console.log('Image selected from Gallery');
          },
        },
        {
          text: 'Select Camera',
          handler: () => {
            this.selectImage();
          },
        },
        {
          text: 'Cancel',
          role: 'cancel',
        },
      ],
    });
    await actionsheet.present();
  }

  async selectImage() {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
    });

    console.log(image);

    if (image) {
      this.saveImage(image);
    }
  }

  async saveImage(photo: Photo) {
    const base64Data = await this.readAsBase64(photo);
    const filename = new Date().getTime() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      directory: Directory.Data,
      path: '',
      data: base64Data,
    });
  }

  private async readAsBase64(photo: Photo) {
    // "hybrid" will detect Cordova or Capacitor
    if (this.platform.is('hybrid')) {
      // Read the file into base64 format
      const file = await Filesystem.readFile({
        path: photo.path!,
      });

      return file.data;
    } else {
      // Fetch the photo, read as a blob, then convert to base64 format
      const response = await fetch(photo.webPath!);
      const blob = await response.blob();

      return (await this.convertBlobToBase64(blob)) as string;
    }
  }

  convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader;
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });

  async startUpload(file: LocalFile) {
    const response = await fetch(file.data);
    const blob = await response.blob();
    const formData = new FormData();
    formData.append('file',blob, file.name);
    this.uploadData(formData);
   }

   async deleteImage(file: LocalFile) {
    await Filesystem.deleteFile({
      directory: Directory.Data,
      path: file.path
    });
    this.loadFiles();
   }

   async uploadData(formData: FormData) {
    const loading  = await this.loadingCtrl.create({
      message: 'Uploading image ....'
    });

    await loading.present();

   }

   async loadFileData(fileName: string[]) {
    for (let f of fileName) {
      const filePath = `${IMAGE_DIR}/${f}`;

      const readFile = await Filesystem.readFile({
        directory: Directory.Data,
        path: filePath,
      });

      this.images.push({
        name: f,
        path: filePath,
        data: `data:image/jpeg;base64,${readFile.data}`
      });
    }
  }

   async loadFiles() {
    this.images = [];
    const loading = await this.loadingCtrl.create({
      message: 'Loading data ....'
    });
    await loading.present();

    Filesystem.readdir({
      directory: Directory.Data,
      path: IMAGE_DIR
    }).then(result => {

    }, async err => {
      console.log(err);
      await Filesystem.mkdir({
        directory: Directory.Data,
        path: IMAGE_DIR
      });
    }).then(() => {
      loading.dismiss();
    })
  }
}
