# 场景编辑器技术预研：OpenDRIVE 路网 + 按帧编辑动态元素

> 参考原型：`docs/原型/M2场景编辑器_原型.html`
> 目标：路网静态数据符合 OpenDRIVE 规范；动态元素支持按帧编辑。
> 状态：预研结论，选型待定（标注「待决策」的项需确认后再实施）。

## 1. 结论

**两件事都能实现，原型的思路可以沿用**：

- 编辑时使用「参考线 + 车道配置」，导出时生成 XODR。
- 动态元素使用「关键帧 + 插值」。

但原型当前导出的 XODR **尚不符合规范**，其中路口结构问题最大。要做到真正合规，需要先实现一个独立的纯 TS 路网几何核心，编辑器建在它上面。

## 2. 原型现状评估

评估范围：`rnFillets` / `rnGeo`（平面线形）、`rnXodrText`（XODR 导出）、`rnValidate`（校验）、`posAt` / `posSpline`（轨迹插值）。

### 2.1 已经正确的部分

- 平面线形为「直线 + 圆曲线」，对应 `<line/>` 与 `<arc curvature="±1/R"/>`；`s` 按弧长累加，`hdg` 与 y 轴翻转处理正确。
- 车道由参考线按宽度偏移生成；中心车道为 `lane 0`，左侧车道 id 为正、右侧为负，与规范一致。
- 信号的 `s / t` 采用 OpenDRIVE 口径（沿前进方向左侧为正）。
- 动态元素的关键帧存储绝对秒数，并能计算段速度和速度跳变。

### 2.2 不合规或缺失项

| # | 严重程度 | 问题 | 说明 |
| --- | --- | --- | --- |
| 1 | 高 | 路口结构错误 | `<connection>` 中直接写 `connectingRoad="出口道路"`。规范要求在路口内单独生成**连接道路**：带 `junction="路口 id"`，有自己的几何，并写好前驱和后继。需要重新设计。 |
| 2 | 高 | 缺少拓扑连接 | 所有道路都是空的 `<link/>`，没有 predecessor/successor；车道也没有 `<link>`，导致拓扑不连通。 |
| 3 | 中 | 信号属性可能不全 | 按 1.7 XSD（待用官方 XSD 核实），`dynamic`、`zOffset`、`subtype` 为必填，有 `value` 时必须带 `unit`；`hOffset` 单位应为弧度，需核实原型传入的单位；信号灯还需要 `dynamic="yes"` 和 `controller`。 |
| 4 | 中 | 曲率不连续 | 直线直接接圆弧，曲率会跳变。规范允许，但与真实道路不符，车辆沿路行驶时朝向会突变。建议后续加入缓和曲线（`<spiral>`）。 |
| 5 | 中 | 坐标系是像素换算 | 采用 `X = px/10`、`Y = (300 - py)/10`，没有 `geoReference`，也没有原点和投影定义。如需对接真实地图或仿真器，必须先统一坐标系。 |
| 6 | 中 | 轨迹与路网未关联 | 关键帧存储的是画布 x/y，插值方式为直线或 Catmull-Rom，车辆不会沿车道行驶，也无法按车道 `s / t` 编辑。 |
| 7 | 低 | 车道信息过于简单 | 各车道宽度均为常数、类型相同；外侧车道边线缺少 roadMark；无高程和超高（暂可按平面处理）。 |

## 3. 技术路线

### 3.1 路网：三层分离，核心模块与 React 无关

```
编辑模型（用户操作）   →   OpenDRIVE 模型（TS 类型）   →   XML 序列化 / 解析
控制点+半径+车道配置       Road/LaneSection/Lane/Junction      .xodr 导入 / 导出
        ↘ 几何核心：line/arc/spiral/paramPoly3 求值、s/t ↔ x/y、车道边界采样 ↙
```

**几何核心**（建议目录 `src/features/scene-editor/road-kernel/`，纯函数实现）：

- 每种几何段都提供：按 `s` 求位置、朝向和曲率；车道边界采样；投影 `xy → (road, lane, s, t)`。
- 缓和曲线需要计算 Fresnel 积分。
- 使用 Vitest 覆盖单元测试，这是整个方案中最需要测试保障的部分。

**路口连接道路自动生成**：

- 根据用户选择的车道连接关系，取入口车道末端和出口车道起点作为两个端点，用 `paramPoly3`（三次 Hermite 曲线）生成连接道路。RoadRunner、scenariogeneration 等工具也采用这种常见做法。
- 自动填写 `junction` 属性、道路前驱和后继，以及 `laneLink`。

