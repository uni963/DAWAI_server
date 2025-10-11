# Melodia - Composer Copilot UI Design Specification

## 1. Introduction

This document outlines the user interface (UI) design for "Melodia - Composer Copilot," an AI-integrated Digital Audio Workstation (DAW). The primary goal of this UI is to provide a beautiful, intuitive, and flexible environment that empowers both beginners and experienced musicians to create music with the assistance of advanced AI features. The design draws inspiration from the clean aesthetics of Apple's DAWs (Logic Pro, GarageBand) and the highly customizable, modular workspace of VS Code.

## 2. Design Principles

### 2.1. Beauty and Minimalism

The UI will adopt a dark theme, similar to VS Code, with a focus on clean lines, subtle gradients, and a sophisticated color palette that minimizes visual clutter. Key information and interactive elements will be highlighted through thoughtful use of color and contrast, ensuring readability and a premium feel. The overall aesthetic aims to be visually appealing while maintaining a professional and unobtrusive presence.

### 2.2. Intuitive and Accessible

Simplicity is paramount. The design prioritizes ease of use for beginners and first-time users, allowing them to quickly grasp core functionalities and start creating music without a steep learning curve. Complex operations will be streamlined, and visual cues, clear iconography, and logical layouts will guide users through the music creation process. Tooltips will provide instant explanations for unfamiliar elements.

### 2.3. Flexible and Customizable Workspace

Inspired by VS Code's highly adaptable interface, Melodia - Composer Copilot will feature a robust window management system. All major functional blocks—such as editors, mixers, and the AI chatbox—will be treated as independent, dockable windows. Users will have the freedom to:

*   **Detach and Float**: Drag any window out of the main application frame to float freely on the desktop.
*   **Dock and Snap**: Re-dock floating windows back into the main application, with intelligent snapping to adjacent panels for seamless tiling.
*   **Resize**: Adjust the size of any window to suit their workflow.
*   **Tabbed Grouping**: Group multiple windows into tabbed panels to conserve screen real estate.
*   **Save Workspaces**: Create and save custom UI layouts as 


custom workspaces for quick recall.

## 3. Mandatory UI Elements and Features

### 3.1. Main Window (Arrangement View)

The core of the Melodia - Composer Copilot interface is the Arrangement View, designed for intuitive song structuring and playback. It will feature a dark, clean aesthetic with clear visual hierarchy.

*   **Timeline**: Occupying the central and largest portion of the view, the timeline visually represents the song's structure. It will feature a clear grid system indicating measures and beats, allowing for precise placement and editing of musical events. Different track types will be visually distinct within the timeline.

*   **Track List**: Positioned on the left side of the Arrangement View, this vertical panel displays all active tracks. Each track entry will include:
    *   **Name**: User-editable track name.
    *   **Icon**: A small, intuitive icon representing the track type (e.g., piano for MIDI, waveform for audio, drum kit for drums).
    *   **Mute/Solo Buttons**: Clearly visible buttons for muting or soloing individual tracks.
    *   **Record Arm Button**: A dedicated button to arm the track for recording.
    *   **Volume Slider**: A small, integrated volume slider for quick level adjustments.

*   **Transport Controls**: Located prominently at the top of the main window, these controls provide essential playback and recording functionalities. Buttons will be large, easily identifiable icons:
    *   Play, Stop, Record
    *   Loop Toggle
    *   Tempo Setting (BPM display with click-and-drag or direct input)
    *   Metronome Toggle

*   **Master Track**: Always visible, typically on the far right of the track list or as a dedicated, compact panel. It will feature:
    *   **Overall Volume Slider**: A large, easily accessible slider for controlling the master output volume.
    *   **Basic Effect Slots**: A few readily available slots for quick master bus effects (e.g., Reverb, Delay, Compressor) with simple on/off toggles or dry/wet knobs.

### 3.2. Track Types and Editing Views

Melodia - Composer Copilot will dynamically adapt its lower panel to provide context-sensitive editing views based on the selected track type. These editing views are designed to be intuitive and efficient, minimizing the need for complex menus.

*   **MIDI Track**: When a MIDI track is selected, the lower panel transforms into a **Piano Roll Editor**. This editor will allow users to:
    *   **Note Input and Editing**: Click-to-add notes, drag-to-resize, and drag-to-reposition notes on a piano keyboard grid.
    *   **Velocity Adjustment**: Visual indicators (e.g., color intensity or vertical bars) for note velocity, with easy drag-and-drop adjustment.
    *   **Quantization**: Simple controls for quantizing notes to a grid.
    *   **MIDI CC Editing**: Basic lanes for editing common MIDI Continuous Controller data (e.g., Modulation, Pitch Bend).

