import { Component } from '@angular/core';
import { NavParams, ViewController } from 'ionic-angular';

@Component({
  selector: 'page-coursesModal',
  templateUrl: 'coursesModal.html'
})
export class CoursesModalPage {
  label: string = this.navParams.get('label');
  id: string = this.navParams.get('id');
  answered: boolean = this.navParams.get('answered');
  group: number = this.navParams.get('group');
  delegate: string = this.navParams.get('delegate');
  commissionsDate: string = this.navParams.get("commissionsDate");
  availableDate: string = this.navParams.get("availableDate");
  typeForm: string = this.navParams.get("typeForm");

  constructor(public navParams: NavParams, public viewCtrl: ViewController) {

  }

  closeModal() {
    this.viewCtrl.dismiss();
  }
}
