const uploadForm = document.getElementById("uploadForm");
const scriptLinkContainer = document.getElementById("scriptLinkContainer");
const askButton = document.getElementById("askButton");
let dynamicScriptId = null;

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(uploadForm);

  try {
    const response = await fetch("https://voiceoverpoj-1.onrender.com/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    dynamicScriptId = data.scriptId;

    // Display the script link
    scriptLinkContainer.innerHTML = `
      <p>Embed this script:</p>
      <pre>&lt;iframe src="https://voiceoverpoj-1.onrender.com/ask/${dynamicScriptId}" allow="microphone" style="border: none;"&gt;&lt;/iframe&gt;</pre>
    `;

    askButton.style.display = "block";
  } catch (error) {
    console.error("File upload error:", error);
    alert("Error uploading file.");
  }
});

// Ask Me Anything Button
askButton.addEventListener("click", () => {
  const greeting = new SpeechSynthesisUtterance("How can I help you?");
  window.speechSynthesis.speak(greeting);

  setTimeout(() => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";

    recognition.onresult = async (event) => {
      const question = event.results[0][0].transcript;
      try {
        const response = await fetch(`https://voiceoverpoj-1.onrender.com/process-speech/${dynamicScriptId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        });

        const data = await response.json();
        const answer = new SpeechSynthesisUtterance(data.answer);
        window.speechSynthesis.speak(answer);
      } catch (error) {
        console.error("Error processing speech:", error);
      }
    };

    recognition.onerror = (err) => {
      console.error("Speech recognition error:", err);
    };

    recognition.start();
  }, 1000);
});
