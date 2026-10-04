/** 驗證介面：本地開發在前端比對帳密，正式環境呼叫 Worker（ADR-0001、ADR-0002）。 */
export interface AuthService {
  /** 目前是否已登入 */
  checkSession(): Promise<boolean>
  /** 帳密正確時登入並回傳 true；錯誤時回傳 false，不區分是哪一個錯 */
  login(username: string, password: string): Promise<boolean>
  logout(): Promise<void>
}
