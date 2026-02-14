Problem Statement Title
AI-Based Real-Time Voice Companion Application with Interactive 3D Avatar
Problem Statement Description
Patients, especially elderly individuals and those in long-term or assisted care, often experience
loneliness, reduced daily interaction, and lack of engaging conversational support. While
existing digital solutions focus on reminders, diagnostics, or monitoring, they largely fail to
provide emotionally engaging, human-like conversational experiences.
Most AI voice systems today suffer from:
● Disembodied voice-only interaction with low emotional presence
● Unnatural conversation flow and response timing
● Inability to handle real-time user interruptions (barge-in)
● Poor detection of low-volume or low-pitch speech
● Limited engagement due to lack of visual interaction
Additionally, purely voice-based interfaces may feel impersonal, while complex user interfaces
are often unsuitable for elderly users. There is a growing need for multimodal conversational
companions that combine voice, visual presence, and natural interaction, without being
diagnostic in nature.
Problem Statement Objective
To design and develop a mobile/webapp application that acts as a real-time AI voice
companion with an interactive 3D avatar, capable of natural conversation, real-time
interruption handling, reliable low-volume speech detection, and synchronized visual interaction
through realistic lip-sync and facial animation.
The system should focus on companionship and daily interaction, not medical diagnosis, and
should provide an engaging, accessible, and emotionally supportive experience.
Expected Solution / Functional Requirements
The proposed solution should:
1. Provide secure authentication and onboarding using Supabase
2. Capture and store patient and caregiver profile information
3. Enable a real-time voice conversation between the user and the AI agent
4. Stream microphone audio to the AI agent with minimal latency
5. Play AI-generated voice responses in real time
6. Render a 3D avatar representing the AI voice companion, capable of:
○ Real-time lip-sync with AI speech
○ Natural facial expressions and idle animations
○ Visual feedback during listening and speaking states
7. Support interrupt handling (barge-in) where:
○ AI speech and avatar animation stop immediately
○ User speech is captured without overlap
8. Reliably detect and transmit low-volume and low-pitch speech
9. Allow participants to create and configure their own AI agent, including:
○ Voice selection
○ Personality traits
○ Conversation tone (friendly, supportive, cheerful, etc.)
○ Avatar behavior style (calm, expressive, neutral)
10. Maintain a simple, accessible, and elderly-friendly interface, with visual cues from
the 3D avatar