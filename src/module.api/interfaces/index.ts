export type ErrorMessage =
  | string
  | {
    code: number
    message: string
    error?: any
  }