*   **Drum Track**: Selecting a drum track will display either a **Step Sequencer** or a **Drum Pad Interface** in the lower panel, depending on user preference or track configuration. Both options will provide:
    *   **Step Sequencer**: A grid-based interface for quickly programming drum patterns, with visual feedback for active steps.
    *   **Drum Pad Interface**: A virtual drum pad layout for real-time drumming or easy pattern input, with assignable sounds.

*   **Audio Track**: When an audio track is selected, the lower panel will show a **Waveform Editor**. This editor will enable:
    *   **Waveform Display**: Clear visualization of the audio waveform.
    *   **Basic Editing**: Tools for trimming, fading in/out, and adjusting gain directly on the waveform.
    *   **Region Manipulation**: Easy selection and movement of audio regions.

*   **Guitar/Bass Track**: For guitar or bass tracks, the lower panel will present an **Amp Simulator and Effect Rack**. This will allow users to:
    *   **Virtual Amps**: Select from a range of virtual amplifier models.
    *   **Effect Pedals**: Drag-and-drop virtual effect pedals (e.g., Overdrive, Chorus, Delay, Reverb) into a signal chain.
    *   **Parameter Control**: Intuitive knobs and sliders for adjusting effect parameters.



### 3.3. AI Chat Box (Agent Chat)

The Agent Chat is a pivotal feature that distinguishes Melodia - Composer Copilot, providing an intuitive and powerful way to interact with the AI. It will be designed as a flexible, independent window, akin to a chat application within the DAW.

*   **Independent Window**: The Agent Chat window can be detached from the main DAW interface and floated anywhere on the user's desktop, similar to VS Code's integrated terminal or chat panels. It can also be docked back into the main application frame, either as a dedicated side panel (e.g., on the right side, vertically long) or as a tab within a larger panel group.

*   **User Interface**: The UI will be clean and familiar, resembling modern chat applications:
    *   **Chat History Display Area**: A scrollable area showing the conversation between the user and the AI Agent.
    *   **Text Input Field**: A clear, multi-line input field for typing natural language commands and questions.
    *   **Send Button**: A prominent button to send the typed message.
    *   **Contextual Prompts**: Optionally, small, context-aware buttons or suggestions might appear to guide users on common AI commands (e.g., "Generate a bassline," "Analyze this melody").

*   **Functionality**: The Agent Chat will serve as the primary interface for AI interaction:
    *   **Natural Language Commands**: Users can issue commands in plain language (e.g., "Create a melancholic piano melody in C minor," "Make this drum pattern more aggressive and rock-like," "Suggest a chord progression for this vocal line"). The AI will interpret these commands and execute actions directly within the DAW.
    *   **Drag-and-Drop AI Output**: When the AI generates musical data (e.g., MIDI patterns, chord progressions, lyrics, effect chains), these outputs will be visually represented within the chat history. Users can then directly drag and drop these elements from the chat window onto the timeline, specific tracks, or instrument/effect slots.
    *   **Ghost Text Correction Integration**: Music theory-based correction suggestions from the Ghost Text feature will be presented within the Agent Chat. Users can accept, modify, or reject these suggestions directly through the chat interface, making the AI a proactive editing assistant.

### 3.4. Window Management System

The flexibility of the UI is a cornerstone of Melodia - Composer Copilot, allowing users to tailor their workspace to their exact needs. The window management system will be robust and intuitive, mirroring the capabilities of professional IDEs like VS Code.

*   **Dockable and Floatable Panels**: All major editing views (Piano Roll, Step Sequencer, Waveform Editor, Amp Simulator, Mixer, Effect Racks) and the Agent Chat will be designed as independent panels. These panels can be:
    *   **Dragged and Detached**: Users can click and drag any panel out of its docked position to make it a free-floating window on the desktop.
    *   **Resized Freely**: Both docked and floating windows can be resized by dragging their edges.
    *   **Snapped and Tiled**: When a floating window is dragged near the edge of another window or the main application frame, it will intelligently snap into place, allowing for easy tiling and arrangement of multiple panels side-by-side or stacked.

*   **Tabbed Grouping**: To optimize screen space, users can drag one panel onto another to create a tabbed group. This allows multiple views to occupy the same screen area, with users switching between them via tabs at the top of the panel.

*   **Custom Workspaces**: Users will be able to save their preferred UI layouts as custom workspaces. This includes the arrangement, size, and visibility of all panels. These workspaces can be named and quickly recalled, allowing users to switch between different setups for composing, mixing, or sound design with a single click.

