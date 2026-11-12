import type { TourProps } from 'antd'
import { Tour } from 'antd'

/**
 * 按 data-tour 属性查找引导目标
 * @param name - data-tour 的值
 * @returns 返回目标元素的函数。antd 的类型要求返回 HTMLElement，
 *   但元素不存在时返回 null 也可以（该步骤居中显示），因此这里做类型断言
 */
const target = (name: string) => (): HTMLElement =>
  document.querySelector<HTMLElement>(`[data-tour="${name}"]`) as HTMLElement

/** 快捷键说明 */
const SHORTCUTS: [string, string][] = [
  ['V / H / D', '选择 / 平移 / 绘制轨迹'],
  ['空格', '播放 / 暂停'],
  ['← →', '逐帧'],
  ['Delete', '删除选中的关键帧或目标物'],
  ['⌘Z / ⌘⇧Z', '撤销 / 重做'],
  ['⌘S', '保存草稿；在 XML 编辑器内为应用修改'],
  ['F', '适应视图'],
]

const STEPS: TourProps['steps'] = [
  {
    title: '添加目标物',
    description: '从元件库拖到画布上，或单击添加到视野中心。场景里的第一辆车会自动设为自车。',
    target: target('palette'),
    placement: 'right',
  },
  {
    title: '在画布上编辑',
    description: '拖动目标物调整位置，滚轮缩放。选中目标物后，可拖动轨迹上的关键帧。',
    target: target('canvas'),
    placement: 'bottom',
  },
  {
    title: '工具栏',
    description:
      '切换选择、平移、绘制轨迹工具；绘制轨迹时在画布上逐点单击。右侧可开关图层和车道吸附。',
    target: target('canvas-toolbar'),
    placement: 'bottom',
  },
  {
    title: '时间轴',
    description:
      '播放预览运动。把播放头移到某一时刻再拖动目标物，会自动记录关键帧；拖动菱形可调整时刻。',
    target: target('timeline'),
    placement: 'top',
  },
  {
    title: '属性面板',
    description:
      '编辑目标物的属性和关键帧；在「自车」页签指定自车并配置传感器；「校验」页签列出待处理的问题。',
    target: target('inspector'),
    placement: 'left',
  },
  {
    title: '导入文件',
    description: '可同时选择 .xodr、.xosc 和传感器配置 .json，也可以直接拖到画布上。',
    target: target('import'),
    placement: 'bottom',
  },
  {
    title: '查看和修改 XML',
    description: '预览并直接编辑 OpenSCENARIO、OpenDRIVE 和传感器 JSON，⌘S 应用修改。',
    target: target('xml'),
    placement: 'bottomRight',
  },
  {
    title: '导出',
    description: '分别导出场景、路网和传感器配置；「保存」将草稿存到本地浏览器。',
    target: target('export'),
    placement: 'bottom',
  },
  {
    title: '常用快捷键',
    description: (
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
        {SHORTCUTS.map(([keys, desc]) => (
          <div key={keys} className="contents">
            <dt className="font-mono text-fg-2">{keys}</dt>
            <dd>{desc}</dd>
          </div>
        ))}
      </dl>
    ),
    target: null,
  },
]

interface EditorTourProps {
  open: boolean
  onClose: () => void
}

/**
 * 场景编辑器使用引导
 * @param props.open - 是否打开
 * @param props.onClose - 关闭或完成时调用
 */
export const EditorTour = ({ open, onClose }: EditorTourProps) => (
  <Tour
    open={open}
    steps={STEPS}
    onClose={onClose}
    onFinish={onClose}
    indicatorsRender={(current, total) => (
      <span className="text-xs text-fg-3 tabular-nums">
        {current + 1} / {total}
      </span>
    )}
  />
)
