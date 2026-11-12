/**
 * 关键帧轨迹与仿真时长的编辑：轨迹写入编辑器管理的 Story，或原地改写导入场景中已有的折线轨迹。
 */
import type { ElSpec } from '../dom'
import { build, cloneDoc, ensureChild, fmt, insertPretty, removePretty } from '../dom'
import type { Keyframe } from './edit-base'
import {
  childOf,
  childrenOf,
  cleanupEditorStory,
  managedGroup,
  PREFIX,
  revMinor,
  rootOf,
  setInitPose,
} from './edit-base'
import { EDITOR_STORY } from './types'

/**
 * 「仿真时间 ≥ 0 时触发」的 StartTrigger 描述
 * @param doc - 文档（决定规则名）
 * @param name - 条件名
 * @returns 元素描述
 */
const startAtZero = (doc: XMLDocument, name: string): ElSpec => [
  'StartTrigger',
  {},
  [
    [
      'ConditionGroup',
      {},
      [
        [
          'Condition',
          { name, delay: 0, conditionEdge: 'none' },
          [
            [
              'ByValueCondition',
              {},
              [
                revMinor(doc) >= 1
                  ? ['SimulationTimeCondition', { value: 0, rule: 'greaterOrEqual' }]
                  : ['SimulationTimeCondition', { value: -1, rule: 'greaterThan' }],
              ],
            ],
          ],
        ],
      ],
    ],
  ],
]

/**
 * 按轨迹方向补全关键帧朝向；原地不动的段沿用上一段朝向
 * @param kfs - 已按时刻排序的关键帧
 * @param fallback - 只有一个点时的朝向
 * @returns 带朝向的关键帧
 */
export const withHeadings = (kfs: Keyframe[], fallback = 0): Required<Keyframe>[] => {
  // 每段的方向；长度为 0 的段记为 undefined
  const seg = kfs.slice(0, -1).map((a, i) => {
    const b = kfs[i + 1]
    return Math.hypot(b.x - a.x, b.y - a.y) > 1e-3 ? Math.atan2(b.y - a.y, b.x - a.x) : undefined
  })
  const firstDir = seg.find((d) => d !== undefined) ?? fallback
  let last = firstDir
  return kfs.map((k, i) => {
    // 顶点朝向取其后一段方向，末点取前一段方向；原地不动时沿用上一个有效朝向
    const dir = seg[Math.min(i, seg.length - 1)]
    if (dir !== undefined) last = dir
    return { ...k, h: k.h ?? last }
  })
}

/**
 * Polyline 顶点元素描述
 * @param kfs - 关键帧
 * @returns Vertex 描述列表
 */
const vertexSpecs = (kfs: Required<Keyframe>[]): ElSpec[] =>
  kfs.map((k) => [
    'Vertex',
    { time: k.t },
    [['Position', {}, [['WorldPosition', { x: k.x, y: k.y, z: 0, h: k.h }]]]],
  ])

/**
 * 设置实体的关键帧轨迹。
 * - 传入 trajectoryIndex：原地改写该轨迹的顶点（用于导入场景中已有的折线轨迹）
 * - 否则写入编辑器管理的 Story（不存在时创建）
 * - 关键帧为空时删除编辑器生成的轨迹
 * - 首个关键帧同步为初始位置
 * @param doc - 原文档
 * @param name - 实体名
 * @param keyframes - 关键帧（会按时刻排序）
 * @param options.trajectoryIndex - 要改写的已有轨迹序号
 * @param options.syncInit - 是否把首个关键帧写回初始位置（默认是；首帧未变化时可传 false 以保留原有位置写法）
 * @returns 新文档
 */
