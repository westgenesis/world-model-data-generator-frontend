import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** 登录令牌 */
export interface AuthTokens {
  /** 访问令牌 */
  accessToken: string
  /** 刷新令牌 */
  refreshToken: string
  /** 访问令牌有效秒数（登录/刷新接口返回），用于提前刷新 */
  expiresIn?: number
}

interface AuthState {
  /** 访问令牌，未登录时为 null */
  accessToken: string | null
  /** 刷新令牌，未登录时为 null */
  refreshToken: string | null
  /** access_token 过期时间戳（毫秒）；未知时为 null */
  accessTokenExpiresAt: number | null
  /** 保存登录 / 刷新后获得的令牌 */
  setTokens: (tokens: AuthTokens) => void
  /** 清空令牌（退出登录或令牌失效） */
  clear: () => void
}

/** 登录态，持久化到 localStorage */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      setTokens: ({ accessToken, refreshToken, expiresIn }) =>
        set({
          accessToken,
          refreshToken,
          accessTokenExpiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
        }),
      clear: () => set({ accessToken: null, refreshToken: null, accessTokenExpiresAt: null }),
    }),
    {
      name: 'wmdg-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

/**
 * 当前是否已登录，供路由守卫等非组件场景使用。
 * 持有访问令牌或刷新令牌都视为已登录：仅有刷新令牌时可在后续自动换取新访问令牌。
 * @returns 是否已登录
 */
export const isAuthenticated = (): boolean => {
  const { accessToken, refreshToken } = useAuthStore.getState()
  return Boolean(accessToken || refreshToken)
}

/** 提前刷新的安全边际（毫秒），避免令牌在请求途中过期 */
const REFRESH_MARGIN_MS = 30_000

/**
 * access_token 是否已过期或即将过期（需要提前刷新）。
 * 未记录过期时间（如旧版本持久化数据）时返回 false，交由 401 兜底刷新。
 * @returns 是否需要刷新
 */
export const isAccessTokenExpiring = (): boolean => {
  const { accessToken, accessTokenExpiresAt } = useAuthStore.getState()
  if (!accessToken || accessTokenExpiresAt === null) return false
  return Date.now() >= accessTokenExpiresAt - REFRESH_MARGIN_MS
}
