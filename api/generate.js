export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { prompt } = await req.json();
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      throw new Error('API Key 未配置');
    }

    // 🔴 核心修改：深度优化的电商标题指令
    const systemPrompt = `
      你是一个精通抖音小店/淘宝搜索算法的【电商SEO专家】。
      
      【任务】
      用户输入产品词。请挖掘"蓝海长尾词"，并组合成3个"高权重堆砌标题"。
      
      【标题生成严格规则】(必须遵守！！！)
      1. **去空格：** 标题必须是【紧凑的字符串】，词与词之间【绝对不要】加空格！
      2. **字数控制：** 每个标题长度必须控制在 **28-30 个汉字** (约60字符)，尽量填满标题框，不要浪费字数！
      3. **堆砌逻辑：** 核心词前置 + 属性词 + 场景词 + 流量词 + 促销词。
      4. **禁止：** 禁止使用标点符号，禁止使用"震惊"等自媒体词汇。
      
      【输出格式】
      只返回纯 JSON：
      {
        "keywords": {
          "traffic": ["流量词1", "流量词2", "流量词3", "流量词4"],
          "scene": ["场景词1", "场景词2", "场景词3", "场景词4"],
          "pain": ["属性词1", "属性词2", "属性词3", "属性词4"]
        },
        "titles": [
          {
            "text": "核心词属性词场景词流量词修饰词(凑满30个字)", 
            "score": "搜索热度 99%"
          },
          {
            "text": "核心词长尾词属性词人群词(凑满30个字)", 
            "score": "搜索热度 96%"
          },
          {
            "text": "核心词节日词送礼词属性词(凑满30个字)", 
            "score": "搜索热度 93%"
          }
        ]
      }
    `;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `核心产品词：${prompt}。请生成无空格、满字数的SEO标题。` },
        ],
        temperature: 0.7,
        stream: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'API 请求失败');
    }

    let aiContent = data.choices[0].message.content;
    aiContent = aiContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonResult = JSON.parse(aiContent);

    return new Response(JSON.stringify(jsonResult), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}