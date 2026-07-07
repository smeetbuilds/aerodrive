export {};

declare global {
  interface Navigator { hid: HID | undefined; }
  interface HID { requestDevice(options: HIDDeviceRequestOptions): Promise<HIDDevice[]>; }
  interface HIDDeviceRequestOptions { filters: HIDDeviceFilter[]; }
  interface HIDDeviceFilter { vendorId?: number; productId?: number; usagePage?: number; usage?: number; }
  interface HIDDevice extends EventTarget { opened: boolean; vendorId: number; productId: number; productName: string; open(): Promise<void>; close(): Promise<void>; sendReport(reportId: number, data: BufferSource): Promise<void>; addEventListener(type: 'inputreport', listener: (event: HIDReportEvent) => void): void; }
  interface HIDReportEvent extends Event { device: HIDDevice; reportId: number; data: DataView; }
}
