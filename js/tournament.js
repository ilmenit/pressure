/**
 * Tournament Manager for Pressure game
 * Handles tournament progression, opponents, and character interactions
 */
class TournamentManager {
    constructor(game) {
        this.game = game;
        this.opponents = [];
        this.currentOpponentIndex = 0;
        this.tournamentCompleted = false;
        this.initialize();
    }

    /**
     * Initialize the tournament manager
     */
    initialize() {
        this.loadOpponents();
        this.loadProgress();
        this.setupEventListeners();
    }

    /**
     * Load character data
     */
    loadOpponents() {
        this.opponents = [
            { 
                id: 1, 
                name: "Captain Thumper", 
                image: "rabbit_pirate.webp", 
                difficulty: 1, 
                defeated: false,
                quotes: {
                    start: ["Arrr! Prepare to be boarded!", "Yer treasure is mine, matey!", "The seas be rough, and so am I!"],
                    win: ["Another victory for Captain Thumper!", "I take no prisoners—except your pride!", "Ye played well, but not well enough!"],
                    lose: ["Blasted landlubbers! I'll be back!", "This be a storm I didn't see comin'!", "Ye sunk me strategy!"],
                    capture: ["Arrr! Me token's overboard!", "That was a cheap shot, scallywag!", "Ye won this round, but I'll get ye!"],
                    opponentCapture: ["Another piece of treasure for me!", "Yer token be mine!", "Thar she goes! Right into me collection!"]
                }
            },
            { 
                id: 2, 
                name: "Sheriff Chomps", 
                image: "dino_policeman.webp", 
                difficulty: 1, 
                defeated: false,
                quotes: {
                    start: ["Law and order will be upheld!", "You're under arrest—for losing!", "Jurassic justice is swift!"],
                    win: ["Case closed! Another win for the Sheriff!", "You fought the law, and the law won!", "Ain't nobody above the rules!"],
                    lose: ["This ain't over... not by a long shot.", "You got lucky—next time, justice prevails!", "Maybe I need a bigger badge..."],
                    capture: ["That's against the law!", "No fair! You tricked me!", "You'll regret that move!"],
                    opponentCapture: ["Justice served!", "You're losing ground, citizen!", "This town ain't big enough for the both of us!"]
                }
            },
            { 
                id: 3, 
                name: "Chef Tentaklus", 
                image: "octopus_chef.webp", 
                difficulty: 1, 
                defeated: false,
                quotes: {
                    start: ["Let's cook up a storm!", "You are the main course tonight!", "Time to whip up a victory!"],
                    win: ["Another delicious win!", "Perfection! Just like my cuisine!", "You've been served!"],
                    lose: ["This dish didn't turn out as planned...", "I must refine my recipe!", "Overcooked! I'll get it right next time!"],
                    capture: ["Hey! That was my secret ingredient!", "My token! That was undercooked!", "Spilled all over the board!"],
                    opponentCapture: ["Bon appétit! I'll take that!", "Your token, perfectly seasoned!", "A little garnish for my victory plate!"]
                }
            },
            { 
                id: 4, 
                name: "Marshal Bones", 
                image: "cowboy_skeleton.webp", 
                difficulty: 1, 
                defeated: false,
                quotes: {
                    start: ["Y'all ready for a showdown?", "This town ain't big enough for two of us!", "I'll be takin' this game, partner!"],
                    win: ["Dead or alive, I win!", "I always play to the bone!", "Y'all got outdrawn!"],
                    lose: ["That was a tough duel...", "Guess I'm just skin and bones after all...", "You got lucky, stranger."],
                    capture: ["Hey! That ain't fair!", "Well, I'll be rattlin' my bones!", "You're faster than I thought!"],
                    opponentCapture: ["Boom! Gotcha!", "Say goodbye to that token!", "Outdrawn and outplayed!"]
                }
            },
            { 
                id: 5, 
                name: "Taxman Zorg", 
                image: "alien_accountant.webp", 
                difficulty: 2, 
                defeated: false,
                quotes: {
                    start: ["Time to audit your strategy!", "You owe me a game-winning move!", "Prepare for intergalactic taxation!"],
                    win: ["Your defeat is now tax-deductible!", "Another calculated victory!", "I have successfully balanced the ledger!"],
                    lose: ["I must reevaluate my expenses...", "A rare accounting error!", "That loss was... not profitable."],
                    capture: ["Hey! That wasn't in the budget!", "An unexpected loss in assets!", "I'll be deducting that move!"],
                    opponentCapture: ["Interest rates just went up!", "Another profitable acquisition!", "Consider this a tax on poor strategy!"]
                }
            },
            { 
                id: 6, 
                name: "Count Snoozula", 
                image: "vampire_sloth.webp", 
                difficulty: 2, 
                defeated: false,
                quotes: {
                    start: ["Let's... yawn... play.", "I'll take my time… and still win!", "Sleep is for the weak, but so are you!"],
                    win: ["A slow and steady victory!", "I drained your energy—and your tokens!", "A most satisfying win!"],
                    lose: ["Perhaps I should've stayed awake...", "Too much effort… I'll try again later.", "A loss? No rush, I'll win next time."],
                    capture: ["You dare take my token?", "Nooo… my precious token!", "That move… unwise."],
                    opponentCapture: ["Mmm… another delicious token!", "I win… again… slowly.", "You should have been more careful."]
                }
            },
            { 
                id: 7, 
                name: "Funky Tusk", 
                image: "disco_walrus.webp", 
                difficulty: 2, 
                defeated: false,
                quotes: {
                    start: ["Let's boogie, baby!", "Time to dance my way to victory!", "Hope you can keep up with the groove!"],
                    win: ["Stayin' alive, stayin' on top!", "The rhythm of victory never stops!", "You just got hustled!"],
                    lose: ["Guess I slipped on the dance floor...", "That was a bad step in my routine!", "Even disco kings have off nights..."],
                    capture: ["Whoa, that move was off-beat!", "You interrupted my flow!", "Not my funky piece!"],
                    opponentCapture: ["Another smooth move!", "Groovin' my way to the top!", "That's the funk of a champion!"]
                }
            },
            { 
                id: 8, 
                name: "Detective Whiskers", 
                image: "cat_detective.webp", 
                difficulty: 2, 
                defeated: false,
                quotes: {
                    start: ["I smell something suspicious... oh, it's your strategy!", "Let's crack this case!", "I always solve the mystery... of victory!"],
                    win: ["Case closed! Another win for Detective Whiskers!", "A mystery solved... and a victory secured!", "Elementary, my dear opponent!"],
                    lose: ["Hmm… I must have overlooked a clue!", "This case remains... unsolved!", "Back to the drawing board."],
                    capture: ["You've tampered with the evidence!", "That was a clever trick… too clever!", "I didn't see that one coming!"],
                    opponentCapture: ["Another clue in my victory puzzle!", "Just as I deduced!", "You can't outthink the master detective!"]
                }
            },
            { 
                id: 9, 
                name: "Don Bamboo", 
                image: "tropical_gangsta_bear.webp", 
                difficulty: 2, 
                defeated: false,
                quotes: {
                    start: ["Welcome to my jungle.", "You mess with the Don, you pay the price.", "Let's settle this... the bear way."],
                    win: ["No one outplays Don Bamboo!", "Another day, another win in the tropics!", "Respect the boss of the board!"],
                    lose: ["You got lucky, kid.", "I'll be back... stronger.", "This ain't over, believe that."],
                    capture: ["Hey, that was mine!", "I don't like when people mess with my business.", "You're making a big mistake."],
                    opponentCapture: ["That's how we do things downtown!", "Bamboo business is booming!", "You just got played!"]
                }
            },
            { 
                id: 10, 
                name: "Chrono Tail", 
                image: "time_travelling_raccoon.webp", 
                difficulty: 3, 
                defeated: false,
                quotes: {
                    start: ["I've seen the future... and I win!", "Time waits for no one, but I can!", "Let's rewrite history—my way!"],
                    win: ["Just as I predicted!", "Another timeline where I win!", "The past, present, and future are mine!"],
                    lose: ["That wasn't in my calculations!", "A glitch in the time stream...", "I'll just time travel back and fix this!"],
                    capture: ["You altered my timeline!", "That move created a paradox!", "A disruption in the continuum!"],
                    opponentCapture: ["That move was inevitable!", "Another token lost in time!", "You're falling behind in history!"]
                }
            },
            { 
                id: 11, 
                name: "KoalaByte", 
                image: "koala_hacker.webp", 
                difficulty: 3, 
                defeated: false,
                quotes: {
                    start: ["Initializing strategy... booting up!", "Let's crack the code to victory!", "Access granted—to my winning streak!"],
                    win: ["Mission complete. You've been outplayed!", "Hack successful—your strategy is mine!", "Another flawless execution!"],
                    lose: ["System error... recalibrating!", "That wasn't in the simulation...", "Looks like I need an upgrade."],
                    capture: ["Unauthorized access to my token!", "Security breach detected!", "That was encrypted!"],
                    opponentCapture: ["Firewall up—your token is mine!", "Download complete!", "Another piece of the puzzle secured!"]
                }
            }
        ];
    }
    