**导入**：一般 XODR 可能包含多个 laneSection、宽度多项式、spiral 等内容，超出编辑模型的表达范围。建议分两档处理：

- 任意 XODR：只读显示。
- 符合子集的 XODR：可以编辑。

**校验分两层**：

1. 前端：结构校验（XSD）+ 业务校验（沿用原型 `rnValidate` 的规则并补全）。
2. 后端或 CI：使用 libOpenDRIVE、esmini 等成熟解析器回读导出文件。能正常加载、车道网格生成正常、拓扑连通，才算合规。

### 3.2 动态元素：存关键帧，按帧率采样

**数据模型**：

```ts
/** 动态对象的一个关键帧 */
interface Keyframe {
  /** 绝对时刻（秒） */
  t: number
  /** 位姿：世界坐标或车道坐标二选一 */
  pose:
    | { kind: 'world'; x: number; y: number; h: number }
    | { kind: 'lane'; roadId: string; laneId: number; s: number; offset: number }
}

/** 插值方式 */
type Interp = 'linear' | 'spline' | 'lane-follow'
```

**「按帧编辑」的语义**：

- 时间轴按帧率（由任务配置给出）量化，关键帧时刻吸附到帧的整数倍。
- 任意一帧的值都由插值计算得出；手动修改某一帧时，该帧自动成为关键帧。
- 不逐帧存储全量数据。规模参考：10 s × 30 fps × 几十个对象，实时插值没有压力。

**沿车道运动**：关键帧使用车道坐标时，通过几何核心把 `s` 映射为 x / y / 朝向。车辆会贴着车道行驶，朝向自然跟随。这依赖 3.1 的几何核心。

**导出**：

- **OpenSCENARIO 1.x（.xosc）**：通过 `RoadNetwork/LogicFile` 引用 .xodr；轨迹用 `Trajectory/Polyline`（顶点带时刻）或 `ClothoidSpline`，配合使用绝对时间的 `FollowTrajectoryAction`。这是行业标准，CARLA ScenarioRunner、esmini 等工具都能直接读取。
- **逐帧 JSON**：按帧率采样每个对象的位姿，直接提供给数据生成流程。

### 3.3 画布渲染（待决策）

原型使用 SVG，元素数量少时没有问题；真实路网元素增多后，拖拽和缩放会出现性能瓶颈。

| 方案 | 适用场景 | 代价 |
| --- | --- | --- |
| SVG + React | 实现最快，与原型一致 | 大型路网性能差 |
| Konva / react-konva（2D Canvas） | 编辑类交互（拖拽、命中检测）成熟 | 新增依赖 |
| PixiJS（WebGL 2D） | 元素多、回放性能要求高 | 交互需要自行封装 |
| Three.js / R3F | 需要 3D 预览、高程、传感器视角 | 2D 编辑体验需要额外打磨 |

**倾向**：2D 编辑使用 Konva，几何核心与渲染层解耦；后续需要 3D 预览时，再单独引入 Three.js。

其他待决策的依赖：

- XML 序列化：手写，或使用 `fast-xml-parser`。
- XSD 校验：前端用 `xmllint-wasm`，或放到后端执行。

### 3.4 状态管理

- 场景文档（路网 + 动态元素）放在独立的 Zustand store 中，与项目现有状态管理保持一致。
- 撤销 / 重做采用命令或快照模式（原型使用 `snapState` 快照，可以沿用）。
- 几何派生数据（车道边界、连接道路）通过纯函数计算并缓存，不写回 store。

### 3.5 开源方案调研（2026-11）

结论：**没有成熟的、可嵌入 Web（React）的开源 OpenDRIVE 编辑器**。现有开源编辑器都是桌面应用，Web 端项目只能查看、不能编辑。真正值得复用的是底层的解析、渲染、生成和校验库。

> 维护状态和协议来自搜索结果与已有了解，未逐个打开仓库核实；选用前需再确认仓库活跃度和 LICENSE。

**开源桌面编辑器**（可作为离线工具，无法嵌入）：

