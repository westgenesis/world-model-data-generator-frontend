# syntax=docker/dockerfile:1

# ---------- 构建阶段 ----------
FROM node:24-alpine AS build
WORKDIR /app

# 使用 package.json 中声明的 pnpm 版本
RUN corepack enable

# 先复制依赖清单以利用层缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

COPY . .

# 生产构建不启用 Mock；接口统一走相对路径 /api，由 nginx 在运行时代理
ENV VITE_API_BASE_URL=/api \
    VITE_ENABLE_MOCK=false
RUN pnpm build && rm -f dist/mockServiceWorker.js

# ---------- 运行阶段 ----------
FROM nginx:stable-alpine AS runtime

# 后端服务地址，容器启动时注入到 nginx 配置
ENV API_UPSTREAM=http://backend:8080 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/healthz || exit 1
