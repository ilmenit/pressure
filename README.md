# Pressure - Strategic Board Game

A web-based implementation of "Pressure", a strategic board game focusing on token movement, pushing mechanics, and territory control.

## Game Modes

### One on One Game
Play a standard game of Pressure against another human player or against the AI with configurable difficulty levels (1-9).

### Tournament Mode
Challenge a series of 11 unique AI characters with distinct personalities and increasing difficulty levels. Defeat them all to become the Pressure Champion!

### Tutorial (Coming Soon)
An interactive tutorial to teach new players the game basics (planned for a future update).

## Game Rules

### Setup
- A 5×5 grid board
- 6 black tokens and 6 white tokens
- White moves first

### Core Rules

1. **Basic Movement**
   - On your turn, move ONE of your tokens
   - Move directly into an adjacent space (orthogonally: up, down, left, or right)
   - You cannot move diagonally
   - You cannot move inactive tokens (tokens with a red marker)

2. **Pushing**
   - When moving into an occupied space, you are "pushing" the whole connected line of tokens
   - Pushing is only valid if there is an empty space at the end of the connected line
   - Both your own and opponent tokens can be pushed

3. **Inactivity**
   - Any opponent tokens that you push become inactive for their owner's next turn
   - Inactive tokens cannot be moved but can still be pushed
   - At the end of each player's turn, all their inactive tokens become active again

4. **Capture**
   - When a token becomes completely surrounded on all four orthogonal sides (by any combination of tokens or board edges), it is immediately captured
   - Captured tokens cannot be moved directly by either player
   - Captured tokens can be pushed as part of a connected line
   - Once captured, tokens remain captured for the rest of the game

### Victory Conditions
The game ends immediately when either:
1. A player captures all enemy tokens
2. A player has no legal moves on their turn

## Tournament Mode Features

- **Progressive Difficulty**: First 5 opponents at level 1, next 5 at level 2, final boss at level 3
- **Character Personalities**: Each opponent has unique commentary based on game events
- **Progress Tracking**: Tournament progress is saved between sessions
- **Victory Celebration**: Special effects when completing the tournament

## Tournament Mode Characters

1. **Captain Thumper** - A pirate rabbit who loves treasure
2. **Sheriff Chomps** - A dinosaur law enforcer
3. **Chef Tentaklus** - An octopus chef who treats the game as a recipe
4. **Marshal Bones** - A skeleton cowboy
5. **Taxman Zorg** - An alien accountant
6. **Count Snoozula** - A vampire sloth who moves slowly but deliberately
7. **Funky Tusk** - A disco dancing walrus
8. **Detective Whiskers** - A cat detective who treats the game as a mystery
9. **Don Bamboo** - A tropical gangster bear
10. **Chrono Tail** - A time-traveling raccoon
11. **KoalaByte** - A koala hacker

## Installation

1. Create the following directory structure:
   ```
   pressure-game/
   ├── css/
   ├── js/
   └── assets/
       └── characters/
   ```

2. Upload the characters images to the `assets/characters/` directory. The required images are:
   - rabbit_pirate.webp
   - dino_policeman.webp
   - octopus_chef.webp
   - cowboy_skeleton.webp
   - alien_accountant.webp
   - vampire_sloth.webp
   - disco_walrus.webp
   - cat_detective.webp
   - tropical_gangsta_bear.webp
   - time_travelling_raccoon.webp
   - koala_hacker.webp

3. Copy all the files to their respective directories.

4. Open `index.html` in a web browser to play.

## File Structure

```
pressure-game/
├── css/
│   ├── style.css             # Core game styles
│   ├── tournament-styles.css # Tournament mode styles
│   └── animations.css        # Animation effects
├── js/
│   ├── board.js              # Board representation and handling
│   ├── moves.js              # Move validation and execution
│   ├── gamestate.js          # Game state management
│   ├── ai.js                 # AI player implementation
│   ├── ui.js                 # User interface management
│   ├── game.js               # Core game logic
│   ├── game-extension.js     # Extensions for tournament mode
│   ├── tournament.js         # Tournament mode management
│   ├── tournament-service.js # Tournament services and utilities
│   └── index.js              # Application entry point
├── assets/
│   └── characters/           # Character images for tournament mode
├── index.html                # Main HTML file
└── README.md                 # This file
```

## Features

- Two-player local gameplay
- AI opponents with adjustable difficulty levels (1-9)
- Tournament mode with progressive difficulty
- Character dialogue and personality
- Progress tracking between sessions
- Responsive design for different screen sizes

## Accessibility Features

- Keyboard focus management
- Proper contrast for text and UI elements
- Responsive design for different device sizes
- Fallback visuals for missing assets

## Browser Compatibility

Tested and working in:
- Chrome
- Firefox
- Safari
- Edge

## Credits

- Original "Pressure" game concept
- Tournament mode characters and implementation
