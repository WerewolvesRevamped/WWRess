/* Discord */
const { Client, Intents, ApplicationCommandOptionType } = require('discord.js');
global.client = new Client({ intents: ['GUILDS', 'GUILD_WEBHOOKS', 'GUILD_VOICE_STATES', 'GUILD_MEMBERS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'DIRECT_MESSAGES', 'DIRECT_MESSAGE_REACTIONS'] });
config = require("./config.json");

/* Setup */
client.on("ready", () => {
    // on bot ready
    registerCommands();
});

/* Board */
const boardSize = 5; // not consistently used

/** AI **/
const PawnValue = 2.0;
const KingValue = 4.0; 
const KnightValue = 4.0;
const RookValue = 7.0;
const QueenValue = 13.0;
const NoneValue = 0.25;

const PawnTable = [
    [0.5, 1.0, -1.0, 1.0, 0.5],
    [0.5, -1.0, 0.0, -1.0, 0.5],
    [0.5, 1.5, 2.5, 1.5, 0.5],
    [2.0, 3.0, 5.0, 3.0, 2.0],
    [0.0, 0.0, 0.0, 0.0, 0.0]
];

const KingTable = [
    [-2.0, -1.0, -1.0, -1.0, -2.0],
    [-1.0, 1.0, 1.5, 1.0, -1.0],
    [-1.0, 1.5, 2.0, 1.5, -1.0],
    [-1.0, 1.0, 1.5, 1.0, -1.0],
    [-2.0, -1.0, -1.0, -1.0, -2.0]
];

const KnightTable = [
    [-5.0, -4.0, -3.0, -4.0, -5.0],
    [-4.0, -2.0, 0.5, -2.0, -4.0],
    [-3.0, 0.5, 2.0, 0.5, -3.0],
    [-4.0, -2.0, 0.5, -2.0, -4.0],
    [-5.0, -4.0, -3.0, -4.0, -5.0]
];

const RookTable = [
    [0.0, 0.5, 0.5, 0.5, 0.0],
    [-0.5, 0.0, 0.0, 0.0, -0.5],
    [-0.5, 0.0, 0.0, 0.0, -0.5],
    [-0.5, 0.0, 0.0, 0.0, -0.5],
    [0.0, 1.0, 1.0, 1.0, 0.0]
];

const QueenTable = [
    [0.5, 2.0, 1.0, 2.0, 0.5],
    [0.0, 0.5, 0.5, 0.5, 0.0],
    [0.0, 0.5, 0.5, 0.5, 0.0],
    [-0.5, 0.5, 0.5, 0.5, -0.5],
    [-1.5, -0.5, -0.5, -0.5, -1.5]
];

const NoneTable = [
    [0.0, -0.5, -1.0, -0.5, 0.0],
    [0.0, -0.5, -1.5, -0.5, 0.0],
    [0.0, -0.5, -2.0, -0.5, 0.0],
    [0.5, -1.5, -2.5, -1.5, 0.5],
    [0.5, 1.0, 1.5, 1.0, 0.5]
];

function getEvaluationData(piece) {
    switch(piece) {
        case "Pawn":
            return { value: PawnValue, table: PawnTable };    
        break;
        case "King":
            return { value: KingValue, table: KingTable };    
        break;
        case "Knight":
            return { value: KnightValue, table: KnightTable };    
        break;
        case "Rook":
            return { value: RookValue, table: RookTable };    
        break;
        case "Queen":
            return { value: QueenValue, table: QueenTable };    
        break;
        case "None":
            return { value: NoneValue, table: NoneTable };    
        break;
    }
}

function evaluate(board) {
    // determine material + position
    let whiteValue = 0, blackValue = 0;
    let whiteReveal = 0, blackReveal = 0;
    for(let y = 0; y < boardSize; y++) {
        for(let x = 0; x < boardSize; x++) {
            let evData = getEvaluationData(board[y][x].chess);
            if(board[y][x].team === 0) {
                whiteValue += evData.value + evData.table[4 - y][x] + getWWRevalValue(board[y][x].name);
                whiteReveal += board[y][x].enemyVisibleStatus / 7;
            } else if(board[y][x].team === 1) {
                blackValue += evData.value + evData.table[y][x] + getWWRevalValue(board[y][x].name);  
                blackReveal += board[y][x].enemyVisibleStatus / 7;
            }
        }
    }
    return (blackValue + whiteReveal) - (whiteValue + blackReveal);
}

// takes a game, a piece name, an argument for the ability + log value
function executeActiveAbility(game, abilityPiece, abilityPieceLocation, position, log = true) {
    switch(abilityPiece) {
        case null: default:
            return false;
        break;
        case "Recall":
        case "Alpha Wolf":
            let recallSubject = { x: position[0], y: position[1] };
            let recallSubjectObject = game.state[recallSubject.y][recallSubject.x];
            game.state[0][recallSubject.x] = deepCopy(recallSubjectObject);
            game.state[recallSubject.y][recallSubject.x] = getPiece(null);
            if(log) game.lastMoves.push([game.turn, recallSubjectObject.name, recallSubjectObject.disguise, recallSubjectObject.enemyVisible, xyToName(position[0], position[1]), xyToName(position[0], 0), recallSubjectObject.enemyVisibleStatus, "⤴️"]);
            return true;
        break;
        case "Tan": // Tanner - Player
            let tanDisSubject = position[0];
            game.state[tanDisSubject.y][tanDisSubject.x].disguise = position[1];
            return false;
        break;
        case "Tanner": // Tanner - AI
            let tanSubject = { x: position[0], y: position[1] };
            let tanSubjectObject = game.state[tanSubject.y][tanSubject.x];
            let disguise;
            switch(tanSubjectObject.enemyVisibleStatus < 6 ? tanSubjectObject.enemyVisible : tanSubjectObject.chess) {
                case "LikelyPawn": case "Pawn":
                default:
                    disguise = "Wolf";
                break;
                case "LikelyKing": case "King":
                    disguise = "Psychic Wolf";
                break;
                case "LikelyKnight": case "Knight":
                    disguise = "Fox";
                break;
                case "LikelyRook": case "Rook":
                case "LikelyQueen": case "Queen":
                    disguise = "Scared Wolf";
                break;
            }
            game.state[tanSubject.y][tanSubject.x].disguise = disguise;
            return false;
        break;
        case "Hide":
        case "Hooker":
            let hideSubject = { x: abilityPieceLocation[0], y: abilityPieceLocation[1] };
            let hideTarget = xyToName(position[0], position[1]);
            game.state[hideSubject.y][hideSubject.x].hidden = hideTarget;
            return false;
        break;
        case "Sabotage":
        case "Saboteur Wolf":
            let sabotageTarget = { x: position[0], y: position[1] };
            let sabotageTargetObject = game.state[sabotageTarget.y][sabotageTarget.x];
            game.state[sabotageTarget.y][sabotageTarget.x].sabotaged = true;
            let sabotageTargetName = xyToName(sabotageTarget.x, sabotageTarget.y);
            if(log) game.lastMoves.push([game.turn, sabotageTargetObject.name, sabotageTargetObject.disguise, sabotageTargetObject.enemyVisible, sabotageTargetName, sabotageTargetName, sabotageTargetObject.enemyVisibleStatus, "⛔🟦🟦"]);
            return false;
        break;
        case "Protect":
        case "Witch":
        case "Royal Knight":
            let protectTarget = { x: position[0], y: position[1] };
            game.state[protectTarget.y][protectTarget.x].protected = true;
            return false;
        break;
        case "Infect":
        case "Infecting Wolf":
            let iwSource = { x: abilityPieceLocation[0], y: abilityPieceLocation[1] };
            let iwTarget = { x: position[0], y: position[1] };
            let iwTargetName = xyToName(iwTarget.x, iwTarget.y);
            if(log) game.lastMoves.push([game.turn, game.state[iwTarget.y][iwTarget.x].name, false, "", iwTargetName, iwTargetName, 7, "🔀" + findEmoji("Wolf") + "🟦"]);
            game.state[iwSource.y][iwSource.x] = getPiece("Wolf");
            game.state[iwTarget.y][iwTarget.x] = getPiece("Wolf");
            game.state[iwSource.y][iwSource.x].enemyVisibleStatus = 7;
            game.state[iwTarget.y][iwTarget.x].enemyVisibleStatus = 7;
            return true;
        break;
        case "Transform":
        case "Dog":
            let transformer = { x: abilityPieceLocation[0], y: abilityPieceLocation[1] };
            game.state[transformer.y][transformer.x] = convertPiece(game.state[transformer.y][transformer.x], position);
            return false;
        break;
        case "Invest":
        case "Fortune Teller":
        case "Warlock":
        case "Clairvoyant Fox":
        case "Crowd Seeker":
        case "Psychic Wolf":
        case "Archivist Fox":
        case "Aura Teller":
            let investigatorC = { x: abilityPieceLocation[0], y: abilityPieceLocation[1] };
            let investigator = game.state[investigatorC.y][investigatorC.x];
            let investTarget = { x: position[0], y: position[1] };
            switch(investigator.name) {
                // reveal role
                case "Fortune Teller":
                case "Warlock":
                case "Clairvoyant Fox":
                    game.state[investTarget.y][investTarget.x].enemyVisibleStatus = 6;
                break;
                // reveal movement type
                case "Crowd Seeker":
                case "Psychic Wolf":
                case "Archivist Fox":
                    game.state[investTarget.y][investTarget.x].enemyVisibleStatus = 4;
                    game.state[investTarget.y][investTarget.x].enemyVisible = game.state[investTarget.y][investTarget.x].chess;
                break;
                // reveal movement type if active
                case "Aura Teller":
                    if(game.state[investTarget.y][investTarget.x].active) {
                        game.state[investTarget.y][investTarget.x].enemyVisibleStatus = 5;
                        game.state[investTarget.y][investTarget.x].enemyVisible = "Active" + game.state[investTarget.y][investTarget.x].chess;
                    }
                break;
            }
            if(game.state[investTarget.y][investTarget.x].name == "Recluse") { // recluse reveal
                if(log) game.lastMoves.push([game.turn, investigator.name, false, "", xyToName(investigatorC.x, investigatorC.y), xyToName(investTarget.x, investTarget.y), 7, "👁️"]);
                game.state[investigatorC.y][investigatorC.x].enemyVisibleStatus = 7;
                game.state[investTarget.y][investTarget.x].enemyVisibleStatus = 7;
            } else {
                if(log) {
                    let investTargetObject = game.state[investTarget.y][investTarget.x];
                    game.lastMoves.push([game.turn, investTargetObject.name, investTargetObject.disguise, investTargetObject.enemyVisible, xyToName(investTarget.x, investTarget.y), xyToName(investTarget.x, investTarget.y), investTargetObject.enemyVisibleStatus, "👁️🟦🟦"]);
                }
            }
            return false;
        break;
    }
    return false;
}

function getChildren(game, depth = 0) {
    let board = game.state;
    // get all available pieces
    let pieces = [];
    let abilityPieces = [];
    let enemyPieces = [];
    let skipPointless = false; // some abilities are unlimited, so always better than nothing
    for(let y = 0; y < boardSize; y++) {
        for(let x = 0; x < boardSize; x++) {
            if(board[y][x].team == game.turn) {
                pieces.push(xyToName(x, y));
                if(board[y][x].active && !board[y][x].sabotaged) {
                    // active ability priorities
                    switch(board[y][x].name) {
                        // done by self this turn
                        case "Crowd Seeker": case "Archivist Fox": case "Psychic Wolf": case "Aura Teller": case "Tanner":
                            if(depth >= 4) {
                                abilityPieces.push([board[y][x].name, x, y]);
                                skipPointless = true;
                            }
                        break;
                        case "Fortune Teller": case "Warlock": case "Clairvoyant Fox": 
                            if(depth >= 4) {
                                abilityPieces.push([board[y][x].name, x, y]);
                                if(abilityPieces.length > 0) skipPointless = true;
                            }
                        break;
                        // done by enemy next turn 
                        case "Hooker":
                            if(depth >= 3) abilityPieces.push([board[y][x].name, x, y]);
                        break;
                        // done by self in next turn
                        case "Saboteur Wolf": 
                            if(depth >= 2) abilityPieces.push([board[y][x].name, x, y]);
                        break;
                        // whenever
                        case "Infecting Wolf": case "Dog": case "Alpha Wolf":
                            abilityPieces.push([board[y][x].name, x, y]);
                        break;
                    }
                    // end priorities
                }
            } else {
                enemyPieces.push([x, y, board[y][x].enemyVisibleStatus]);
            }
        }
    }
    
    // find all possible ability/move combinations
    let children = [];
    // option to not use an ability
    if(!skipPointless) abilityPieces.unshift([null,0,0]);
    // iterate ability pieces
    for(const abilityPiece of abilityPieces) {
        // find valid options for ability
        let abilityPositions = [];
        switch(abilityPiece[0]) {
            case null: default:
                abilityPositions = [[null]];
            break;
            // targetable enemy
            case "Fortune Teller": case "Warlock": case "Infecting Wolf": case "Saboteur Wolf":
                abilityPositions = generatePositions(game.state, xyToName(abilityPiece[1], abilityPiece[2]), true).filter(el => el[2]).map(el => [el[0], el[1]]); // only select moves with targets
            break;
            // all enemy
            case "Clairvoyant Fox": case "Crowd Seeker": case "Archivist Fox": case "Psychic Wolf": case "Aura Teller":
                let status = 0;
                // only select the investigation that reveals most
                while(status < 7) {
                    abilityPositions = enemyPieces.filter(el => el[2] == status);
                    if(abilityPositions.length > 1) break;
                    status++;
                }
                // there is no real priority otherwise
                if(abilityPositions.length > 1) { 
                    abilityPositions = abilityPositions.slice(0, 1);
                }
            break;
            // all ally
            case "Tanner":
                abilityPositions = pieces.map(el => {
			let tanXY = nameToXY(el);
			return [el.x, el.y];
		});
            break;
            // dog
            case "Dog":
                abilityPositions = ["Wolf Cub","Fox"];
            break;
            // adjacent ally
            case "Hooker":
                let ax = abilityPiece[1], ay = abilityPiece[2];
                if(inBounds(ax, ay-1) && game.state[ay-1][ax].team == 0) abilityPositions.push([ax, ay-1]);
                if(inBounds(ax, ay+1) && game.state[ay+1][ax].team == 0) abilityPositions.push([ax, ay+1]);
                if(inBounds(ax-1, ay-1) && game.state[ay-1][ax-1].team == 0) abilityPositions.push([ax-1, ay-1]);
                if(inBounds(ax-1, ay) && game.state[ay][ax-1].team == 0) abilityPositions.push([ax-1, ay]);
                if(inBounds(ax-1, ay+1) && game.state[ay+1][ax-1].team == 0) abilityPositions.push([ax-1, ay+1]);
                if(inBounds(ax+1, ay-1) && game.state[ay-1][ax+1].team == 0) abilityPositions.push([ax+1, ay-1]);
                if(inBounds(ax+1, ay) && game.state[ay][ax+1].team == 0) abilityPositions.push([ax+1, ay]);
                if(inBounds(ax+1, ay+1) && game.state[ay+1][ax+1].team == 0) abilityPositions.push([ax+1, ay+1]);
            break;
            // alpha wolf
            case "Alpha Wolf":
                for(let i = 0; i < pieces.length; i++) {
                        let coords = nameToXY(pieces[i]);
                        if(game.state[0][coords.x].name == null) abilityPositions.push([coords.x, coords.y]);
                }
            break;
        }
        
        for(const abilityPosition of abilityPositions) {
            // make a copy
            let gameCopy = deepCopy(game); // create a copy of the game to simulate the move on
            gameCopy.ai = true; // mark as AI game
            gameCopy.id = null;
            // execute ability
            let piecesChanged = false
            if(abilityPiece[0] != null) {
                piecesChanged = executeActiveAbility(gameCopy, abilityPiece[0], [abilityPiece[1], abilityPiece[2]], abilityPosition, false);
            }
            
            // redetermine pieces if positions have changed
            if(piecesChanged) {
                pieces = [];
                for(let y = 0; y < boardSize; y++) {
                    for(let x = 0; x < boardSize; x++) {
                        if(gameCopy.state[y][x].team == gameCopy.turn) {
                            pieces.push(xyToName(x, y));
                        }
                    }
                }
            }
            
            // START continue with normal move
            // iterate through all pieces
            for(let i = 0; i < pieces.length; i++) {
                let selectedPiece = pieces[i];
                let positions = generatePositions(gameCopy.state, selectedPiece, true);
                // iterate through that piece's moves
                for(let j = 0; j < positions.length; j++) {
                    let gameInnerCopy = deepCopy(gameCopy); // create a copy of the game to simulate the move on
                    let selectedMove = positions[j];
                    // simulate move
                    movePiece(null, gameInnerCopy, selectedPiece, xyToName(selectedMove[0], selectedMove[1]));
                    //if(depth==4) console.log(abilityPiece, "~", abilityPosition, "|", selectedPiece, ">", selectedMove);
                    children.push([abilityPiece, abilityPosition, selectedPiece, selectedMove, gameInnerCopy]);
                }
            }
            // END normal move section
        }
    }
    // END ability section
    
	return children; // 0 -> ability piece, 1 -> ability usage, 2 -> piece, 3 -> move, 4 -> state
}

// on the first iteration save and return the move
function minimaxStart(game, depth, alpha = -Infinity, beta = Infinity) {
    let board = game.state;
    if (!canMove(board, 0)) {
        return { value: Infinity, move: null };
    }
    if (!canMove(board, 1)) {
        return { value: -Infinity, move: null };
    }
    
    // maximizing player (minimizing does not exist)
    let value = -Infinity;
    let bestMove = null;
    let children = getChildren(game, depth);
    console.log("POSSIBLE MOVES", children.length/**, children.map(el => (el[0]==null?"":(el[0] + "~" + (el[1].length==2?xyToName(el[1][0], el[1][1]):el[1]) + " & "))  + el[2] + ">" + xyToName(el[3][0], el[3][1]))**/);
    for (const child of children) {
        const result = minimax(child[4], depth - 1, alpha, beta, false);
        if (result > value) {
            value = result;
            bestMove = child.slice(0, 4);
        }
        alpha = Math.max(alpha, value);
        if (beta <= alpha) {
            break;  // Beta cut-off
        }
    }
    return { value, move: bestMove };
}

function minimax(game, depth, alpha = -Infinity, beta = Infinity, maximizingPlayer = true) {
    let board = game.state;
    // Base case: if we have reached the maximum search depth or the game is over, return the heuristic value of the state
    if (depth === 0) {
        // this is positive for the maximizing player -> so rn Player#2 is hardcoded as that
        return evaluate(board);
    }
    if (!canMove(board, 0)) {
        return Infinity;
    }
    if (!canMove(board, 1)) {
        return -Infinity;
    }
   
    if (maximizingPlayer) {
        let value = -Infinity;
        let children = getChildren(game, depth);
        for (const child of children) {
            value = Math.max(value, minimax(child[4], depth - 1, alpha, beta, false));
            alpha = Math.max(alpha, value);
            if (beta <= alpha) {
                break;  // Beta cut-off
            }
        }
        return value;
    } else {
        let value = Infinity;
        let children = getChildren(game, depth);
        for (const child of children) {
            value = Math.min(value, minimax(child[4], depth - 1, alpha, beta, true));
            beta = Math.min(beta, value);
            if (beta <= alpha) {
                break;  // Alpha cut-off
            }
        }
        return value;
    }
}


async function AImove(game) {
    let gameCopy = deepCopy(game); // create a copy of the game to simulate the move on
    gameCopy.ai = true; // mark as AI game
    gameCopy.id = null;
    let minmax = minimaxStart(gameCopy, 4);
    if(minmax.move == null) minmax = { value: null, move: getChildren(game)[0].slice(0, 4) };
    let bestMove = minmax.move;
	console.log("AI BEST MOVE DEBUG", bestMove);
    
    if(bestMove[0] == null || bestMove[0][0] == null) {
        console.log("NO ABILITY");
    } else {
        console.log("AI ABILITY", bestMove[0] + "~" + (bestMove[1].length == 2 ? xyToName(bestMove[1][0], bestMove[1][1]) : bestMove[1]));
        executeActiveAbility(game, bestMove[0][0], [bestMove[0][1], bestMove[0][2]], bestMove[1]);
    }
    console.log("AI MOVE", bestMove[2] + ">" + xyToName(bestMove[3][0], bestMove[3][1]), minmax.value);
    movePiece(null, game, bestMove[2], xyToName(bestMove[3][0], bestMove[3][1]));
}



// check if user is a Game Master
function isGameMaster(member) {
    if(!member) return false;
    return member && member.roles && member.roles.cache.get("584767449078169601");
}

// log utility function
function log(txt1, txt2 = "", txt3 = "", txt4 = "", txt5 = "") {
    let txt = txt1 + " " + txt2 + " " + txt3 + " " + txt4 + " " + txt5;
    console.log(txt);
    /**let guild = client.guilds.cache.get("584765921332297775");
    let channel;
    if(guild) channel = guild.channels.cache.get("1047920491089895565")
    if(channel) channel.send(txt);**/
}


/** GLOBAL VARIABLES **/
var games = [];
var players = [];
var outstandingChallenge = [];

// check if player is playing
function isPlaying(id) {
    return players.map(el => el[0]).indexOf(id) != -1;
}

// check if player has an outstanding challenge
function isOutstanding(id) {
    return outstandingChallenge.map(el => el[0]).indexOf(id) != -1;
}

// get the id of the game the player is playing
function getPlayerGameId(id) {
    let ind = players.map(el => el[0]).indexOf(id);
    return players[ind][1];
}

// create a deep copy of an element by JSON stringifying and then parsing it
function deepCopy(el) {
    return structuredClone(el);
}

function turnStart(interaction, gameid, turn, mode = "editreply") {
    let availableAbilities = showMoves(gameid, turn, true, "Select a Piece (ABILITY)");
    // show buttons?
    if(availableAbilities.components[0].components.length == 1) turnMove(interaction, gameid, turn, mode); // no
    else response(interaction, availableAbilities, mode); // yes
}

function turnMove(interaction, gameid, turn, mode = "editreply") {
    // update spec board
    let msgSpec = displayBoard(games[gameid], "SPECTATOR BOARD", [], games[gameid].players[1] == null ? 0 : -1);
    msgSpec.ephemeral = false;
    games[gameid].msg.edit(msgSpec);
    // show movable pieces
    let availableMoves = showMoves(gameid, turn, false, "Select a Piece (MOVE)");
    response(interaction, availableMoves, mode);
}

function response(interaction, resp, mode) {
    switch(mode) {
        case "update":
            interaction.update(resp);
        break;
        case "followup":
            interaction.followUp(resp);  
        break;
        case "edit":
            interaction.edit(resp);  
        break;
        case "editreply":
	        interaction.editReply(resp);  
        break;
    }
}

function getDefensivePosition(moveFrom, moveTo, movedX, movedY) {
    let defensive = {};
    defensive.x = moveTo.x;
    defensive.y = moveTo.y;
    if(moveTo.x != moveFrom.x) defensive.x -= Math.sign(moveTo.x - moveFrom.x)
    if(moveTo.y != moveFrom.y) defensive.y -= Math.sign(moveTo.y - moveFrom.y)
    if((movedY == 1 && movedX == 2) || (movedY == 2 && movedX == 1)) { // knight has no intermediate steps and stays if blocked
        defensive.x = moveFrom.x;
        defensive.y = moveFrom.y;
    }
    return defensive;
}

// moves a piece from one place to another (and/or replaces the piece with another piece)
function movePiece(interaction, moveCurGame, from, to, repl = null) {
    // is ai fake turn
    const notAiTurn = !moveCurGame.ai;
    // get coords
    let moveFrom = nameToXY(from);
    let moveTo = nameToXY(to);
            
    // move piece
    let movedPieceCopy = deepCopy(moveCurGame.state[moveFrom.y][moveFrom.x]);
    let movedPiece = deepCopy(moveCurGame.state[moveFrom.y][moveFrom.x]);
    let beatenPiece = deepCopy(moveCurGame.state[moveTo.y][moveTo.x]);
    if(repl) movedPiece = repl; // replace piece for promotion
    moveCurGame.state[moveFrom.y][moveFrom.x] = getPiece(null);
    moveCurGame.state[moveTo.y][moveTo.x] = movedPiece;
    
    // 0 -> unknown / likely knight
    // 1 -> likely pawn
    // 2 -> likely king
    // 3 -> likely rook / king
    // 4 -> piece known
    // 5 -> active ability known
    // 6 -> role known (disguise affected)
    // 7 -> role known (disguise unaffected)
    let movedXorig = moveFrom.x - moveTo.x;
    let movedYorig = moveFrom.y - moveTo.y;
    let movedX = Math.abs(movedXorig);
    let movedY = Math.abs(movedYorig);
    if(notAiTurn) console.log("MOVED", movedXorig, movedYorig, beatenPiece?beatenPiece.name:"");
    //console.log("status", movedPiece.enemyVisibleStatus);
    const mEVS = movedPiece.enemyVisibleStatus;
    const mDis = movedPiece.disguise;
    const mDisChess = getChessName(mDis);
    const p1Turn = moveCurGame.turn === 0;
    const beaten = beatenPiece.name != null;
    if(mEVS < 7) { 
        // definitely a knight
        if(mEVS < 3 && ((movedY == 1 && movedX == 2) || (movedY == 2 && movedX == 1))) {
            if(movedPiece.team == 0 && !movedPiece.hasMoved) { // white knights may be amnesiacs
                movedPiece.enemyVisibleStatus = 0;
                movedPiece.enemyVisible = "LikelyKnight";  
            } else {
                movedPiece.enemyVisibleStatus = 4;
                movedPiece.enemyVisible = "Knight";
            }
        }
        if(mEVS == 6 && ((movedY == 1 && movedX == 2) || (movedY == 2 && movedX == 1)) && mDis && mDisChess != "Knight") { // was disguised
            movedPiece.enemyVisibleStatus = 4;
            movedPiece.enemyVisible = "Knight";
        }
        // pawn condition
        else if(mEVS < 1 && p1Turn && movedYorig == 1 && movedX == 0 && beatenPiece.name == null) { // white pawn move
            movedPiece.enemyVisibleStatus = 1;
            movedPiece.enemyVisible = "LikelyPawn";
        } else if((mEVS < 1 || (mEVS == 6 && mDis && mDisChess == "Rook")) && p1Turn && movedYorig == 1 && movedX == 1 && beaten) { // white pawn beat
            movedPiece.enemyVisibleStatus = 1;
            movedPiece.enemyVisible = "LikelyPawn";
        } else if(mEVS < 1 && !p1Turn && movedYorig == -1 && movedX == 0 && beatenPiece.name == null) { // black pawn move
            movedPiece.enemyVisibleStatus = 1;
            movedPiece.enemyVisible = "LikelyPawn";
        } else if((mEVS < 1 || (mEVS == 6 && mDis && mDisChess == "Rook")) && !p1Turn && movedYorig == -1 && movedX == 1 && beaten) { // black pawn beat
            movedPiece.enemyVisibleStatus = 1;
            movedPiece.enemyVisible = "LikelyPawn";
        }
        // king condition
        else if((mEVS < 2 || (mEVS == 6 && mDis && (mDisChess != "Rook" || mDisChess != "Queen" || mDisChess != "King"))) && movedY == 0 && movedX == 1) { // rook like move (left/right)
            movedPiece.enemyVisibleStatus = 2;
            movedPiece.enemyVisible = "LikelyKing";
        } else if((mEVS < 2 || (mEVS == 6 && mDis && (mDisChess != "Rook" || mDisChess != "Queen" || mDisChess != "King"))) && ((p1Turn && movedYorig == -1) || (!p1Turn && movedYorig == 1))  && (movedX == 0 || movedX == 1)) { // rook like move (down, side down)
            movedPiece.enemyVisibleStatus = 2;
            movedPiece.enemyVisible = "LikelyKing";
        } else if((mEVS < 2 || (mEVS == 6 && mDis && (mDisChess != "Rook" || mDisChess != "Queen" || mDisChess != "King"))) && ((p1Turn && movedYorig == 1) || (!p1Turn && movedYorig == -1))  && movedX == 0 && beaten) { // rook like move (up)
            movedPiece.enemyVisibleStatus = 2;
            movedPiece.enemyVisible = "LikelyKing";
        } else if((mEVS < 2 || (mEVS == 6 && mDis && (mDisChess != "Rook" || mDisChess != "Queen" || mDisChess != "King"))) && ((p1Turn && movedYorig == 1) || (!p1Turn && movedYorig == -1))  && movedX == 1 && beatenPiece.name == null) { // rook like move (side up)
            movedPiece.enemyVisibleStatus = 2;
            movedPiece.enemyVisible = "LikelyKing";
        }
        // rook condition
        else if((mEVS < 3 || (mEVS == 6 && mDis && (mDisChess != "Rook" || mDisChess != "Queen"))) && ((movedY > 1 && movedX == 0) || (movedY == 0 && movedX > 1))) {
            movedPiece.enemyVisibleStatus = 3;
            movedPiece.enemyVisible = "LikelyRook";
        }
        // queen condition
        else if((mEVS < 4 || (mEVS == 6 && mDis && mDisChess != "Queen")) && (movedY > 1 || movedX > 1) && movedY > 1 && movedX > 1) {
            movedPiece.enemyVisibleStatus = 4;
            movedPiece.enemyVisible = "Queen";
        }
    }
    
    
    if(from == to) beatenPiece = getPiece(null); // promotion is not taking
    
    let defensive;
    // death effects
    if(notAiTurn || moveCurGame.players[moveCurGame.turn] == null || beatenPiece.enemyVisibleStatus >= 6) { // only run in normal turns, ai's own turns or when effect is visible
        if(!notAiTurn && moveCurGame.players[moveCurGame.turn] != null && beatenPiece.enemyVisibleStatus == 6 && beatenPiece.disguise) beatenPiece.name = beatenPiece.disguise; // see role with disguise if applicable
        switch(beatenPiece.name) {
            case null:
                if(from == to) { // pawn promotion
                    if(notAiTurn) moveCurGame.lastMoves.push([moveCurGame.turn, movedPieceCopy.name, movedPiece.disguise, movedPiece.enemyVisibleStatus<4?"Pawn":movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus<4?4:movedPiece.enemyVisibleStatus, "⏫🟦🟦"]);
                } else { 
                    moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus]);
                }
            break;
            default:
                // store move
                if(beatenPiece.protected) { // protected (Witch)
                    defensive = getDefensivePosition(moveFrom, moveTo, movedX, movedY);
                    if(notAiTurn) {
                        moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, xyToName(defensive.x, defensive.y), movedPiece.enemyVisibleStatus]);
                        moveCurGame.lastMoves.push([(moveCurGame.turn+1)%2, beatenPiece.name, beatenPiece.disguise, beatenPiece.enemyVisible, to, to, beatenPiece.enemyVisibleStatus, "🛡️🟦🟦"]);
                    }
                    moveCurGame.state[defensive.y][defensive.x] = movedPiece;
                    moveCurGame.state[moveTo.y][moveTo.x] = beatenPiece;
                } else { // piece taken
                    moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                }
            break; // Hooker defense
            case "Hooker":
                if(beatenPiece.hidden) {
                    defensive = getDefensivePosition(moveFrom, moveTo, movedX, movedY);
                    if(notAiTurn) {
                        moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, xyToName(defensive.x, defensive.y), movedPiece.enemyVisibleStatus]);
                        moveCurGame.lastMoves.push([(moveCurGame.turn+1)%2, beatenPiece.name, false, "", to, to, 7, "🛡️🟦🟦"]);
                    }
                    moveCurGame.state[defensive.y][defensive.x] = movedPiece;
                    moveCurGame.state[moveTo.y][moveTo.x] = beatenPiece;
                    moveCurGame.state[moveTo.y][moveTo.x].enemyVisibleStatus = 7;
                }
            break;
            case "Ranger":
                movedPiece.enemyVisibleStatus = 7;
                if(notAiTurn) {
                    moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                    moveCurGame.lastMoves.push([(moveCurGame.turn+1)%2, "Ranger", false, "", to, to, 7, "👁️" + findEmoji(movedPiece.name) + "🟦"]);
                }
            break;
            case "Huntress":
                moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                moveCurGame.lastMoves.push([(moveCurGame.turn+1)%2, "Huntress", false, "", to, from, 7, "🇽​"]);
                moveCurGame.state[moveTo.y][moveTo.x] = getPiece(null);
            break;
            // Extra Move Pieces
            case "Child":
            case "Wolf Cub":
                if(notAiTurn) {
                    moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                    moveCurGame.lastMoves.push([(moveCurGame.turn+1)%2, beatenPiece.name, false, "", to, to, 7, "🟦" + "2️⃣" + "🇽"]);
                }
                if(moveCurGame.turn == 1) moveCurGame.doubleMove0 = true;
                else if(moveCurGame.turn == 0) moveCurGame.doubleMove1 = true;
            break;
            // Fortune Apprentice
            case "Fortune Teller":
            case "Aura Teller":
            case "Crowd Seeker":
                if(notAiTurn) moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                for(let y = 0; y < 5; y++) {
                    for(let x = 0; x < 5; x++) {
                        let xyPiece = moveCurGame.state[y][x];
                        if(xyPiece.name == "Fortune Apprentice") {
                            moveCurGame.state[y][x] = getPiece(beatenPiece.name);
                        }
                    }
                }
            break;
            // Defensive Pieces, Single Defense
            case "Runner":
            case "Idiot":
            case "Scared Wolf":
                defensive = getDefensivePosition(moveFrom, moveTo, movedX, movedY);
                if(notAiTurn) {
                    moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, xyToName(defensive.x, defensive.y), movedPiece.enemyVisibleStatus]);
                    moveCurGame.lastMoves.push([(moveCurGame.turn+1)%2, beatenPiece.name, false, "", to, to, 7, "🛡️🟦🟦"]);
                }
                moveCurGame.state[defensive.y][defensive.x] = movedPiece;
                moveCurGame.state[moveTo.y][moveTo.x] = getPiece("Attacked " + beatenPiece.name);
                moveCurGame.state[moveTo.y][moveTo.x].enemyVisibleStatus = 7;
            break;
            case "Cursed Civilian":
                defensive = getDefensivePosition(moveFrom, moveTo, movedX, movedY);
                if(notAiTurn) {
                    moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, xyToName(defensive.x, defensive.y), movedPiece.enemyVisibleStatus]);
                    moveCurGame.lastMoves.push([moveCurGame.turn, beatenPiece.name, false, "", to, to, 7, "🔀" + findEmoji("Wolf") + "🟦"]);
                }
                moveCurGame.state[defensive.y][defensive.x] = movedPiece;
                moveCurGame.state[moveTo.y][moveTo.x] = getPiece("Wolf");
                moveCurGame.state[moveTo.y][moveTo.x].enemyVisibleStatus = 7;
            break;
            case "Alcoholic":
                let bartenderAlive = false;
                for(let y = 0; y < 5; y++) {
                    for(let x = 0; x < 5; x++) {
                        let xyPiece = moveCurGame.state[y][x];
                        if(xyPiece.name == "Bartender") {
                            bartenderAlive = true;
                        }
                    }
                }
                if(bartenderAlive) {
                    defensive = getDefensivePosition(moveFrom, moveTo, movedX, movedY);
                    if(notAiTurn) {
                        moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, xyToName(defensive.x, defensive.y), movedPiece.enemyVisibleStatus]);
                        moveCurGame.lastMoves.push([(moveCurGame.turn+1)%2, beatenPiece.name, false, "", to, to, 7, "🛡️🟦🟦"]);
                    }
                    moveCurGame.state[defensive.y][defensive.x] = movedPiece;
                    moveCurGame.state[moveTo.y][moveTo.x] = beatenPiece;
                    moveCurGame.state[moveTo.y][moveTo.x].enemyVisibleStatus = 7;
                } else {
                    if(notAiTurn) moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus]);
                }
            break;
        }
    }
    
    // Hooker death check
    if(notAiTurn || moveCurGame.players[moveCurGame.turn] == null || movedPiece.enemyVisibleStatus >= 6) { // only run in normal turns, ai's own turns or when effect is visible
        if(inBounds(moveTo.y, moveTo.x-1) && moveCurGame.state[moveTo.y][moveTo.x-1].hidden == to) {
            moveCurGame.state[moveTo.y][moveTo.x-1] = getPiece(null);
            moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽" + findEmoji("Hooker") + "🟦"]);
        }
        if(inBounds(moveTo.y, moveTo.x+1) && moveCurGame.state[moveTo.y][moveTo.x+1].hidden == to) {
            moveCurGame.state[moveTo.y][moveTo.x+1] = getPiece(null);
            moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽" + findEmoji("Hooker") + "🟦"]);
        }
        if(inBounds(moveTo.y+1, moveTo.x-1) && moveCurGame.state[moveTo.y+1][moveTo.x-1].hidden == to) {
            moveCurGame.state[moveTo.y+1][moveTo.x-1] = getPiece(null);
            moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽" + findEmoji("Hooker") + "🟦"]);
        }
        if(inBounds(moveTo.y+1, moveTo.x) && moveCurGame.state[moveTo.y+1][moveTo.x].hidden == to) {
            moveCurGame.state[moveTo.y+1][moveTo.x] = getPiece(null);
            moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽" + findEmoji("Hooker") + "🟦"]);
        }
        if(inBounds(moveTo.y+1, moveTo.x+1) && moveCurGame.state[moveTo.y+1][moveTo.x+1].hidden == to) {
            moveCurGame.state[moveTo.y+1][moveTo.x+1] = getPiece(null);
            moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽" + findEmoji("Hooker") + "🟦"]);
        }
        if(inBounds(moveTo.y-1, moveTo.x-1) && moveCurGame.state[moveTo.y-1][moveTo.x-1].hidden == to) {
            moveCurGame.state[moveTo.y-1][moveTo.x-1] = getPiece(null);
            moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽" + findEmoji("Hooker") + "🟦"]);
        }
        if(inBounds(moveTo.y-1, moveTo.x) && moveCurGame.state[moveTo.y-1][moveTo.x].hidden == to) {
            moveCurGame.state[moveTo.y-1][moveTo.x] = getPiece(null);
            moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽" + findEmoji("Hooker") + "🟦"]);
        }
        if(inBounds(moveTo.y-1, moveTo.x+1) && moveCurGame.state[moveTo.y-1][moveTo.x+1].hidden == to) {
            moveCurGame.state[moveTo.y-1][moveTo.x+1] = getPiece(null);
            moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽" + findEmoji("Hooker") + "🟦"]);
        }
    }
    
    // move effects
    if(notAiTurn || moveCurGame.players[moveCurGame.turn] == null || movedPiece.enemyVisibleStatus >= 6) { // only run in normal turns, ai's own turns or when effect is visible
        if(!notAiTurn && moveCurGame.players[moveCurGame.turn] != null && movedPiece.enemyVisibleStatus == 6 && movedPiece.disguise) movedPiece.name = movedPiece.disguise; // see role with disguise if applicable
        switch(movedPiece.name) {
            case "Amnesiac": // Amnesiac -> Change role after onhe move
            if(from != to) { // dont convert on promotion
                 if(!moveCurGame.ai) console.log("AMNESIAC CHANGE", movedPiece.convertTo);
                 moveCurGame.state[moveTo.y][moveTo.x] = convertPiece(movedPiece, movedPiece.convertTo);
            }
            break;
            case "Direwolf": // Direwolf -> Double move if last piece
                let wolfCount = 0;
                for(let y = 0; y < 5; y++) {
                    for(let x = 0; x < 5; x++) {
                        let xyPiece = moveCurGame.state[y][x];
                        if(xyPiece.team == 1) {
                            wolfCount++;
                        }
                    }
                }
                if(wolfCount == 1 && !moveCurGame.inDoubleMove) {
                moveCurGame.doubleMove1 = true;
                movedPiece.enemyVisibleStatus = 7;
            }
            break;
        }
        moveCurGame.inDoubleMove = false;
    }
    
    
    // promote?
    if(movedPiece.chess == "Pawn" && p1Turn && moveTo.y == 0) {
        if(interaction) {
            let kings = ["Hooker","Idiot","Crowd Seeker","Aura Teller"];
            let knights = ["Royal Knight","Amnesiac"];
            let rooks = ["Fortune Teller","Runner","Witch"];
            let promoteKing = kings[Math.floor(Math.random() * kings.length)];
            let promoteKnight = knights[Math.floor(Math.random() * knights.length)];
            let promoteRook = rooks[Math.floor(Math.random() * rooks.length)];
            let components = [];
            components.push({ type: 2, label: promoteKing + " " + getUnicode(getChessName(promoteKing), 0), style: 1, custom_id: "promote-"+to+"-"+promoteKing });
            components.push({ type: 2, label: promoteKnight + " " + getUnicode(getChessName(promoteKnight), 0), style: 1, custom_id: "promote-"+to+"-" + promoteKnight });
            components.push({ type: 2, label: promoteRook + " " + getUnicode(getChessName(promoteRook), 0), style: 1, custom_id: "promote-"+to+"-" + promoteRook });
            interaction.editReply(displayBoard(moveCurGame, "Promote " + to, [{ type: 1, components: components }] ));
        } else {
            let randomOptions = ["Hooker","Royal Knight","Fortune Teller","Runner","Witch"];
            movePiece(interaction, moveCurGame, to, to, getPiece(randomOptions[Math.floor(Math.random() * randomOptions.length)]));
        }
    } else if(movedPiece.chess == "Pawn" && !p1Turn && moveTo.y == 4) {
        if(interaction) {
            let kings = ["Alpha Wolf","Psychic Wolf","Sneaking Wolf"];
            let knights = ["Direwolf","Clairvoyant Fox","Fox"];
            let rooks = ["Warlock","Scared Wolf","Saboteur Wolf"];
            let promoteKing = kings[Math.floor(Math.random() * kings.length)];
            let promoteKnight = knights[Math.floor(Math.random() * knights.length)];
            let promoteRook = rooks[Math.floor(Math.random() * rooks.length)];
            let components = [];
            components.push({ type: 2, label: promoteKing + " " + getUnicode(getChessName(promoteKing), 1), style: 1, custom_id: "promote-"+to+"-"+promoteKing });
            components.push({ type: 2, label: promoteKnight + " " + getUnicode(getChessName(promoteKnight), 1), style: 1, custom_id: "promote-"+to+"-" + promoteKnight });
            components.push({ type: 2, label: promoteRook + " " + getUnicode(getChessName(promoteRook), 1), style: 1, custom_id: "promote-"+to+"-" + promoteRook });
            interaction.editReply(displayBoard(moveCurGame, "Promote " + to, [{ type: 1, components: components }] ));
        } else {
            let randomOptions = ["Alpha Wolf","Direwolf","Warlock","Scared Wolf","Saboteur Wolf"];
            movePiece(interaction, moveCurGame, to, to, getPiece(randomOptions[Math.floor(Math.random() * randomOptions.length)]));
        }
    } else {
        // turn complete
        turnDone(interaction, moveCurGame, "Waiting on Opponent");
    }
}

