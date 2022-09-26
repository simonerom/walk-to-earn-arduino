export interface FieldReg {
  reg: (opts?: { reg?: RegExp; len?: number }) => RegExp;
  message: (opts?: { msg?: string; len?: number }) => string;
}
