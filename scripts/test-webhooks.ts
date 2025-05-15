// scripts/test-webhooks.ts
const session_id = "1c325074-2929-4bbc-9a89-c5205610660e"; // 👈 替换为你要测试的 session_id

const payload = {
  record: {
    session_id,
  },
};

fetch("https://group-discussion-app-new.vercel.app/api/webhook/merge-transcript", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
})
  .then((res) => res.json())
  .then((data) => console.log("Response:", data))
  .catch((err) => console.error("Error:", err));