async function turnDone(interaction, game, message) {
    // turn complete
    if(!game.ai) {
        // update player message
        if(interaction) {
            await interaction.editReply(displayBoard(game, message));
            busyWaiting(interaction, game.id, game.turn);
        }
        // update spectator message
        let msgSpec = displayBoard(game, "SPECTATOR BOARD", [], game.players[1] == null ? 0 : -1);
        msgSpec.ephemeral = false;
        game.msg.edit(msgSpec);
    }
    nextTurn(game);
}

function displayBoard(game, message, comp = [], turnOverride = null) {
    return { content: renderBoard(game, message, turnOverride), components: comp, ephemeral: true, fetchReply: true };
}

function emptyMessage() {
    return { content: "*Loading...*", components: [], ephemeral: true, fetchReply: true };
}

async function busyWaiting(interaction, gameid, player) {
    await sleep(900);
    while(true) {
        await sleep(100);
        // game disappeared
        if(!games[gameid]) return;
        // game concluded
        if(games[gameid].concluded) {
            interaction.editReply(displayBoard(games[gameid], "Game Concluded", [], player));     
            destroyGame(gameid);
            return;
        }
        // attempt turn
        if(games[gameid].turn == player) {
            await sleep(100);
            // if edit fails retry;
            try {
                if(interaction && interaction.replied) {
                    turnStart(interaction, gameid, player, "editreply");  
                    return;
                }
            } catch (err) { 
                console.log(err);
                await sleep(500);
            }
        }
    }
}

