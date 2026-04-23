// Frontend TTS utilities - Browser only, no Node.js modules

/**
 * Browser built-in TTS (Web Speech API)
 */
export function speak(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.rate = 1;
    window.speechSynthesis.speak(utter);
  } else {
    alert('Sorry, your browser does not support text-to-speech.');
  }
}

/**
 * Sarvam TTS using REST API (no npm package)
 * @param {string} text - The text to speak
 * @param {string} apiKey - Your Sarvam API key
 * @param {object} opts - Options: { sourceLang, targetLang, gender }
 */
export async function sarvamSpeak(text, apiKey, opts = {}) {
  if (!apiKey) {
    alert('Sarvam API key not set.');
    return;
  }
  try {
    const response = await fetch('https://tts.api.sarvam.ai/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text,
        source_language_code: opts.sourceLang || 'auto',
        target_language_code: opts.targetLang || 'en-IN',
        speaker_gender: opts.gender || 'Male',
      }),
    });
    if (!response.ok) throw new Error('TTS API error');
    const data = await response.json();
    if (!data.audio_url) throw new Error('No audio URL in response');
    const audio = new Audio(data.audio_url);
    audio.play();
  } catch (err) {
    alert('Sarvam TTS failed: ' + err.message);
  }
}