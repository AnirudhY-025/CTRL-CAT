declare module 'qrcode.react' {
  import * as React from 'react';

  export interface QRCodeSVGProps {
    value: string;
    size?: number;
    bgColor?: string;
    fgColor?: string;
    level?: 'L' | 'M' | 'Q' | 'H';
    includeMargin?: boolean;
    imageSettings?: {
      src: string;
      x?: number;
      y?: number;
      height?: number;
      width?: number;
      excavate?: boolean;
    };
  }

  export const QRCodeSVG: React.FC<QRCodeSVGProps>;
  export const QRCodeCanvas: React.FC<QRCodeSVGProps>;
}