async function delayedDestroy(gameid) {
    await sleep(2000);
    if(games[gameid]) destroyGame(gameid);
}

function canMove(board, player) {
    // check if a piece is available
    for(let y = 0; y < board.length; y++) {
        for(let x = 0; x < board[0].length; x++) {
            if(board[y][x].team == player) {
                if(hasAvailableMove(board, xyToName(x, y), true)) return true;
            }
        }
    }
    // if no move is found, return false
    return false;
}

function nextTurn(game) {
    // increment turn
    if(!game.ai) console.log("NEXT TURN");
    let oldTurn = game.turn;
    game.turn = (game.turn + 1) % 2;
    
    if(!game.ai) {
        // find a valid move
        let board = game.state;
      
        // Update Spectator Board
        let msgSpec = displayBoard(game, "SPECTATOR BOARD", [], game.players[1] == null ? 0 : -1);
        msgSpec.ephemeral = false;
        game.msg.edit(msgSpec);

        // WIN Message
        if(!canMove(board, game.turn)) {
            let guild = client.guilds.cache.get(game.guild);
            let channel = guild.channels.cache.get(game.channel);

            // look for www
            let wwwAlive = false;
            let wolfCount = 0;
            for(let y = 0; y < 5; y++) {
                for(let x = 0; x < 5; x++) {
                    let xyPiece = game.state[y][x];
                    if(xyPiece.name == "White Werewolf") {
                        wwwAlive = true;
                    }
                    if(xyPiece.team == 1) {
                        wolfCount++;
                    }
                }
            }
            // www lose
            if(wwwAlive && wolfCount > 1 && oldTurn == 1) {
                oldTurn = 0;
                game.turn = 1;
                channel.send("White Werewolf causes a loss!");
            }

            if(game.players[1]) channel.send("<@" + game.players[oldTurn] + "> has won against <@" + game.players[game.turn] + ">!");
            else if(oldTurn == 0 && !game.players[1]) channel.send("<@" + game.players[oldTurn] + "> has won against **AI**!");
            else if(oldTurn == 1 && !game.players[1]) channel.send("**AI** has won against <@" + game.players[game.turn] + ">!");
            concludeGame(game.id);
            delayedDestroy(game.id);
            console.log("WIN");
            return;
        }
    }
    
    // DOUBLE MOVE (CHILD/CUB)
    if(game.turn == 1 && game.doubleMove0 == true) { // double move town (Child)
        game.doubleMove0 = false;
    	game.inDoubleMove = true;
        nextTurn(game);
        return;
    } else if(game.turn == 0 && game.doubleMove1 == true) { // double move wolf (Cub)
        game.doubleMove1 = false;
    	game.inDoubleMove = true;
        nextTurn(game);
        return;
    }
    
    // Do AI Turn if AI in play
    if(!game.ai && game.turn == 1 && game.players[1] == null) {
        AImove(game)
    }
}

