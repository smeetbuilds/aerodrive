export {};

declare global {
  interface Navigator { gpu?: GPU; }
  interface GPU { requestAdapter(): Promise<GPUAdapter | null>; getPreferredCanvasFormat(): GPUTextureFormat; }
  interface GPUAdapter { requestDevice(): Promise<GPUDevice>; }
  interface GPUDevice { createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule; createRenderPipeline(descriptor: GPURenderPipelineDescriptor): GPURenderPipeline; createCommandEncoder(): GPUCommandEncoder; queue: GPUQueue; destroy(): void; }
  interface GPUQueue { submit(commandBuffers: GPUCommandBuffer[]): void; }
  interface GPUShaderModule {}
  interface GPURenderPipeline {}
  interface GPUCommandBuffer {}
  interface GPUCommandEncoder { beginRenderPass(descriptor: GPURenderPassDescriptor): GPURenderPassEncoder; finish(): GPUCommandBuffer; }
  interface GPURenderPassEncoder { setPipeline(pipeline: GPURenderPipeline): void; draw(vertexCount: number): void; end(): void; }
  interface GPUCanvasContext { configure(configuration: GPUCanvasConfiguration): void; getCurrentTexture(): GPUTexture; }
  interface GPUTexture { createView(): GPUTextureView; }
  interface GPUTextureView {}
  type GPUTextureFormat = string;
  type GPULoadOp = 'load' | 'clear';
  type GPUStoreOp = 'store' | 'discard';
  interface GPUCanvasConfiguration { device: GPUDevice; format: GPUTextureFormat; alphaMode?: 'opaque' | 'premultiplied'; }
  interface GPUShaderModuleDescriptor { label?: string; code: string; }
  interface GPURenderPipelineDescriptor { label?: string; layout: 'auto'; vertex: { module: GPUShaderModule; entryPoint: string }; fragment?: { module: GPUShaderModule; entryPoint: string; targets: Array<{ format: GPUTextureFormat }> }; primitive?: { topology: string }; }
  interface GPURenderPassDescriptor { colorAttachments: Array<{ view: GPUTextureView; clearValue?: { r: number; g: number; b: number; a: number }; loadOp: GPULoadOp; storeOp: GPUStoreOp }>; }
  interface HTMLCanvasElement { getContext(contextId: 'webgpu'): GPUCanvasContext | null; }
}
