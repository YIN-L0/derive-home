// One interface for every model call the agents make, so an agent names a model and a schema
// and does not care which provider answers. Only OpenAI is wired up; a second provider is
// another function returning the same Provider shape.

export interface ModelCall {
  model: string
  system: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  name: string // schema name
  schema: unknown // JSON schema the answer must follow
  effort?: 'minimal' | 'low' | 'medium' | 'high' // reasoning models only
}

export interface Provider {
  id: string
  json: (call: ModelCall) => Promise<any>
}

// An error whose message is safe to show in the UI.
export class AgentError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export function openai(apiKey: string): Provider {
  return {
    id: 'openai',
    async json(call) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: call.model,
          // older chat models do not accept this field
          ...(call.model.startsWith('gpt-5') ? { reasoning_effort: call.effort ?? 'low' } : {}),
          messages: [{ role: 'system', content: call.system }, ...call.messages],
          response_format: { type: 'json_schema', json_schema: { name: call.name, strict: true, schema: call.schema } },
        }),
        signal: AbortSignal.timeout(58_000),
      })
      const data = (await res.json().catch(() => null)) as any
      if (!res.ok) {
        const detail = data?.error?.message ?? res.statusText
        console.error(`[agent:${call.name}] OpenAI ${res.status}: ${detail}`)
        throw new AgentError(502, `OpenAI (${call.model}) returned ${res.status}: ${detail}`)
      }
      const message = data?.choices?.[0]?.message
      if (message?.refusal) throw new AgentError(422, message.refusal)
      try {
        return JSON.parse(message.content)
      } catch {
        throw new AgentError(502, 'The model did not return valid JSON. Try again.')
      }
    },
  }
}

// Schema helpers: strict mode wants every property required and no extras.
export const str = { type: 'string' }
export const nullable = (type: string) => ({ type: [type, 'null'] })
export const obj = (properties: Record<string, unknown>) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
})
export const arr = (items: unknown) => ({ type: 'array', items })
