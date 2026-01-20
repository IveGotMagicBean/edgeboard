# EdgeBoard 部署指南

本文档详细介绍如何将 EdgeBoard 部署到阿里云 ESA 平台。

## 前提条件

1. 拥有阿里云账号并完成实名认证
2. 开通阿里云 ESA 服务（推荐使用免费套餐）
3. 准备一个域名（可选，用于自定义访问地址）

## 部署步骤

### 一、部署边缘函数

#### 1. 登录 ESA 控制台

访问 [阿里云 ESA 控制台](https://esa.console.aliyun.com/)

#### 2. 创建边缘函数

1. 在左侧菜单选择 **边缘计算** → **函数和 Pages**
2. 点击 **创建函数**
3. 填写函数信息：
   - 函数名称：`whiteboard-sync`
   - 描述：实时白板同步函数
   - 运行时：JavaScript

#### 3. 编写函数代码

将项目中的 `sync.js` 文件内容复制到函数编辑器中。

#### 4. 配置 EdgeKV 存储

1. 在 ESA 控制台，选择 **边缘计算** → **边缘存储（EdgeKV）**
2. 点击 **创建命名空间**
3. 命名空间名称：`whiteboard`
4. 选择地域：全球
5. 点击创建

#### 5. 部署函数

1. 保存函数代码
2. 点击 **部署** 按钮
3. 记录函数的访问地址，例如：`https://your-function.aliyun-esa.net/`

### 二、部署前端应用

#### 方式一：使用 ESA Pages（推荐）

1. 在 ESA 控制台，选择 **边缘计算** → **函数和 Pages**
2. 点击 **创建 Pages**
3. 选择部署方式：
   - 从 Git 仓库部署（推荐）
   - 上传构建产物

##### 从 Git 仓库部署

1. 连接你的 GitHub/GitLab 账号
2. 选择 EdgeBoard 项目仓库
3. 配置构建设置：
   - 构建命令：`npm run build`
   - 输出目录：`dist`
   - 环境变量：无需配置
4. 点击 **部署**

##### 上传构建产物

1. 在本地运行 `npm run build`
2. 将 `dist` 目录打包为 zip
3. 在 ESA 控制台上传 zip 文件
4. 点击 **部署**

#### 方式二：使用其他静态托管服务

EdgeBoard 也可以部署到以下平台：
- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages

只需将构建产物（`dist` 目录）上传到这些平台即可。

### 三、配置 API 地址

1. 打开 `src/App.jsx` 文件
2. 找到第 3 行的 `API_URL` 常量
3. 将其修改为你的边缘函数地址：

```javascript
const API_URL = 'https://your-function.aliyun-esa.net/';
```

4. 重新构建并部署

### 四、绑定自定义域名（可选）

如果你想使用自己的域名访问 EdgeBoard：

1. 在 ESA 控制台，选择你的 Pages 项目
2. 点击 **域名管理**
3. 添加自定义域名，例如：`edgeboard.yourdomain.com`
4. 按照提示配置 DNS 记录（CNAME）
5. 等待 SSL 证书自动签发（通常几分钟内完成）

## 本地开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173 即可在本地测试。

### 构建生产版本

```bash
npm run build
```

构建产物位于 `dist/` 目录。

### 预览构建结果

```bash
npm run preview
```

## ESA 免费套餐说明

阿里云 ESA 提供免费套餐，适合个人项目和开发测试：

- **流量**：无限量
- **请求数**：无限量
- **边缘函数**：支持
- **EdgeKV 存储**：支持
- **全球节点**：3200+ 节点
- **DDoS 防护**：基础防护
- **WAF 防火墙**：基础规则

每个账号可免费领取 1 个免费套餐，完全满足 EdgeBoard 的运行需求。

## 性能优化建议

1. **启用缓存**：在 ESA 控制台配置静态资源缓存规则
2. **开启压缩**：启用 Gzip/Brotli 压缩
3. **设置 CDN**：利用 ESA 的全球 CDN 加速静态资源
4. **监控告警**：配置流量和错误监控

## 安全建议

1. **限频控制**：在 ESA 控制台配置智能限频规则
2. **防盗刷**：启用防盗刷功能
3. **WAF 规则**：配置自定义 WAF 规则
4. **流量上限**：设置流量封顶，避免意外费用

## 故障排查

### 前端无法连接到边缘函数

1. 检查 `src/App.jsx` 中的 `API_URL` 是否正确
2. 在浏览器开发者工具中查看网络请求
3. 确认边缘函数已成功部署

### 笔画不同步

1. 查看浏览器控制台日志
2. 检查 EdgeKV 命名空间是否正确创建
3. 确认多个客户端使用相同的 API 地址

### 性能问题

1. 检查 ESA 控制台的性能监控
2. 优化轮询间隔（默认 150ms）
3. 减少批量传输的数据量

## 技术支持

如遇到问题，可以通过以下方式获取帮助：

- 提交 GitHub Issue
- 查看阿里云 ESA 官方文档
- 联系阿里云技术支持

## 相关链接

- [阿里云 ESA 官网](https://www.aliyun.com/product/esa)
- [阿里云 ESA 文档](https://help.aliyun.com/product/edge-security-acceleration.html)
- [EdgeBoard 在线演示](https://edgeboard.fa11eaaf.er.aliyun-esa.net)
- [项目 GitHub 仓库](https://github.com/yourusername/edgeboard-realtime-whiteboard)