function removeEffects(curGame, team) {
    // unprotect, unhide, undisguise, unsabotage
    for(let y = 0; y < 5; y++) {
        for(let x = 0; x < 5; x++) {
            let xyPiece = curGame.state[y][x];
            if(xyPiece.name != null && xyPiece.team == team) {
                curGame.state[y][x].protected = false; 
                curGame.state[y][x].hidden = false; 
                curGame.state[y][x].disguise = false;
                if(curGame.state[y][x].name == "Sneaking Wolf") curGame.state[y][x].disguise = "Wolf"; // keep SnW disguise
            } else if(xyPiece.name != null && xyPiece.team != team) {
                curGame.state[y][x].sabotaged = false;
            }
        }
    }
}

/* New Slash Command */
client.on('interactionCreate', async interaction => {
    if(interaction.isButton()) {
        console.log("INTERACTION", interaction.customId);
        let type = interaction.customId.split("-")[0];
        let arg1 = interaction.customId.split("-")[1];
        let arg2 = interaction.customId.split("-")[2];
        let gameID = getPlayerGameId(interaction.member.id);
        let curGame = games[gameID];
        switch(type) {
            // select a piece; show available moves
            case "select":    
                let selection = nameToXY(arg1);
                let currentGame = deepCopy(curGame);
                
                // generate list of possible moves
                //console.log("BOARD AT SELECT", currentGame.state.map(el => el.map(el2 => el2.name).join(",")).join("\n"));
                let positions = generatePositions(currentGame.state, arg1);
                console.log("AVAILABLE POSITIONS", positions.map(el => xyToName(el[0], el[1])).join(","));
                let components = interactionsFromPositions(positions, arg1, "turnmove", "move");
                //console.log(components);
                
                currentGame.selectedPiece = deepCopy(currentGame.state[selection.y][selection.x]);
                currentGame.state[selection.y][selection.x] = getPiece("Selected");
                
                interaction.update(displayBoard(currentGame, "Pick a Move", components));
            break;
            // move a piece to another location; update board
            case "move":
                await interaction.update(displayBoard(curGame, "Executing Move", []));
                movePiece(interaction, games[gameID], arg1, arg2);
            break;
            // promote a piece; update board
            case "promote":
                await interaction.update(displayBoard(curGame, "Executing Move", []));
                movePiece(interaction, games[gameID], arg1, arg1, getPiece(arg2));
            break;
            // back to turn start menu
            case "turnstart":
                turnStart(interaction, gameID, curGame.turn, "update");
            break;
            // back to turn move menu
            case "turnmove":
                // unprotect, unhide, undisguise, unsabotage
                removeEffects(curGame, curGame.turn);
                // continue
                turnMove(interaction, gameID, curGame.turn, "update");
            break;
             // select an ability piece; show available actions
            case "ability":    
                let abilitySelection = nameToXY(arg1);
                let abilityPiece = curGame.state[abilitySelection.y][abilitySelection.x];
                
                // unprotect, unhide, undisguise, unsabotage
                removeEffects(curGame, abilityPiece.team);
                
                let aPositions, aInteractions, aComponents = [];
                // provide options
                switch(abilityPiece.name) {
                    default: case null:
                        aComponents = interactionsFromPositions([], arg1, "turnstart", 3);
                    break;
                    // Target targetable enemy
                    case "Fortune Teller":
                    case "Warlock":
                    case "Infecting Wolf":
                    case "Saboteur Wolf":
                        aPositions = generatePositions(curGame.state, arg1);
                        aPositions = aPositions.filter(el => el[2]).map(el => [el[0], el[1]]); // only select moves with targets
                        aComponents = interactionsFromPositions(aPositions, arg1, "turnstart", abilityPiece.name == "Infecting Wolf" ? "infect" : (abilityPiece.name == "Saboteur Wolf" ? "sabotage" : "investigate"), 3);
                    break;
                    // Target targetable ally
                    case "Witch":
                    case "Royal Knight":
                        let modGame = deepCopy(curGame.state);
                        modGame[abilitySelection.y][abilitySelection.x].team = (modGame[abilitySelection.y][abilitySelection.x].team + 1) % 2;
                        aPositions = generatePositions(modGame, arg1);
                        aPositions = aPositions.filter(el => el[2]).map(el => [el[0], el[1]]); // only select moves with targets
                        aComponents = interactionsFromPositions(aPositions, arg1, "turnstart", "protect", 3);
                    break;
                    // Target all enemy
                    case "Clairvoyant Fox":
                    case "Crowd Seeker":
                    case "Archivist Fox":
                    case "Psychic Wolf":
                    case "Aura Teller":
                        aPositions = [];
                        for(let y = 0; y < 5; y++) {
                            for(let x = 0; x < 5; x++) {
                                let xyPiece = curGame.state[y][x];
                                if(xyPiece.name != null && xyPiece.team != abilityPiece.team && xyPiece.enemyVisibleStatus != 7) {
                                    aPositions.push([x, y]);
                                }
                            }
                        }
                        aComponents = interactionsFromPositions(aPositions, arg1, "turnstart", "investigate", 3);
                    break;
                    // Target all ally
                    case "Tanner":
                        aPositions = [];
                        for(let y = 0; y < 5; y++) {
                            for(let x = 0; x < 5; x++) {
                                let xyPiece = curGame.state[y][x];
                                if(xyPiece.name != null && xyPiece.team == abilityPiece.team) {
                                    aPositions.push([x, y]);
                                }
                            }
                        }
                        aComponents = interactionsFromPositions(aPositions, arg1, "turnstart", "disguise", 3);
                    break;
                    // Dog
                    case "Dog":
                        aInteractions = [{ type: 2, label: "Back", style: 4, custom_id: "turnstart" }];
                        aInteractions.push({ type: 2, label: "Wolf Cub " + getUnicode("Pawn", 1), style: 3, custom_id: "transform-" + arg1 + "-Wolf Cub" });
                        aInteractions.push({ type: 2, label: "Fox " + getUnicode("Knight", 1), style: 3, custom_id: "transform-" + arg1 + "-Fox" });
                        aComponents = [{ type: 1, components: aInteractions }];
                    break;
                    // Hooker - Surrounding fields
                    case "Hooker":
                        aInteractions = [];
                        if(inBounds(abilitySelection.x, abilitySelection.y-1) && curGame.state[abilitySelection.y-1][abilitySelection.x].team == 0) aInteractions.push([abilitySelection.x, abilitySelection.y-1]);
                        if(inBounds(abilitySelection.x, abilitySelection.y+1) && curGame.state[abilitySelection.y+1][abilitySelection.x].team == 0) aInteractions.push([abilitySelection.x, abilitySelection.y+1]);
                        if(inBounds(abilitySelection.x-1, abilitySelection.y-1) && curGame.state[abilitySelection.y-1][abilitySelection.x-1].team == 0) aInteractions.push([abilitySelection.x-1, abilitySelection.y-1]);
                        if(inBounds(abilitySelection.x-1, abilitySelection.y) && curGame.state[abilitySelection.y][abilitySelection.x-1].team == 0) aInteractions.push([abilitySelection.x-1, abilitySelection.y]);
                        if(inBounds(abilitySelection.x-1, abilitySelection.y+1) && curGame.state[abilitySelection.y+1][abilitySelection.x-1].team == 0) aInteractions.push([abilitySelection.x-1, abilitySelection.y+1]);
                        if(inBounds(abilitySelection.x+1, abilitySelection.y-1) && curGame.state[abilitySelection.y-1][abilitySelection.x+1].team == 0) aInteractions.push([abilitySelection.x+1, abilitySelection.y-1]);
                        if(inBounds(abilitySelection.x+1, abilitySelection.y) && curGame.state[abilitySelection.y][abilitySelection.x+1].team == 0) aInteractions.push([abilitySelection.x+1, abilitySelection.y]);
                        if(inBounds(abilitySelection.x+1, abilitySelection.y+1) && curGame.state[abilitySelection.y+1][abilitySelection.x+1].team == 0) aInteractions.push([abilitySelection.x+1, abilitySelection.y+1]);
                        aInteractions = aInteractions.map(el => {
                            return new Object({ type: 2, label: xyToName(el[0], el[1]), style: 3, custom_id: "hide-" + arg1 + "-" + xyToName(el[0], el[1]) });
                        });
                        aInteractions.unshift({ type: 2, label: "Back", style: 4, custom_id: "turnstart" });
                        aComponents = [{ type: 1, components: aInteractions.slice(0, 5) }];
                        if(aInteractions.length > 5) aComponents.push({ type: 1, components: aInteractions.slice(5, 10) });
                    break;
                    // Alpha Wolf - All allies with available slot
                    case "Alpha Wolf":
                        aPositions = [];
                        for(let y = 1; y < 5; y++) {
                            for(let x = 0; x < 5; x++) {
                                let xyPiece = curGame.state[y][x];
                                let x0Piece = curGame.state[0][x];
                                if(xyPiece.name != null && xyPiece.team == abilityPiece.team && x0Piece.name == null) {
                                    aPositions.push([x, y]);
                                }
                            }
                        }
                        aComponents = interactionsFromPositions(aPositions, arg1, "turnstart", "recall", 3);
                    break;
                }
                
                // update message
                interaction.update(displayBoard(curGame, "Pick a Target", aComponents));
            break;
            /** ACTIVE ABILITIES **/
            // investigate
            case "investigate":
                let investigatorC = nameToXY(arg1);
                let investigator = curGame.state[investigatorC.y][investigatorC.x];
                let investTarget = nameToXY(arg2);
			    executeActiveAbility(curGame, "Invest", [investigatorC.x, investigatorC.y], [investTarget.x, investTarget.y]);
                turnMove(interaction, gameID, curGame.turn, "update") 
            break;
            // transform
            case "transform":
                let transformer = nameToXY(arg1);
			    executeActiveAbility(curGame, "Transform", [transformer.x, transformer.y], arg2);
                turnMove(interaction, gameID, curGame.turn, "update");   
            break;
            // infect
            case "infect":
                let iwSource = nameToXY(arg1);
                let iwTarget = nameToXY(arg2);
			    executeActiveAbility(curGame, "Infect", [iwSource.x, iwSource.y], [iwTarget.x, iwTarget.y]);
                turnMove(interaction, gameID, curGame.turn, "update");   
            break;
            // active protect
            case "protect":
                let protectTarget = nameToXY(arg2);
			    executeActiveAbility(curGame, "Protect", null, [protectTarget.x, protectTarget.y]);
                turnMove(interaction, gameID, curGame.turn, "update");
            break;
            // sabotage
            case "sabotage":
                let sabotageTarget = nameToXY(arg2);
			    executeActiveAbility(curGame, "Sabotage", null, [sabotageTarget.x, sabotageTarget.y]);
                turnMove(interaction, gameID, curGame.turn, "update");
            break;
            // hooker hide
            case "hide":
                let hideSubject = nameToXY(arg1);
                let hideTarget = nameToXY(arg2);
			    executeActiveAbility(curGame, "Hide", [hideSubject.x, hideSubject.y], [hideTarget.x, hideTarget.y]);
                turnMove(interaction, gameID, curGame.turn, "update");
            break;
            // tanner tan
            case "disguise":
                // show tan options
                let disInteractions = [{ type: 2, label: "Back", style: 4, custom_id: "ability-" + arg1 }];
                disInteractions.push({ type: 2, label: "Wolf " + getUnicode("Pawn", 1), style: 3, custom_id: "tan-" + arg2 + "-Wolf" });
                disInteractions.push({ type: 2, label: "Psychic Wolf " + getUnicode("King", 1), style: 3, custom_id: "tan-" + arg2 + "-Psychic Wolf" });
                disInteractions.push({ type: 2, label: "Fox " + getUnicode("Knight", 1), style: 3, custom_id: "tan-" + arg2 + "-Fox" });
                disInteractions.push({ type: 2, label: "Scared Wolf " + getUnicode("Rook", 1), style: 3, custom_id: "tan-" + arg2 + "-Scared Wolf" });
                let disComponents = [{ type: 1, components: disInteractions }];
                // update message
                interaction.update(displayBoard(curGame, "Pick a Disguise", disComponents));
            break;
            // tanner tan
            case "tan":
                let tanSubject = nameToXY(arg1);
			    executeActiveAbility(curGame, "Tan", null, [tanSubject, arg2], true);
                turnMove(interaction, gameID, curGame.turn, "update") 
            break;
            // alpha wolf recall
            case "recall":
                let recallSubject = nameToXY(arg2);
			    executeActiveAbility(curGame, "Recall", null, [recallSubject.x, recallSubject.y]);
                turnMove(interaction, gameID, curGame.turn, "update");
            break;
        }
    }
    
    if(!interaction.isCommand()) return; // ignore non-slash commands
    switch(interaction.commandName) {
        case "ping":
            // Send pinging message
            interaction.reply({ content: "✳ Ping", fetchReply: true, ephemeral: true })
            .then(m => {
                // Get values
                let latency = m.createdTimestamp - interaction.createdTimestamp;
                let ping = Math.round(client.ws.ping);
                interaction.editReply("✅ Pong! Latency is " + latency + "ms. API Latency is " + ping + "ms");
            })
        break;
        case "help":
            // Send pinging message
            interaction.reply({ content: "**WWRess**\nWWRess is a variant of chess, played on a 5x5 grid. In each game, each of the two sides (white/town & black/wolves) gets 5 pieces. Each piece comes with a movement type (Pawn, King, Knight, Rook or Queen) and an ability. Each team has 17 unique pieces (6 pawns, 4 kings, 3 knights, 3 rooks, 1 queen). The pieces of the teams differ, so the two sides usually have completely different abilities.\n\nEach turn consists of two actions: first, using an active ability (if a piece with an active ability is available) and second, moving a piece. The game is won if the enemy cannot make a move (Kings are not part of the win condition in any way).\n\nThe only available special move is Pawn Promotion.\n\nInitially, all enemy pieces are hidden. The movement type of enemy pieces will automatically be marked where possible (only a knight can jump so that move makes the piece clearly identifiable as a knight (though not which knight), moving a single step forward does not) and additionally investigative pieces may be used to reveal them. Sometimes this is not fully accurate, as some pieces can change role (e.g. Dog) and some can be disguised (e.g. Sneaking Wolf).\n\nStart a game against the AI with `/play`, challenge another player with `/challenge <name>`. Accept or deny a challenge with `/accept` and `/deny`. Use `/resign` to give up." });
        break;
        case "play":
            if(isPlaying(interaction.member.id)) {
                interaction.reply({ content: "❎ You're already in a game!", ephemeral: true });
            } else {
                createGame(interaction.member.id, null, games.length, interaction.member.user.username, "*AI*", interaction.channel.id, interaction.guild.id);
                
                // display board
                let id = getPlayerGameId(interaction.member.id);
                
                // spectator board
                let msgSpec = displayBoard(games[id], "SPECTATOR BOARD", [], 0);
                msgSpec.ephemeral = false;
                interaction.reply(msgSpec).then(m => {
                    games[id].msg = m;
                    // player board
                    turnStart(interaction, id, 0, "followup"); 
                });
            }
        break;
        case "resign":
            if(!isPlaying(interaction.member.id)) {
                interaction.reply({ content: "❎ You're not in a game!", ephemeral: true });
            } else {
                let id = getPlayerGameId(interaction.member.id);
                concludeGame(id);
                destroyGame(id);
                interaction.reply("✅ " + interaction.member.user.username + " resigned!");
                console.log("RESIGN");
            }
        break;
        case "deny":
            if(!isOutstanding(interaction.member.id)) {
                interaction.reply({ content: "❎ You have no outstanding challenges!", ephemeral: true });
            } else {
                let id = getPlayerGameId(interaction.member.id);
                concludeGame(id);
                destroyGame(id);
                interaction.reply("✅ " + interaction.member.user.username + " denied the challenge!");
                console.log("DENY");
            }
        break;
        case "challenge":
            if(isPlaying(interaction.member.id)) {
                interaction.reply({ content: "❎ You're already in a game!", ephemeral: true });
            } else {
                let opponent = interaction.options.get('opponent').value;
                opponent = interaction.guild.members.cache.get(opponent);
                if(!opponent || opponent.bot) {
                    interaction.reply({ content: "❎ Could not find opponent!", ephemeral: true });
                    return;
                }
                if(isPlaying(opponent.id)) {
                    interaction.reply({ content: "❎ Your selected opponent is already in a game!", ephemeral: true });
                    return;
                }
                
                let gameID = games.length;
                createGame(interaction.member.id, opponent.id, gameID, interaction.member.user.username, opponent.user.username, interaction.channel.id, interaction.guild.id);
                
                interaction.channel.send("<@" + opponent.id + "> You have been challenged by <@" + interaction.member.id + ">! Run `/accept` to accept the challenge.");
                
                outstandingChallenge.push([opponent.id, interaction.member.id, gameID])
                
                // display board
                let id = getPlayerGameId(interaction.member.id);
                
                let msgSpec = displayBoard(games[id], "SPECTATOR BOARD", [], -1);
                msgSpec.ephemeral = false;
                interaction.reply(msgSpec).then(m => {
                    games[id].msg = m;
                    // player board
                    turnStart(interaction, id, 0, "followup"); 
                });
            }
        break;
        case "accept":
            if(!isOutstanding(interaction.member.id)) {
                interaction.reply({ content: "❎ You have no outstanding challenges!", ephemeral: true });
            } else {
                let challenge = outstandingChallenge.filter(el => el[0] == interaction.member.id)[0];
                console.log("CHALLENGE", challenge);
                
                interaction.channel.send("<@" + challenge[1] + "> Your challenge has been accepted by <@" + interaction.member.id + ">!");
                
                interaction.reply(displayBoard(games[challenge[2]], "Waiting on Opponent", [], 1));
                busyWaiting(interaction, challenge[2], 1);
                
                outstandingChallenge = outstandingChallenge.filter(el => el[0] != interaction.member.id);
            }
        break;
    }
})