| 项目 | 技术 / 协议 | 状态 |
| --- | --- | --- |
| [ORBIT](https://vat.pages.dev/RI-SE/ORBIT)（RISE 瑞典研究院） | PyQt6 / GPL-3.0 | Beta，支持 OpenDRIVE 1.8，可基于航拍图绘制路网 |
| [LaneMaker](https://awesome.ecosyste.ms/projects/github.com%2Fguotata1996%2Flanemaker) | Qt5 / Apache-2.0 | v0.9；导出文件不完全符合规范，不能加载任意 xodr |
| [RoadMaker](https://github.com/Robomous/RoadMaker)（Robomous） | Qt6 + C++20 内核 / Apache-2.0 | 功能看起来最全，但尚未发布第一个正式版 |
| OpenRoadEd、ODDLOT（COVISE 组成部分） | C++ / 开源 | 老项目，基本不再维护，见 [awesome-openx](https://github.com/beneschwab/awesome-openx) |
| [RoadRunner_Rel](https://github.com/guotata1996/RoadRunner_Rel)（个人项目） | 可免费使用，源码不公开 | 不算开源；与 MathWorks 商业软件 RoadRunner 无关 |

**Web 端**（只能查看）：

- [opendrivejs](https://github.com/Saquib764/opendrivejs)：基于 three.js 在浏览器中渲染 xodr，车道支持仍很基础。
- [OpenDriveOnlineEditor](https://awesome.ecosyste.ms/projects/github.com%2FOlodus%2FOpenDriveOnlineEditor)：名为编辑器，但编辑功能未实现，2019 年后不再更新。

**可复用的底层库**（不在本次搜索结果中，基于已有了解，需核实）：

| 库 | 技术 / 协议 | 可用于 |
| --- | --- | --- |
| libOpenDRIVE | C++，Apache-2.0，可编译为 WebAssembly（odrviewer.io 基于它） | 浏览器内解析 xodr、生成车道网格；导入后只读显示；导出后回读校验 |
| esmini | C++，MPL-2.0 | 同时加载 xodr 和 xosc 并回放；后端或 CI 做合规与轨迹验证 |
| scenariogeneration | Python，MPL-2.0 | 用代码生成 xodr 和 xosc；可参考其路口连接道路生成逻辑，或作为后端生成方案 |

**协议注意**：GPL 协议的项目（如 ORBIT）不能把代码并入闭源产品；Apache、MPL 协议的可以复用（MPL 要求被修改的文件保持开源）。

**对技术路线的影响：可选的折中方案（待决策）**

| 路线 | 说明 | 优点 | 代价 |
| --- | --- | --- | --- |
| A. 全自研（本文 3.1–3.3） | 路网与动态元素都在 Web 编辑器中完成 | 一体化体验 | 工作量大；路口几何风险最高 |
| B. 外部建路网 + Web 编辑动态元素 | 复杂路网用外部工具（商业 RoadRunner，或 ORBIT、RoadMaker 等开源工具）制作；Web 端用 libOpenDRIVE（WebAssembly 版）导入并只读显示，重点做按帧编辑 | 绕开路口几何这一最大风险，交付快 | 用户要在两个工具之间切换；只读路网不能在线微调 |
| C. 混合 | 先按 B 落地；Web 端再提供直道、弯道、十字路口等简单路网的轻量编辑 | 风险分散，可渐进推进 | 需要同时维护导入链路和自研生成链路 |

选择取决于产品是否要求所有编辑都在网页内完成。

## 4. 风险

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 路口连接道路的几何与车道对齐 | 导出能通过 XSD 校验，但仿真器中车辆无法通行 | 尽早做技术验证，用 esmini/libOpenDRIVE 回读验证 |
| 下游消费方对规范的支持不完整 | 文件合规，但下游读取失败 | 先确认下游工具及版本，按其支持范围收窄特性 |
| 外部 XODR 导入后可编辑 | 编辑模型复杂度明显上升 | 首期只做只读导入 |
| 坐标系不统一 | 路网与动态元素、传感器对不齐 | 定义统一的米制坐标与原点，必要时加 `geoReference` |

## 5. 需要确认的事项

1. **下游消费方**：CARLA、esmini 还是自研渲染？这决定 OpenDRIVE 版本（1.6 还是 1.7）、动态元素用 xosc 还是逐帧 JSON，以及坐标系约定。
2. **是否需要导入外部 XODR 进行编辑**：如需要，编辑模型要直接采用 OpenDRIVE 模型，工作量明显上升。
3. **技术选型**：渲染方案、XML 序列化库、XSD 校验位置（见 3.3）。
4. **路网编辑路线**：全自研、外部建路网 + Web 编辑动态元素，还是混合（见 3.5）。

## 6. 建议实施顺序

1. 几何核心 + OpenDRIVE 类型 + 导出：补齐道路和车道 link、信号必填字段；用单元测试和 esmini/libOpenDRIVE 回读验证。
2. 路口连接道路自动生成（风险最高，建议先做技术验证）。
3. 画布编辑：参考线、车道、路口、标志。
4. 时间轴 + 关键帧 + 帧率采样；沿车道插值。
5. 导出 OpenSCENARIO 与逐帧 JSON；只读导入 XODR。
