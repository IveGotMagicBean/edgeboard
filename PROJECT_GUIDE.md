# EdgeBoard 项目说明文档

## 📦 项目概述

EdgeBoard 是一个基于阿里云 ESA（边缘安全加速）的实时协作白板应用。它展示了如何利用边缘计算技术实现无服务器架构的实时协作应用。

## 🎯 核心特性

### 1. 现代化界面设计
- ✨ 采用 Material Design 设计语言
- 🎨 优化的颜色选择器（8种现代化配色）
- 📱 完全响应式设计，完美支持移动端
- 🌈 渐变背景和现代化UI组件
- 💫 流畅的动画效果和交互反馈

### 2. 增强的用户体验
- ❓ 内置帮助面板，新手友好
- 📊 实时状态监控（在线状态、发送/接收统计）
- 🐛 可选的调试日志查看器
- ⚠️ 清空画布前的确认提示
- 🔔 网络连接状态实时提示

### 3. 技术优势
- 🚀 基于阿里云 ESA 3200+ 全球边缘节点
- ⚡ 超低延迟（就近节点处理）
- 💰 零成本（免费套餐）
- 🔒 原生安全防护（DDoS + WAF）
- 📦 无需传统服务器和数据库

## 🏗️ 项目结构详解

```
edgeboard-realtime-whiteboard/
├── src/
│   ├── App.jsx              # 主应用组件（改进的UI和交互）
│   ├── main.jsx             # React 应用入口
│   └── index.css            # 全局样式（包含自定义动画）
│
├── public/
│   └── favicon.svg          # 渐变风格的画笔图标
│
├── sync.js                  # ESA边缘函数（后端逻辑）
│
├── 配置文件
│   ├── package.json         # 项目依赖和脚本
│   ├── vite.config.js       # Vite 构建配置
│   ├── tailwind.config.js   # Tailwind CSS 配置
│   ├── postcss.config.js    # PostCSS 配置
│   └── index.html           # HTML 模板
│
└── 文档
    ├── README.md            # 项目主文档（技术架构和使用说明）
    ├── DEPLOYMENT.md        # 详细部署指南
    ├── CONTRIBUTING.md      # 贡献指南
    ├── CHANGELOG.md         # 版本更新日志
    └── LICENSE              # MIT 开源许可证
```

## 🚀 快速开始

### 本地开发

```bash
# 1. 解压项目
unzip edgeboard-realtime-whiteboard.zip
cd edgeboard-realtime-whiteboard

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 访问 http://localhost:5173
```

### 构建部署

```bash
# 构建生产版本
npm run build

# 构建产物在 dist/ 目录
# 可以部署到任何静态托管服务
```

## 🌐 在线演示

访问 **https://edgeboard.fa11eaaf.er.aliyun-esa.net** 体验实时协作白板

**测试建议：**
1. 打开两个或多个浏览器窗口/标签页
2. 在一个窗口中绘画
3. 观察其他窗口的实时同步效果
4. 尝试不同的颜色和画笔粗细
5. 在手机上访问测试触摸绘画

## 🔧 为什么选择阿里云 ESA？

### 1. 边缘计算优势

阿里云ESA的各节点拥有集计算、存储和网络于一体的Serverless服务，为业务提供函数和Pages、镜像双形态部署、自动弹性扩缩容、KV存储等能力。对于实时协作应用来说：

- **就近处理**：请求自动路由到最近的边缘节点，大幅降低延迟
- **无需中心服务器**：EdgeKV 提供分布式存储，无需维护数据库
- **自动扩容**：根据流量自动调整资源，无需手动干预

### 2. 性能表现

ESA使用全新的日志采集和数据分析系统，使得数据采集的时效性可达到秒级别。实际测试表明：

- 笔画同步延迟 < 200ms（150ms 轮询间隔）
- 全球节点响应时间 < 50ms
- 支持高并发绘画场景

### 3. 安全防护

ESA使用原生DDoS防护、原生Web应用防火墙搭配阿里云自研机器学习算法，对每一次请求进行威胁检测，全球有超过20Tbps的边缘DDoS攻击防护资源储备。

- 自动防御 DDoS 攻击
- WAF 防护恶意请求
- 智能限频防止滥用

### 4. 成本优势

ESA的免费套餐是为开发者、个人项目及功能评估场景设计的入门级服务，完全免费，套餐支持0元购买和续费，包含不限量流量和请求数。

- **无限流量**：不用担心流量费用
- **无限请求**：适合高频同步场景
- **免费EdgeKV**：存储笔画数据无需额外费用
- **免费SSL证书**：自动HTTPS加密

### 5. 开发体验

ESA发布AI编程助手，支持以自然语言生成边缘应用与ESA访问控制策略，一键生成并自动部署，显著降低函数开发与运维门槛，缩短从构想到上线的周期。

- 简单的 JavaScript API
- 完善的开发文档
- 可视化监控面板
- 一键部署功能

## 📊 技术架构详解

### 前端架构

```
React 18 (UI框架)
    ↓
Canvas API (绘图引擎)
    ↓
Fetch API (网络请求)
    ↓
Tailwind CSS (样式系统)
```

**核心特性：**
- 函数式组件 + Hooks
- Canvas 2D 上下文优化
- 防抖和批量处理
- 响应式布局

### 后端架构（边缘函数）

```
用户请求
    ↓
ESA 边缘节点（就近路由）
    ↓
边缘函数（JavaScript）
    ↓
EdgeKV 存储（分布式KV）
    ↓
全球同步
```

**核心特性：**
- RESTful API 设计
- 独立笔画存储（避免竞态）
- 广播机制（新笔画发现）
- 错误重试机制

