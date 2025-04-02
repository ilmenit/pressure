# **Pressure: a deep strategy game in a small package**

## **Introduction**

**Pressure** is a novel board game that delivers strategic depth in compact packages. Played on a 5×5 grid with 12 tokens, this game uses a "pushing" mechanic that creates tactical complexity rivaling much larger classic games. If you enjoy games like Chess, Checkers, or Othello but are looking for something that plays faster while offering similar depth, Pressure might be for you.

## **Game Rules**

### **Components**

* 5×5 grid board  
* 6 black tokens and 6 white tokens

### **Setup**

Players arrange their tokens in the following positions:

* **Black tokens:** a3, a4, b3, b5, c4, c5  
* **White tokens:** c1, c2, d1, d3, e2, e3

White moves first.

### **Basic Movement**

* On your turn, move ONE of your tokens orthogonally (up, down, left, or right)  
* No diagonal movement allowed  
* You cannot move inactive tokens (explained below)  
* Move into an empty space or push a line of tokens

### **The Push Mechanic**

The heart of Pressure is its pushing mechanic:

* When moving into an occupied space, you "push" the whole connected line of tokens  
* You can only push if there is an empty space at the end of the line  
* Both your own and opponent tokens can be pushed  
* When you push opponent tokens, they become inactive for their next turn  
* Your own tokens remain active even when pushed

### **Inactivity Rule**

* Any opponent tokens you push become inactive for their next turn  
* Inactive tokens cannot be moved but can still be pushed  
* At the end of a player's turn, all their inactive tokens become active again

### **Capture**

* When a token is surrounded on all four sides (by any combination of tokens or board edges), it is captured  
* Captured tokens remain on the board but cannot be moved directly  
* Captured tokens can still be pushed and used to surround other tokens

### **Victory Conditions**

Win by either:

* Capturing all opponent tokens, or  
* Leaving your opponent with no valid moves

## **Strategic Depth**

The push mechanic creates a cascade of strategic considerations:

* **Temporary Advantage:** Pushing opponent tokens creates a one-turn window where they cannot move  
* **Connected Lines:** Managing your tokens as connected or disconnected lines affects push vulnerability  
* **Positioning:** Board edges depending on positioning either increase or reduce vulnerability  
* **Capture Setup:** Creating multi-token traps to force captures  
* **Active/Inactive Balance:** Timing pushes to maximize opponent inactivity

## **Complexity Analysis**

One of the interesting aspects of Pressure is complexity:

| Game | Board Size | State Space (log₁₀) | Game Tree (log₁₀) | Avg. Game Length | Branching Factor |
| ----- | ----- | ----- | ----- | ----- | ----- |
| **Pressure** | 5×5 | 20\* | 57 | 54 | 11.5 |
| Tic-tac-toe | 3×3 | 3 | 5 | 9 | 4 |
| Connect Four | 7×6 | 13 | 21 | 36 | 4 |
| Checkers | 8×8 | 20 | 40 | 70 | 2.8 |
| Othello | 8×8 | 28 | 58 | 58 | 10 |
| Chess | 8×8 | 44 | 123 | 70 | 35 |

\*Estimated based on analysis of game structure

Despite its small 5×5 board, Pressure's game tree complexity (10^57) approaches that of Othello (10^58). Its branching factor of 11.5 exceeds Othello's 10, meaning players typically have more meaningful choices per turn.

## **Try It Yourself**

If you're intrigued by games that balance simplicity with depth, Pressure may deserve a spot in your collection. 
