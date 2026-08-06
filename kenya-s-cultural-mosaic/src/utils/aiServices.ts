// type AIRequest = {
//   message: string;
//   page: string;
//   selectedText?: string;
// };
type AIRequest = {
  message: string;
  page?: string;
  url?: string;
  pageTitle?: string;
  selectedText?: string | null;
  conversation_id?: string;
};

type AIResponse = {
  type: string;
  content: string;
  source?: string;
  action?: string;
  url?: string;
  selector?: string;
  conversation_id?: string;
  [key: string]: unknown;
};

export async function askAI(payload: AIRequest): Promise<AIResponse> {
  console.log("AI Request Payload:", payload);
  const res = await fetch("http://127.0.0.1:8000/ai/api/ask/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`AI API error: ${res.status}`);
  }

  const data = await res.json();
  console.log("AI Response Data:", data);
  
  return data;
}

