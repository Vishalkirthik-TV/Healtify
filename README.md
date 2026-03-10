# DermSight
### Conflict-Aware Multimodal Pre-Clinical Triage Platform

DermSight is an intelligent pre-clinical triage system that bridges the gap between how patients describe symptoms and how clinicians make decisions.  
It combines medical images, symptom input, body location, and temporal history to generate explainable early triage insights.

Unlike traditional symptom checkers, DermSight verifies whether patient-reported symptoms align with visual evidence, detects inconsistencies, tracks progression, and produces structured telehealth-ready reports.

---

## 🏃 How to Run the Application

The application consists of a **React Native (Expo)** frontend (`DermSight`) and a **Node.js/Express** backend (`backend`). 

### 1. Start the Backend Server
The backend handles API requests, database connections, and AI integrations (Gemini, Twilio).

1. Open a new terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install the necessary dependencies:
   ```bash
   npm install
   ```
3. Ensure your environment variables are configured in the `.env` file (e.g., MongoDB URI, Gemini API Key, Twilio credentials).
4. Run the server using nodemon for automatic reloading:
   ```bash
   npx nodemon server.js
   ```

### 2. Start the Frontend (Mobile App)
The frontend is built with React Native and Expo Router.

1. Open a second terminal and navigate to the frontend directory:
   ```bash
   cd DermSight
   ```
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server:
   ```bash
   npm start
   ```

### 3. Viewing the App
Once the Expo development server is running, it will display a QR code globally in the terminal.
- **Physical Device:** Download the **Expo Go** app on your iOS or Android device and scan the QR code. Ensure your device is on the same local network (Wi-Fi) as your PC.
- **Emulator:** Press `a` in the terminal to open the app via an installed Android emulator, or `i` for an iOS simulator.

---

## 🚀 Key Features

### 📷 Guided Multimodal Symptom Capture
- Image capture with structured intake
- Voice, text, and sign-based input
- Interactive body map selection
- Progressive, dynamic follow-up questions

### 🧠 Conflict-Aware Multimodal AI
- Combines image analysis + symptom NLP + temporal history
- Detects inconsistencies between visual and reported symptoms
- Identifies red flags and escalation signals
- Uncertainty-aware decision logic

### ⏳ Temporal Progression Tracking
- Compares current and past images
- Detects changes in size, color, and severity
- Enables early intervention and proactive care

### 📊 Explainable Triage Output
- Risk categorization: Low / Moderate / High
- Transparent reasoning behind decisions
- Annotated structured triage report
- Telehealth-ready clinical summary

### 🌍 Accessibility-First (LINZO Integration)
- Real-time Sign ↔ Voice translation
- Multilingual support
- Voice-based interaction
- Designed for deaf, elderly, and low-literacy users

### 📡 Offline-First Capability
- Basic triage functionality without internet
- Secure synchronization when online
- Designed for rural and low-connectivity environments

### 🏥 Telehealth Integration
- Structured intake summary
- Annotated images
- Timeline and symptom history
- Doctor-ready HPI-style output

---

## 🏗 System Architecture

DermSight follows a layered architecture:

1. User Interaction Layer  
   Guided capture, symptom input, accessibility interface

2. Multimodal Processing Layer  
   Vision encoder, symptom NLP encoder, temporal tracker

3. Conflict Detection Engine  
   Signal alignment check  
   Uncertainty filtering  
   Red flag rule engine  

4. Decision Layer  
   Explainable triage scoring  
   Structured report generation  

5. Integration Layer  
   Telehealth API  
   Enterprise/Insurance interface  

---

## 🛠 Tech Stack

### 📱 Frontend (Mobile Application)
- React Native
- Expo
- Expo Camera
- React Native Skia (UI rendering)
- AsyncStorage & SecureStore (offline storage)

### 🧠 AI & Multimodal Intelligence
- Google Gemini API (multimodal reasoning)
- TensorFlow Lite (on-device lightweight models)
- OpenCV (image preprocessing & quality validation)
- Custom Conflict-Aware Fusion Logic
- Clinical NLP processing layer

### 🌐 Backend
- Node.js
- Express.js
- RESTful API architecture
- MongoDB Atlas (structured triage data)
- Cloudinary (medical image storage)

### ☁ Cloud & DevOps
- AWS EC2 (deployment)
- AWS S3 (secure storage)
- Docker (containerization)

### 🎥 Telehealth Integration
- Twilio Video SDK
- Twilio Voice

### ♿ Accessibility (LINZO Layer)
- MediaPipe (gesture detection)
- Real-time Sign → Text/Voice conversion
- Speech-to-Text & Text-to-Speech APIs

---

## 🎯 Problem We Solve

Patients often struggle to accurately describe visual symptoms.  
Doctors receive incomplete, inconsistent, or low-quality input before consultations.

This leads to:
- Missed early warning signs
- Unnecessary clinic visits
- Increased consultation time
- Healthcare system overload

DermSight solves this through structured multimodal triage with explainable decision intelligence.

---

## 🌍 Impact

- Improves early detection and patient safety
- Reduces unnecessary clinical workload
- Expands healthcare access for underserved populations
- Enables inclusive communication through Sign ↔ Voice technology
- Creates scalable triage infrastructure across industries

---

## 📈 Future Roadmap

- Expand beyond dermatology to injury and wound triage
- Advanced temporal learning engine
- Enterprise insurance verification integration
- Rural healthcare deployment
- Global telehealth API partnerships

---

## 🔐 Data Privacy & Security

- Secure cloud storage
- Encrypted API communication
- Minimal data retention policy
- HIPAA-aligned architecture principles

---

## 👥 Target Markets

- Telehealth platforms
- Hospitals & clinics
- Insurance providers
- Workplace safety systems
- Elderly care monitoring
- Rural healthcare networks

---

## 🧩 Scalability

Built as an API-first architecture, DermSight can integrate seamlessly into:
- Telehealth platforms
- Enterprise healthcare systems
- Insurance workflows
- Government healthcare initiatives

---

## 🏁 Vision

DermSight is not just a symptom checker.  
It is a universal triage intelligence infrastructure designed to redefine how healthcare decisions begin.

---

## 📄 License

MIT License

---

## 👨‍💻 Built With

Passion for accessible, explainable, and scalable healthcare AI.
