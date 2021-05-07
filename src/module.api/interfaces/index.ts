export type AppErrorMessage = string | ErrorMessage

export interface ErrorMessage {
  statusCode: number
  message: string
  error?: any
}
