import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';
import { Storage } from '@ionic/storage';

import { CourseData } from '../providers/course-data';
import { Question } from '../providers/question';


// This file provides tools for survey
// It selects the kind of survey ('Classique', 'Projet'...) and generates the survey
// It saves the results in the local storage and upload them asap

@Injectable()
export class SurveyData{
  course: CourseData;
  survey: Array<Question> = []  // both questions and answers

  constructor(public http: Http, private storage: Storage){
  }

  save(){
    for(let question of this.survey){
      console.log("saving " + this.course.id + question.id + " : " + question.answer)
      this.storage.set(this.course.id + question.id, question.answer);
    }
  }

  // generates the survey corresponding to the course and
  // look in the local storage if we already begin it
  getSurvey(course:CourseData){
    this.course = course;
    this.survey = [];
    //this.survey = this.storage.get(this.course.id);

    console.log("Trying to generate survey for course : " + course.id + " typeForm : " + course.typeForm);
    return new Promise(resolve => {
      this.http.get('assets/data/typeForm/'+ course.typeForm +'.json')
      .map(res => res.json())
      .subscribe(s =>
        {
          s.map(q => {
            let qq: Question = new Question(q);
            this.storage.get(this.course.id + qq.id).then(ans =>{
              if(ans != null){
              qq.answer = ans;
              this.survey.push(qq);
            }
            });
          });
          console.log("done");
          console.log(this.survey);
          resolve(this.survey);
      })
    })
  }


  // save the survey in the local storage
  saveSurvey(){

  }

  // upload the survey
  uploadSurvey(){

  }
}