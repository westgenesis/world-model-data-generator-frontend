# 世界模型数据生成系统 · 前端

## 技术栈

| 分类      | 选型                                                    |
| --------- | ------------------------------------------------------- |
| 构建      | Vite + React 19 + TypeScript（SPA）                     |
| 包管理    | pnpm                                                    |
| UI 组件   | Ant Design 6（主题 token 见 `src/theme/antd-theme.ts`） |
| 样式      | Tailwind CSS v4（设计 token 见 `src/styles/index.css`） |
| 路由      | TanStack Router（文件路由，`src/routes`）               |
| 数据请求  | TanStack Query + ky + Zod 校验                          |
| 全局状态  | Zustand                                                 |
| 表单      | AntD Form + Zod                                         |
| 国际化    | i18next + react-i18next                                 |
| 接口 Mock | MSW                                                     |
| 代码规范  | ESLint + Prettier，lefthook + commitlint                |
| 测试      | Vitest + Testing Library，Playwright（E2E）             |

## 快速开始

```bash
pnpm install
pnpm dev
```

## 常用命令

| 命令                        | 说明                                                       |
| --------------------------- | ---------------------------------------------------------- |
| `pnpm dev`                  | 启动开发服务器（默认启用 MSW Mock）                        |
| `pnpm build`                | 生产构建并类型检查                                         |
| `pnpm lint` / `pnpm format` | 代码检查 / 格式化                                          |
| `pnpm test`                 | 单元测试（watch 模式）                                     |
| `pnpm test:e2e`             | E2E 测试（首次需 `pnpm exec playwright install chromium`） |

## Docker 部署

镜像为多阶段构建：`node:24-alpine` 打包，`nginx:stable-alpine` 提供静态资源并反向代理 `/api`。
后端地址在**容器启动时**注入，同一镜像可部署到任意环境。

各环境配置位于 `deploy/env/<环境>.env`（已入库，只放地址、端口等非敏感配置）：

| 文件                     | 环境   | 默认端口 |
| ------------------------ | ------ | -------- |
| `deploy/env/dev.env`     | 开发   | 8080     |
| `deploy/env/staging.env` | 预发布 | 8081     |
| `deploy/env/prod.env`    | 生产   | 80       |

```bash
pnpm docker:build    # 选择环境 → 构建镜像 → 询问是否启动
pnpm docker:logs     # 选择环境 → 跟踪日志
pnpm docker:down     # 选择环境 → 停止并移除容器
```

非交互（CI / 服务器脚本）：

```bash
pnpm docker:build --env prod --up      # 构建并启动
pnpm docker:build --env prod --no-up   # 只构建
pnpm docker:down --env prod
```

- **新增环境**：在 `deploy/env/` 下新建 `<名称>.env`，首行写 `# @label 显示名`，脚本会自动识别。
- **本机覆盖 / 敏感配置**：新建 `deploy/env/<环境>.local.env`（不入库），其中的值会覆盖同名配置。
- 各环境使用不同的 `COMPOSE_PROJECT_NAME` 与端口，可在同一台机器并存。

| 变量                       | 说明                                                        |
| -------------------------- | ----------------------------------------------------------- |
| `API_UPSTREAM`             | `/api/*` 转发的后端地址（路径原样透传，不去掉 `/api` 前缀） |
| `WEB_PORT`                 | 宿主机对外端口                                              |
| `IMAGE_NAME` / `IMAGE_TAG` | 镜像名与标签                                                |
| `COMPOSE_PROJECT_NAME`     | Compose 项目名，区分同机的多套环境                          |

- 不使用脚本时：`docker compose -f deploy/docker-compose.yml --env-file deploy/env/dev.env up -d --build`。
- 只用镜像时：`docker run -d -p 8080:80 -e API_UPSTREAM=http://backend:8080 <镜像>`。
- 健康检查：`GET /healthz` 返回 `ok`，镜像已内置 `HEALTHCHECK`。
- 缓存策略：`/assets/*` 长期缓存，`index.html` 不缓存，发版后刷新即生效。
- 配置文件：`deploy/docker-compose.yml`、`deploy/nginx/default.conf.template`、`scripts/docker.mjs`。

## 目录结构

```
src/
├── api/          # 接口定义：zod schema + queryOptions
├── app/          # 全局 Provider 与路由实例
├── components/   # 通用组件
├── config/       # 导航等静态配置
├── i18n/         # 国际化配置与语言包
├── layouts/      # 布局（顶栏 / 侧栏）
├── lib/          # http、queryClient、环境变量等基础设施
├── mocks/        # MSW Mock 接口
├── routes/       # 文件路由（routeTree.gen.ts 自动生成，勿手改）
├── stores/       # Zustand 全局状态
├── styles/       # 全局样式与 Tailwind 主题
├── test/         # 测试初始化
└── theme/        # antd 主题
```

## 环境变量

见 `.env.example`。本地覆盖请新建 `.env.local`。

- `VITE_ENABLE_MOCK=false` 关闭 Mock 后，`/api` 请求经 Vite 代理转发到 `VITE_PROXY_TARGET`。

## 约定

- 原型位于 `docs/原型`，新页面先对照原型实现。
- 新增菜单：在 `src/routes/_app/<模块>/` 下新建路由文件，并在 `src/config/navigation.ts` 的导航树与语言包中登记。导航树支持任意层级嵌套，面包屑与 ⌘K 搜索自动生效。
- 图标统一使用 `lucide-react`，默认 `strokeWidth={1.75}`，菜单/按钮尺寸 16–18。
- 颜色使用语义 token（如 `bg-card`、`text-fg-2`、`border-line`），不要写死色值，以保证暗色模式可用。
- 全屏页面（如场景编辑器）放在 `src/routes` 根层级，不经过 `_app` 布局。
- 注释使用中文，函数使用箭头函数并附 JSDoc，单文件不超过 500 行。
- 提交信息遵循 Conventional Commits（如 `feat: 新增任务列表`）。
