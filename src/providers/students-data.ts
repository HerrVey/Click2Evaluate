import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import 'rxjs/add/operator/map';
import { Storage } from '@ionic/storage';
import { AlertController } from 'ionic-angular';
import { LocalNotifications } from "@ionic-native/local-notifications";

import { API } from '../providers/api';
import { CourseData } from '../providers/course-data';
import { SurveyData } from '../providers/survey-data';

// Connect somebody (verify if ldap and password are corresponding)
// and download the list of his courses
// If stayConnected save the data in the local storage
// Now it works with .json files in assets/data_offline_version/

@Injectable()
export class StudentsData{
  ldap: string; // id like vorname.name@enpc.fr
  token: any; // token used for authentication
  connected: boolean = false;
  courses: Array<CourseData> = []; // list of courses
  notifPermission: boolean = false; // to know if there is a notif scheduled

  constructor(public http: HttpClient,
              public surveyData:SurveyData,
              private storage: Storage,
              public api: API,
              private alertCtrl:AlertController,
              private localNotif: LocalNotifications){


  }

  isAlreadyConnected(){
      return new Promise(resolve => {
          this.storage.get("token").then(token => {
            this.storage.get("ldap").then(res => {
            console.log(res)
            this.ldap = res;
            this.token = token;
            if(this.ldap != null && this.token != null){
              this.connected = true;
            }else{
              this.connected = false;
            }
            resolve (this.connected);
        })
      })
    });
  }

  connect(ldap: string, password: string, stayConnected: boolean){
    // stayConnected == true now
    stayConnected = true;

    if(this.api.noServer){
      return this.connect_noServer(ldap, password, stayConnected)
    }else{
      console.log("Trying to connect " + ldap);
      return new Promise((resolve, reject) => {
        this.http.post(this.api.url + "connect/",{
            username: ldap,
            password: password,
          })
        .subscribe((data: any) => {
          this.connected = true;
          if(this.connected){
            this.ldap = ldap;
            this.token = data.token;
          }
          console.log(data);
          this.storage.set("token", data.token);
          this.storage.set("ldap", ldap);
          resolve(this.connected);
        }, err => {
          console.log(err);
          if(err.status == 400){
            let alert = this.alertCtrl.create({
              title: 'Identifiant incorrect',
              subTitle: "L'identifiant ou le mot de passe est incorrect.",
              buttons: ['Ok']
            });
            alert.present();
          }else{
            let alert = this.alertCtrl.create({
              title: 'Aucun accès',
              subTitle: "L'application n'arrive pas à accéder au serveur d'authentification, réessayez ultérieurement.",
              buttons: ['Ok']
            });
            alert.present();
          }
        })
      })
    }
  }

  connect_noServer(ldap: string, password: string, stayConnected: boolean){
    this.courses = [];
    console.log("Trying to connect : " + ldap);
    this.ldap = ldap;
    return new Promise(resolve => {
      this.http.get('assets/data_offline_version/data_students.json')
      .subscribe((data: any) => {
        this.connected = (data.filter(h => h.LOGIN_LDAP == this.ldap).length > 0);
        console.log("Connected ? " + this.connected);
        resolve(this.connected);
      })
    })
  }

  getCoursesFromLocalStorage(){
    console.log("Trying to get courses from local storage for " + this.ldap);
    if(this.connected){
      this.storage.get("courses_data").then(res => {
      if(res != null){
        this.courses = res;
        return true;
      }
    });
    console.log("Nothing in local storage");
    return false; // nothing is in local storage
    }
    console.log("Nobody is connected");
    return false;
  }

  getCoursesOnline(){
    console.log("Trying to get courses for : " + this.ldap);
    if(this.connected){
      return new Promise(resolve =>
        {
          let url: string;
          if(this.api.noServer){
            url = 'assets/data_offline_version/modules.json';
          }else{
            url = this.api.url + "courses/" + this.ldap + "/";
          }
          console.log("Request : "+ url);
          console.log(this.token);
          this.http.get(url, {
            headers: {
                "Authorization": 'Token ' + this.token
            }
          })
          .subscribe((courses: any) =>
            {
              console.log(courses);
              this.courses = [];
              courses.map(x =>
                {
                  let c = new CourseData(x);
                  this.courses.push(c);
                });
                resolve(this.courses);
            }, err => {
              if(err.status == 401){
                let alert = this.alertCtrl.create({
                  title: 'Authentification impossible',
                  subTitle: "Vous devez vous reconnecter",
                  buttons: ['Ok']
                });
                alert.present();
              }else{
                let alert = this.alertCtrl.create({
                  title: 'Aucun accès',
                  subTitle: "L'application n'arrive pas à accéder au serveur d'authentification, réessayez ultérieurement.",
                  buttons: ['Ok']
                });
                alert.present();
            }
        })
    });
  }}

