import type { CameraIntrinsics, CameraParams } from './types'

const DEG = Math.PI / 180

/**
 * 由水平视场角与分辨率推算针孔相机内参（主点位于图像中心，方形像素）
 * @param fov - 水平视场角（度）
 * @param width - 图像宽度（像素）
 * @param height - 图像高度（像素）
 * @returns 内参
 */
export const intrinsicsFromFov = (fov: number, width: number, height: number): CameraIntrinsics => {
  const f = width / 2 / Math.tan((fov * DEG) / 2)
  return { fx: round(f), fy: round(f), cx: width / 2, cy: height / 2 }
}

/**
 * 由内参推算水平视场角
 * @param fx - 横向焦距（像素）
 * @param width - 图像宽度（像素）
 * @returns 水平视场角（度）
 */
export const fovFromIntrinsics = (fx: number, width: number) =>
  round((2 * Math.atan(width / 2 / fx)) / DEG)

/**
 * 保留 3 位小数
 * @param n - 数值
 * @returns 结果
 */
const round = (n: number) => Math.round(n * 1000) / 1000

/**
 * 修改相机参数；未标定时，FOV 或分辨率变化会同步重算内参
 * @param camera - 原参数
 * @param patch - 要修改的字段
 * @returns 新参数
 */
export const updateCamera = (camera: CameraParams, patch: Partial<CameraParams>): CameraParams => {
  const next = { ...camera, ...patch }
  const geometryChanged =
    patch.fov !== undefined || patch.width !== undefined || patch.height !== undefined
  if (!next.calibrated && geometryChanged && !patch.intrinsics) {
    next.intrinsics = intrinsicsFromFov(next.fov, next.width, next.height)
  }
  if (patch.intrinsics && patch.fov === undefined) {
    next.fov = fovFromIntrinsics(next.intrinsics.fx, next.width)
  }
  return next
}

type Json = Record<string, unknown>

/**
 * 读取有限数值
 * @param v - 任意值
 * @returns 数值；不是有限数值时返回 undefined
 */
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

/**
 * 读取数值数组（支持 OpenCV 的 { data: [...] } 写法）
 * @param v - 任意值
 * @returns 数值数组；格式不符时返回 undefined
 */
const numbers = (v: unknown): number[] | undefined => {
  const arr = Array.isArray(v)
    ? v.flat()
    : v && typeof v === 'object'
      ? (v as Json).data
      : undefined
  if (!Array.isArray(arr)) return undefined
  const out = arr.flat().map(num)
  return out.every((n) => n !== undefined) ? (out as number[]) : undefined
}

/**
 * 解析相机标定文件（JSON）。支持：
 * - 本格式的 camera 对象：{ width, height, intrinsics: { fx, fy, cx, cy }, distortion }
 * - OpenCV 风格：{ image_width, image_height, camera_matrix | K: 3×3, distortion_coefficients | dist_coeffs | D }
 * @param text - 文件内容
 * @param fallback - 原相机参数（文件缺少分辨率时沿用）
 * @returns 标定后的相机参数（calibrated 为 true）
 * @throws {Error} 无法识别内参时抛出
 */
export const importCalibration = (text: string, fallback: CameraParams): CameraParams => {
  let json: Json
  try {
    json = JSON.parse(text) as Json
  } catch {
    throw new Error('标定文件不是合法的 JSON')
  }
  const src = (json.camera && typeof json.camera === 'object' ? json.camera : json) as Json
  const width = num(src.width) ?? num(src.image_width) ?? fallback.width
  const height = num(src.height) ?? num(src.image_height) ?? fallback.height

  let intrinsics: CameraIntrinsics | undefined
  const inner = src.intrinsics as Json | undefined
  if (inner && [inner.fx, inner.fy, inner.cx, inner.cy].every((v) => num(v) !== undefined)) {
    intrinsics = { fx: inner.fx, fy: inner.fy, cx: inner.cx, cy: inner.cy } as CameraIntrinsics
  } else {
    const k = numbers(src.camera_matrix ?? src.K ?? src.k)
    if (k?.length === 9) intrinsics = { fx: k[0], fy: k[4], cx: k[2], cy: k[5] }
  }
  if (!intrinsics || intrinsics.fx <= 0 || intrinsics.fy <= 0) {
    throw new Error('未找到有效的相机内参（需要 intrinsics.fx/fy/cx/cy 或 3×3 camera_matrix / K）')
  }
  const distortion =
    numbers(src.distortion ?? src.distortion_coefficients ?? src.dist_coeffs ?? src.D) ??
    fallback.distortion
  const model =
    src.model === 'fisheye' || src.distortion_model === 'fisheye' ? 'fisheye' : fallback.model
  return {
    ...fallback,
    width,
    height,
    model,
    intrinsics,
    distortion,
    fov: fovFromIntrinsics(intrinsics.fx, width),
    calibrated: true,
  }
}
