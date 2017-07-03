import { isDevMode } from '@angular/core';

export  class GameSettings {
	maxHeigh: number = 128;
	websocketProtocol: string = "crafting";
	detroyTimeout: number = 1000;
	startColor: string = "#24dc27";
	websocketUrl: string = "ws://aedificem.tk:8080";

	constructor(){
		if (isDevMode())
			this.websocketUrl = "ws://localhost:8080";
	}
}