function getTeam(piece) {
    switch(piece) {
        case "Citizen": case "Ranger": case "Huntress": case "Bartender": case "Fortune Apprentice": case "Child":
        case "Hooker": case "Idiot": case "Crowd Seeker": case "Aura Teller":
        case "Royal Knight": case "Alcoholic": case "Amnesiac":
        case "Runner": case "Fortune Teller": case "Witch":
        case "Cursed Civilian":
        case "Attacked Runner": case "Attacked Idiot":
            return 0;
        case "Wolf": case "Wolf Cub": case "Tanner": case "Archivist Fox": case "Recluse": case "Dog":
        case "Infecting Wolf": case "Alpha Wolf": case "Psychic Wolf": case "Sneaking Wolf":
        case "Direwolf": case "Clairvoyant Fox": case "Fox":
        case "Warlock": case "Scared Wolf": case "Saboteur Wolf":
        case "White Werewolf":
        case "Attacked Scared Wolf":
            return 1;
        case "Selected":
        case null:
            return -1;
    }
}

function isActive(piece) {
    switch(piece) {
        default:
            return false;
        case "Hooker": case "Crowd Seeker": case "Aura Teller": case "Royal Knight": case "Fortune Teller": case "Witch":
        case "Tanner": case "Archivist Fox": case "Dog": case "Infecting Wolf": case "Alpha Wolf": case "Psychic Wolf": case "Clairvoyant Fox": case "Warlock": case "Saboteur Wolf":
            return true;
    }
}

