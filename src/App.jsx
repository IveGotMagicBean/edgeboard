import { useEffect, useRef, useState } from 'react';

const API_URL = 'https://sync.fa11eaaf.er.aliyun-esa.net/';
const COLORS = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];

export default function App() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState({ sent: 0, received: 0, failed: 0, queue: 0 });

  // 用户信息
  const userIdRef = useRef(`user_${Math.random().toString(36).slice(2)}`);
  const userNameRef = useRef(`用户${Math.floor(Math.random() * 1000)}`);

  // 绘制状态
  const drawingRef = useRef(false);
  const currentStrokeIdRef = useRef(null);
  const pointsRef = useRef([]);

  // 🆕 两阶段同步
  const lastSyncRef = useRef(0);  // 上次同步时间戳
  const knownStrokesRef = useRef(new Set());  // 已知的strokeId
  const receivedStrokesRef = useRef(new Set());  // 已绘制的strokeId
  const myStrokesRef = useRef(new Set());  // 我的strokeId
  
  // 发送队列
  const sendQueueRef = useRef([]);
  const sendingRef = useRef(false);

  /* ================= 初始化 ================= */
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;

    window.addEventListener('resize', () => {
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.putImageData(image, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    });
  }, []);

  /* ================= 🆕 阶段1: 发现新笔画 ================= */
  useEffect(() => {
    const discoverNewStrokes = async () => {
      try {
        // 获取since之后的新strokeId列表
        const res = await fetch(`${API_URL}?since=${lastSyncRef.current}`, {
          signal: AbortSignal.timeout(2000)
        });

        if (!res.ok) {
          setIsOnline(false);
          return;
        }

        const data = await res.json();
        setIsOnline(true);

        if (data.strokeIds && data.strokeIds.length > 0) {
          // 添加到已知列表
          let newCount = 0;
          data.strokeIds.forEach(id => {
            if (!knownStrokesRef.current.has(id)) {
              knownStrokesRef.current.add(id);
              newCount++;
            }
          });

          if (newCount > 0) {
            console.log(`🔍 发现 ${newCount} 个新笔画`);
          }

          // 更新同步时间戳
          lastSyncRef.current = data.serverTime;
        }

      } catch (e) {
        if (e.name !== 'AbortError') {
          setIsOnline(false);
        }
      }
    };

    discoverNewStrokes();
    const timer = setInterval(discoverNewStrokes, 200); // 200ms发现一次
    return () => clearInterval(timer);
  }, []);

  /* ================= 🆕 阶段2: 拉取笔画数据 ================= */
  useEffect(() => {
    const fetchStrokeData = async () => {
      try {
        // 找出需要拉取的strokeId (已知但未绘制)
        const toFetch = Array.from(knownStrokesRef.current)
          .filter(id => !receivedStrokesRef.current.has(id))
          .filter(id => !myStrokesRef.current.has(id))
          .slice(0, 20); // 每次最多20个

        if (toFetch.length === 0) return;

        const res = await fetch(`${API_URL}?ids=${toFetch.join(',')}`, {
          signal: AbortSignal.timeout(2000)
        });

        if (!res.ok) {
          setIsOnline(false);
          return;
        }

        const data = await res.json();
        setIsOnline(true);

        const ctx = ctxRef.current;
        let newCount = 0;

        data.actions.forEach(action => {
          if (receivedStrokesRef.current.has(action.strokeId)) return;

          receivedStrokesRef.current.add(action.strokeId);

          if (action.type === 'stroke') {
            drawStroke(ctx, action.points, action.color, action.lineWidth);
            newCount++;
          }

          if (action.type === 'clear') {
            handleRemoteClear();
          }
        });

        if (newCount > 0) {
          setStats(prev => ({ ...prev, received: prev.received + newCount }));
          console.log(`📥 绘制了 ${newCount} 个笔画`);
        }

      } catch (e) {
        if (e.name !== 'AbortError') {
          setIsOnline(false);
        }
      }
    };

    fetchStrokeData();
    const timer = setInterval(fetchStrokeData, 300); // 300ms拉取一次
    return () => clearInterval(timer);
  }, []);

  /* ================= 发送队列处理 ================= */
  useEffect(() => {
    const processSendQueue = async () => {
      if (sendingRef.current || sendQueueRef.current.length === 0) return;
      
      sendingRef.current = true;
      
      // 每次发送3个
      const batch = sendQueueRef.current.splice(0, 3);
      
      try {
        for (const action of batch) {
          try {
            const res = await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action),
            });
            
            if (res.ok) {
              setStats(prev => ({ 
                ...prev, 
                sent: prev.sent + 1,
                queue: sendQueueRef.current.length
              }));
              setIsOnline(true);
            } else {
              sendQueueRef.current.unshift(action);
              setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
              setIsOnline(false);
              break;
            }
          } catch (e) {
            sendQueueRef.current.unshift(action);
            setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
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
      
      // 标记为我的笔画
      myStrokesRef.current.add(strokeId);
      knownStrokesRef.current.add(strokeId);
      receivedStrokesRef.current.add(strokeId);

      // 加入发送队列
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
  };

  const clearCanvas = () => {
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
    }).catch(e => console.error('清空失败:', e));
  };

  /* ================= UI ================= */
  return (
    <div className="fixed inset-0">
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
        className="cursor-crosshair touch-none"
        style={{ touchAction: 'none' }}
      />

      <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg p-3 flex gap-2 md:gap-3 z-10 items-center">
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-6 h-6 md:w-8 md:h-8 rounded-full border-2 transition ${
              color === c ? 'border-gray-800 scale-110' : 'border-gray-300'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 hidden md:inline">粗细</span>
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={e => setLineWidth(Number(e.target.value))}
            className="w-16 md:w-24"
          />
          <span className="text-xs text-gray-600 w-6">{lineWidth}</span>
        </div>

        <button
          onClick={clearCanvas}
          className="px-2 py-1 md:px-3 md:py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition"
        >
          清空
        </button>
      </div>

      <div className="fixed bottom-4 right-4 bg-white/90 px-3 py-2 rounded shadow text-xs flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{userNameRef.current}</span>
        </div>
        <div className="text-gray-600 font-mono text-[10px]">
          发送: {stats.sent} | 接收: {stats.received} | 失败: {stats.failed}
        </div>
        <div className="text-gray-500 font-mono text-[10px]">
          队列: {stats.queue} | 已知: {knownStrokesRef.current.size}
        </div>
      </div>

      {!isOnline && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded shadow text-sm">
          ⚠️ 连接中断
        </div>
      )}
    </div>
  );
}
