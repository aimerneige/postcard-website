# 手动发布指南

核对官方文档：2026-09-15。交付的 `dist` 为完整静态资源，可用同一份文件部署到仓库子路径或域名根路径。

## GitHub Pages：独立公开发布仓库

1. 用户自行创建一个新的独立公开仓库，用于存放构建产物。
2. 将 `dist` 内全部内容复制到该仓库根目录，保留 `assets/`、`licenses/`、`index.html` 和隐藏的 `.nojekyll`。不要放源码、原始 ZIP、测试样本、`node_modules` 或 `.local`。
3. 用户自行上传并提交。进入 Settings → Pages → Build and deployment，Source 选择 **Deploy from a branch**，选择发布分支与 **/(root)**，保存。
4. 等待平台完成发布后打开 `https://用户名.github.io/仓库名/`，检查选图、字体、PNG 和 PDF 下载。网站目录 URL 应以 `/` 结尾。

此流程使用预构建文件，项目无需创建 GitHub Actions 工作流。GitHub Pages 自身仍会运行平台的发布过程。

官方：[配置发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 自定义域名根路径

同一 `dist` 无需重建。用户在 GitHub Pages 设置中添加自己的域名，并按官方文档配置 DNS 与 HTTPS。域名设置可能生成 `CNAME` 文件，后续替换发布文件时保留该文件；通用 `dist` 不预设任何域名。

官方：[管理自定义域名](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)。

## Cloudflare Pages

用户在 Cloudflare 的 Workers & Pages 中创建 Pages Direct Upload 项目，将 `dist` 内容所在的文件夹或对应 ZIP 拖入上传。使用预构建产物，无需构建命令或后端。页面根路径与 GitHub Pages 仓库子路径使用相同资源。

官方：[Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)。

## Cloudflare Free CDN 代理 GitHub Pages

CDN 代理属于自定义域名的 DNS 配置；无法直接代理用户不控制的 `github.io` 域名。用户需先拥有并配置自己的域名、GitHub Pages 自定义域名与 HTTPS，再按 Cloudflare 当前指引配置 DNS 代理和端到端 HTTPS。发布前复核当前 Free 计划能力及两端设置，应用本身不依赖 CDN 特有功能。

官方：[Cloudflare 主区域设置](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)、[代理 DNS 记录](https://developers.cloudflare.com/dns/proxy-status/)、[Full (strict) TLS](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)。

## 路径兼容与更新

Vite `base: './'` 生成相对路径；单页面不使用路由，无硬编码仓库名称。构建中的字体、脚本、CSS 和延迟加载的 PDF 模块都按站点所在目录解析。

官方：[Vite 相对基础路径](https://vite.dev/guide/build#relative-base)。

更新时重新本地构建并替换发布产物；避免保留旧 `index.html` 的长时间 CDN 缓存。发布后检查浏览器控制台和资源加载。这里提供操作文档，未执行任何外部发布操作。