function getAbilityText(piece) {
    switch(piece) {
        case "Citizen":
            return "No ability.";
        case "Ranger":
            return "Reveals killer, when taken.";
        case "Huntress": 
            return "Takes killer, when taken.";
        case "Bartender":
            return "No ability. Relevant for Alcoholic.";
        case "Fortune Apprentice":
            return "Replaces FT/AT/CS if they are taken.";
        case "Child":
            return "Additional move, when taken.";
        case "Hooker":
            return "May hide in an adjacent ally's field.";
        case "Idiot":
            return "Survives one attack, but becomes unmovable.";
        case "Attacked Idiot":
            return "Survived an attack. No ability.";
        case "Crowd Seeker":
            return "Reveal a piece's type.";
        case "Aura Teller":
            return "Reveal a piece's type, if it has an active power.";
        case "Royal Knight":
            return "Protects a reachable piece.";
        case "Alcoholic":
            return "Invulnerable, if Bartender exists.";
        case "Amnesiac":
            return "Changes after one move.";
        case "Runner":
            return "Survives one attack.";
        case "Attacked Runner":
            return "Survived an attack. No ability.";
        case "Fortune Teller":
            return "Reveal a reachable piece.";
        case "Witch":
            return "Protects a reachable piece.";
        case "Cursed Civilian":
            return "Becomes a Wolf, when taken.";
        case "Wolf":
            return "No ability.";
        case "Wolf Cub":
            return "Additional move, when taken.";
        case "Tanner":
            return "Disguise one piece.";
        case "Archivist Fox":
            return "Reveal a piece's type.";
        case "Recluse":
            return "Reveals if investigated.";
        case "Dog":
            return "Once, becomes a Wolf Cub or Fox.";
        case "Infecting Wolf":
            return "Convert enemy piece to wolf + become wolf.";
        case "Alpha Wolf":
            return "Can call back pieces to home row.";
        case "Psychic Wolf":
            return "Reveal a piece's type.";
        case "Sneaking Wolf":
            return "Disguised as Wolf.";
        case "Direwolf":
            return "Double moves, if last piece.";
        case "Clairvoyant Fox":
            return "Reveal a piece.";
        case "Fox":
            return "No ability.";
        case "Warlock":
            return "Reveal a reachable piece.";
        case "Scared Wolf":
            return "Survives one attack.";
        case "Attacked Scared Wolf":
            return "Survived an attack. No ability.";
        case "Saboteur Wolf":
            return "Block a piece's movement/active ability.";
         case "White Werewolf":
            return "Must either be dead or the only remaining piece. Loses the game otherwise.";
    }
}

function getChessName(piece) {
    switch(piece) {
        default:
            return null;
        case "Citizen": case "Ranger": case "Huntress": case "Bartender": case "Fortune Apprentice": case "Child":
        case "Wolf": case "Wolf Cub": case "Tanner": case "Archivist Fox": case "Recluse": case "Dog":
            return "Pawn";
         case "Hooker": case "Idiot": case "Crowd Seeker": case "Aura Teller":
         case "Infecting Wolf": case "Alpha Wolf": case "Psychic Wolf": case "Sneaking Wolf":
            return "King";
         case "Royal Knight": case "Alcoholic": case "Amnesiac":
         case "Direwolf": case "Clairvoyant Fox": case "Fox":
            return "Knight";
        case "Runner": case "Fortune Teller": case "Witch":
        case "Warlock": case "Scared Wolf": case "Saboteur Wolf":
        case "Attacked Runner": case "Attacked Scared Wolf":
            return "Rook";
         case "Cursed Civilian":
         case "White Werewolf":
            return "Queen";
        case "Attacked Idiot":
        case "Selected":
        case null:
            return "None";
    }
}

function getChessValue(name) {
    switch(name) {
        case "Pawn":
            return 1;
        case "Knight":
            return 3;
        case "King":
            return 3;
        case "Rook":
            return 5;
        case "Queen":
            return 9;
        case "None":
            return -1;
    }
}

// converts one piece into another
function convertPiece(oldPiece, newName) {
    oldPiece.name = newName;
    oldPiece.team = getTeam(newName);
    oldPiece.chess = getChessName(newName);
    oldPiece.active = isActive(newName);
    return oldPiece;
}

// creates a piece object
function getPiece(name, metadata = {}) {
    var piece = { name: name, team: getTeam(name), chess: getChessName(name), enemyVisible: "Unknown", enemyVisibleStatus: 0, active: isActive(name), disguise: false, protected: false, hasMoved: false, hidden: false, sabotaged: false };
    switch(name) {
        case "Amnesiac":
            piece.convertTo = metadata.amnesiac;
            if(!metadata.amnesiac) piece.convertTo = ["Citizen","Ranger","Aura Teller"][Math.floor(Math.random() * 3)]; // for Amnesiac by promotion
        break;
    	case "Sneaking Wolf":
		    piece.disguise = "Wolf";
    	break;    
    }
    return piece;
}

function loadDefaultSetup(board) {
    board[4][0] = getPiece("Hooker");
    board[4][1] = getPiece("Citizen");
    board[4][2] = getPiece("Citizen");
    board[4][3] = getPiece("Runner");
    board[4][4] = getPiece("Citizen");
    board[0][0] = getPiece("Wolf");
    board[0][1] = getPiece("Warlock");
    board[0][2] = getPiece("Wolf");
    board[0][3] = getPiece("Wolf");
    board[0][4] = getPiece("Alpha Wolf");
}

function loadPromoteTestSetup(board) {
    board[1][0] = getPiece("Citizen");
    board[3][4] = getPiece("Alpha Wolf");
}

function loadTestingSetup(board) {
    let testTown = "Runner";
    let testWolf = "Runner";
    board[4][0] = getPiece(testTown);
    board[4][1] = getPiece(testTown);
    board[4][2] = getPiece(testTown);
    board[4][3] = getPiece(testTown);
    board[4][4] = getPiece(testTown);
    board[0][0] = getPiece(testWolf);
    board[0][1] = getPiece(testWolf);
    board[0][2] = getPiece(testWolf);
    board[0][3] = getPiece(testWolf);
    board[0][4] = getPiece(testWolf);
}

function getWWRevalValue(piece) {
        switch(piece) {
            case "Citizen": case "Cursed Civilian": case "Ranger": case "Child": case "Huntress":
            case "Wolf": case "Sneaking Wolf": case "Fox": case "White Werewolf": case "Recluse":
            case "Attacked Runner": case "Attacked Idiot":
            case "Attacked Scared Wolf": 
                return 0;
            case "Amnesiac": case "Idiot": 
                return 1;
            case "Crowd Seeker": case "Aura Teller": case "Royal Knight": case "Witch": 
            case "Wolf Cub": case "Tanner": case "Archivist Fox": case "Dog": case "Psychic Wolf":
                return 2;
            case "Fortune Apprentice": case "Fortune Teller": case "Runner": case "Bartender":
            case "Alpha Wolf": case "Clairvoyant Fox": case "Scared Wolf": case "Saboteur Wolf": case "Warlock":
                return 3;
            case "Hooker": case "Alcoholic":
                return 4;
            case "Infecting Wolf": case "Direwolf":
                return 5;
    }
}

function getWWRValue(piece) { // UNUSED
        switch(piece) {
            case "Cursed Civilian":
                return -3;
            case "Citizen":
            case "Wolf": case "Sneaking Wolf": case "Fox": case "White Werewolf":
            case "Attacked Runner": case "Attacked Idiot":
            case "Attacked Scared Wolf": 
                return 0;
            case "Ranger": case "Amnesiac": case "Idiot": 
            case "Recluse":
                return 1;
            case "Child": case "Crowd Seeker": case "Aura Teller": case "Royal Knight": case "Witch": case "Bartender":
            case "Wolf Cub": case "Tanner": case "Archivist Fox": case "Dog": case "Psychic Wolf": case "Direwolf":
                return 2;
            case "Fortune Apprentice": case "Fortune Teller": case "Runner":
            case "Alpha Wolf": case "Clairvoyant Fox": case "Scared Wolf": case "Saboteur Wolf": case "Warlock":
                return 3;
            case "Hooker": case "Alcoholic":
                return 4;
            case "Huntress":
            case "Infecting Wolf":
                return 5;
    }
}

function generateRoleList(board) {
    // name, chess value, wwr value, incompatible with, requires
    // all town pieces
	 /// !!!!!!! USE getWWRValue for town[2]/wolf[2]
    let town = [
        ["Citizen", 1, 0, [], ""],
        ["Ranger", 1, 1, [], ""],
        ["Huntress", 1, 5, [], ""],
        ["Fortune Apprentice", 1, 3, [], ""],
        ["Fortune Apprentice", 1, 3, [], ""], // double chance
        ["Child", 1, 2, [], ""],
        ["Hooker", 3, 4, [], ""],
        ["Idiot", 3, 1, [], ""],
        ["Crowd Seeker", 3, 2, ["Fortune Teller","Aura Teller"], ""],
        ["Aura Teller", 3, 2, ["Fortune Teller","Crowd Seeker"], ""],
        ["Royal Knight", 3, 2, [], ""],
        ["Alcoholic", 3, 4, [], "Bartender"],
        ["Amnesiac", 3, 1, [], []],
        ["Amnesiac", 3, 1, [], []],
        ["Fortune Teller", 5, 3, ["Crowd Seeker","Aura Teller"], ""],
        ["Runner", 5, 3, [], ""],
        ["Witch", 5, 2, [], ""],
        ["Cursed Civilian", 9, -3, [], ""],
        ["Bartender", 1, 2, [], "Alcoholic"], // cant be rolled normally
    ];
    // all wolf pieces
    let wolf = [
        ["Wolf", 1, 0, [], ""],
        ["Wolf Cub", 1, 2, [], ""],
        ["Tanner", 1, 2, ["Sneaking Wolf"], ""],
        ["Archivist Fox", 1, 2, [], ""],
        ["Recluse", 1, 1, [], ""],
        ["Dog", 1, 2, ["Fox"], ""],
        ["Infecting Wolf", 3, 5, ["Saboteur Wolf"], ""],
        ["Alpha Wolf", 3, 3, [], ""],
        ["Psychic Wolf", 3, 2, ["Clairvoyant Fox","Warlock"], ""],
        ["Sneaking Wolf", 3, 0, ["Tanner"], ""],
        ["Direwolf", 3, 2, [], ""],
        ["Clairvoyant Fox", 3, 3, ["Warlock","Psychic Wolf"], ""],
        ["Fox", 3, 0, ["Dog"], ""],
        ["Scared Wolf", 5, 3, [], ""],
        ["Saboteur Wolf", 5, 3, ["Infecting Wolf"], ""],
        ["Warlock", 5, 3, ["Psychic Wolf","Clairvoyant Fox"], ""],
        ["White Werewolf", 9, 0, [], ""],
    ];
    // preparation
    let townSelected = [];
    let wolfSelected = [];
    let iterations = 0;
    let metadata = {};
    // attempt to select pieces
    while(iterations < 1000) {
        metadata = {};
        // select pieces TOWN
        townSelected = [];
        for(let i = 0; i < 5; i++) {
            townSelected.push(town[Math.floor(Math.random() * (town.length-1))]);
            // add previous requirement if exists
            let prevReq = townSelected[townSelected.length - 1][4];
            if(prevReq && prevReq.length) {
                townSelected.push(town.filter(el => el[0] == prevReq)[0]);
                i++;
            }
        }
        // select pieces WOLF
        wolfSelected = [];
        for(let i = 0; i < 5; i++) {
            wolfSelected.push(wolf[Math.floor(Math.random() * wolf.length)]);
            // add previous requirement if exists
            let prevReq = wolfSelected[wolfSelected.length - 1][4];
            if(prevReq && prevReq.length) {
                wolfSelected.push(wolf.filter(el => el[0] == prevReq)[0]);
                i++;
            }
        }
        // EVALUATE setup
        // calculate values town
        let totalChessValueTown = townSelected.map(el => el[1]).reduce((a,b) => a+b);
        let totalWWRValueTown  = townSelected.map(el => el[2]).reduce((a,b) => a+b);
        let totalValueTown = totalChessValueTown + totalWWRValueTown;
        let combinedIncompTown = [].concat.apply([], townSelected.map(el => el[3]));
        // calculate values wolf
        let totalChessValueWolf = wolfSelected.map(el => el[1]).reduce((a,b) => a+b);
        let totalWWRValueWolf  = wolfSelected.map(el => el[2]).reduce((a,b) => a+b);
        let totalValueWolf = totalChessValueTown + totalWWRValueTown;
        let combinedIncompWolf = [].concat.apply([], wolfSelected.map(el => el[3]));
        
        // special handling
        // town
        let townNames = townSelected.map(el => el[0]);
        // Double ALCOHOLIC
        if(townNames.filter(el => el=="Alcoholic").length > 1) {
            console.log("DISCARD - Double Alcoholic");
            continue;
        }
        // AMNESIAC
        if(townNames.indexOf("Amnesiac") > -1) { // find 
            let amnesiacCount = townNames.filter(el => el=="Amnesiac").length
            let amnesiacRole = town[Math.floor(Math.random() * town.length)];
            if(amnesiacRole[0] == "Amnesiac" || amnesiacRole[0] == "Bartender" || (amnesiacRole[0] == "Alcoholic" && townNames.indexOf("Alcoholic") == -1)) {
                console.log("DISCARD - Amnesiac");
                continue;
            }
            totalChessValueTown = totalChessValueTown - (amnesiacCount * 3) + (amnesiacCount * ((3 + amnesiacRole[1] * 3) / 4));
            totalWWRValueTown = totalWWRValueTown - (amnesiacCount * 1) + (amnesiacCount * ((1 + amnesiacRole[2] * 3) / 4));
            totalValueTown = totalChessValueTown + totalWWRValueTown;
            combinedIncompTown.push(...amnesiacRole[3]);
            metadata.amnesiac = amnesiacRole[0];
        }
        // FORTUNE APPRENTICE
        if(townNames.indexOf("Fortune Apprentice") > -1) { // find 
            let faCount = townNames.filter(el => el=="Fortune Apprentice").length
            let faRole;
            if(townNames.indexOf("Fortune Teller") > -1) faRole = town.filter(el => el[0]=="Fortune Teller")[0];
            else if(townNames.indexOf("Aura Teller") > -1) faRole = town.filter(el => el[0]=="Aura Teller")[0];
            else if(townNames.indexOf("Crowd Seeker") > -1) faRole = town.filter(el => el[0]=="Crowd Seeker")[0];
            else {
                console.log("DISCARD - Fortune Apprentice");
                continue;
            }
            totalChessValueTown = totalChessValueTown - (faCount * 3) + (faCount * ((3 + faRole[1]) / 2));
            totalWWRValueTown = totalWWRValueTown - (faCount * 1) + (faCount * ((1 + faRole[2]) / 2));
            totalValueTown = totalChessValueTown + totalWWRValueTown;
        }
        
        // condition
        if(totalChessValueTown <= 15 && totalWWRValueTown <= 12 && totalValueTown <= 23 && totalChessValueWolf <= 15 && totalWWRValueWolf <= 12 && totalValueWolf <= 23 && townSelected.length == 5 && wolfSelected.length == 5 && combinedIncompTown.indexOf(townSelected[0]) == -1 && (totalValueTown >= totalValueWolf - 2 || totalValueTown <= totalValueWolf) &&combinedIncompTown.indexOf(townSelected[1]) == -1 && combinedIncompTown.indexOf(townSelected[2]) == -1 && combinedIncompTown.indexOf(townSelected[3]) == -1 && combinedIncompTown.indexOf(townSelected[4]) == -1 && combinedIncompWolf.indexOf(wolfSelected[0]) == -1 && combinedIncompWolf.indexOf(wolfSelected[1]) == -1 && combinedIncompWolf.indexOf(wolfSelected[2]) == -1 && combinedIncompWolf.indexOf(wolfSelected[3]) == -1 && combinedIncompWolf.indexOf(wolfSelected[4]) == -1) {
            console.log("INCOMPATIBLE", combinedIncompTown);
            console.log("ACCEPT #" + iterations, totalChessValueTown, totalWWRValueTown, totalValueTown, townSelected.map(el=>el[0]).join(","), totalChessValueWolf, totalWWRValueWolf, totalValueWolf, wolfSelected.map(el=>el[0]).join(","));
            console.log("LIST METADATA", metadata);
            break;
        }
        console.log("DISCARD #" + iterations, totalChessValueTown, totalWWRValueTown, totalValueTown, townSelected.map(el=>el[0]).join(","), totalChessValueWolf, totalWWRValueWolf, totalValueWolf, wolfSelected.map(el=>el[0]).join(","));
        iterations++;
    }
    // randomize piece order
    townSelected = randomize(townSelected);
    wolfSelected = randomize(wolfSelected);
    // put pieces onto the board
    for(let i = 0; i < 5; i++) {
        board[4][i] = getPiece(townSelected[i][0], metadata);
        board[0][i] = getPiece(wolfSelected[i][0], metadata);
    }
}

