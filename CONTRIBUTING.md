# 贡献指南

感谢你对 EdgeBoard 项目的关注！我们欢迎任何形式的贡献。

## 如何贡献

### 报告 Bug

如果你发现了 bug，请通过 [GitHub Issues](https://github.com/yourusername/edgeboard-realtime-whiteboard/issues) 提交，并包含以下信息：

- Bug 的详细描述
- 复现步骤
- 期望的行为
- 实际的行为
- 浏览器和操作系统信息
- 截图（如果可能）

### 提出新功能

如果你有新功能的想法，欢迎提交 Feature Request：

1. 在 Issues 中描述你的想法
2. 说明为什么需要这个功能
3. 描述期望的使用场景
4. 等待社区讨论和反馈

### 提交代码

1. **Fork 项目**
   ```bash
   # 点击 GitHub 页面右上角的 Fork 按钮
   ```

2. **克隆到本地**
   ```bash
   git clone https://github.com/your-username/edgeboard-realtime-whiteboard.git
   cd edgeboard-realtime-whiteboard
   ```

3. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或
   git checkout -b fix/your-bug-fix
   ```

4. **安装依赖**
   ```bash
   npm install
   ```

5. **开发和测试**
   ```bash
   npm run dev
   ```

6. **提交更改**
   ```bash
   git add .
   git commit -m "feat: add some feature"
   # 或
   git commit -m "fix: fix some bug"
   ```

7. **推送到 GitHub**
   ```bash
   git push origin feature/your-feature-name
   ```

8. **创建 Pull Request**
   - 在 GitHub 上打开你的 Fork
   - 点击 "New Pull Request"
   - 填写 PR 描述
   - 等待审核

## 代码规范

### 提交信息格式

我们使用语义化的提交信息：

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链相关

示例：
```
feat: add eraser tool
fix: canvas resize issue on mobile
docs: update README with deployment guide
```

### JavaScript/React 规范

- 使用 ES6+ 语法
- 使用函数式组件和 Hooks
- 保持组件单一职责
- 添加必要的注释
- 使用有意义的变量名

### CSS 规范

- 使用 Tailwind CSS 工具类
- 保持一致的命名风格
- 避免内联样式（除非必要）

## 开发流程

### 本地开发

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 调试技巧

1. **前端调试**
   - 使用浏览器开发者工具
   - 查看 Console 和 Network 标签
   - 启用应用内的调试日志

2. **边缘函数调试**
   - 在 ESA 控制台查看函数日志
   - 使用 `console.log` 输出调试信息
   - 测试不同的请求场景

### 测试

目前项目暂无自动化测试，但我们鼓励：

- 手动测试所有修改的功能
- 在不同浏览器中测试（Chrome, Firefox, Safari）
- 在移动设备上测试
- 测试边缘情况和错误处理

## 项目结构

```
edgeboard-realtime-whiteboard/
├── src/
│   ├── App.jsx              # 主应用组件
│   ├── main.jsx             # 应用入口
│   └── index.css            # 全局样式
├── public/
│   └── favicon.svg          # 网站图标
├── sync.js                  # ESA边缘函数代码
├── index.html               # HTML模板
├── package.json             # 项目配置
├── vite.config.js           # Vite配置
├── tailwind.config.js       # Tailwind配置
├── README.md                # 项目文档
├── DEPLOYMENT.md            # 部署指南
├── CHANGELOG.md             # 更新日志
└── CONTRIBUTING.md          # 贡献指南（本文件）
```

## 代码审核

所有的 Pull Request 都会经过代码审核：

- 确保代码符合项目规范
- 验证功能是否正常工作
- 检查是否有性能问题
- 确认是否需要更新文档

## 社区准则

- 尊重所有贡献者
- 保持友好和专业
- 接受建设性批评
- 帮助新手上手

## 获取帮助

如果你在贡献过程中遇到问题：

- 查看 [README.md](README.md) 和 [DEPLOYMENT.md](DEPLOYMENT.md)
- 在 Issues 中搜索类似问题
- 创建新的 Issue 寻求帮助
- 加入讨论区与社区交流

## 许可证

通过向本项目提交代码，你同意你的贡献将使用 MIT 许可证授权。

---

再次感谢你的贡献！ ❤️