export const setKeyframes = (
  doc: XMLDocument,
  name: string,
  keyframes: Keyframe[],
  { trajectoryIndex, syncInit = true }: { trajectoryIndex?: number; syncInit?: boolean } = {},
): XMLDocument => {
  const next = cloneDoc(doc)
  const sorted = [...keyframes].sort((a, b) => a.t - b.t)

  if (!sorted.length) {
    const group = managedGroup(next, name)
    if (group) removePretty(group)
    cleanupEditorStory(next)
    return next
  }

  const kfs = withHeadings(sorted)
  const first = kfs[0]
  if (syncInit)
    setInitPose(next, name, { kind: 'world', x: first.x, y: first.y, h: first.h }, false)
  if (sorted.length < 2 && trajectoryIndex === undefined) {
    // 只有一个点：只是初始位置，不需要轨迹
    const group = managedGroup(next, name)
    if (group) removePretty(group)
    cleanupEditorStory(next)
    return next
  }

  const existing =
    trajectoryIndex !== undefined
      ? next.getElementsByTagName('Trajectory')[trajectoryIndex]
      : managedGroup(next, name)?.getElementsByTagName('Trajectory')[0]

  if (existing) {
    const polyline = existing.getElementsByTagName('Polyline')[0]
    if (polyline) {
      for (const v of childrenOf(polyline, 'Vertex')) removePretty(v)
      for (const spec of vertexSpecs(kfs)) insertPretty(polyline, build(next, spec))
    }
    // 关键帧时刻按仿真绝对时间解释
    const follow = existing.closest('FollowTrajectoryAction')
    const timing = childOf(childOf(follow, 'TimeReference'), 'Timing')
    if (timing) timing.setAttribute('domainAbsoluteRelative', 'absolute')
    else {
      const ref = childOf(follow, 'TimeReference')
      if (ref) {
        for (const c of Array.from(ref.children)) removePretty(c)
        insertPretty(
          ref,
          build(next, ['Timing', { domainAbsoluteRelative: 'absolute', scale: 1, offset: 0 }]),
        )
      }
    }
    return next
  }

  // 创建编辑器管理的 Story / Act / ManeuverGroup
  const storyboard = ensureChild(rootOf(next), 'Storyboard')
  let story = childrenOf(storyboard, 'Story').find((s) => s.getAttribute('name') === EDITOR_STORY)
  if (!story) {
    story = insertPretty(
      storyboard,
      build(next, [
        'Story',
        { name: EDITOR_STORY },
        [['Act', { name: `${PREFIX}EditorAct` }, [startAtZero(next, `${PREFIX}ActStart`)]]],
      ]),
      childOf(storyboard, 'StopTrigger') ?? null,
    )
  }
  const act = childOf(story, 'Act') as Element
  const trajectory: ElSpec = [
    'Trajectory',
    { name: `${PREFIX}${name}_Trajectory`, closed: 'false' },
    [['Shape', {}, [['Polyline', {}, vertexSpecs(kfs)]]]],
  ]
  insertPretty(
    act,
    build(next, [
      'ManeuverGroup',
      { maximumExecutionCount: 1, name: `${PREFIX}${name}` },
      [
        ['Actors', { selectTriggeringEntities: 'false' }, [['EntityRef', { entityRef: name }]]],
        [
          'Maneuver',
          { name: `${PREFIX}${name}_Maneuver` },
          [
            [
              'Event',
              { name: `${PREFIX}${name}_Event`, priority: 'overwrite' },
              [
                [
                  'Action',
                  { name: `${PREFIX}${name}_Follow` },
                  [
                    [
                      'PrivateAction',
                      {},
                      [
                        [
                          'RoutingAction',
                          {},
                          [
                            [
                              'FollowTrajectoryAction',
                              {},
                              [
                                revMinor(next) >= 1
                                  ? ['TrajectoryRef', {}, [trajectory]]
                                  : trajectory,
                                [
                                  'TimeReference',
                                  {},
                                  [
                                    [
                                      'Timing',
                                      { domainAbsoluteRelative: 'absolute', scale: 1, offset: 0 },
                                    ],
                                  ],
                                ],
                                ['TrajectoryFollowingMode', { followingMode: 'position' }],
                              ],
                            ],
                          ],
                        ],
                      ],
                    ],
                  ],
                ],
                startAtZero(next, `${PREFIX}${name}_Start`),
              ],
            ],
          ],
        ],
      ],
    ]),
    childOf(act, 'StartTrigger') ?? null,
  )
  return next
}

/**
 * 设置仿真时长：修改编辑器写入的停止条件，没有时追加一个（与原有条件为「或」关系）
 * @param doc - 原文档
 * @param seconds - 时长（秒）
 * @returns 新文档
 */
export const setStopTime = (doc: XMLDocument, seconds: number): XMLDocument => {
  const next = cloneDoc(doc)
  const cond = Array.from(next.getElementsByTagName('Condition')).find(
    (c) => c.getAttribute('name') === `${PREFIX}StopTime`,
  )
  const sim = cond?.getElementsByTagName('SimulationTimeCondition')[0]
  if (sim) {
    sim.setAttribute('value', fmt(seconds))
    return next
  }
  const storyboard = ensureChild(rootOf(next), 'Storyboard')
  const stop = ensureChild(storyboard, 'StopTrigger')
  insertPretty(
    stop,
    build(next, [
      'ConditionGroup',
      {},
      [
        [
          'Condition',
          { name: `${PREFIX}StopTime`, delay: 0, conditionEdge: 'rising' },
          [
            [
              'ByValueCondition',
              {},
              [['SimulationTimeCondition', { value: seconds, rule: 'greaterThan' }]],
            ],
          ],
        ],
      ],
    ]),
  )
  return next
}

/**
 * 读取编辑器写入的仿真时长
 * @param doc - 文档
 * @returns 秒；没有时返回 undefined
 */
export const getStopTime = (doc: XMLDocument): number | undefined => {
  const cond = Array.from(doc.getElementsByTagName('Condition')).find(
    (c) => c.getAttribute('name') === `${PREFIX}StopTime`,
  )
  const v = Number(cond?.getElementsByTagName('SimulationTimeCondition')[0]?.getAttribute('value'))
  return Number.isFinite(v) && v > 0 ? v : undefined
}
