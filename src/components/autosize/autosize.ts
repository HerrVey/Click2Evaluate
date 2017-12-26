import {ElementRef, HostListener, Directive, OnInit} from '@angular/core';

@Directive({
  selector: 'ion-textarea[autosize]'
})

export class Autosize implements OnInit {
  @HostListener("input", ["$event.target"])
	onInput(textArea: HTMLTextAreaElement): void {
		this.adjust();
	}
	constructor(public element: ElementRef) {
	}
	ngOnInit(): void {
		this.adjust();
	}
	adjust(): void {
		let ta = this.element.nativeElement.querySelector("textarea");
		ta.style.overflow = "hidden";
		ta.style.height = "auto";
		ta.style.height = ta.scrollHeight + "px";
	}
}
