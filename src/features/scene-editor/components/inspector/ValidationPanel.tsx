import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { Issue } from '../../core/validate'
import { useSceneEditorStore } from '../../stores/scene-editor-store'
import { Hint } from './fields'

const ICONS = {
  error: <CircleAlert size={15} strokeWidth={1.75} className="mt-0.5 shrink-0 text-danger" />,
  warning: <TriangleAlert size={15} strokeWidth={1.75} className="mt-0.5 shrink-0 text-warning" />,
  info: <Info size={15} strokeWidth={1.75} className="mt-0.5 shrink-0 text-fg-3" />,
}

/**
 * 校验面板：点击条目定位到对应目标物与关键帧
 * @param props.issues - 校验结果
 */
export const ValidationPanel = ({ issues }: { issues: Issue[] }) => {
  const select = useSceneEditorStore((s) => s.select)
  const setUi = useSceneEditorStore((s) => s.setUi)
  const blocking = issues.filter((i) => i.level !== 'info').length

  return (
    <div className="flex flex-col gap-2 p-3 text-[13px]">
      <div
        className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
          blocking ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'
        }`}
      >
        {blocking ? (
          <TriangleAlert size={16} strokeWidth={1.75} />
        ) : (
          <CircleCheck size={16} strokeWidth={1.75} />
        )}
        {blocking ? `发现 ${blocking} 个问题` : '未发现问题'}
        <span className="ms-auto">
          <Hint title="校验在浏览器中进行；导出后可用 esmini 等仿真器做最终确认" />
        </span>
      </div>
      <ul className="space-y-0.5">
        {issues.map((issue, i) => (
          <li key={i}>
            <button
              type="button"
              disabled={!issue.entity}
              onClick={() => {
                if (!issue.entity) return
                select(issue.entity, issue.keyIndex)
                setUi({ inspectorTab: 'entity' })
              }}
              className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-fg-2 transition-colors focus-visible:outline-2 focus-visible:outline-primary enabled:cursor-pointer enabled:hover:bg-sunken"
            >
              {ICONS[issue.level]}
              <span>{issue.message}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
