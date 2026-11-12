import { Group, Rect } from 'react-konva'
import type { OscEntity } from '../../core/openscenario/types'
import { shapeVariant } from './entity-variant'
import { objectParts } from './object-shapes'
import type { CanvasColors } from './palette'
import { createShapeKit } from './shape-kit'
import { roleBody, vehicleParts } from './vehicle-shapes'

interface EntityShapeProps {
  entity: OscEntity
  colors: CanvasColors
  active: boolean
  /** 一个屏幕像素对应的世界长度（米） */
  px: number
}

/**
 * 目标物的俯视轮廓：按类别与角色选择画法，按包围盒尺寸缩放，车头朝 +x。
 * 坐标系与父级实体 Group 一致（原点为参考点，包围盒中心位于 x = centerX）。
 */
export const EntityShape = ({ entity, colors, active, px }: EntityShapeProps) => {
  const { length: L, width: W, centerX: cx } = entity
  const body = roleBody(entity.role, colors) ?? colors[entity.kind]
  const ctx = { cx, L, W, colors, body, px }
  const kit = createShapeKit(ctx)
  const variant = shapeVariant(entity)
  const parts = vehicleParts(kit, ctx, variant, entity.role) ?? objectParts(kit, ctx, variant)

  // 选中框：包围盒外扩，保证小目标也清晰可见
  const pad = Math.max(0.25, 4 * px)
  return (
    <Group listening={false}>
      {parts}
      {/* 自车：常驻的虚线外框，与选中框区分 */}
      {entity.ego && !active && (
        <Rect
          x={cx - L / 2 - pad}
          y={-W / 2 - pad}
          width={L + pad * 2}
          height={W + pad * 2}
          cornerRadius={pad}
          stroke={colors.ego}
          strokeWidth={2}
          strokeScaleEnabled={false}
          dash={[6 * px, 4 * px]}
        />
      )}
      {active && (
        <Rect
          x={cx - L / 2 - pad}
          y={-W / 2 - pad}
          width={L + pad * 2}
          height={W + pad * 2}
          cornerRadius={pad}
          stroke={colors.selected}
          strokeWidth={2}
          strokeScaleEnabled={false}
          shadowColor={colors.selected}
          shadowBlur={10}
          shadowOpacity={0.6}
        />
      )}
    </Group>
  )
}
