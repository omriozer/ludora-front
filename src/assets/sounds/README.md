# Sound Assets for Ludora Classroom Effects

## Directory Structure
```
src/assets/sounds/
├── effects/
│   ├── clapping.mp3
│   ├── fireworks.mp3
│   └── [future effects]...
└── README.md
```

## Required Sound Files

### Classroom Effects
Located in: `src/assets/sounds/effects/`

#### 1. Clapping Effect
- **File name**: `clapping.mp3`
- **Description**: Sound effect for applause/clapping classroom effect
- **Duration**: 2-3 seconds recommended
- **Format**: MP3
- **Quality**: 44.1kHz, 128kbps minimum
- **Usage**: Triggered when "מחיאות כפיים" (clapping) effect is activated

#### 2. Fireworks Effect
- **File name**: `fireworks.mp3`
- **Description**: Sound effect for celebration/fireworks classroom effect
- **Duration**: 3-4 seconds recommended
- **Format**: MP3
- **Quality**: 44.1kHz, 128kbps minimum
- **Usage**: Triggered when "זיקוקים" (fireworks) effect is activated

## Audio Requirements
- **Format**: MP3 (preferred) or WAV
- **Sample Rate**: 44.1kHz minimum
- **Bit Rate**: 128kbps minimum for MP3
- **Volume**: Normalized to prevent clipping
- **Content**: Appropriate for educational/classroom environment

## Implementation Notes
- Sound files are imported as static assets in the ClassroomEffectMenu component
- Audio playback uses the Web Audio API for reliable cross-browser support
- Sound playback is optional and gracefully degrades if files are missing
- Volume can be controlled by the user through browser settings

## Replacement Instructions
1. Replace the current placeholder files with actual audio content
2. Maintain the exact file names as specified above
3. Ensure audio files meet the quality requirements
4. Test in browser to verify proper playback

## Future Expansion
Additional effect sounds can be added to the `effects/` directory following the same naming convention.