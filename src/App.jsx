import { useEffect, useRef, useState } from 'react';

const API_URL = 'https://sync.fa11eaaf.er.aliyun-esa.net/';
const COLORS = [
  { name: '黑色', value: '#000000', class: 'bg-black' },
  { name: '红色', value: '#EF4444', class: 'bg-red-500' },
  { name: '橙色', value: '#F97316', class: 'bg-orange-500' },
  { name: '蓝色', value: '#3B82F6', class: 'bg-blue-500' },
  { name: '绿色', value: '#10B981', class: 'bg-emerald-500' },
  { name: '紫色', value: '#8B5CF6', class: 'bg-violet-500' },
  { name: '粉色', value: '#EC4899', class: 'bg-pink-500' },
  { name: '黄色', value: '#EAB308', class: 'bg-yellow-500' },
];

export default function App() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState({ sent: 0, received: 0, failed: 0, queue: 0 });
  const [showDebug, setShowDebug] = useState(false);
  const [debugLog, setDebugLog] = useState([]);
  const [showHelp, setShowHelp] = useState(false);

  // 用户信息
  const userIdRef = useRef(`user_${Math.random().toString(36).slice(2)}`);
  const userNameRef = useRef(`用户${Math.floor(Math.random() * 1000)}`);

  // 绘制状态
  const drawingRef = useRef(false);
  const currentStrokeIdRef = useRef(null);
  const pointsRef = useRef([]);

  // 同步状态
  const lastSyncRef = useRef(0);
  const knownStrokesRef = useRef(new Set());
  const receivedStrokesRef = useRef(new Set());
  const myStrokesRef = useRef(new Set());
  const fetchQueueRef = useRef([]);
  const isFetchingRef = useRef(false);

  // 发送队列
  const sendQueueRef = useRef([]);
  const sendingRef = useRef(false);

  // 调试日志
  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${msg}`);
    setDebugLog(prev => [...prev.slice(-9), `${time}: ${msg}`]);
  };

  /* ================= 初始化 ================= */
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;

    addLog('🎨 EdgeBoard 初始化完成');

    const handleResize = () => {
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.putImageData(image, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* ================= 阶段1: 发现新笔画 ================= */
  useEffect(() => {
    const discoverNewStrokes = async () => {
      try {
        const discoverUrl = `${API_URL}?since=${lastSyncRef.current}`;

        const res = await fetch(discoverUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(2000)
        });

        if (!res.ok) {
          addLog(`❌ 发现失败: ${res.status}`);
          setIsOnline(false);
          return;
        }

        const data = await res.json();
        setIsOnline(true);

        if (data.strokeIds && data.strokeIds.length > 0) {
          let newCount = 0;

          data.strokeIds.forEach(id => {
            if (!knownStrokesRef.current.has(id) &&
                !myStrokesRef.current.has(id) &&
                !fetchQueueRef.current.includes(id)) {
              knownStrokesRef.current.add(id);
              fetchQueueRef.current.push(id);
              newCount++;
            }
          });

          if (newCount > 0) {
            addLog(`🔍 发现 ${newCount} 个新笔画`);
          }

          if (data.serverTime) {
            lastSyncRef.current = data.serverTime;
          }
        }

      } catch (e) {
        if (e.name !== 'AbortError') {
          addLog(`❌ 发现异常: ${e.message}`);
          setIsOnline(false);
        }
      }
    };

    discoverNewStrokes();
    const timer = setInterval(discoverNewStrokes, 150);
    return () => clearInterval(timer);
  }, []);

  /* ================= 阶段2: 拉取笔画数据 ================= */
  useEffect(() => {
    const fetchStrokeData = async () => {
      if (isFetchingRef.current || fetchQueueRef.current.length === 0) return;

      isFetchingRef.current = true;

      try {
        const batch = fetchQueueRef.current.splice(0, 10);
        const fetchUrl = `${API_URL}?ids=${batch.join(',')}`;

        const res = await fetch(fetchUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(2000)
        });

        if (!res.ok) {
          fetchQueueRef.current.unshift(...batch);
          addLog(`❌ 拉取失败: ${res.status}`);
          setIsOnline(false);
          return;
        }

        const data = await res.json();
        setIsOnline(true);

        const ctx = ctxRef.current;
        let drawnCount = 0;

        if (data.actions && data.actions.length > 0) {
          data.actions
            .sort((a, b) => a.timestamp - b.timestamp)
            .forEach(action => {
              if (receivedStrokesRef.current.has(action.strokeId)) return;

              receivedStrokesRef.current.add(action.strokeId);

              // 只处理 stroke 类型，忽略 clear（防止自动清空）
              if (action.type === 'stroke') {
                drawStroke(ctx, action.points, action.color, action.lineWidth);
                drawnCount++;
              }
            });

          if (drawnCount > 0) {
            setStats(prev => ({ ...prev, received: prev.received + drawnCount }));
            addLog(`📥 绘制 ${drawnCount} 个笔画`);
          }
        }

        const missing = batch.filter(id =>
          !receivedStrokesRef.current.has(id)
        );

        if (missing.length > 0) {
          addLog(`⚠️ ${missing.length} 个未就绪，重试`);
          setTimeout(() => {
            fetchQueueRef.current.push(...missing);
          }, 500);
        }

      } catch (e) {
        if (e.name !== 'AbortError') {
          addLog(`❌ 拉取异常: ${e.message}`);
          setIsOnline(false);
        }
      } finally {
        isFetchingRef.current = false;
      }
    };

    const timer = setInterval(fetchStrokeData, 100);
    return () => clearInterval(timer);
  }, []);

  /* ================= 发送队列处理 ================= */
  useEffect(() => {
    const processSendQueue = async () => {
      if (sendingRef.current || sendQueueRef.current.length === 0) return;

      sendingRef.current = true;

      const batch = sendQueueRef.current.splice(0, 3);

      try {
        for (const action of batch) {
          try {
            const res = await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action),
              signal: AbortSignal.timeout(3000)
            });

            if (res.ok) {
              setStats(prev => ({
                ...prev,
                sent: prev.sent + 1,
                queue: sendQueueRef.current.length
              }));
              setIsOnline(true);
              addLog(`✅ 发送成功: ${action.strokeId.slice(-8)}`);
            } else {
              sendQueueRef.current.unshift(action);
              setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
              addLog(`❌ 发送失败: ${res.status}`);
              setIsOnline(false);
              break;
            }
          } catch (e) {
            sendQueueRef.current.unshift(action);
            setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
            addLog(`❌ 发送异常: ${e.message}`);
            setIsOnline(false);
            break;
          }

          await new Promise(r => setTimeout(r, 50));
        }
      } finally {
        sendingRef.current = false;
      }
    };

    const timer = setInterval(processSendQueue, 100);
    return () => clearInterval(timer);
  }, []);

  /* ================= 绘制函数 ================= */
  const drawStroke = (ctx, points, color, lineWidth) => {
    if (!points || points.length < 2) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  };

  /* ================= 获取坐标 ================= */
  const getCoordinates = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  /* ================= 绘制事件 ================= */
  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);

    drawingRef.current = true;
    currentStrokeIdRef.current = `${userIdRef.current}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    pointsRef.current = [{ x, y }];

    const ctx = ctxRef.current;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();

    const { x, y } = getCoordinates(e);
    pointsRef.current.push({ x, y });

    const ctx = ctxRef.current;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    if (!drawingRef.current) return;
    if (e) e.preventDefault();

    drawingRef.current = false;

    if (pointsRef.current.length > 1) {
      const strokeId = currentStrokeIdRef.current;
      const timestamp = Date.now();

      myStrokesRef.current.add(strokeId);
      knownStrokesRef.current.add(strokeId);
      receivedStrokesRef.current.add(strokeId);

      const action = {
        type: 'stroke',
        userId: userIdRef.current,
        userName: userNameRef.current,
        strokeId: strokeId,
        points: [...pointsRef.current],
        color: color,
        lineWidth: lineWidth,
        timestamp: timestamp,
      };

      sendQueueRef.current.push(action);
      setStats(prev => ({ ...prev, queue: sendQueueRef.current.length }));
      addLog(`✏️ 新笔画: ${pointsRef.current.length}点`);
    }

    pointsRef.current = [];
    currentStrokeIdRef.current = null;
  };

  /* ================= 清空 ================= */
  const handleRemoteClear = () => {
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    knownStrokesRef.current.clear();
    receivedStrokesRef.current.clear();
    fetchQueueRef.current = [];
    addLog('🗑️ 画布已清空');
  };

  const clearCanvas = () => {
    if (!window.confirm('确定要清空画布吗？这将影响所有用户。')) return;
    
    handleRemoteClear();
    myStrokesRef.current.clear();
    sendQueueRef.current = [];
    lastSyncRef.current = Date.now();

    const clearId = `clear_${Date.now()}`;
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'clear',
        userId: userIdRef.current,
        strokeId: clearId,
        timestamp: Date.now()
      }),
    }).catch(e => addLog(`清空失败: ${e.message}`));
  };

  /* ================= UI ================= */
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        onTouchCancel={stopDrawing}
        className="cursor-crosshair touch-none bg-white"
        style={{ touchAction: 'none' }}
      />

      {/* 顶部工具栏 */}
      <div className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-lg border-b border-gray-200 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* 左侧：Logo和标题 */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div className="hidden md:block">
                  <h1 className="text-lg font-bold text-gray-800">EdgeBoard</h1>
                  <p className="text-xs text-gray-500">实时协作白板</p>
                </div>
              </div>
            </div>

            {/* 中间：颜色选择器 */}
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-xs text-gray-600 hidden sm:inline">颜色:</span>
              <div className="flex gap-1.5">
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    title={c.name}
                    className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                      color === c.value 
                        ? 'border-gray-800 ring-2 ring-gray-300 scale-110' 
                        : 'border-gray-300 hover:border-gray-400'
                    } ${c.class}`}
                  />
                ))}
              </div>
            </div>

            {/* 右侧：画笔粗细和操作按钮 */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={lineWidth}
                  onChange={e => setLineWidth(Number(e.target.value))}
                  className="w-20 sm:w-24"
                />
                <span className="text-sm font-medium text-gray-700 w-6 text-center">{lineWidth}</span>
              </div>

              <button
                onClick={clearCanvas}
                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="hidden sm:inline">清空</span>
              </button>

              <button
                onClick={() => setShowHelp(!showHelp)}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                title="帮助"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 帮助面板 */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">欢迎使用 EdgeBoard</h2>
              <button 
                onClick={() => setShowHelp(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4 text-gray-600">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">🎨 功能特色</h3>
                <ul className="space-y-1 text-sm ml-4">
                  <li>• 实时多人协作绘画</li>
                  <li>• 基于阿里云ESA边缘函数，全球低延迟</li>
                  <li>• 无需注册登录，打开即用</li>
                  <li>• 支持电脑和手机触摸绘画</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">📖 使用说明</h3>
                <ul className="space-y-1 text-sm ml-4">
                  <li>• 选择颜色和画笔粗细开始绘画</li>
                  <li>• 您的绘画会实时同步给所有在线用户</li>
                  <li>• 点击清空按钮会清除所有用户的画布</li>
                  <li>• 打开多个浏览器窗口测试协作效果</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">⚡ 技术亮点</h3>
                <ul className="space-y-1 text-sm ml-4">
                  <li>• 边缘计算：利用3200+全球节点就近处理</li>
                  <li>• 零后端：无需传统服务器和数据库</li>
                  <li>• 高性能：EdgeKV存储 + 轮询同步机制</li>
                  <li>• 原生安全：DDoS防护 + WAF防火墙</li>
                </ul>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  由 <span className="font-semibold text-orange-600">阿里云ESA</span> 边缘函数驱动 ❤️
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 底部状态栏 */}
      <div className="fixed bottom-4 left-4 right-4 flex items-end justify-between gap-4 pointer-events-none">
        {/* 左侧：调试日志 */}
        <div className="pointer-events-auto">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="mb-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-medium transition-colors shadow-lg"
          >
            {showDebug ? '隐藏日志' : '显示日志'}
          </button>
          
          {showDebug && (
            <div className="bg-gray-900/95 backdrop-blur text-white px-4 py-3 rounded-xl shadow-2xl text-xs font-mono max-w-md max-h-48 overflow-y-auto border border-gray-700">
              {debugLog.length === 0 ? (
                <div className="text-gray-500">暂无日志...</div>
              ) : (
                debugLog.map((log, i) => (
                  <div key={i} className="whitespace-nowrap py-0.5 hover:bg-gray-800/50">{log}</div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 右侧：状态面板 */}
        <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-lg border border-gray-200 pointer-events-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="font-semibold text-gray-800 text-sm">{userNameRef.current}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isOnline ? '在线' : '离线'}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
              <span>发送: <span className="font-semibold text-gray-800">{stats.sent}</span></span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 13l5 5m0 0l5-5m-5 5V6" />
              </svg>
              <span>接收: <span className="font-semibold text-gray-800">{stats.received}</span></span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>队列: <span className="font-semibold text-gray-800">{stats.queue}</span></span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>失败: <span className="font-semibold text-gray-800">{stats.failed}</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* 离线提示 */}
      {!isOnline && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-fade-in z-20">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium">连接中断，正在重试...</span>
        </div>
      )}
    </div>
  );
}