*   **VS Code-like Top Bar**: The application will feature a top menu bar similar to VS Code, including standard menus like `File`, `Edit`, `View`, `Project`, `Tools`, `Help`. This provides a familiar navigation structure for users accustomed to modern software applications.



## 4. Beginner/Learner Considerations

To ensure Melodia - Composer Copilot is accessible and empowering for beginners and first-time users, several design choices will be implemented:

*   **Progressive Disclosure (Simplicity by Default)**: Upon first launch, the UI will present a simplified view, showing only the most essential tools and panels required for basic music creation. Advanced features, detailed settings, and less frequently used options will be initially hidden or nested within sub-menus and expandable panels. Users can progressively reveal more complex functionalities as they gain confidence and explore the DAW.

*   **Visual Cues and Tooltips**: Every interactive element (buttons, sliders, icons, fields) will have clear, concise tooltips that appear on hover. These tooltips will explain the function of the element, providing immediate context without requiring users to consult a manual. Additionally, visual cues (e.g., subtle animations, highlight states) will guide users through common workflows.

*   **Interactive Quick Start Guide**: The first time a user opens Melodia - Composer Copilot, an optional, interactive quick start guide will be presented. This guide will walk them through the basic steps of creating a new project, adding tracks, using the piano roll, and interacting with the Agent Chat. This hands-on tutorial will help users build foundational skills quickly.

*   **AI Assistant as a Learning Companion**: The Agent Chat will be positioned not just as a creative assistant but also as a learning companion. A prominent "Ask AI" button or a dedicated entry point will be available for users to ask questions about the DAW itself (e.g., "How do I add a new instrument track?", "What does quantization do?"). The AI will provide clear, step-by-step instructions or direct users to relevant UI elements, effectively acting as an always-available, personalized tutor.

## 5. Overall UI Concept Summary

Melodia - Composer Copilot's UI is envisioned as a powerful yet approachable creative hub. It combines the visual elegance and clarity of leading DAWs with the unparalleled flexibility and customization of modern code editors. The dark theme, inspired by VS Code, provides a focused environment, while the modular window system allows users to construct their ideal workspace. The AI Agent Chat is seamlessly integrated as a central point of interaction, transforming complex musical tasks into intuitive natural language conversations. This design philosophy ensures that users, regardless of their experience level, can dive into music creation with confidence and unleash their full creative potential.

## 6. Main Screen Layout Example (Text-based Representation)

```
+-----------------------------------------------------------------------------------------------------------------------------------+
| File | Edit | View | Project | Tools | Help                                                                             |
+-----------------------------------------------------------------------------------------------------------------------------------+
| [ Play ] [ Stop ] [ Rec ] [ Loop ]  Tempo: 120 BPM [Metronome]                                                                    |
+-----------------------------------------------------------------------------------------------------------------------------------+
|                                                                                                                                   |
| +-------------------------------------------------------------------------------------------------------------------------------+
| |                                                                                                                               |
| |                                              ARRANGEMENT VIEW (Timeline)                                                      |
| |                                                                                                                               |
| |                                                                                                                               |
| |                                                                                                                               |
| |                                                                                                                               |
| |                                                                                                                               |
| |                                                                                                                               |
| |                                                                                                                               |
| |                                                                                                                               |
| |                                                                                                                               |
| |                                                                                                                               |
| |                                                                                                                               |
| |                                                                                                                               |
| |                                                                                                                               |
| |                                                                                                                               |
| +-------------------------------------------------------------------------------------------------------------------------------+
|                                                                                                                                   |
| +-------------------------------------------------------------------------------------------------------------------------------+
| |                                                                                                                               |
| |                                               EDITING VIEW (Context-sensitive)                                                |
| |                                            (e.g., Piano Roll, Step Sequencer, Waveform Editor)                                |
| |                                                                                                                               |
| |                                                                                                                               |
| |                                                                                                                               |
| +-------------------------------------------------------------------------------------------------------------------------------+
|                                                                                                                                   |
+-----------------------------------------------------------------------------------------------------------------------------------+


**Left Panel (Docked by Default): Track List**

```
+-----------------------+
| TRACKS                |
+-----------------------+
| [ ] Piano 1   [M][S][R] |
| [ ] Drums     [M][S][R] |
| [ ] Bass      [M][S][R] |
| [ ] Vocals    [M][S][R] |
|                       |
| + Add Track           |
+-----------------------+
| MASTER                |
| [Vol Slider] [FX Slot] |
+-----------------------+
```

**Right Panel (Docked by Default): Agent Chat (Vertically Long)**

```
+-----------------------+
| AGENT CHAT            |
+-----------------------+
| [Chat History Area]   |
|                       |
| User: Create a melody |
| AI: Here's a melody...|
|                       |
| [Input Field]         |
| [Send Button]         |
+-----------------------+
```

**Floating Window Example: Mixer**

```
+-----------------------+
| MIXER                 |
+-----------------------+
| [Channel 1 Vol]       |
| [Channel 2 Vol]       |
| ...                   |
| [Master Vol]          |
+-----------------------+
```

## 7. Window Arrangement Examples and Interaction

### 7.1. Default Layout

Upon initial launch, the UI will present a clean, uncluttered layout. The main Arrangement View will dominate the screen, with the Track List and Master controls docked on the left. The Agent Chat will be docked as a tall, narrow panel on the right side, providing immediate access to AI assistance. The context-sensitive editing view will appear at the bottom of the Arrangement View when a track is selected.

### 7.2. Composer's Layout

A user focused on composing might detach the Piano Roll Editor and the Agent Chat, placing them on a second monitor or arranging them side-by-side with the Arrangement View for maximum visibility. The Mixer might be minimized or hidden until needed.

```
+-----------------------------------------------------------------------------------------------------------------------------------+
|                                                                                                                                   |
| +-------------------------------------------------------------------------------------------------------------------------------+
| |                                                                                                                               |
| |                                              ARRANGEMENT VIEW (Timeline)                                                      |
| |                                                                                                                               |
| +-------------------------------------------------------------------------------------------------------------------------------+
|                                                                                                                                   |
+-----------------------------------------------------------------------------------------------------------------------------------+

