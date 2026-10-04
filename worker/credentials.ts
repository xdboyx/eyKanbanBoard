const encoder = new TextEncoder()

function sha256(text: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', encoder.encode(text))
}

/**
 * 以常數時間比對帳號與密碼。先各自取雜湊，讓比對的兩邊長度固定，不會從耗時推出長度；
 * 帳號與密碼都比對完才合併結果，不會因為帳號錯誤就提早結束。
 */
export async function credentialsMatch(
  input: { username: string; password: string },
  expected: { username: string; password: string },
): Promise<boolean> {
  const [inputUsername, expectedUsername, inputPassword, expectedPassword] = await Promise.all([
    sha256(input.username),
    sha256(expected.username),
    sha256(input.password),
    sha256(expected.password),
  ])
  const usernameMatches = crypto.subtle.timingSafeEqual(inputUsername, expectedUsername)
  const passwordMatches = crypto.subtle.timingSafeEqual(inputPassword, expectedPassword)
  return usernameMatches && passwordMatches
}
