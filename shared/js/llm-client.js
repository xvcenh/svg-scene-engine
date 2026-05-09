// AI Tavern v2.0 - LLM Client
// Unified LLM API interface with structured output support

const LLMClient = {
  _config: null,

  init(config) {
    this._config = config || Config;
  },

  getEndpoint() {
    return this._config.get('apiEndpoint');
  },

  getHeaders() {
    return this._config.getHeaders();
  },

  getConfig() {
    return {
      model: this._config.get('model'),
      temperature: this._config.get('temperature'),
      max_tokens: this._config.get('maxTokens')
    };
  },

  // Basic chat completion
  async chat(messages, options = {}) {
    const cfg = { ...this.getConfig(), ...options };
    const body = {
      model: cfg.model,
      messages,
      temperature: cfg.temperature,
      max_tokens: cfg.max_tokens
    };

    // Add response format if requested (for structured output)
    if (cfg.response_format) {
      body.response_format = cfg.response_format;
    }

    // Add tools/functions if provided
    if (cfg.tools) {
      body.tools = cfg.tools;
    }

    const response = await Utils.fetchWithTimeout(
      `${this.getEndpoint()}/chat/completions`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body)
      },
      cfg.timeout || 60000
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LLM API Error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.choices[0].message;
  },

  // Chat with structured JSON output
  async chatJSON(messages, schema = null) {
    const options = {
      response_format: { type: 'json_object' },
      temperature: 0.3  // Lower temp for structured output
    };

    const result = await this.chat(messages, options);

    try {
      return JSON.parse(result.content);
    } catch (e) {
      console.error('Failed to parse LLM JSON output:', result.content);
      return null;
    }
  },

  // Chat with structured JSON output + schema validation + fallback
  async chatStructured(messages, schema = null) {
    // Inject a system-level instruction to return valid JSON if not already present
    const structuredMessages = messages.map(m => ({ ...m }));
    const hasSystemMsg = structuredMessages.some(m => m.role === 'system');
    if (hasSystemMsg) {
      // Append JSON instruction to the existing system message
      const sysIdx = structuredMessages.findIndex(m => m.role === 'system');
      const jsonInstruction = '\n\n你必须以纯JSON格式回复，不要包含markdown代码块标记。JSON格式如下：\n' +
        '{"narration": "叙事文本（必填）", "scene_update": {"background": "背景ID", "add_assets": [{"id": "资产ID", "position": {"x": 0, "y": 0}, "animation": "walk-in"}], "remove_assets": [], "effects": []}, "choices": ["选项1", "选项2"], "state_changes": {"key": "value"}}\n' +
        'narration字段是必填的。其他字段可选，仅在需要更新场景、提供选择或修改状态时包含。';
      structuredMessages[sysIdx] = {
        ...structuredMessages[sysIdx],
        content: structuredMessages[sysIdx].content + jsonInstruction
      };
    }

    // Request JSON response format
    const options = {
      response_format: { type: 'json_object' },
      temperature: 0.4
    };

    const result = await this.chat(structuredMessages, options);
    const rawContent = result.content;

    // Try to parse as JSON
    let parsed = null;
    try {
      parsed = JSON.parse(rawContent);
    } catch (e) {
      // Fallback: strip markdown code fences if present
      try {
        const stripped = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        parsed = JSON.parse(stripped);
      } catch (e2) {
        console.warn('[LLMClient] JSON parse failed, building fallback structure from plain text.');
      }
    }

    // Validate required fields
    if (parsed) {
      // Ensure narration field exists
      if (!parsed.narration && typeof parsed === 'object') {
        // If there's a 'text' or 'content' field, use that as narration
        parsed.narration = parsed.text || parsed.content || rawContent;
      }
      return parsed;
    }

    // Final fallback: wrap plain text as structured response
    console.warn('[LLMClient] Returning fallback structured response.');
    return {
      narration: rawContent,
      scene_update: null,
      choices: null,
      state_changes: null
    };
  },

  // Simple text completion
  async complete(prompt, systemPrompt = null) {
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const result = await this.chat(messages);
    return result.content;
  },

  // Check if API is configured
  isReady() {
    return this._config && this._config.isConfigured();
  }
};
