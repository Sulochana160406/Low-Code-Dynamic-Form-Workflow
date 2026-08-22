import { useRef, useState } from "react";

const SpeechRecognitionAPI =
  typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

function VoiceTextInput({ type = "text", value, onChange, ...rest }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const handleMicClick = () => {
    if (!SpeechRecognitionAPI) {
      alert("Voice input isn't supported in this browser. Try Chrome on desktop or Android.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onChange(value ? `${value} ${transcript}` : transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  return (
    <div className="voice-input-wrap">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
      {SpeechRecognitionAPI && (
        <button
          type="button"
          className={`voice-input-btn${listening ? " listening" : ""}`}
          onClick={handleMicClick}
          title={listening ? "Listening… click to stop" : "Speak your answer"}
        >
          🎤
        </button>
      )}
    </div>
  );
}

export default VoiceTextInput;