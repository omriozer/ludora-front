# Game Settings Components

This directory contains game-type-specific settings components organized by game type and version (digital/offline).

## Directory Structure

```
/src/components/game/settings/
├── memory_game/
│   ├── MemoryGameSettingsDigital.jsx
│   ├── MemoryGameSettingsOffline.jsx
│   └── index.js
├── scatter_game/           # Future implementation
├── sharp_and_smooth/       # Future implementation
├── ar_up_there/            # Future implementation
├── index.js               # Main exports
└── README.md
```

## Component Pattern

Each game type should have its own directory with components for each available version:

- **Digital Components**: For interactive, animated game experiences
- **Offline Components**: For printable PDF game materials

## Implementation Status

- ✅ **Memory Game**: Both digital and offline components implemented as placeholders
- ⏳ **Other Games**: Directory structure ready, awaiting implementation

## Usage

Components are automatically loaded in `GameSettings.jsx` based on:
1. Selected game type (`game_type` field)
2. Selected version (`digital` field)

## Adding New Game Types

1. Create directory: `/settings/{game_type}/`
2. Add components: `{GameType}SettingsDigital.jsx` and `{GameType}SettingsOffline.jsx`
3. Export in local `index.js`
4. Update main `index.js`
5. Add case in `GameSettings.jsx` render function