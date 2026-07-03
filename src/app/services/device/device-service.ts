import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private readonly DEVICE_ID_KEY = 'device_id';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.initializeDeviceId();
  }

  private initializeDeviceId(): void {
    if (!this.isBrowser()) return;
    
    const existingId = localStorage.getItem(this.DEVICE_ID_KEY);
    if (!existingId) {
      const newId = this.generateUUID();
      localStorage.setItem(this.DEVICE_ID_KEY, newId);
    }
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  getDeviceId(): string | null {
    if (this.isBrowser()) {
      return localStorage.getItem(this.DEVICE_ID_KEY);
    }
    return null;
  }

  clearDeviceId(): void {
    if (this.isBrowser()) {
      localStorage.removeItem(this.DEVICE_ID_KEY);
      this.initializeDeviceId();
    }
  }
}