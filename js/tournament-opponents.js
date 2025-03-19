/**
 * Tournament Opponents
 * Contains all opponent definitions for the tournament mode
 * Refactored to use event-driven architecture
 */
class TournamentOpponents {
    /**
     * Get all tournament opponents
     * @returns {Array} Array of opponent objects
     */
    static getOpponents() {
        // Get event system if available
        const events = window.gameEvents || null;
        
        // Define opponents
        const opponents = [
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
                difficulty: 2, 
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
                difficulty: 3, 
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
                difficulty: 3, 
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
                difficulty: 4, 
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
                difficulty: 4, 
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
                difficulty: 5, 
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
                name: "Koala6502", 
                image: "koala_hacker.webp", 
                difficulty: 6, 
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
        
        // Emit opponents:loaded event 
        if (events) {
            events.emit('opponents:defined', {
                count: opponents.length
            });
        }
        
        return opponents;
    }
    
    /**
     * Get a specific opponent by ID
     * @param {number} id - The opponent ID to find
     * @returns {Object|null} - The opponent object or null if not found
     */
    static getOpponentById(id) {
        const opponents = this.getOpponents();
        return opponents.find(opponent => opponent.id === id) || null;
    }
    
    /**
     * Get opponents filtered by difficulty level
     * @param {number} difficulty - The difficulty level to filter by
     * @returns {Array} - Array of opponents with the specified difficulty
     */
    static getOpponentsByDifficulty(difficulty) {
        const opponents = this.getOpponents();
        return opponents.filter(opponent => opponent.difficulty === difficulty);
    }
}