(Floating on second monitor or alongside main window)

+-----------------------+  +-----------------------+
| PIANO ROLL EDITOR     |  | AGENT CHAT            |
+-----------------------+  +-----------------------+
| [MIDI Notes]          |  | [Chat History Area]   |
|                       |  |                       |
|                       |  | [Input Field]         |
|                       |  | [Send Button]         |
+-----------------------+  +-----------------------+
```

### 7.3. Mixing Engineer's Layout

For mixing, a user might undock the Mixer and place it prominently, perhaps across the bottom of the screen, while keeping the Arrangement View visible for reference. Effect Racks for individual tracks could be opened as separate floating windows.

### 7.4. AI-Assisted Workflow Example (Agent Chat Interaction)

1.  **User Initiates**: The user types into the Agent Chat: "Create a catchy synth melody for my chorus in D major." and presses Enter.
2.  **AI Processes**: The AI processes the request, considering the current project's tempo and key.
3.  **AI Generates and Presents**: The Agent Chat displays: "Here are a few melody options. You can drag and drop them directly onto a MIDI track:"
    *   `[Synth Melody Option 1 (MIDI)]` (Visually represented as a small MIDI clip icon)
    *   `[Synth Melody Option 2 (MIDI)]`
4.  **User Interacts**: The user drags `[Synth Melody Option 1 (MIDI)]` from the chat window onto an empty MIDI track in the Arrangement View.
5.  **User Refines with Ghost Text**: The user then selects the newly added MIDI clip. The Ghost Text feature, integrated with the Agent Chat, might suggest: "This melody could be improved by adding a passing note on beat 3 of measure 2. Accept? [Yes] [No] [Suggest Alternatives]".
6.  **User Accepts/Modifies**: The user clicks "Yes" in the chat, and the MIDI clip on the timeline is automatically updated. Alternatively, they might ask the Agent: "Can you make this melody more syncopated?"
7.  **Lyrics Generation**: The user then asks: "Write some uplifting lyrics for this melody." The AI generates lyrics, which can also be dragged onto a dedicated lyric track or used with the vocal synthesizer.

This seamless interaction between natural language commands, AI-generated content, and direct manipulation within the DAW is central to the Melodia - Composer Copilot experience.



### 3.2.1. MIDI Track Management and Tabbed Editing

Melodia - Composer Copilot will support multiple MIDI tracks, each capable of holding distinct MIDI data (e.g., Piano, Synth Lead, Bass). When a MIDI track is selected, its corresponding MIDI data will be displayed in the Piano Roll Editor in the lower panel. If multiple MIDI tracks are selected or being edited simultaneously, the Piano Roll Editor will feature a tabbed interface, with each tab representing a different MIDI track. This allows users to quickly switch between editing different MIDI parts while maintaining context within the same editor window.

For example, a user might have a 'Piano Chords' MIDI track and a 'Synth Melody' MIDI track. When both are selected for editing, the Piano Roll will show two tabs: 'Piano Chords' and 'Synth Melody'. Clicking on a tab will display the MIDI notes for that specific track, allowing for focused editing. This approach mirrors the tabbed file management in VS Code, providing a familiar and efficient way to manage multiple musical ideas.


