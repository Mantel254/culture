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

export async function askAI(payload: AIRequest) {
  console.log("AI Request Payload:", payload);
  const res = await fetch("http://127.0.0.1:8000/ai/api/ask/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`AI API error: ${res.status}`);
  }

  return res.json();
}

