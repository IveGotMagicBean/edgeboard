// 极简同步服务 - 全局共享
// 部署在阿里云 ESA 边缘函数
let globalActions = [];
let users = {};

setInterval(() => {
  const now = Date.now();
  globalActions = globalActions.filter(a => now - a.timestamp < 600000);
  for (const uid in users) {
    if (now - users[uid].lastSeen > 30000) delete users[uid];
  }
}, 60000);

export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      const now = Date.now();

      if (request.method === 'POST') {
        const data = await request.json();
        const action = {
          ...data,
          id: `${data.userId}_${now}_${Math.random().toString(36).substr(2, 6)}`,
          timestamp: now
        };
        globalActions.push(action);
        if (globalActions.length > 500) globalActions = globalActions.slice(-500);
        users[data.userId] = {
          userId: data.userId,
          userName: data.userName || '匿名用户',
          lastSeen: now
        };
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      }

      if (request.method === 'GET') {
        const url = new URL(request.url);
        const since = parseInt(url.searchParams.get('since') || '0');
        const newActions = globalActions.filter(a => a.timestamp > since);
        return new Response(JSON.stringify({
          actions: newActions,
          users: Object.values(users),
          serverTime: now
        }), {
          headers: { 
            ...cors, 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
      }

      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json' 
        }
      });
    }
  }
};