### 同步机制

EdgeBoard 采用三阶段同步策略：

```
阶段1：发现新笔画
  - 每 150ms 轮询广播列表
  - 获取 since 时间戳之后的新笔画 ID
  - 加入拉取队列

阶段2：拉取笔画数据
  - 批量获取笔画详细数据（每次最多 10 个）
  - 按时间戳排序
  - 绘制到本地画布

阶段3：发送笔画
  - 用户绘制完成后加入发送队列
  - 批量发送到边缘函数（每次最多 3 个）
  - 存储到 EdgeKV 并更新广播列表
```

**防竞态设计：**
- 每个笔画独立存储，使用唯一 ID
- 本地去重：knownStrokes、receivedStrokes、myStrokes
- 广播列表仅用于发现，不存储数据

## 🎨 UI/UX 改进

相比原版，新版本做了以下改进：

1. **顶部导航栏**
   - Logo 和应用名称
   - 现代化的颜色选择器
   - 集成的工具按钮

2. **帮助面板**
   - 新手引导
   - 功能说明
   - 技术亮点介绍

3. **状态面板**
   - 更美观的设计
   - 图标化展示
   - 实时统计数据

4. **调试工具**
   - 可折叠的日志面板
   - 高对比度显示
   - 鼠标悬停高亮

5. **颜色方案**
   - 8 种现代化配色
   - 更好的视觉反馈
   - 渐变背景

## 📚 使用 npm 构建

### 安装 Node.js

1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载并安装 LTS 版本（推荐 v18 或 v20）
3. 验证安装：
   ```bash
   node --version
   npm --version
   ```

### 项目依赖

项目使用的主要依赖包：

```json
{
  "dependencies": {
    "react": "^18.3.1",           // React 框架
    "react-dom": "^18.3.1"        // React DOM 渲染
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",  // Vite React 插件
    "autoprefixer": "^10.4.19",        // CSS 自动添加前缀
    "postcss": "^8.4.38",              // CSS 处理工具
    "tailwindcss": "^3.4.4",           // CSS 工具框架
    "vite": "^5.3.1"                   // 构建工具
  }
}
```

### 构建命令

```bash
# 开发模式（热重载）
npm run dev
# 访问 http://localhost:5173

# 生产构建
npm run build
# 输出到 dist/ 目录

# 预览构建结果
npm run preview
# 访问 http://localhost:4173
```

### 构建优化

项目已配置了以下优化：

1. **代码分割**：React 库单独打包
2. **Tree Shaking**：移除未使用的代码
3. **压缩**：JavaScript 和 CSS 压缩
4. **懒加载**：按需加载资源

## 🔐 安全和性能建议

### 安全配置

1. **限频控制**（推荐）
   - 在 ESA 控制台配置智能限频规则
   - 限制单 IP 请求频率
   - 防止恶意刷量

2. **防盗刷**（推荐）
   - 启用防盗刷功能
   - 设置异常流量告警
   - 配置流量封顶

3. **WAF 规则**（可选）
   - 自定义访问控制规则
   - 地域访问限制
   - User-Agent 过滤

### 性能优化

1. **启用缓存**
   - 静态资源缓存（HTML、CSS、JS）
   - EdgeKV 读缓存
   - 浏览器缓存策略

2. **压缩传输**
   - 启用 Gzip/Brotli
   - 减小传输体积
   - 加快加载速度

3. **CDN 加速**
   - 利用 ESA 全球节点
   - 静态资源就近分发
   - 降低源站压力

## 📖 进阶功能开发指南

### 添加新工具

在 `src/App.jsx` 中：

```javascript
// 1. 添加工具状态
const [currentTool, setCurrentTool] = useState('pen');

// 2. 修改绘制逻辑
const draw = (e) => {
  if (currentTool === 'eraser') {
    // 橡皮擦逻辑
  } else {
    // 画笔逻辑
  }
};

// 3. 添加UI按钮
<button onClick={() => setCurrentTool('eraser')}>
  橡皮擦
</button>
```

### 添加房间系统

在 `sync.js` 中：

```javascript
// 1. 修改 EdgeKV 键名
const key = `room_${roomId}_${action.strokeId}`;

// 2. 修改广播键
const BROADCAST_KEY = `broadcast_${roomId}`;

// 3. 前端传递房间ID
const action = {
  roomId: currentRoom,
  ...
};
```

### 添加导出功能

在 `src/App.jsx` 中：

```javascript
const exportCanvas = () => {
  const canvas = canvasRef.current;
  const dataURL = canvas.toDataURL('image/png');
  
  const link = document.createElement('a');
  link.download = 'edgeboard.png';
  link.href = dataURL;
  link.click();
};
```

## 🐛 故障排查

### 常见问题

1. **无法连接到边缘函数**
   - 检查 API_URL 配置
   - 确认边缘函数已部署
   - 查看浏览器控制台错误

2. **笔画不同步**
   - 确认 EdgeKV 命名空间正确
   - 检查网络请求是否成功
   - 查看调试日志

3. **性能问题**
   - 降低轮询频率（150ms → 300ms）
   - 减少批量传输大小
   - 清理旧的笔画数据

## 📞 技术支持

- **GitHub Issues**: 报告 bug 和功能请求
- **阿里云 ESA 文档**: https://help.aliyun.com/product/esa.html
- **在线演示**: https://edgeboard.fa11eaaf.er.aliyun-esa.net

## 📄 许可证

本项目采用 MIT 许可证开源，允许自由使用、修改和分发。

---

**EdgeBoard** - 基于阿里云 ESA 的实时协作白板 ❤️

由边缘计算驱动，为全球用户提供低延迟的协作体验。
