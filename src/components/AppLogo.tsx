import { useId } from 'react'

interface AppLogoProps {
  /** 边长（px），默认 32 */
  size?: number
  /** 额外类名 */
  className?: string
}

/**
 * 系统 Logo：地球（世界模型）+ 四角星（数据生成），品牌蓝渐变底。
 * 图形与 public/favicon.svg 保持一致，修改时需同步。
 * @param props.size - 边长（px）
 * @param props.className - 额外类名
 */
export const AppLogo = ({ size = 32, className }: AppLogoProps) => {
  // 同页多处渲染时避免渐变 / 遮罩 id 冲突
  const id = useId()
  const bg = `${id}-bg`
  const hl = `${id}-hl`
  const cut = `${id}-cut`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="世界模型数据生成系统"
      className={className}
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22c1f5" />
          <stop offset="1" stopColor="#0067c7" />
        </linearGradient>
        <linearGradient id={hl} x1="16" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity=".22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={cut} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
          <rect width="32" height="32" fill="#fff" />
          <circle cx="23.5" cy="8.5" r="5" fill="#000" />
        </mask>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${bg})`} />
      <rect width="32" height="16" rx="8" fill={`url(#${hl})`} />
      <g stroke="#fff" strokeLinecap="round" mask={`url(#${cut})`}>
        <circle cx="14.5" cy="17.5" r="8.25" strokeWidth="1.9" />
        <ellipse
          cx="14.5"
          cy="17.5"
          rx="3.4"
          ry="8.25"
          strokeWidth="1.5"
          strokeOpacity=".85"
          className="origin-[14.5px_17.5px] transition-transform duration-500 group-hover:scale-x-50 motion-reduce:transition-none"
        />
        <path d="M6.6 17.5h15.8" strokeWidth="1.5" strokeOpacity=".85" />
      </g>
      <path
        d="M23.5 4.3c.45 2.55 1.25 3.35 3.8 3.8-2.55.45-3.35 1.25-3.8 3.8-.45-2.55-1.25-3.35-3.8-3.8 2.55-.45 3.35-1.25 3.8-3.8Z"
        fill="#fff"
        stroke="#fff"
        strokeWidth=".9"
        strokeLinejoin="round"
        className="origin-[23.5px_8.1px] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-90 motion-reduce:transition-none"
      />
    </svg>
  )
}