    /**
     * Load saved tournament progress
     */
    loadProgress() {
        try {
            // Check if localStorage is available
            if (typeof localStorage === 'undefined') {
                console.warn("localStorage not available, tournament progress won't be saved");
                return;
            }
            
            const savedData = localStorage.getItem('pressure_tournament');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.currentOpponentIndex = data.currentOpponentIndex || 0;
                this.tournamentCompleted = data.tournamentCompleted || false;
                
                // Update opponent defeated status
                if (data.defeatedOpponents) {
                    data.defeatedOpponents.forEach(id => {
                        const opponent = this.opponents.find(o => o.id === id);
                        if (opponent) {
                            opponent.defeated = true;
                        }
                    });
                }
            }
        } catch (e) {
            console.error("Error loading tournament progress:", e);
            this.resetProgress();
        }
    }
    
    /**
     * Save tournament progress
     */
    saveProgress() {
        try {
            // Check if localStorage is available
            if (typeof localStorage === 'undefined') {
                console.warn("localStorage not available, tournament progress won't be saved");
                return;
            }
            
            const defeatedOpponents = this.opponents
                .filter(o => o.defeated)
                .map(o => o.id);
                
            const data = {
                currentOpponentIndex: this.currentOpponentIndex,
                tournamentCompleted: this.tournamentCompleted,
                defeatedOpponents: defeatedOpponents
            };
            
            localStorage.setItem('pressure_tournament', JSON.stringify(data));
        } catch (e) {
            console.error("Error saving tournament progress:", e);
        }
    }
    
    /**
     * Reset tournament progress
     */
    resetProgress() {
        this.currentOpponentIndex = 0;
        this.tournamentCompleted = false;
        this.opponents.forEach(o => o.defeated = false);
        
        // Check if localStorage is available
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.removeItem('pressure_tournament');
            } catch (e) {
                console.error("Error removing tournament progress from localStorage:", e);
            }
        }
    }
    
    /**
     * Get current opponent
     */
    getCurrentOpponent() {
        return this.opponents[this.currentOpponentIndex];
    }
    
    /**
     * Advance to next opponent
     * @returns {boolean} - True if there are more opponents, false if tournament is complete
     */
    advanceToNextOpponent() {
        // Mark current opponent as defeated
        this.opponents[this.currentOpponentIndex].defeated = true;
        
        // Move to next opponent
        if (this.currentOpponentIndex < this.opponents.length - 1) {
            this.currentOpponentIndex++;
            this.saveProgress();
            return true;
        } else {
            // Tournament completed
            this.tournamentCompleted = true;
            this.saveProgress();
            return false;
        }
    }
    
    /**
     * Setup event listeners for tournament controls
     */
    setupEventListeners() {
        // Challenge button
        const startMatchBtn = document.getElementById('start-match-btn');
        if (startMatchBtn) {
            startMatchBtn.addEventListener('click', () => {
                this.startMatch();
            });
        }
        
        // Back to menu button
        const backToMenuBtn = document.getElementById('back-to-menu-btn');
        if (backToMenuBtn) {
            backToMenuBtn.addEventListener('click', () => {
                this.backToMainMenu();
            });
        }
        
        // Reset progress button
        const resetTournamentBtn = document.getElementById('reset-tournament-btn');
        if (resetTournamentBtn) {
            resetTournamentBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset your tournament progress?')) {
                    this.resetProgress();
                    this.renderLadder();
                }
            });
        }
        
        // Try again button
        const retryBtn = document.getElementById('tournament-retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                retryBtn.classList.add('hidden');
                this.startMatch();
            });
        }
        
        // Complete tournament button
        const tournamentCompleteBackBtn = document.getElementById('tournament-complete-back-btn');
        if (tournamentCompleteBackBtn) {
            tournamentCompleteBackBtn.addEventListener('click', () => {
                const tournamentCompleteScreen = document.getElementById('tournament-complete-screen');
                if (tournamentCompleteScreen) {
                    tournamentCompleteScreen.classList.add('hidden');
                }
                const mainMenu = document.getElementById('main-menu');
                if (mainMenu) {
                    mainMenu.classList.remove('hidden');
                }
            });
        }
    }
    
    /**
     * Start a match with the current opponent
     */
    startMatch() {
        const opponent = this.getCurrentOpponent();
        if (!opponent) {
            console.error("No opponent found at index", this.currentOpponentIndex);
            return;
        }
        
        // Hide tournament screen
        const tournamentScreen = document.getElementById('tournament-screen');
        if (tournamentScreen) {
            tournamentScreen.classList.add('hidden');
        }
        
        // Set game to tournament mode
        this.game.isTournamentMode = true;
        this.game.currentOpponent = opponent;
        
        // Initialize game with player as white, AI as black
        this.game.initialize('human', 'ai', 0, opponent.difficulty);
        
        // Show opponent display
        const opponentDisplay = document.getElementById('opponent-display');
        const opponentPortrait = document.getElementById('opponent-portrait');
        const opponentInfo = document.getElementById('opponent-info');
        
        if (opponentDisplay && opponentPortrait && opponentInfo) {
            opponentDisplay.classList.remove('hidden');
            opponentPortrait.src = `assets/characters/${opponent.image}`;
            opponentPortrait.onerror = function() {
                // If image loading fails, try to get from localStorage fallback
                try {
                    const fallbackImage = localStorage.getItem(`char_img_${opponent.image}`);
                    if (fallbackImage) {
                        opponentPortrait.src = fallbackImage;
                    } else {
                        // Use a simple color block with text as fallback
                        opponentPortrait.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiM0QTZGQTUiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIj5DaGFyYWN0ZXI8L3RleHQ+PC9zdmc+';
                    }
                } catch (e) {
                    console.error("Error using fallback image:", e);
                }
            };
            
            opponentInfo.innerHTML = `
                <div class="opponent-name">${opponent.name}</div>
                <div class="opponent-difficulty">
                    ${'★'.repeat(opponent.difficulty)}${'☆'.repeat(3 - opponent.difficulty)}
                </div>
            `;
        }
        
        // Show start commentary
        this.displayCommentary('start');
        
        // Show game screen
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
            gameScreen.classList.remove('hidden');
        }
    }
    
    /**
     * Display character commentary
     */
    displayCommentary(type) {
        const opponent = this.getCurrentOpponent();
        if (!opponent || !opponent.quotes || !opponent.quotes[type]) {
            return;
        }
        
        const quotes = opponent.quotes[type];
        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        
        const commentaryBox = document.getElementById('commentary-box');
        if (commentaryBox) {
            commentaryBox.textContent = quote;
            commentaryBox.classList.add('active');
            
            // Hide commentary after a few seconds
            setTimeout(() => {
                commentaryBox.classList.remove('active');
            }, 3000);
        }
    }
    
    /**
     * Handle token capture event
     */
    handleTokenCapture(tokenColor) {
        if (this.game.isTournamentMode) {
            // If player's token was captured
            if (tokenColor === 'white') {
                this.displayCommentary('opponentCapture');
            } 
            // If opponent's token was captured
            else if (tokenColor === 'black') {
                this.displayCommentary('capture');
            }
        }
    }
    
    /**
     * Handle match outcome
     */
    handleMatchOutcome(winner) {
        const isPlayerWin = winner === 'white';
        
        // Show appropriate commentary
        this.displayCommentary(isPlayerWin ? 'lose' : 'win');
        
        // If player won, enable progression after a delay
        if (isPlayerWin) {
            setTimeout(() => {
                const hasNextOpponent = this.advanceToNextOpponent();
                
                if (!hasNextOpponent) {
                    // Tournament complete
                    this.showTournamentComplete();
                } else {
                    // Return to tournament ladder
                    this.showTournamentScreen();
                }
            }, 3000);
        } else {
            // Player lost - show retry button
            setTimeout(() => {
                const retryBtn = document.getElementById('tournament-retry-btn');
                if (retryBtn) {
                    retryBtn.classList.remove('hidden');
                }
            }, 2000);
        }
    }
    
    /**
     * Show tournament complete screen
     */
    showTournamentComplete() {
        // Hide game screen
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
            gameScreen.classList.add('hidden');
        }
        
        // Show completion screen
        const completeScreen = document.getElementById('tournament-complete-screen');
        if (completeScreen) {
            completeScreen.classList.remove('hidden');
        }
    }
    
    /**
     * Show tournament screen (ladder)
     */
    showTournamentScreen() {
        // Hide game screen
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
            gameScreen.classList.add('hidden');
        }
        
        // Show tournament screen
        const tournamentScreen = document.getElementById('tournament-screen');
        if (tournamentScreen) {
            tournamentScreen.classList.remove('hidden');
        }
        
        // Update ladder display
        this.renderLadder();
    }
    
    /**
     * Back to main menu
     */
    backToMainMenu() {
        const tournamentScreen = document.getElementById('tournament-screen');
        const mainMenu = document.getElementById('main-menu');
        
        if (tournamentScreen) {
            tournamentScreen.classList.add('hidden');
        }
        
        if (mainMenu) {
            mainMenu.classList.remove('hidden');
        }
    }
    
    /**
     * Render tournament ladder UI
     */
    renderLadder() {
        const ladderElement = document.getElementById('tournament-ladder');
        if (!ladderElement) {
            console.error("Tournament ladder element not found");
            return;
        }
        
        ladderElement.innerHTML = '';
        
        this.opponents.forEach((opponent, index) => {
            const opponentElement = document.createElement('div');
            opponentElement.className = 'ladder-opponent';
            
            // Add appropriate classes
            if (opponent.defeated) {
                opponentElement.classList.add('defeated');
            }
            
            if (index === this.currentOpponentIndex && !opponent.defeated) {
                opponentElement.classList.add('current');
            }
            
            opponentElement.innerHTML = `
                <div class="opponent-portrait">
                    <img src="assets/characters/${opponent.image}" alt="${opponent.name}">
                </div>
                <div class="opponent-info">
                    <div class="opponent-name">${opponent.name}</div>
                    <div class="opponent-difficulty">
                        ${'★'.repeat(opponent.difficulty)}${'☆'.repeat(3 - opponent.difficulty)}
                    </div>
                </div>
                ${opponent.defeated ? '<div class="opponent-status">Defeated</div>' : ''}
            `;
            
            // Handle image loading errors
            const img = opponentElement.querySelector('img');
            if (img) {
                img.onerror = function() {
                    // If image loading fails, try to get from localStorage fallback
                    try {
                        const fallbackImage = localStorage.getItem(`char_img_${opponent.image}`);
                        if (fallbackImage) {
                            img.src = fallbackImage;
                        } else {
                            // Use a simple color block with text as fallback
                            img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiM0QTZGQTUiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIj5DaGFyYWN0ZXI8L3RleHQ+PC9zdmc+';
                        }
                    } catch (e) {
                        console.error("Error using fallback image:", e);
                    }
                };
            }
            
            ladderElement.appendChild(opponentElement);
        });
    }
}
