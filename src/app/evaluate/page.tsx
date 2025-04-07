"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase"; // Ensure correct path

export default function Evaluate() {
  const [rubricFile, setRubricFile] = useState<File | null>(null);
  const [promptFile, setPromptFile] = useState<File | null>(null);
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null); // Success/Error Messages
  const [studentNames, setStudentNames] = useState<string[]>(["", "", "", ""]); // Names for A, B, C, D
  const [testTopic, setTestTopic] = useState<string>(""); // Topic for the session
  const [apiStatus, setApiStatus] = useState<string | null>(null); // API Key Status

  //const [studentIDs, setStudentIDs] = useState<string[]>(["", "", "", ""]); // IDs for A, B, C, D

  useEffect(() => {
    const loadFiles = async () => {
      try {
        // 加载评分标准
        const rubricResponse = await fetch("/test/rubric.txt");
        if (!rubricResponse.ok) {
          throw new Error("Failed to load rubric file");
        }
        const rubricText = await rubricResponse.text();
        const rubricBlob = new Blob([rubricText], { type: "text/plain" });
        setRubricFile(
          new File([rubricBlob], "rubric.txt", { type: "text/plain" })
        );

        // 加载测试主题和创建 prompt 文件
        const promptResponse = await fetch("/test/prompt1.txt");
        if (!promptResponse.ok) {
          throw new Error("Failed to load prompt file");
        }
        const promptText = await promptResponse.text();
        // 设置测试主题
        setTestTopic(promptText.trim());
        // 同时用作 prompt 文件
        const promptBlob = new Blob([promptText], { type: "text/plain" });
        setPromptFile(
          new File([promptBlob], "prompt1.txt", { type: "text/plain" })
        );

        // 获取最新的转录内容
        const session_id = sessionStorage.getItem("session_id");
        const transcriptResponse = await fetch(
          "/api/transcript/latest" +
            (session_id ? `?session_id=${session_id}` : "")
        );

        // 如果响应不是200-299范围内的状态码，但是是404，我们认为是没有找到转录内容
        if (!transcriptResponse.ok && transcriptResponse.status !== 404) {
          throw new Error("Failed to load transcript");
        }

        if (transcriptResponse.ok) {
          const transcriptData = await transcriptResponse.json();
          if (transcriptData && transcriptData.content) {
            const transcriptBlob = new Blob([transcriptData.content], {
              type: "text/plain",
            });
            setTranscriptFile(
              new File([transcriptBlob], "transcript.txt", {
                type: "text/plain",
              })
            );
          }
        }

        // 如果没有找到转录内容，我们可以使用示例转录文件
        if (!transcriptFile) {
          const sampleTranscriptResponse = await fetch("/test/transcript1.txt");
          if (sampleTranscriptResponse.ok) {
            const sampleTranscriptText = await sampleTranscriptResponse.text();
            const transcriptBlob = new Blob([sampleTranscriptText], {
              type: "text/plain",
            });
            setTranscriptFile(
              new File([transcriptBlob], "transcript1.txt", {
                type: "text/plain",
              })
            );
            setApiStatus("Using sample transcript");
          } else {
            setApiStatus("No transcript found");
          }
        }

        // 获取当前用户信息
        const username = sessionStorage.getItem("username");
        if (username) {
          setStudentNames([username, "", "", ""]);
        }

        setApiStatus("Files loaded successfully");
      } catch (error) {
        console.error("Error loading files:", error);
        setApiStatus(
          error instanceof Error ? error.message : "Error loading files"
        );
      }
    };

    loadFiles();
  }, []);

  const checkApiKey = async () => {
    setApiStatus("Checking API key...");
    try {
      const response = await fetch("/api/check-key"); // New API Route for checking API key
      const data = await response.json();
      console.log("data message:", data.message);
      setApiStatus(data.message || "API Key check failed");
    } catch {
      setApiStatus("Error: Unable to check API key.");
    }
  };

  const handleEvaluate = async () => {
    if (!rubricFile || !promptFile || !transcriptFile || !testTopic) {
      setMessage(
        "❌ Please upload all files and provide a test topic before submitting."
      );
      return;
    }

    setLoading(true);
    setMessage("🔄 Resolving student names...");

    // **Step 1: Resolve student names to IDs**
    const resolvedUserIDs: string[] = [];
    for (const name of studentNames) {
      if (!name.trim()) {
        setMessage("❌ All student names must be filled.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("username", name)
        .single(); // Expecting each student name to be unique

      if (error || !data) {
        setMessage(`❌ Student "${name}" not found.`);
        setLoading(false);
        return;
      }
      resolvedUserIDs.push(data.id);
    }

    // **Step 2: Prepare FormData**
    setMessage("🔄 Evaluating... Please wait.");
    const formData = new FormData();
    formData.append("rubric", rubricFile);
    formData.append("prompt", promptFile);
    formData.append("transcript", transcriptFile);
    formData.append("student_ids", JSON.stringify(resolvedUserIDs));
    formData.append("test_topic", testTopic);

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Evaluation Completed! ${data.message}`);
        // 跳转到结果页面
        window.location.href = "/results";
      } else {
        setMessage(`❌ Error: ${data.error || "Evaluation failed"}`);
      }
    } catch {
      setMessage("❌ Evaluation error. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Mock Exam Evaluation</h1>

      {/* API Key Status Check Button */}
      <button
        onClick={checkApiKey}
        className="mb-4 px-4 py-2 bg-gray-500 text-white rounded"
      >
        Check API Key
      </button>
      {apiStatus && <p className="mb-4 text-gray-700">{apiStatus}</p>}

      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-lg">
        <label className="block font-semibold">Test Topic:</label>
        <input
          type="text"
          placeholder="Enter test topic"
          className="w-full p-2 border rounded mb-4"
          value={testTopic}
          onChange={(e) => setTestTopic(e.target.value)}
        />

        <label className="block font-semibold">Rubric File：</label>
        <input
          type="file"
          onChange={(e) => setRubricFile(e.target.files?.[0] || null)}
          className="mb-4"
        />

        <label className="block font-semibold">Prompt File</label>
        <input
          type="file"
          onChange={(e) => setPromptFile(e.target.files?.[0] || null)}
          className="mb-4"
        />

        <label className="block font-semibold">Transcript File</label>
        <input
          type="file"
          onChange={(e) => setTranscriptFile(e.target.files?.[0] || null)}
          className="mb-4"
        />

        <label className="block font-semibold">
          Student Names (A, B, C, D):
        </label>
        {studentNames.map((name, index) => (
          <input
            key={index}
            type="text"
            placeholder={`Student ${String.fromCharCode(65 + index)}`}
            className="w-full p-2 border rounded mb-2"
            value={name}
            onChange={(e) => {
              const newNames = [...studentNames];
              newNames[index] = e.target.value;
              setStudentNames(newNames);
            }}
          />
        ))}

        <button
          onClick={handleEvaluate}
          className="w-full bg-blue-500 text-white py-2 rounded"
          disabled={loading}
        >
          {loading ? "Evaluating..." : "Start Evaluation"}
        </button>
      </div>

      {/* Status Messages */}
      {message && <p className="mt-4 text-gray-700">{message}</p>}
    </div>
  );
}
