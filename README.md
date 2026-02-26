# 👅 TwistQuest – Tongue Twister Challenge

TwistQuest is an AI-powered tongue twister challenge game built with modern web technologies. Test your fluency across three difficulty levels, each with unique tongue twisters and a premium, animated UI.

## 🚀 Features

- **3 Difficulty Levels**: Easy (Level 1), Medium (Level 2), and Hard (Level 3).
- **AI Evaluation**: Real-time evaluation of speech accuracy (CER) and speed (WPM) using the Web Speech API and fallback evaluation logic.
- **Premium Design**: Modern aesthetic featuring animated background particles, glassmorphism, and a segmented "block-style" loading system.
- **Microphone Integration**: Uses the browser's MediaRecorder and Web Speech API for seamless voice input.
- **Developer Panel**: Built-in panel (accessible via `Ctrl+Shift+D`) to configure ASR API endpoints and test evaluation results.

## 🛠️ Technology Stack

- **Core**: HTML5, Vanilla JavaScript (ES6+)
- **Styling**: Premium CSS (Transitions, Gradients, Particles)
- **Speech**: Web Speech API (`SpeechRecognition`), MediaRecorder
- **Assets**: Hand-picked memes for success, fail, and evaluation states.

## 🎮 How to Play

1. **Start the Quest**: Hit the Start Quest button on the opening page.
2. **Accept Terms**: Read the short instructions and accept the terms.
3. **Select Level**: Start with Level 1 and advance through the quest.
4. **Speak Clearly**: Press "Start" in the level view, speak the tongue twister, and press "Stop" when done.
5. **Meet the Threshold**: You need accurate speech and high speed to pass.
6. **Watch Your Lives**: You have 3 hearts (❤️) per level. Lose them all, and it's Game Over!

## 🔧 Local Development

Simply open `index.html` in your browser.

> **Note**: For microphone permissions to be remembered, it is recommended to run the project via a local web server (e.g., VS Code Live Server extension).

## 👨‍💻 Contributing

This project is open for collaboration! To contribute:
1. Clone the repository.
2. Create a new branch for your feature.
3. Make your changes and test.
4. Push your branch and open a Pull Request.

---

*TwistQuest UI — Built for performance and fun.*
