// ============================================
// ESA边缘函数 - 实时协作白板后端
// 混合方案：独立笔画存储 + 轻量级广播机制
// ============================================

const NAMESPACE = 'whiteboard';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const now = Date.now();

    try {
      const kv = new EdgeKV({ namespace: NAMESPACE });

      // ==================== POST ====================
      if (request.method === 'POST') {
        const action = await request.json();
        action.receivedAt = now;
        const key = action.strokeId;

        // 1. 写入笔画数据 (带重试)
        let writeSuccess = false;
        for (let retry = 0; retry < 3; retry++) {
          try {
            await kv.put(key, JSON.stringify(action));
            writeSuccess = true;
            break;
          } catch (e) {
            if (retry < 2) await delay(50 * (retry + 1));
          }
        }

        if (!writeSuccess) {
          return new Response(JSON.stringify({
            ok: false,
            error: 'Write failed'
          }), {
            status: 500,
            headers: CORS
          });
        }

        // 2. 添加到广播列表 (最近的笔画ID)
        await addToBroadcast(kv, action.strokeId, action.timestamp);

        return new Response(JSON.stringify({
          ok: true,
          key: key,
          serverTime: now
        }), {
          headers: CORS
        });
      }

      // ==================== GET ====================
      if (request.method === 'GET') {
        const url = new URL(request.url);
        const idsParam = url.searchParams.get('ids');
        const sinceParam = url.searchParams.get('since');

        // 模式1: 获取广播列表 (发现新笔画)
        if (!idsParam && sinceParam) {
          const since = parseInt(sinceParam);
          const broadcast = await getBroadcast(kv);

          // 返回since之后的strokeId列表
          const recentIds = broadcast.items
            .filter(item => item.ts > since)
            .map(item => item.id);

          return new Response(JSON.stringify({
            strokeIds: recentIds,
            serverTime: now,
            total: broadcast.items.length
          }), {
            headers: CORS
          });
        }

        // 模式2: 获取具体笔画数据
        if (idsParam) {
          const ids = idsParam.split(',')
            .map(id => id.trim())
            .filter(id => id.length > 0)
            .slice(0, 100);

          const results = await Promise.all(
            ids.map(async (id) => {
              for (let retry = 0; retry < 2; retry++) {
                try {
                  const data = await kv.get(id, { type: 'text' });
                  return data ? JSON.parse(data) : null;
                } catch (e) {
                  if (retry < 1) await delay(30);
                }
              }
              return null;
            })
          );

          const actions = results.filter(a => a !== null);

          return new Response(JSON.stringify({
            actions: actions,
            serverTime: now,
            requested: ids.length,
            found: actions.length
          }), {
            headers: CORS
          });
        }

        // 默认: 返回使用说明
        return new Response(JSON.stringify({
          error: 'Invalid request',
          usage: {
            discover: '?since=timestamp - 获取新的strokeId列表',
            fetch: '?ids=id1,id2,id3 - 获取具体笔画数据'
          }
        }), {
          headers: CORS
        });
      }

      // ==================== DELETE ====================
      if (request.method === 'DELETE') {
        // 清空广播列表
        try {
          await kv.put('broadcast', JSON.stringify({ items: [], version: Date.now() }));
        } catch (e) {
          // ignore
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: CORS
        });
      }

      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: CORS
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: error.message
      }), {
        status: 500,
        headers: CORS
      });
    }
  }
};

// ==================== 辅助函数 ====================

// 添加到广播列表 (简化版,减少竞态)
async function addToBroadcast(kv, strokeId, timestamp) {
  const BROADCAST_KEY = 'broadcast';
  const MAX_ITEMS = 200; // 只保留最近200个

  // 不重试,失败就失败 (广播是辅助功能)
  try {
    let broadcast = { items: [], version: 0 };

    try {
      const data = await kv.get(BROADCAST_KEY, { type: 'text' });
      if (data) {
        broadcast = JSON.parse(data);
      }
    } catch (e) {
      // 读取失败,使用空列表
    }

    // 检查是否已存在
    if (broadcast.items.some(item => item.id === strokeId)) {
      return; // 已存在,不重复添加
    }

    // 添加新项
    broadcast.items.push({ id: strokeId, ts: timestamp });

    // 保留最近的N个
    if (broadcast.items.length > MAX_ITEMS) {
      broadcast.items = broadcast.items.slice(-MAX_ITEMS);
    }

    broadcast.version = timestamp;

    // 写回 (不重试)
    await kv.put(BROADCAST_KEY, JSON.stringify(broadcast));

  } catch (e) {
    // 广播失败不影响主流程
    console.error('广播失败:', e);
  }
}

// 获取广播列表
async function getBroadcast(kv) {
  const BROADCAST_KEY = 'broadcast';

  try {
    const data = await kv.get(BROADCAST_KEY, { type: 'text' });
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.log('读取广播失败');
  }

  return { items: [], version: 0 };
}
