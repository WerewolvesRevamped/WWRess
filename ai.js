/** AI **/
const PawnValue = 2.0;
const PrinceValue = 3.0;
const KingValue = 4.0; 
const KnightValue = 4.0;
const BishopValue = 4.0;
const RookValue = 7.0;
const QueenValue = 13.0;
const NoneValue = 0.25;

const UnknownValue = 5.0;
const LikelyPawnValue = 3.0;
const LikelyKingValue = 5.0;
const LikelyKnightValue = 4.5;
const LikelyRookValue = 8.0;

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

const PrinceTable = [
    [-3.0, -1.0, -1.0, -1.0, -3.0],
    [-1.0, 1.5, 2.0, 1.5, -1.0],
    [-1.0, 2.0, 2.0, 2.0, -1.0],
    [-1.0, 1.5, 2.0, 1.5, -1.0],
    [-3.0, -1.0, -1.0, -1.0, -3.0]
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

const BishopTable = [
    [-2.0, -1.0, -1.0, -1.0, -2.0],
    [-1.0, 0.5, 0.5, 0.5, -1.0],
    [-0.5, 0.5, 0.5, 0.5, -0.5],
    [-1.0, 0.5, 0.5, 0.5, -1.0],
    [-2.0, -1.0, -1.0, -1.0, -2.0]
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

const SoloTable = [
    [-1.0, -0.75, -0.25, -0.75, -1.0],
    [-0.5, 0.5, 1.0, 0.5, -0.5],
    [0.0, 1.0, 2.0, 1.0, 0.0],
    [-0.5, 0.5, 1.0, 0.5, -0.5],
    [-1.0, -0.75, -0.25, -0.75, -1.0]
];

/**
getEvaluationData(pieceChessName)
Returns an object containing the value of a piece as well as a table marking which locations are best for the piece
**/
function getEvaluationData(piece) {
    switch(piece) {
        case "Pawn": case "ActivePawn":
            return { value: PawnValue, table: PawnTable };
        case "Prince":
            return { value: PrinceValue, table: PrinceTable };
        case "King": case "ActiveKing":
            return { value: KingValue, table: KingTable };
        case "Knight": case "ActiveKnight":
            return { value: KnightValue, table: KnightTable };
        case "Bishop":
            return { value: BishopValue, table: BishopTable };
        case "Rook": case "ActiveRook":
            return { value: RookValue, table: RookTable };    
        case "Queen": case "ActiveQueen":
            return { value: QueenValue, table: QueenTable };   
        case "None":
            return { value: NoneValue, table: NoneTable };    
        case "LikelyPawn":
            return { value: LikelyPawnValue, table: PawnTable };    
        case "LikelyKing":
            return { value: LikelyKingValue, table: KingTable };    
        case "LikelyKnight":
            return { value: LikelyKnightValue, table: KnightTable };    
        case "LikelyRook": case "LikelyRook":
            return { value: LikelyRookValue, table: RookTable };    
        default:
            return { value: PawnValue, table: PawnTable };
        case "Unknown":
            return { value: UnknownValue, table: KingTable };
        break;
    }
}

/**
table(returnTableDirectly, inputTable, Xcoord, Ycoord, XwidthFactor, YwidthFactor)
Receives a table and either returns a value from certain X/Y coordinates directly, or scales the coordinates according to factors first and then returns
**/
function table(defTable, tbl, x, y, boardWidthFactor, boardHeightFactor) {
    if(defTable) return tbl[y][x];
    else return tbl[Math.floor(y * boardHeightFactor)][Math.floor(x * boardWidthFactor)];
}

/**
evaluate(currentPlayer, currentGame, visibleTeam)
Evaluates the current game state for a certain player (AI) with pieces from a certain team visible
**/
function evaluate(AI, game, visiblePieces = null) {
    //BENCHMARK timeSpentEvaluating -= Date.now();
    let board = game.state;
    // determine material + position
    let whiteValue = 0, blackValue = 0, goldValue = 0;
    let whiteReveal = 0, blackReveal = 0, goldReveal = 0;
    let boardHeight = board.length;
    let boardWidth = board[0].length;
    let boardHeightFactor = 5 / boardHeight;
    let boardWidthFactor = 5 / boardWidth;
    let defTable = boardWidthFactor == 1 && boardHeightFactor == 1;
    for(let y = 0; y < boardHeight; y++) {
        for(let x = 0; x < boardWidth; x++) {
            let piece = board[y][x];
            // get piece value
            if(piece.team === 0) { // team white
                if(visiblePieces != 0 && (piece.enemyVisibleStatus < 6 || (piece.enemyVisibleStatus == 6 && piece.disguise))) { // hidden piece
                    if(piece.enemyVisibleStatus < 6) {
                        let evData = getEvaluationData(piece.enemyVisible);
                        whiteValue += evData.value + table(defTable, evData.table, x, boardHeight-1 - y, boardWidthFactor, boardHeightFactor) + 4;
                    } else if(piece.enemyVisibleStatus == 6) {
                        let evData = getEvaluationData(getChessName(piece.disguise));
                        whiteValue += evData.value + table(defTable, evData.table, x, boardHeight-1 - y, boardWidthFactor, boardHeightFactor) + getWWRevalValue(piece.disguise);
                    }
                } else { // revealed piece
                    let evData = getEvaluationData(piece.chess);
                    whiteValue += evData.value + table(defTable, evData.table, x, boardHeight-1 - y, boardWidthFactor, boardHeightFactor) + getWWRevalValue(piece.name);
                }
                whiteReveal += piece.enemyVisibleStatus / 7;
            } else if(piece.team === 1) { // team black
                if(visiblePieces != 1 && (piece.enemyVisibleStatus < 6 || (piece.enemyVisibleStatus == 6 && piece.disguise))) { // hidden piece
                    if(piece.enemyVisibleStatus < 6) {
                        let evData = getEvaluationData(piece.enemyVisible);
                        blackValue += evData.value + table(defTable, evData.table, x, y, boardWidthFactor, boardHeightFactor) + 4;
                    } else if(piece.enemyVisibleStatus == 6) {
                        let evData = getEvaluationData(getChessName(piece.disguise));
                        blackValue += evData.value + table(defTable, evData.table, x, y, boardWidthFactor, boardHeightFactor) + getWWRevalValue(piece.disguise);
                    }
                } else { // revealed piece
                    let evData = getEvaluationData(piece.chess);
                    blackValue += evData.value + table(defTable, evData.table, x, y, boardWidthFactor, boardHeightFactor) + getWWRevalValue(piece.name);  
                }
                blackReveal += piece.enemyVisibleStatus / 7;
            } else if(piece.team === 2) { // team gold
                if(visiblePieces != 2 && (piece.enemyVisibleStatus < 6 || (piece.enemyVisibleStatus == 6 && piece.disguise))) { // hidden piece
                    if(piece.enemyVisibleStatus < 6) {
                        let evData = getEvaluationData(piece.enemyVisible);
                        goldValue += evData.value + table(defTable, SoloTable, x, y, boardWidthFactor, boardHeightFactor) + 4;
                    } else if(piece.enemyVisibleStatus == 6) {
                        let evData = getEvaluationData(getChessName(piece.disguise));
                        goldValue += evData.value + table(defTable, SoloTable, x, y, boardWidthFactor, boardHeightFactor) + getWWRevalValue(piece.disguise);
                    }
                } else { // revealed piece
                    let evData = getEvaluationData(piece.chess);
                    goldValue += evData.value + table(defTable, SoloTable, x, y, boardWidthFactor, boardHeightFactor) + getWWRevalValue(piece.name);  
                }
                goldReveal += (piece.enemyVisibleStatus / 7);
            }
            
            // solo extra evaluation
            if(game.solo && (AI == 2 || (AI != 2 && game.soloRevealed)) && !game.goldEliminated) {
                switch(game.soloTeam) {
                    case "Flute":
                        if(piece.enchanted) {
                            goldValue += 5;
                        }
                    break;
                    case "Underworld":
                        if(piece.demonized) {
                            if(visiblePieces == 2) goldValue += 3;
                            else goldValue += 1;
                        }
                    break;
                    default:
                    break;
                }
            }
            // solo extra eval end
        }
    }
    // calculate value
    switch(AI) {
        case 0: // white ai
            //BENCHMARK timeSpentEvaluating += Date.now();
            return (whiteValue + blackReveal + goldReveal) - (blackValue + goldValue + whiteReveal);
        case 1: // black ai
            //BENCHMARK timeSpentEvaluating += Date.now();
            return (blackValue + whiteReveal + goldReveal) - (whiteValue + goldValue + blackReveal);
        case 2: // gold ai
            //BENCHMARK timeSpentEvaluating += Date.now();
            return (goldValue + whiteReveal + blackReveal) - (whiteValue + blackValue + goldReveal);
    }
}

/**
getChildren(currentGame, maximumIteration, remainingIterations, isCurrentPlayerAI)
Retrieves all relevant child states of the current game state
**/
function getChildren(game, maxDepth = 0, depth = 0, maximizingPlayer = true) {
    let board = game.state;
    let pieces = [];
    
    // get all available pieces
    let abilityPieces = [];
    let enemyPieces = [];
    let skipPointless = false; // some abilities are unlimited, so always better than nothing
    // some roles have abilities that arent position based, so if they exist twice its just the same thing twice
    let csFound = false;
    let afFound = false;
    let pwFound = false;
    let atFound = false;
    let tFound = false;
    let cfFound = false;
    let awFound = false;
    // iterate through pieces, to find ability pieces
    for(let y = 0; y < game.height; y++) {
        for(let x = 0; x < game.width; x++) {
            if(game.turn == 1 && board[y][x].name == "Bloody Butcher" && maximizingPlayer) {
                abilityPieces.push([board[y][x].name, x, y]); // can use ability, but cannot be moved
            }
            if(board[y][x].team == game.turn) {
                pieces.push(xyToName(x, y));
                if(board[y][x].active && !board[y][x].sabotaged && !board[y][x].enchanted && (maximizingPlayer || board[y][x].enemyVisibleStatus >= 6)) {
                    let abilityPieceName = (!maximizingPlayer && board[y][x].disguise && board[y][x].enemyVisibleStatus == 6) ? board[y][x].disguise : board[y][x].name;
                    // active ability priorities
                    switch(abilityPieceName) {
                        // done by self this turn
                        case "Crowd Seeker":
                            if(depth >= maxDepth && !csFound) {
                                abilityPieces.push([board[y][x].name, x, y]);
                                skipPointless = true;
                            }
                            csFound = true;
                        break;
                        case "Archivist Fox":
                            if(depth >= maxDepth && !afFound) {
                                abilityPieces.push([board[y][x].name, x, y]);
                                skipPointless = true;
                            }
                            afFound = true;
                        break;
                        case "Psychic Wolf":
                            if(depth >= maxDepth && !pwFound) {
                                abilityPieces.push([board[y][x].name, x, y]);
                                skipPointless = true;
                            }
                            pwFound = true;
                        break;
                        case "Aura Teller":
                            if(depth >= maxDepth && !atFound) {
                                abilityPieces.push([board[y][x].name, x, y]);
                                skipPointless = true;
                            }
                            atFound = true;
                        break;
                        case "Tanner":
                        case "Horseman of Famine":
                            if(depth >= maxDepth && !tFound) {
                                abilityPieces.push([board[y][x].name, x, y]);
                                skipPointless = true;
                            }
                            tFound = true;
                        break;
                        case "Fortune Teller": case "Warlock":
                            if(depth >= maxDepth) {
                                abilityPieces.push([board[y][x].name, x, y]);
                                let positionsCheck = generatePositions(game.state, xyToName(x, y), true).filter(el => el[2]); // only select moves with targets;
                                if(positionsCheck.length >= 1) skipPointless = true;
                            }
                        break;
                        case "Clairvoyant Fox": 
                            if(depth >= maxDepth && !cfFound) {
                                abilityPieces.push([board[y][x].name, x, y]);
                            }
                            cfFound = true;
                        break;
                        // done by enemy next turn 
                        case "Hooker":
                        case "Bat":
                            if(depth >= (maxDepth-1)) abilityPieces.push([board[y][x].name, x, y]);
                        break;
                        // done by self in next turn
                        case "Saboteur Wolf": 
                        case "Horseman of Pestilence": 
                            if(depth >= (maxDepth-2)) abilityPieces.push([board[y][x].name, x, y]);
                        break;
                        // whenever
                        case "Infecting Wolf": case "Dog": case "Flute Player": case "Vampire": case "Ghast": case "FireballUp": case "FireballDown":
                            abilityPieces.push([board[y][x].name, x, y]);
                        break;
                        // whenever
                        case "Alpha Wolf":
                            if(!awFound) {
                                abilityPieces.push([board[y][x].name, x, y]);
                            }
                            awFound = true;
                        break;
                        // whenever
                        case "Horseman of War":
                        case "Horseman of Death":
                            abilityPieces.push([board[y][x].name, x, y]);
                        break;
                    }
                    // end priorities
                }
            } else if(enemyTeam(game.turn, board[y][x].team)) {
                enemyPieces.push([x, y, board[y][x].enemyVisibleStatus]);
            }
        }
    }
   
    // find all possible ability/move combinations
    let children = [];
    // option to not use an ability
    if(!skipPointless) abilityPieces.unshift([null,0,0]);
    // iterate ability pieces
    for(let abilityPiece of abilityPieces) {
        // find valid options for ability
        let abilityPositions = [];
        let ax = abilityPiece[1], ay = abilityPiece[2];
        switch(abilityPiece[0]) {
            case null: default:
                abilityPositions = [[null]];
            break;
            // targetable enemy
            case "Fortune Teller": case "Warlock": case "Infecting Wolf": case "Saboteur Wolf": case "Horseman of Pestilence":
                abilityPositions = generatePositions(game.state, xyToName(abilityPiece[1], abilityPiece[2]), true).filter(el => el[2]).map(el => [el[0], el[1]]); // only select moves with targets
            break;
            // all enemy
            case "Clairvoyant Fox": case "Crowd Seeker": case "Archivist Fox": case "Psychic Wolf": case "Aura Teller":
                let status = 0;
                // only select the investigation that reveals most
                while(status < 7) {
                    abilityPositions = enemyPieces.filter(el => el[2] == status).map(el => [el[0], el[1]]);
                    if(abilityPositions.length > 0) break;
                    status++;
                }
                // there is no real priority otherwise
                if(abilityPositions.length > 1) { 
                    abilityPositions = abilityPositions.slice(0, 1);
                }
                // if no target could be found, provide no ability as an option instead
                if(abilityPositions.length == 0) { 
                    abilityPiece = [null, 0, 0];
                    abilityPositions = [[null]]; 
                }
            break;
            // all enemy pieces
            case "Flute Player":
                abilityPositions = enemyPieces.filter(el => !game.state[el[1]][el[0]].enchanted).map(el => [el[0], el[1]]);
                abilityPositions = randomize(abilityPositions).splice(0, 4); // reduce amount of targets to maximum of 4
            break;
            case "Vampire":
                abilityPositions = enemyPieces.filter(el => !game.state[el[1]][el[0]].demonized).map(el => [el[0], el[1]]);
                abilityPositions = randomize(abilityPositions);
                if(depth != maxDepth) abilityPositions = abilityPositions.splice(0, 4); // reduce amount of targets to maximum of 4, unless next Vampire turn
            break;
            // all ally
            case "Tanner":
            case "Horseman of Famine":
                abilityPositions = pieces.map(el => {
                    let tanXY = nameToXY(el);
                    return [tanXY.x, tanXY.y];
                });
            break;
            // dog
            case "Dog":
                abilityPositions = ["Wolf Cub","Fox"];
            break;
            case "Bloody Butcher":
                abilityPositions = ["Revealed Bloody Butcher"];
            break;
            case "Ghast":
                if(inBounds(game.width, game.height, ax, ay - 1) && game.state[ay - 1][ax].name == null) {
                    abilityPositions.push("up");
                }
                if(inBounds(game.width, game.height, ax, ay + 1) && game.state[ay + 1][ax].name == null) {
                    abilityPositions.push("down");
                }
            break;
            case "FireballUp":
                if(inBounds(game.width, game.height, ax, ay - 1)) {
                    abilityPositions = [[ax, ay - 1]];
                }
            break;
            case "FireballDown":
                if(inBounds(game.width, game.height, ax, ay + 1)) {
                    abilityPositions = [[ax, ay + 1]];
                }
            break;
            // adjacent ally
            case "Hooker":
                if(inBounds(game.width, game.height, ax, ay-1) && game.state[ay-1][ax].team == 0) abilityPositions.push([ax, ay-1]);
                if(inBounds(game.width, game.height, ax, ay+1) && game.state[ay+1][ax].team == 0) abilityPositions.push([ax, ay+1]);
                if(inBounds(game.width, game.height, ax-1, ay-1) && game.state[ay-1][ax-1].team == 0) abilityPositions.push([ax-1, ay-1]);
                if(inBounds(game.width, game.height, ax-1, ay) && game.state[ay][ax-1].team == 0) abilityPositions.push([ax-1, ay]);
                if(inBounds(game.width, game.height, ax-1, ay+1) && game.state[ay+1][ax-1].team == 0) abilityPositions.push([ax-1, ay+1]);
                if(inBounds(game.width, game.height, ax+1, ay-1) && game.state[ay-1][ax+1].team == 0) abilityPositions.push([ax+1, ay-1]);
                if(inBounds(game.width, game.height, ax+1, ay) && game.state[ay][ax+1].team == 0) abilityPositions.push([ax+1, ay]);
                if(inBounds(game.width, game.height, ax+1, ay+1) && game.state[ay+1][ax+1].team == 0) abilityPositions.push([ax+1, ay+1]);
            break;
            case "Bat":
                if(inBounds(game.width, game.height, ax, ay-1) && game.state[ay-1][ax].team == 2) abilityPositions.push([ax, ay-1]);
                if(inBounds(game.width, game.height, ax, ay+1) && game.state[ay+1][ax].team == 2) abilityPositions.push([ax, ay+1]);
                if(inBounds(game.width, game.height, ax-1, ay-1) && game.state[ay-1][ax-1].team == 2) abilityPositions.push([ax-1, ay-1]);
                if(inBounds(game.width, game.height, ax-1, ay) && game.state[ay][ax-1].team == 2) abilityPositions.push([ax-1, ay]);
                if(inBounds(game.width, game.height, ax-1, ay+1) && game.state[ay+1][ax-1].team == 2) abilityPositions.push([ax-1, ay+1]);
                if(inBounds(game.width, game.height, ax+1, ay-1) && game.state[ay-1][ax+1].team == 2) abilityPositions.push([ax+1, ay-1]);
                if(inBounds(game.width, game.height, ax+1, ay) && game.state[ay][ax+1].team == 2) abilityPositions.push([ax+1, ay]);
                if(inBounds(game.width, game.height, ax+1, ay+1) && game.state[ay+1][ax+1].team == 2) abilityPositions.push([ax+1, ay+1]);
            break;
            case "Horseman of Death":
                if(inBounds(game.width, game.height, ax, ay-1) && game.state[ay-1][ax].team == 0) abilityPositions.push([ax, ay-1]);
                if(inBounds(game.width, game.height, ax, ay+1) && game.state[ay+1][ax].team == 0) abilityPositions.push([ax, ay+1]);
                if(inBounds(game.width, game.height, ax-1, ay-1) && game.state[ay-1][ax-1].team == 0) abilityPositions.push([ax-1, ay-1]);
                if(inBounds(game.width, game.height, ax-1, ay) && game.state[ay][ax-1].team == 0) abilityPositions.push([ax-1, ay]);
                if(inBounds(game.width, game.height, ax-1, ay+1) && game.state[ay+1][ax-1].team == 0) abilityPositions.push([ax-1, ay+1]);
                if(inBounds(game.width, game.height, ax+1, ay-1) && game.state[ay-1][ax+1].team == 0) abilityPositions.push([ax+1, ay-1]);
                if(inBounds(game.width, game.height, ax+1, ay) && game.state[ay][ax+1].team == 0) abilityPositions.push([ax+1, ay]);
                if(inBounds(game.width, game.height, ax+1, ay+1) && game.state[ay+1][ax+1].team == 0) abilityPositions.push([ax+1, ay+1]);
                if(inBounds(game.width, game.height, ax, ay-1) && game.state[ay-1][ax].team == 1) abilityPositions.push([ax, ay-1]);
                if(inBounds(game.width, game.height, ax, ay+1) && game.state[ay+1][ax].team == 1) abilityPositions.push([ax, ay+1]);
                if(inBounds(game.width, game.height, ax-1, ay-1) && game.state[ay-1][ax-1].team == 1) abilityPositions.push([ax-1, ay-1]);
                if(inBounds(game.width, game.height, ax-1, ay) && game.state[ay][ax-1].team == 1) abilityPositions.push([ax-1, ay]);
                if(inBounds(game.width, game.height, ax-1, ay+1) && game.state[ay+1][ax-1].team == 1) abilityPositions.push([ax-1, ay+1]);
                if(inBounds(game.width, game.height, ax+1, ay-1) && game.state[ay-1][ax+1].team == 1) abilityPositions.push([ax+1, ay-1]);
                if(inBounds(game.width, game.height, ax+1, ay) && game.state[ay][ax+1].team == 1) abilityPositions.push([ax+1, ay]);
                if(inBounds(game.width, game.height, ax+1, ay+1) && game.state[ay+1][ax+1].team == 1) abilityPositions.push([ax+1, ay+1]);
            break;
            // alpha wolf
            case "Alpha Wolf":
                for(let i = 0; i < pieces.length; i++) {
                        let coords = nameToXY(pieces[i]);
                        if(game.state[0][coords.x].name == null) abilityPositions.push([coords.x, coords.y]);
                }
            break;
            // how
            case "Horseman of War":
                for(let i = 0; i < pieces.length; i++) {
                        let coords = nameToXY(pieces[i]);
                        if(game.state[2][coords.x].name == null) abilityPositions.push([coords.x, coords.y]);
                }
            break;
        }
        
        for(const abilityPosition of abilityPositions) {
            // make a copy
            let gameCopy = gameClone(game); // create a copy of the game to simulate the move on
            gameCopy.ai = true; // mark as AI game
            gameCopy.id = null;
            // execute ability
            let piecesChanged = false
            if(abilityPiece[0] != null) {
                //BENCHMARK timeSpentAbility -= Date.now();
                piecesChanged = executeActiveAbility(gameCopy, abilityPiece[0], [abilityPiece[1], abilityPiece[2]], abilityPosition, false);
                //BENCHMARK timeSpentAbility += Date.now();
            }
            
            // redetermine pieces if positions have changed
            if(piecesChanged) {
                pieces = [];
                for(let y = 0; y < gameCopy.height; y++) {
                    for(let x = 0; x < gameCopy.width; x++) {
                        if(gameCopy.state[y][x].team == gameCopy.turn) {
                            pieces.push(xyToName(x, y));
                        }
                    }
                }
            }
            
            // START continue with normal move
            // iterate through all pieces
            children = getNormalChildren(pieces, maximizingPlayer, gameCopy, depth, maxDepth, abilityPiece, abilityPosition, false);
            // END normal move section
        }
    }
    // END ability section
    
	return children; // 0 -> ability piece, 1 -> ability usage, 2 -> piece, 3 -> move, 4 -> state
}

/**
getNormalChildren(availablePieces, isCurrentPlayerAI, currentGame, remainingIterations, maximumIteration, abilityPiece, abilityPosition, isUncloned)
Normal move evaluation
 **/
function getNormalChildren(pieces, maximizingPlayer, gameCopy, depth, maxDepth, abilityPiece, abilityPosition, uncloned = false) {
    let children = [];
    let pm = pieces.length-1;
    for(let i = 0; i < pieces.length; i++) {
        let selectedPiece = pieces[i];
        let positions;
        if(maximizingPlayer) { // own piece
            positions = generatePositions(gameCopy.state, selectedPiece, true);
        } else { // enemy piece
            let selectedPieceCoords = nameToXY(selectedPiece);
            let selectedPieceObject = gameCopy.state[selectedPieceCoords.y][selectedPieceCoords.x];
            switch(selectedPieceObject.enemyVisibleStatus) {
                default: case 7: // type known
                    positions = generatePositions(gameCopy.state, selectedPiece, true);
                break;
                case 4: case 5: case 6: // type could be disguise
                    if(selectedPieceObject.disguise) {
                        positions = generatePositions(gameCopy.state, selectedPiece, true, getChessName(selectedPieceObject.disguise));
                    } else {
                        positions = generatePositions(gameCopy.state, selectedPiece, true);
                    }
                break;
                case 0: case 1: case 2: case 3: // type unknown
                    switch(selectedPieceObject.enemyVisible) {
                        default:
                            positions = generatePositions(gameCopy.state, selectedPiece, true, "Pawn");
                        break;
                        case "LikelyRook":
                            positions = generatePositions(gameCopy.state, selectedPiece, true, "Rook");
                        break;
                        case "LikelyKing":
                            positions = generatePositions(gameCopy.state, selectedPiece, true, "King");
                        break;
                        case "LikelyPawn":
                            positions = generatePositions(gameCopy.state, selectedPiece, true, "Pawn");
                        break;
                        case "LikelyKnight":
                            positions = generatePositions(gameCopy.state, selectedPiece, true, "Knight");
                            if(depth >= (maxDepth-1)) {  // on first move consider it could be a amnesiac->pawn
                                positions.push(...generatePositions(gameCopy.state, selectedPiece, true, "Pawn"));
                            }
                        break;
                        case "Unknown":
                            if(depth >= (maxDepth-1)) { // on the first move, consider king and knight
                                positions = generatePositions(gameCopy.state, selectedPiece, true, "King");
                                positions.push(...generatePositions(gameCopy.state, selectedPiece, true, "Knight"));
                            } else { // otherwise just pawn
                                positions = generatePositions(gameCopy.state, selectedPiece, true, "Pawn");
                            }
                        break;
                    }
                break;
            }
        }
        // iterate through that piece's moves
        for(let j = 0; j < positions.length; j++) {
            let gameInnerCopy;
            if(!uncloned && i == pm && j == positions.length-1) {
                gameInnerCopy = gameCopy; // reuse current copy on last move
            } else {
                gameInnerCopy = gameClone(gameCopy); // create a copy of the game to simulate the move on
                gameInnerCopy.ai = true; // mark as AI game
                gameInnerCopy.id = null;
            }
                       
            let selectedMove = positions[j];
            // simulate move
            //BENCHMARK timeSpentMoving -= Date.now();
            //BENCHMARK timeSpentMovingCur = true;
            movePieceWrapper(null, gameInnerCopy, selectedPiece, xyToName(selectedMove[0], selectedMove[1]));
            //BENCHMARK timeSpentMovingCur = false;
            //BENCHMARK timeSpentMoving += Date.now();
            //if(depth==4) console.log(abilityPiece, "~", abilityPosition, "|", selectedPiece, ">", selectedMove);
            children.push([abilityPiece, abilityPosition, selectedPiece, selectedMove, gameInnerCopy]);
        }
    }
    return children;
}

// on the first iteration save and return the move
function minimaxStart(AI, game, maxDepth, depth, alpha = -Infinity, beta = Infinity) {
    let board = game.state;
    if(
        (game.players.length == 2 && !canMove(board, (AI+1)%2)) ||
        (game.players.length == 3 && !canMove(board, (AI+1)%3) && !canMove(board, (AI+2)%3)) ||
        (AI == 2 && soloWin(board, game.soloTeam)) ||
        (AI == 2 && uaWin(board, game.soloTeam))
    ) {
        return { value: 1000 - (maxDepth - depth), move: null }; // game winning move
    }
    if (!canMove(board, AI) || (AI != 2 && game.solo && game.soloRevealed && soloWin(board, game.soloTeam))) {
        return { value: -1000 + (maxDepth - depth), move: null }; // game losing move
    }
    
    // maximizing player (minimizing does not exist)
    let value = -Infinity;
    let bestMove = null;
    let children = getChildren(game, maxDepth, depth, true);
    console.log("POSSIBLE MOVES", children.length, "RUNNING " + depth + " ITERATIONS"/**, children.map(el => (el[0]==null?"":(el[0] + "~" + (el[1].length==2?xyToName(el[1][0], el[1][1]):el[1]) + " & "))  + el[2] + ">" + xyToName(el[3][0], el[3][1]))**/);
    for (const child of children) {
        debugIterationCounter++;
        var result = minimax(AI, child[4], maxDepth, depth - 1, alpha, beta);
        
        //console.log("MOVE", result, (child[0]==null?"":(child[0] + "~" + (child[1].length==2?xyToName(child[1][0], child[1][1]):child[1]) + " & "))  + child[2] + ">" + xyToName(child[3][0], child[3][1]));
        
        // check for triplicate
        let gameHistoryCopy = deepCopy(gamesHistory[game.parentId].history);
        // check if the move ends up as a triplicate
        if(!child[4].doNotSerialize) {
            gameHistoryCopy.push(serialize(game.turn, child[4].state));
        }
        
        // check for draw by triplicate/30move
        let findDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) != index)
        let triplicates = findDuplicates(findDuplicates(gameHistoryCopy));
        if(triplicates.length > 0) {
            console.log("POSSIBLE TRIPLICATE MOVE");
            result = -7; // a draw is better than any guaranteed losing position, but worse than positions with a decent chance of winning
        } else if(child[4].sinceCapture >= 30) {
            console.log("POSSIBLE 30MOVE MOVE");
            result = -7; // a draw is better than any guaranteed losing position, but worse than positions with a decent chance of winning
        }
        
        // continue with minimax
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

// further minmax iterations
function minimax(AI, game, maxDepth, depth, alpha = -Infinity, beta = Infinity) {
    let board = game.state;
    // Base case: if we have reached the maximum search depth or the game is over, return the heuristic value of the state
    if (depth === 0) {
        return evaluate(AI, game, AI);
    }
    if (
        (game.players.length == 2 && !canMove(board, (AI+1)%2)) ||
        (game.players.length == 3 && !canMove(board, (AI+1)%3) && !canMove(board, (AI+2)%3)) ||
        (AI == 2 && soloWin(board, game.soloTeam)) ||
        (AI == 2 && uaWin(board, game.soloTeam))
    ) {
        return 1000 - (maxDepth - depth) + evaluate(AI, game, AI); // game winning move
    }
    if (!canMove(board, AI) || (AI != 2 && game.solo && game.soloRevealed && soloWin(board, game.soloTeam))) {
        return -1000 + (maxDepth - depth) + evaluate(AI, game, AI); // game losing move
    }
   
    if (AI == game.turn) {
        let value = -Infinity;
        let children = getChildren(game, maxDepth, depth, true);
        for (const child of children) {
            debugIterationCounter++;
            /**let result = minimax(AI, child[4], maxDepth, depth - 1, alpha, beta);
            if(depth == 5) console.log("-   MOVE", result, (child[0]==null?"":(child[0] + "~" + (child[1].length==2?xyToName(child[1][0], child[1][1]):child[1]) + " & "))  + child[2] + ">" + xyToName(child[3][0], child[3][1]));
            value = Math.max(value, result);**/
            value = Math.max(value, minimax(AI, child[4], maxDepth, depth - 1, alpha, beta));
            alpha = Math.max(alpha, value);
            if (beta <= alpha) {
                break;  // Beta cut-off
            }
        }
        return value;
    } else {
        let value = Infinity;
        let children = getChildren(game, maxDepth, depth, false);
        for (const child of children) {
            debugIterationCounter++;
            /**let result = minimax(AI, child[4], maxDepth, depth - 1, alpha, beta);
            if(depth == 5) console.log("+   MOVE", result, (child[0]==null?"":(child[0] + "~" + (child[1].length==2?xyToName(child[1][0], child[1][1]):child[1]) + " & "))  + child[2] + ">" + xyToName(child[3][0], child[3][1]));
            value = Math.min(value, result);**/
            value = Math.min(value, minimax(AI, child[4], maxDepth, depth - 1, alpha, beta));
            beta = Math.min(beta, value);
            if (beta <= alpha) {
                break;  // Alpha cut-off
            }
        }
        return value == Infinity ? -Infinity : value;
    }
}

var debugIterationCounter = 0;
//BENCHMARK var timeSpentEvaluating = 0;
//BENCHMARK var timeSpentChecking = 0;
//BENCHMARK var timeSpentMoving = 0;
//BENCHMARK var timeSpentMovingCur = false;
//BENCHMARK var timeSpentMovingClone = 0;
//BENCHMARK var timeSpentAbility = 0;
//BENCHMARK  timeSpentCloning = 0;
//BENCHMARK var timeSpentFastCloning = 0;
async function AImove(AI, game) {
    removeEffects(game, game.turn); // remove effects
    let gameCopy = gameClone(game); // create a copy of the game to simulate the move on
    gameCopy.ai = true; // mark as AI game
    gameCopy.id = null;
    gameCopy.parentId = game.id;
    
    // count pieces
    let pieceCount = 0;
    for(let y = 0; y < game.height; y++) {
        for(let x = 0; x < game.width; x++) {
            if(game.state[y][x].team >= 0) pieceCount++;
        }
    }
    if(game.reducedIterations) pieceCount += 7;
    if(!game.ai && game.stupidChance != 0 && Math.random() < game.stupidChance) {
        console.log("BLUNDER");
        pieceCount += 100;
    }
    
    // start minimax to find the best move
    let minmax;
    var timeSpentTotal = -Date.now();
    //BENCHMARK debugIterationCounter = 0;
    //BENCHMARK timeSpentEvaluating = 0;
    //BENCHMARK timeSpentChecking = 0;
    //BENCHMARK timeSpentMoving = 0;
    //BENCHMARK timeSpentMovingCur = false;
    //BENCHMARK timeSpentMovingClone = 0;
    //BENCHMARK timeSpentAbility = 0;
    //BENCHMARK timeSpentCloning = 0;
    //BENCHMARK timeSpentFastCloning = 0;
    let modifier = game.aiModifier;
    if(pieceCount >= 50) minmax = { move: null };
    else if(pieceCount >= 27) minmax = minimaxStart(AI, gameCopy, 2 + modifier, 2 + modifier);
    else if(pieceCount >= 17) minmax = minimaxStart(AI, gameCopy, 3 + modifier, 3 + modifier);
    else if(pieceCount >= 12) minmax = minimaxStart(AI, gameCopy, 4 + modifier, 4 + modifier);
    else if(pieceCount >= 5) minmax = minimaxStart(AI, gameCopy, 5 + modifier, 5 + modifier);
    else if(pieceCount == 4) minmax = minimaxStart(AI, gameCopy, 6 + modifier, 6 + modifier);
    else if(pieceCount == 3) minmax = minimaxStart(AI, gameCopy, 7 + modifier, 7 + modifier);
    else minmax = minimaxStart(AI, gameCopy, 8 + modifier, 8 + modifier);
    try {
        // minmax cant find a move, do any move
        let children = getChildren(game, 0, 0, true);
        if(minmax.move == null) minmax = { value: null, move: getChildren(game, 0, 0, true)[0].slice(0, 4) };
    } catch (err) {
        // absolutely no moves can be found. this is a bug. why?
        console.log("ERROR AI MOVE", AI, err, "\n", getChildren(game, 0, 0, true), "\n", JSON.stringify(game));
        minmax = { value: null, move: [null, null, "A1", [0, 0]] };
    }
    let bestMove = minmax.move;
	console.log("BEST MOVE VAL", minmax.value);
    
    if(minmax.value < -20 && game.players.length == 2 && gamesHistory[game.id].length > 10) {
        sendMessage(game.id, "**Game End:** *AI* resigned!");
        concludeGame(game.id);
        destroyGame(game.id);
        console.log("RESIGN AI");
        return;
    }
    

    timeSpentTotal += Date.now();
    //console.log(game)
    const ITER_FACTOR = 10000;
    console.log("CONSIDERED STATES", debugIterationCounter);
    console.log("SPENT ", timeSpentTotal, "ms TOTAL ", Math.floor(timeSpentTotal/debugIterationCounter*ITER_FACTOR)/ITER_FACTOR, "ms PER STATE");
    //BENCHMARK console.log("SPENT ", timeSpentEvaluating, "ms EVALUATING ", Math.floor(timeSpentEvaluating/debugIterationCounter*ITER_FACTOR)/ITER_FACTOR, "ms PER STATE ", Math.floor(timeSpentEvaluating/timeSpentTotal*100), "%");
    //BENCHMARK console.log("SPENT ", timeSpentChecking, "ms CHECKING MOVES ", Math.floor(timeSpentChecking/debugIterationCounter*ITER_FACTOR)/ITER_FACTOR, "ms PER STATE ", Math.floor(timeSpentChecking/timeSpentTotal*100), "%");
    //BENCHMARK console.log("SPENT ", timeSpentMoving-timeSpentMovingClone, "ms MOVING ", Math.floor((timeSpentMoving-timeSpentMovingClone)/debugIterationCounter*ITER_FACTOR)/ITER_FACTOR, "ms PER STATE ", Math.floor((timeSpentMoving-timeSpentMovingClone)/timeSpentTotal*100), "%");
    //BENCHMARK console.log("SPENT ", timeSpentAbility, "ms on ABILITY ", Math.floor(timeSpentAbility/debugIterationCounter*ITER_FACTOR)/ITER_FACTOR, "ms PER STATE ", Math.floor(timeSpentAbility/timeSpentTotal*100), "%");
    //BENCHMARK console.log("SPENT ", timeSpentCloning, "ms slow CLONING ", Math.floor(timeSpentCloning/debugIterationCounter*ITER_FACTOR)/ITER_FACTOR, "ms PER STATE ", Math.floor(timeSpentCloning/timeSpentTotal*100), "%");
    //BENCHMARK console.log("SPENT ", timeSpentFastCloning, "ms fast CLONING ", Math.floor(timeSpentFastCloning/debugIterationCounter*ITER_FACTOR)/ITER_FACTOR, "ms PER STATE ", Math.floor(timeSpentFastCloning/timeSpentTotal*100), "%");
    //BENCHMARK console.log("SPENT ", timeSpentCloning+timeSpentFastCloning, "ms total CLONING ", Math.floor((timeSpentCloning+timeSpentFastCloning)/debugIterationCounter*ITER_FACTOR)/ITER_FACTOR, "ms PER STATE ", Math.floor((timeSpentCloning+timeSpentFastCloning)/timeSpentTotal*100), "%");
    //BENCHMARK console.log("SPENT ", timeSpentMoving, "ms MOVING w/ Cloning ", Math.floor((timeSpentMoving)/debugIterationCounter*ITER_FACTOR)/ITER_FACTOR, "ms PER STATE ", Math.floor((timeSpentMoving)/timeSpentTotal*100), "%");
    //BENCHMARK console.log("ACCOUNTED FOR ", Math.floor((timeSpentEvaluating+timeSpentChecking+timeSpentMoving-timeSpentMovingClone+timeSpentAbility+timeSpentCloning+timeSpentFastCloning)/timeSpentTotal*100), "%");
    if(bestMove[0] == null || bestMove[0][0] == null) {
        console.log("AI ABILITY -");
    } else {
        console.log("AI ABILITY", bestMove[0][0], xyToName(bestMove[0][1], bestMove[0][2]) + "~" + (bestMove[1].length == 2 ? xyToName(bestMove[1][0], bestMove[1][1]) : bestMove[1]));
        executeActiveAbility(game, bestMove[0][0], [bestMove[0][1], bestMove[0][2]], bestMove[1]);
    }
    console.log("AI MOVE   ", game.state[nameToXY(bestMove[2]).y][nameToXY(bestMove[2]).x].name + " " + bestMove[2] + ">" + xyToName(bestMove[3][0], bestMove[3][1]), round2dec(minmax.value));
    
    //sendMessage(game.id, "**AI:** Considered " + debugIterationCounter + " possibilities. Selected: " + ((bestMove[0] == null || bestMove[0][0] == null) ? "" : (bestMove[0][0] + " " + (bestMove[0][0], xyToName(bestMove[0][1], bestMove[0][2]) + "~" + (bestMove[1].length == 2 ? xyToName(bestMove[1][0], bestMove[1][1]) : bestMove[1])) +  " & ") + game.state[nameToXY(bestMove[2]).y][nameToXY(bestMove[2]).x].name + " " + bestMove[2] + ">" + xyToName(bestMove[3][0], bestMove[3][1]) + " - Expected Value: " + round2dec(minmax.value));
    
    movePieceWrapper(null, game, bestMove[2], xyToName(bestMove[3][0], bestMove[3][1]));
}
