export declare const color: {
  readonly ground: string;
  readonly surface: string;
  readonly panel: string;
  readonly derived: string;
  readonly ink: string;
  readonly steel: string;
  readonly mute: string;
  readonly line: string;
  readonly hair: string;
  readonly tag: string;
  readonly good: string;
  readonly warn: string;
  readonly danger: string;
  readonly info: string;
};

export type ToneName = 'neutral' | 'success' | 'warning' | 'danger' | 'pending';

export declare const tone: Record<ToneName, string>;

export declare const font: {
  readonly display: string;
  readonly displayBold: string;
  readonly body: string;
  readonly bodyMedium: string;
  readonly mono: string;
  readonly monoMedium: string;
};

export interface TypeStyle {
  readonly family: string;
  readonly size: number;
  readonly lineHeight?: number;
  readonly letterSpacing?: number;
  readonly uppercase?: boolean;
}

export declare const type: {
  readonly screenTitle: TypeStyle;
  readonly heading: TypeStyle;
  readonly cardTitle: TypeStyle;
  readonly sectionLabel: TypeStyle;
  readonly fieldLabel: TypeStyle;
  readonly body: TypeStyle;
  readonly helper: TypeStyle;
  readonly value: TypeStyle;
  readonly valueLarge: TypeStyle;
  readonly button: TypeStyle;
  readonly chip: TypeStyle;
};

export declare const space: {
  readonly xs: number;
  readonly sm: number;
  readonly md: number;
  readonly lg: number;
  readonly xl: number;
  readonly xxl: number;
};

export declare const radius: {
  readonly sm: number;
  readonly md: number;
  readonly pill: number;
};

export declare const border: {
  readonly hair: number;
  readonly base: number;
  readonly strong: number;
};

export declare const touch: {
  readonly min: number;
  readonly control: number;
};

export declare const role: {
  readonly gatedAction: string;
  readonly derivedField: string;
  readonly calloutBorder: string;
  readonly queued: string;
  readonly confirmed: string;
  readonly failed: string;
};