// randomizes an array
function randomize(arr) {
    return arr .map(value => ({ value, sort: Math.random() }))
                        .sort((a, b) => a.sort - b.sort)
                        .map(({ value }) => value);
}

// setups a new game
const emptyBoard = [[getPiece(null), getPiece(null), getPiece(null), getPiece(null), getPiece(null)], [getPiece(null), getPiece(null), getPiece(null), getPiece(null), getPiece(null)], [getPiece(null), getPiece(null), getPiece(null), getPiece(null), getPiece(null)], [getPiece(null), getPiece(null), getPiece(null), getPiece(null), getPiece(null)], [getPiece(null), getPiece(null), getPiece(null), getPiece(null), getPiece(null)]];
function createGame(playerID, playerID2, gameID, name1, name2, channel, guild) {
    // store players as playing players
    players.push([playerID, gameID]);
    if(playerID2) players.push([playerID2, gameID]);
    // create a blank new board
    let newBoard = deepCopy(emptyBoard);
    // put pieces on board
    
    //loadDefaultSetup(newBoard);
    generateRoleList(newBoard);
    
    //loadPromoteTestSetup(newBoard);
    //loadTestingSetup(newBoard);
    
    // push game to list of games
    games.push({id: gameID, players: [ playerID, playerID2 ], playerNames: [ name1, name2 ], state: newBoard, turn: 0, channel: channel, guild: guild, lastMoves: [], concluded: false, selectedPiece: null, doubleMove0: false, doubleMove1: false, inDoubleMove: false, msg: null, ai: false });
}

// destroys a game
function destroyGame(id) {
    console.log("DESTROY", id);
    players = players.filter(el => el[1] != id); // delete players from playing players
    games = games.filter(el => el.id != id);
}

// concludes a game (reveals all pieces)
function concludeGame(id) {
    console.log("CONCLUDE", id);
    let concludedGame = games[id];
    if(!concludedGame.state) return;
    for(let y = 0; y < 5; y++) {
        for(let x = 0; x < 5; x++) {
            concludedGame.state[y][x].enemyVisibleStatus = 7;
        }
    }
    concludedGame.concluded = true;
    
    console.log("CONCLUDE UPDATE", id);
    // Update Spectator Board
    let msgSpec = displayBoard(games[id], "SPECTATOR BOARD", [], games[id].players[1] == null ? 0 : -1);
    msgSpec.ephemeral = false;
    games[id].msg.edit(msgSpec);
}

// turn = 0 for town, 1 for wolves
function showMoves(gameID, turn, abilities = false, message = "") {
    let currentGame = games[gameID];
    let board = renderBoard(currentGame, message);
    let interactions;
    if(!abilities) {
        interactions = generateInteractions(currentGame.state, turn);
        interactions.sort((a,b) => (a.label > b.label) ? 1 : ((b.label > a.label) ? -1 : 0));
    } else {
        interactions = [{ type: 2, label: "Skip", style: 4, custom_id: "turnmove" }];
        let abilities = generateAbilities(currentGame.state, turn);
        abilities.sort((a,b) => (a.label > b.label) ? 1 : ((b.label > a.label) ? -1 : 0));
        interactions.push(...abilities);
    }
    let components = [ { type: 1, components: interactions.slice(0, 5) } ];
    if(interactions.length > 5) components.push({ type: 1, components: interactions.slice(5, 10) });
    return { content: board, ephemeral: true, fetchReply: true, components: components }
}

function isPawn(name) {
    return name.chess === "Pawn";
}

function getUnicode(chessName, team) {
    switch(chessName) {
        case "Pawn":
            return team?"♙":"♟︎";
        case "King":
            return team?"♔":"♚";
        case "Knight":
            return team?"♘":"♞";
        case "Rook":
            return team?"♖":"♜";
        case "Queen":
            return team?"♕":"♛";
        case "None":
            return team?"◼️":"◻️";
    }
}

function numToRank(num) {
    return "ABCDE"[num];
}

function rankToNum(rank) {
    return "ABCDE".indexOf(rank);
}

function xyToName(x, y) {
    return numToRank(x) + (y+1);
}

function nameToXY(name) {
    return { x: rankToNum(name[0]), y: (+name[1])-1 };
}

function inBoundsOne(x) {
    return x>=0 && x<=4;
}

function inBounds(x, y = 1) {
    return inBoundsOne(x) && inBoundsOne(y);
}

function generatePositions(board, position, hideLog = false) {
    let positions = [];
    position = nameToXY(position);
    let x = position.x, y = position.y;
    let piece = board[y][x];
    if(!hideLog) console.log("Finding moves for ", piece.name, " @ ", x, "|", numToRank(x), " ", y);
    const pieceTeam = piece.team;
    const enemyTeam = (pieceTeam + 1) % 2;
    const pieceType = piece.chess;
    // Movement Logic
    /* PAWN */
    if(pieceType == "Pawn" && pieceTeam == 0) {
        if(y>0) {
            if(board[y-1][x].name == null) positions.push([x, y-1]);
            if(x>0 && board[y-1][x-1].name != null && board[y-1][x-1].team == enemyTeam) positions.push([x-1, y-1, true]);
            if(x<4 && board[y-1][x+1].name != null && board[y-1][x+1].team == enemyTeam) positions.push([x+1, y-1, true]);
        }            
    } else if(pieceType == "Pawn" && pieceTeam == 1) {
        if(y<4) {
            if(board[y+1][x].name == null) positions.push([x, y+1]);
            if(x>0 && board[y+1][x-1].name != null && board[y+1][x-1].team == enemyTeam) positions.push([x-1, y+1, true]);
            if(x<4 && board[y+1][x+1].name != null && board[y+1][x+1].team == enemyTeam) positions.push([x+1, y+1, true]);
        }            
    } 
    /* ROOK */
    else if(pieceType == "Rook") {
        for(let xt1 = x+1; xt1 < 5; xt1++) {
            if(inBounds(xt1) && board[y][xt1].name == null) {
                positions.push([xt1, y]);
            } else if(inBounds(xt1) && board[y][xt1].team == enemyTeam) {
                positions.push([xt1, y, true]);
                break;
            } else {
                break;
            }
        }
        for(let xt2 = x-1; xt2 >= 0; xt2--) {
            if(inBounds(xt2) && board[y][xt2].name == null) {
                positions.push([xt2, y]);
            } else if(inBounds(xt2) && board[y][xt2].team == enemyTeam) {
                positions.push([xt2, y, true]);
                break;
            } else {
                break;
            }
        }
        for(let yt1 = y+1; yt1 < 5; yt1++) {
            if(inBounds(yt1) && board[yt1][x].name == null) {
                positions.push([x, yt1]);
            } else if(inBounds(yt1) && board[yt1][x].team == enemyTeam) {
                positions.push([x, yt1, true]);
                break;
            } else {
                break;
            }
        }
        for(let yt2 = y-1; yt2 >= 0; yt2--) {
            if(inBounds(yt2) && board[yt2][x].name == null) {
                positions.push([x, yt2]);
            } else if(inBounds(yt2) && board[yt2][x].team == enemyTeam) {
                positions.push([x, yt2, true]);
                break;
            } else {
                break;
            }
        }
    } /* QUEEN */
    else if(pieceType == "Queen") {
        for(let xt1 = x+1; xt1 < 5; xt1++) {
            if(inBounds(xt1) && board[y][xt1].name == null) {
                positions.push([xt1, y]);
            } else if(inBounds(xt1) && board[y][xt1].team == enemyTeam) {
                positions.push([xt1, y, true]);
                break;
            } else {
                break;
            }
        }
        for(let xt2 = x-1; xt2 >= 0; xt2--) {
            if(inBounds(xt2) && board[y][xt2].name == null) {
                positions.push([xt2, y]);
            } else if(inBounds(xt2) && board[y][xt2].team == enemyTeam) {
                positions.push([xt2, y, true]);
                break;
            } else {
                break;
            }
        }
        for(let yt1 = y+1; yt1 < 5; yt1++) {
            if(inBounds(yt1) && board[yt1][x].name == null) {
                positions.push([x, yt1]);
            } else if(inBounds(yt1) && board[yt1][x].team == enemyTeam) {
                positions.push([x, yt1, true]);
                break;
            } else {
                break;
            }
        }
        for(let yt2 = y-1; yt2 >= 0; yt2--) {
            if(inBounds(yt2) && board[yt2][x].name == null) {
                positions.push([x, yt2]);
            } else if(inBounds(yt2) && board[yt2][x].team == enemyTeam) {
                positions.push([x, yt2, true]);
                break;
            } else {
                break;
            }
        }
        for(let offset = 1; offset < 5; offset++) {
            if(inBounds(x+offset, y+offset) && board[y+offset][x+offset].name == null) {
                positions.push([x+offset, y+offset]);
            } else if(inBounds(x+offset, y+offset) && board[y+offset][x+offset].team == enemyTeam) {
                positions.push([x+offset, y+offset, true]);
                break;
            } else {
                break;
            }
        }
        for(let offset = 1; offset < 5; offset++) {
            if(inBounds(x-offset, y+offset) && board[y+offset][x-offset].name == null) {
                positions.push([x-offset, y+offset]);
            } else if(inBounds(x-offset, y+offset) && board[y+offset][x-offset].team == enemyTeam) {
                positions.push([x-offset, y+offset, true]);
                break;
            } else {
                break;
            }
        }
        for(let offset = 1; offset < 5; offset++) {
            if(inBounds(x+offset, y-offset) && board[y-offset][x+offset].name == null) {
                positions.push([x+offset, y-offset]);
            } else if(inBounds(x+offset, y-offset) && board[y-offset][x+offset].team == enemyTeam) {
                positions.push([x+offset, y-offset, true]);
                break;
            } else {
                break;
            }
        }
        for(let offset = 1; offset < 5; offset++) {
            if(inBounds(x-offset, y-offset) && board[y-offset][x-offset].name == null) {
                positions.push([x-offset, y-offset]);
            } else if(inBounds(x-offset, y-offset) && board[y-offset][x-offset].team == enemyTeam) {
                positions.push([x-offset, y-offset, true]);
                break;
            } else {
                break;
            }
        }
    }
    /* KING */
    else if(pieceType == "King") {
        let possibleMoves = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
        for(let i = 0; i < possibleMoves.length; i++) {
            let px = x + possibleMoves[i][0];
            let py = y + possibleMoves[i][1];
            if(inBounds(px, py) && board[py][px].name == null) positions.push([px, py]);
            else if(inBounds(px, py) && board[py][px].team == enemyTeam) positions.push([px, py, true]);
        }
    }
    /* KNIGHT */
    else if(pieceType == "Knight") {
        let possibleMoves = [[2,1],[-2,1],[2,-1],[-2,-1],[1,2],[-1,2],[1,-2],[-1,-2]];
        for(let i = 0; i < possibleMoves.length; i++) {
            let px = x + possibleMoves[i][0];
            let py = y + possibleMoves[i][1];
            if(inBounds(px, py) && board[py][px].name == null) positions.push([px, py]);
            else if(inBounds(px, py) && board[py][px].team == enemyTeam) positions.push([px, py, true]);
        }
    }
    positions.sort((a,b) => (xyToName(a[0], a[1]) > xyToName(b[0], b[1])) ? 1 : ((xyToName(b[0], b[1]) > xyToName(a[0], a[1])) ? -1 : 0));
    return positions;
}