  sort_courses(course1: CourseData, course2: CourseData){
    if(course1.label < course2.label){
      return -1;
    }
    else{
      return 1;
    }
  }

  getCourses(){
    console.log("Trying to get courses for : " + this.ldap);
    if(this.courses.length > 0){
      console.log("Courses already loaded");
      return true;
    }
    if(this.connected){
      // get courses in local storage
      // We don't get courses from local storage anymore. We need internet connexion
      //if(this.getCoursesFromLocalStorage()){
      //  this.courses.sort(this.sort_courses);
      //  return true;
      //}else{
        this.getCoursesOnline().then(res => {
          console.log(res);
          this.courses.sort(this.sort_courses);
          this.localNotif.hasPermission().then(res => {
            if (res) {
              this.scheduleRemindNotif();
            }
          }, err => {
            console.log(err);
          });
        });
        return true;
      }
    //}
  }

  saveCourses(){
    console.log("Saving courses");
    this.storage.set("courses_data", this.courses);
    this.storage.get("courses_data").then(res => {console.log(res);})
  }


  // remove everything we already know from the smarphone
  // Caution : we have to send the answers.
  disconnect(){
    this.courses = [];
    console.log(this.ldap + " is now disconnected");
    this.connected = false;
    this.localNotif.hasPermission().then(res => {
      if (res) {this.localNotif.cancelAll();}
    }, err => {console.log(err);});
    this.storage.clear();
  }

  // return how many surveys it remains to answer
  // in order to schedule notifications
  CoursesToEvaluate() {
    let nbCoursesToEval: number = 0;
    for (let course of this.courses){
      if(new Date().getTime() - new Date(course.availableDate).getTime() >= 0){
        if(new Date().getTime() - new Date(course.commissionsDate).getTime() <= 0){
          if (!course.answered) {
            nbCoursesToEval += 1;
          }
        }
      }
    }
    return nbCoursesToEval;
  }
/*
  // Return the date of the last commission of the courses available
  deadline() {
    let deadlineDate: any = new Date();
    for (let course of this.courses) {
      if (!course.answered) {
        if (deadlineDate.getTime() < course.commissionsDate.getTime()) {
          deadlineDate = course.commissionsDate;
        }
      }
    }
    return deadlineDate;
  }
*/


// Schedule remind notifications every 3 days when a course is available
// Those notifications have the ID 1
  scheduleRemindNotif(){
    if (this.CoursesToEvaluate()>0){
      console.log("There are courses to evaluate : checking if there are notifications scheduled...");
      this.localNotif.isScheduled(1).then(res => {
        if (!res) {
          console.log("There aren't any remind notifications scheduled");
          var tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate()+1);
          tomorrow.setHours(18,0,0);
          this.localNotif.schedule({
            id: 1,
            title: 'Éval\'Ponts',
            text: 'Il te reste des cours à évaluer !',
            firstAt: tomorrow,
            every: "week"// 3 days in second
          });
        } else {
          console.log("Remind notifications are already scheduled...");
        }
      }, err => {
        console.log(err);
      });
    } else {
      console.log("There are not any courses to evaluate, cancelling remind notifications...")
      this.localNotif.cancel(1);
    }
  }

  /*getCoursesOnline_noServer(){
    this.courses = [];
    console.log("Trying to get courses (online) for " + this.ldap);
    if(this.connected){
      if(this.courses.length > 0){
        return Promise.resolve(this.courses);
      }else{
        return new Promise(resolve =>
          {
          this.http.get('assets/data_offline_version/data_students.json')
          .subscribe(courses =>
            {
            let raw:any = courses.filter(h => h.LOGIN_LDAP == this.ldap);
            //console.log(raw);
            raw.map(x =>
              {
              this.addCourse(x.CODE_MODULE, x.SC_GROUPE, false);
              });
            resolve(this.courses);
            })
          });
      }
    }else{
      console.log("Nobody is connected.");
    }
  }
  */

  /*addCourse(code_module: string, group: number, answered: boolean){
    console.log("Trying to add course with id : " + code_module);
    return new Promise(resolve => {
      this.http.get('assets/data_offline_version/data_courses.json')
      .subscribe(data => {
        let course = new CourseData(data.filter(h => h.Id == code_module)[0], group, answered);
        this.courses.push(course);
        if(data.filter(h => h.Id == code_module)[0]){
          console.log("Course : " + code_module + " is added");
        }
        resolve(this.courses);})
      })
  }*/

}