function hasAvailableMove(board, position) {
    position = nameToXY(position);
    let x = position.x, y = position.y;
    let piece = board[y][x];
    const pieceTeam = piece.team;
    const enemyTeam = (pieceTeam + 1) % 2;
    const pieceType = piece.chess;
    // Movement Logic
    /* PAWN */
    if(pieceType == "Pawn" && pieceTeam == 0) {
        if(y>0) {
            if(board[y-1][x].name == null) return true;
            if(x>0 && board[y-1][x-1].name != null && board[y-1][x-1].team == enemyTeam) return true;
            if(x<4 && board[y-1][x+1].name != null && board[y-1][x+1].team == enemyTeam) return true;
        }            
    } else if(pieceType == "Pawn" && pieceTeam == 1) {
        if(y<4) {
            if(board[y+1][x].name == null) return true;
            if(x>0 && board[y+1][x-1].name != null && board[y+1][x-1].team == enemyTeam) return true;
            if(x<4 && board[y+1][x+1].name != null && board[y+1][x+1].team == enemyTeam) return true;
        }            
    } 
    /* ROOK */
    else if(pieceType == "Rook") {
        for(let xt1 = x+1; xt1 < 5; xt1++) {
            if(inBounds(xt1) && board[y][xt1].team != pieceTeam) {
                return true;
            }
        }
        for(let xt2 = x-1; xt2 >= 0; xt2--) {
            if(inBounds(xt2) && board[y][xt2].team != pieceTeam) {
                return true;
            }
        }
        for(let yt1 = y+1; yt1 < 5; yt1++) {
            if(inBounds(yt1) && board[yt1][x].team != pieceTeam) {
                return true;
            }
        }
        for(let yt2 = y-1; yt2 >= 0; yt2--) {
            if(inBounds(yt2) && board[yt2][x].team != pieceTeam) {
                return true;
            }
        }
    } /* QUEEN */
    else if(pieceType == "Queen") {
        for(let xt1 = x+1; xt1 < 5; xt1++) {
            if(inBounds(xt1) && board[y][xt1].team != pieceTeam) {
                return true;
            }
        }
        for(let xt2 = x-1; xt2 >= 0; xt2--) {
            if(inBounds(xt2) && board[y][xt2].team != pieceTeam) {
                return true;
            }
        }
        for(let yt1 = y+1; yt1 < 5; yt1++) {
            if(inBounds(yt1) && board[yt1][x].team != pieceTeam) {
                return true;
            }
        }
        for(let yt2 = y-1; yt2 >= 0; yt2--) {
            if(inBounds(yt2) && board[yt2][x].team != pieceTeam) {
                return true;
            }
        }
        for(let offset = 1; offset < 5; offset++) {
            if(inBounds(x+offset, y+offset) && board[y+offset][x+offset].team != pieceTeam) {
                return true;
            }
        }
        for(let offset = 1; offset < 5; offset++) {
            if(inBounds(x-offset, y+offset) && board[y+offset][x-offset].team != pieceTeam) {
                return true;
            }
        }
        for(let offset = 1; offset < 5; offset++) {
            if(inBounds(x+offset, y-offset) && board[y-offset][x+offset].team != pieceTeam) {
                return true;
            }
        }
        for(let offset = 1; offset < 5; offset++) {
            if(inBounds(x-offset, y-offset) && board[y-offset][x-offset].team != pieceTeam) {
                return true;
            }
        }
    }
    /* KING */
    else if(pieceType == "King") {
        let possibleMoves = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
        for(let i = 0; i < possibleMoves.length; i++) {
            let px = x + possibleMoves[i][0];
            let py = y + possibleMoves[i][1];
            if(inBounds(px, py) && board[py][px].team != pieceTeam) return true;
        }
    }
    /* KNIGHT */
    else if(pieceType == "Knight") {
        let possibleMoves = [[2,1],[-2,1],[2,-1],[-2,-1],[1,2],[-1,2],[1,-2],[-1,-2]];
        for(let i = 0; i < possibleMoves.length; i++) {
            let px = x + possibleMoves[i][0];
            let py = y + possibleMoves[i][1];
            if(inBounds(px, py) && board[py][px].team != pieceTeam) return true;
        }
    }
    return false;
}

function interactionsFromPositions(positions, from, back = "turnstart", action = "move", styleOverride = false) {
    let interactions = [{ type: 2, label: "Back", style: 4, custom_id: back }];
    for(let i = 0; i < positions.length; i++) {
        interactions.push({ type: 2, label: xyToName(positions[i][0], positions[i][1]) + (positions[i][2]?" ✘":""), style:  styleOverride?styleOverride:(positions[i][2]?3:1), custom_id: action + "-" + from + "-" + xyToName(positions[i][0], positions[i][1]) });
    }
    let interactionsOutput = [];
    let interactionsTemp = [];
    for(let i = 0; i < interactions.length; i++) {
        interactionsTemp.push(interactions[i]);
        if(interactionsTemp.length == 5) {
            interactionsOutput.push({ type: 1, components: interactionsTemp });
            interactionsTemp = [];
        }
    }
    if(interactionsTemp.length > 0) interactionsOutput.push({ type: 1, components: interactionsTemp });
    return interactionsOutput;
}


function generateInteractions(board, team) {
    let interactions = [];
    for(let y = 0; y < board.length; y++) {
        for(let x = 0; x < board[0].length; x++) {
            if(board[y][x].team == team && !board[y][x].sabotaged) {
                interactions.push({ type: 2, label: xyToName(x, y) + " " + board[y][x].name + " " + getUnicode(board[y][x].chess, team), style: isPawn(board[y][x]) ? 2 : 1, custom_id: "select-" + xyToName(x, y) });
            }
        }
    }
    return interactions;
}

function generateAbilities(board, team) {
    let interactions = [];
    for(let y = 0; y < board.length; y++) {
        for(let x = 0; x < board[0].length; x++) {
            if(board[y][x].team == team && board[y][x].active && !board[y][x].sabotaged) {
                interactions.push({ type: 2, label: xyToName(x, y) + " " + board[y][x].name + " " + getUnicode(board[y][x].chess, team), style: 3, custom_id: "ability-" + xyToName(x, y) });
            }
        }
    }
    return interactions;
}

function renderBoard(game, message = "Turn", turnOverride = null) {
    let board = game.state;
    let boardMsg = "**" + game.playerNames[0] + " vs. " + game.playerNames[1] +  "**\n" + "**" + message + "** " + evaluate(board) + "\n";
    let boardRows = ["🟦🇦​🇧​🇨​🇩​🇪"];
    let visiblePieces = [];
    const letterRanks = ["🇦","🇧","🇨","🇩","​🇪"];
    const numberRow = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣"];
    const curTurn = turnOverride != null ? turnOverride : game.turn;
    for(let y = 0; y < board.length; y++) {
        let row = numberRow[y];
        for(let x = 0; x < board[0].length; x++) {
                row += renderField(board[y][x], x, y, curTurn);
                if(board[y][x].name != null && board[y][x].team == curTurn) visiblePieces.push(board[y][x].name);
                else if(board[y][x].name != null && board[y][x].team != curTurn && board[y][x].enemyVisibleStatus == 6) visiblePieces.push(board[y][x].disguise?board[y][x].disguise:board[y][x].name);
                else if(board[y][x].name != null && board[y][x].team != curTurn && board[y][x].enemyVisibleStatus == 7) visiblePieces.push(board[y][x].name);
        }
        boardRows.push(row);
        row = "";
    }
    // display last moves
    for(let i = 0; i < boardRows.length; i++) {
        boardRows[i] += "🟦";
        if(i == 0) {
            boardRows[i] += "🟦🟦🟦🟦🟦🟦🟦";
        } else {
            let lmIndex = game.lastMoves.length - i;
            if(game.lastMoves[lmIndex]) {
                let lmMsg = "";
                let lm = game.lastMoves[lmIndex];
                let moveFrom = nameToXY(lm[4]);
                let moveTo = nameToXY(lm[5]);
                if(lm[0] == 0) lmMsg += "⬜"; 
                else lmMsg += "⬛";
                if(lm[6] == 6 && lm[2]) lmMsg += findEmoji(lm[2]);
                else if((lm[0] == curTurn && getTeam(lm[1]) == curTurn) || lm[6] >= 6) lmMsg += findEmoji(lm[1]);
                else lmMsg += findEmoji((getTeam(lm[1]) == 0?"white":"black") + lm[3]);
                lmMsg += letterRanks[moveFrom.x];
                lmMsg += numberRow[moveFrom.y];
                if(lm.length == 7) {
                    lmMsg += "▶️";
                    lmMsg += letterRanks[moveTo.x];
                    lmMsg += numberRow[moveTo.y];
                } else {
                    lmMsg += lm[7];
                    // Array.from("").length is more precise than "".length
                    if(Array.from(lm[7]).length < 3) {
                        lmMsg += letterRanks[moveTo.x];
                        lmMsg += numberRow[moveTo.y];
                    }
                }
                boardRows[i] += lmMsg;
            } else {
                boardRows[i] += "🟦🟦🟦🟦🟦🟦🟦";
            }
        }
    }
    // divider
    boardRows.push("🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦");
    // add explanations for visible pieces
    if(game.selectedPiece) visiblePieces.push(game.selectedPiece.name);
    visiblePieces = [...new Set(visiblePieces)];
    visiblePieces.sort();
    for(let i = 0; i < visiblePieces.length; i++) {
        boardRows.push(findEmoji((getTeam(visiblePieces[i])?"Black":"White") + getChessName(visiblePieces[i])) + " " + findEmoji(visiblePieces[i]) + " **" + visiblePieces[i] + ":** " + getAbilityText(visiblePieces[i]));
    }
    return (boardMsg + boardRows.join("\n")).substr(0, 1950);
}

// find an emoji by name
function findEmoji(name) {
    name = name.toLowerCase().replace(/[^a-z]/g,"");
    let emoji = client.emojis.cache.find(el => el.name.toLowerCase() === name);
    if(emoji) emoji = `<:${emoji.name}:${emoji.id}>`;
    else {
        console.log("MISSING EMOJI", name);
        emoji = "❓";
    }
    // return
    return emoji;
}

function renderField(field, x, y, turn) {
    switch(field.name) {
        default: 
            // get name
            let fieldName;
            if(field.team == turn || field.enemyVisibleStatus == 7) fieldName = field.name;
            else if(field.enemyVisibleStatus == 6 && !field.disguise) fieldName = field.name;
            else if(field.enemyVisibleStatus == 6 && field.disguise) fieldName = field.disguise;
            else fieldName = (field.team?"black":"white") + field.enemyVisible;
            // get emoji
            return findEmoji(fieldName);
        case null:
            return findEmoji(((x&1)^(y&1))?"whitesquare":"blacksquare");
        case "Selected":
            return "❗";
    }
}

/* Register Slash Commands */
function registerCommands() {
    client.application?.commands.create({
        name: 'play',
        description: 'Starts a game.'
    });
    client.application?.commands.create({
        name: 'challenge',
        description: 'Starts a game with another player.',
        options: [
            {
                type: "MENTIONABLE",
                name: "opponent",
                description: "The name of the person you'd like to challenge.",
                required: true
            }
        ]
    });
    client.application?.commands.create({
        name: 'resign',
        description: 'Resigns the game.'
    });
    client.application?.commands.create({
        name: 'accept',
        description: 'Accepts a challenge.'
    });
    client.application?.commands.create({
        name: 'deny',
        description: 'Denies a challenge.'
    });
    client.application?.commands.create({
        name: 'help',
        description: 'Explains the game.'
    });
}


function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
} 

/* 
	LOGIN
*/
client.login(config.token);
