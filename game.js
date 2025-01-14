// serializes the board
function serialize(turn, board) {
    let serialized = "";
    for(let y = 0; y < board.length; y++) {
        for(let x = 0; x < board[0].length; x++) {
            let piece = board[y][x];
            if(piece.team >= 0) serialized += piece.chess.substr(0, 2) + piece.team + piece.name.substr(0, 2) + piece.enemyVisibleStatus;
            else serialized += "-";
        }
    }
    return turn + "." + serialized;
}

// takes a game, a piece name, an argument for the ability + log value
function executeActiveAbility(game, abilityPiece, abilityPieceLocation, position, log = true) {
    let gameHistory = gamesHistory[game.id];
    switch(abilityPiece) {
        case null: default:
            return false;
        break;
        case "Recall":
        case "Alpha Wolf":
            let recallSubject = { x: position[0], y: position[1] };
            let recallSubjectObject = game.state[recallSubject.y][recallSubject.x];
            game.state[0][recallSubject.x] = shallowCopy(recallSubjectObject);
            game.state[recallSubject.y][recallSubject.x] = getPiece(null);
            if(log) gameHistory.lastMoves.push([game.turn, recallSubjectObject.name, recallSubjectObject.disguise, recallSubjectObject.enemyVisible, xyToName(position[0], position[1]), xyToName(position[0], 0), recallSubjectObject.enemyVisibleStatus, "⤴️"]);
            return true;
        break;
        case "Cecall":
        case "Horseman of War":
            let cecallSubject = { x: position[0], y: position[1] };
            let cecallSubjectObject = game.state[cecallSubject.y][cecallSubject.x];
            game.state[2][cecallSubject.x] = shallowCopy(cecallSubjectObject);
            game.state[cecallSubject.y][cecallSubject.x] = getPiece(null);
            if(log) gameHistory.lastMoves.push([game.turn, cecallSubjectObject.name, cecallSubjectObject.disguise, cecallSubjectObject.enemyVisible, xyToName(position[0], position[1]), xyToName(position[0], 2), cecallSubjectObject.enemyVisibleStatus, "⤴️"]);
            return true;
        break;
        case "Tan": // Tanner/HoF - Player
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
        case "Horseman of Famine": // HoF - AI
            let hofSubject = { x: position[0], y: position[1] };
            let hofSubjectObject = game.state[hofSubject.y][hofSubject.x];
            let disguisehof;
            switch(hofSubjectObject.enemyVisibleStatus < 6 ? hofSubjectObject.enemyVisible : hofSubjectObject.chess) {
                case "LikelyPawn": case "Pawn":
                default:
                    disguisehof = "Lamb";
                break;
                case "LikelyKing": case "King":
                    disguisehof = "Horseman of War";
                break;
                case "LikelyKnight": case "Knight":
                case "LikelyRook": case "Rook":
                case "LikelyQueen": case "Queen":
                    disguisehof = "Horseman of Famine";
                break;
            }
            game.state[hofSubject.y][hofSubject.x].disguise = disguisehof;
            return false;
        break;
        case "Hide":
        case "Hooker":
        case "Bat":
            let hideSubject = { x: abilityPieceLocation[0], y: abilityPieceLocation[1] };
            let hideTarget = xyToName(position[0], position[1]);
            game.state[hideSubject.y][hideSubject.x].hidden = hideTarget;
            return false;
        break;
        case "Sabotage":
        case "Saboteur Wolf":
        case "Horseman of Pestilence":
            let sabotageTarget = { x: position[0], y: position[1] };
            let sabotageTargetObject = game.state[sabotageTarget.y][sabotageTarget.x];
            game.state[sabotageTarget.y][sabotageTarget.x].sabotaged = true;
            let sabotageTargetName = xyToName(sabotageTarget.x, sabotageTarget.y);
            if(log) gameHistory.lastMoves.push([game.turn, sabotageTargetObject.name, sabotageTargetObject.disguise, sabotageTargetObject.enemyVisible, sabotageTargetName, sabotageTargetName, sabotageTargetObject.enemyVisibleStatus, "⛔🟦🟦"]);
            return false;
        break;
        case "Protect":
        case "Witch":
        case "Royal Knight":
            let protectTarget = { x: position[0], y: position[1] };
            game.state[protectTarget.y][protectTarget.x].protected = true;
            game.state[protectTarget.y][protectTarget.x].protectedBy = 0;
            return false;
        break;
        case "Enchant":
        case "Flute Player":
            let enchantTarget = { x: position[0], y: position[1] };
            let enchantSource = { x: abilityPieceLocation[0], y: abilityPieceLocation[1] };
            let enchantSourceObject = game.state[enchantSource.y][enchantSource.x];
            game.state[enchantTarget.y][enchantTarget.x].enchanted = true;
            game.state[enchantTarget.y][enchantTarget.x].soloEffect = true;
            game.state[enchantSource.y][enchantSource.x].stay = true;
            game.state[enchantSource.y][enchantSource.x].enemyVisibleStatus = 7;
            if(log) gameHistory.lastMoves.push([game.turn, enchantSourceObject.name, enchantSourceObject.disguise, enchantSourceObject.enemyVisible, xyToName(enchantSource.x, enchantSource.y), xyToName(enchantTarget.x, enchantTarget.y), enchantSourceObject.enemyVisibleStatus, "🎶"]);
            game.soloRevealed = true;
            return false;
        break;
        case "Demonize":
        case "Vampire":
            let demonizeTarget = { x: position[0], y: position[1] };
            let demonizeSource = { x: abilityPieceLocation[0], y: abilityPieceLocation[1] };
            let demonizeSourceObject = game.state[demonizeSource.y][demonizeSource.x];
            game.state[demonizeTarget.y][demonizeTarget.x].demonized = true;
            game.state[demonizeTarget.y][demonizeTarget.x].soloEffect = true;
            game.state[demonizeSource.y][demonizeSource.x].stay = true;
            game.state[demonizeSource.y][demonizeSource.x].enemyVisibleStatus = 7;
            if(log) gameHistory.lastMoves.push([game.turn, demonizeSourceObject.name, demonizeSourceObject.disguise, demonizeSourceObject.enemyVisible, xyToName(demonizeSource.x, demonizeSource.y), xyToName(demonizeTarget.x, demonizeTarget.y), demonizeSourceObject.enemyVisibleStatus, "🧛"]);
            game.soloRevealed = true;
            return false;
        break;
        case "Infect":
        case "Infecting Wolf":
            let iwSource = { x: abilityPieceLocation[0], y: abilityPieceLocation[1] };
            let iwTarget = { x: position[0], y: position[1] };
            let iwTargetName = xyToName(iwTarget.x, iwTarget.y);
            if(log) gameHistory.lastMoves.push([game.turn, game.state[iwTarget.y][iwTarget.x].name, false, "", iwTargetName, iwTargetName, 7, "🔀" + findEmoji("Wolf") + "🟦"]);
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
        case "TransformReveal":
        case "Bloody Butcher":
            let transformer2 = { x: abilityPieceLocation[0], y: abilityPieceLocation[1] };
            let transformer2Name = xyToName(abilityPieceLocation[0], abilityPieceLocation[1]);
            game.state[transformer2.y][transformer2.x] = convertPiece(game.state[transformer2.y][transformer2.x], position);
            game.state[transformer2.y][transformer2.x].enemyVisibleStatus = 7;
            if(log) gameHistory.lastMoves.push([game.turn, game.state[transformer2.y][transformer2.x].name, false, "", transformer2Name, transformer2Name, 7, "❕🟦🟦"]);
            return false;
        break;
        case "CreateFireball":
        case "Ghast":
            let creator = { x: abilityPieceLocation[0], y: abilityPieceLocation[1] };
            game.state[creator.y][creator.x].stay = true;
            game.state[creator.y][creator.x].enemyVisibleStatus = 7;
            game.soloRevealed = true;
            if(position == "down" && (creator.y + 1) < game.height) {
                let creatorName = xyToName(abilityPieceLocation[0], abilityPieceLocation[1] + 1);
                //console.log("Create Fireball Down");
                game.state[creator.y + 1][creator.x] = getPiece("FireballDown");
                game.state[creator.y + 1][creator.x].enemyVisibleStatus = 7;
                if(log) gameHistory.lastMoves.push([game.turn, game.state[creator.y + 1][creator.x].name, false, "", creatorName, creatorName, 7, "❕🟦🟦"]);
                return true;
            } else if(position == "up" && (creator.y - 1) >= 0) {
                let creatorName = xyToName(abilityPieceLocation[0], abilityPieceLocation[1] - 1);
                //console.log("Create Fireball Up");
                game.state[creator.y - 1][creator.x] = getPiece("FireballUp");
                game.state[creator.y - 1][creator.x].enemyVisibleStatus = 7;
                if(log) gameHistory.lastMoves.push([game.turn, game.state[creator.y - 1][creator.x].name, false, "", creatorName, creatorName, 7, "❕🟦🟦"]);
                return true;
            } else {
                return false;
            }
        break;
        case "Teleport":
        case "FireballUp":
        case "FireballDown":
            let teleportSubject = { x: abilityPieceLocation[0], y: abilityPieceLocation[1] };
            let teleportDestination = { x: position[0], y: position[1] };
            let teleportSubjectObject = game.state[teleportSubject.y][teleportSubject.x];
            game.state[teleportDestination.y][teleportDestination.x] = shallowCopy(teleportSubjectObject);
            game.state[teleportSubject.y][teleportSubject.x] = getPiece(null);
            if(log) gameHistory.lastMoves.push([game.turn, teleportSubjectObject.name, teleportSubjectObject.disguise, teleportSubjectObject.enemyVisible, xyToName(abilityPieceLocation[0], abilityPieceLocation[1]), xyToName(position[0], position[1]), teleportSubjectObject.enemyVisibleStatus, "↕️"]);
            return true;
        break;
        case "Destroy":
        case "Horseman of Death":
            let deathSubject = { x: abilityPieceLocation[0], y: abilityPieceLocation[1] };
            let deathDestination = { x: position[0], y: position[1] };
            let deathSubjectObject = game.state[deathSubject.y][deathSubject.x];
            if(log) gameHistory.lastMoves.push([game.turn, deathSubjectObject.name, deathSubjectObject.disguise, deathSubjectObject.enemyVisible, xyToName(abilityPieceLocation[0], abilityPieceLocation[1]), xyToName(position[0], position[1]), deathSubjectObject.enemyVisibleStatus, "☠️"]);
            game.state[deathDestination.y][deathDestination.x] = getPiece(null)
            return true;
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
            let investTargetObject = game.state[investTarget.y][investTarget.x];
            let investSuccess = false;
            switch(investigator.name) {
                // reveal role
                case "Fortune Teller":
                case "Warlock":
                case "Clairvoyant Fox":
                    if(investTargetObject.disguise) {
                        if(investTargetObject.enemyVisibleStatus < 6) investSuccess = true;
                        investTargetObject.enemyVisibleStatus = 6;
                    } else {
                        if(investTargetObject.enemyVisibleStatus < 7) investSuccess = true;
                        investTargetObject.enemyVisibleStatus = 7;
                    }
                break;
                // reveal movement type
                case "Crowd Seeker":
                case "Psychic Wolf":
                case "Archivist Fox":
                    if(investTargetObject.enemyVisibleStatus < 4) investSuccess = true;
                    investTargetObject.enemyVisibleStatus = 4;
                    if(investTargetObject.disguise) {
                        let dChess = getChessName(investTargetObject.disguise);
                        if(investTargetObject.enemyVisible != dChess) investSuccess = true;
                        investTargetObject.enemyVisible = dChess;
                    } else {
                        if(investTargetObject.enemyVisible != investTargetObject.chess) investSuccess = true;
                        investTargetObject.enemyVisible = investTargetObject.chess;
                    }
                break;
                // reveal movement type if active
                case "Aura Teller":
                    if(investTargetObject.active) {
                        if(investTargetObject.enemyVisibleStatus < 5) investSuccess = true;
                        investTargetObject.enemyVisibleStatus = 5;
                        investTargetObject.atChecked = 5;
                        if(investTargetObject.disguise) {
                            let dChess = getChessName(investTargetObject.disguise);
                            if(investTargetObject.enemyVisible != "Active"+dChess) investSuccess = true;
                            investTargetObject.enemyVisible = "Active" + dChess;
                        } else {
                            if(investTargetObject.enemyVisible != "Active" + investTargetObject.chess) investSuccess = true;
                            investTargetObject.enemyVisible = "Active" + investTargetObject.chess;
                        }
                    }
                break;
            }
            if(investTargetObject.name == "Recluse" || investTargetObject.name == "Bard") { // recluse reveal
                investSuccess = true;
                if(log) gameHistory.lastMoves.push([game.turn, investigator.name, false, "", xyToName(investigatorC.x, investigatorC.y), xyToName(investTarget.x, investTarget.y), 7, "👁️"]);
                investigator.enemyVisibleStatus = 7;
                investTargetObject.enemyVisibleStatus = 7;
            } else {
                if(log && investSuccess) {
                    gameHistory.lastMoves.push([game.turn, investTargetObject.name, investTargetObject.disguise, investTargetObject.enemyVisible, xyToName(investTarget.x, investTarget.y), xyToName(investTarget.x, investTarget.y), investTargetObject.enemyVisibleStatus, "👁️🟦🟦"]);
                }
            }
            return false;
        break;
    }
    return false;
}

/**
getDefensivePosition
Returns the position a piece should be placed at when it hits a defensive piece and thus cannot move to the intended position
**/
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

/**
pieceDied
Runs whenever a piece dies
**/
function pieceDied(game, piece, locName, fromLocName, attackingPiece) {
    if(!game.ai) console.log("TOOK", piece.name);
    
    // Apprentice: Promotion
    if(game.soloTeam == "Apprentice" && !game.ai && piece.name != "Apprentice") {
        game.soloTeam = "ApprenticeUsed";
        let apprentice = null;
        let appx = null, appy = null;
        for(let y = 0; y < game.height; y++) {
            for(let x = 0; x < game.width; x++) {
                let xyPiece = game.state[y][x];
                if(xyPiece.name == "Apprentice") {
                    apprentice = shallowCopy(xyPiece);
                    appx = x;
                    appy = y;
                }
            }
        }
        if(apprentice) {
            if(!game.ai) gamesHistory[game.id].lastMoves.push([2, apprentice.name, apprentice.name, 7, xyToName(appx, appy), xyToName(appx, appy), 7, "⏫🟦🟦"]);
            game.state[appy][appx] = getPiece(piece.name);
        }
    }
    
    // Underworld: Demonized piece -> Undead
    if(game.soloTeam == "Underworld" && piece.demonized) {
        if(!game.ai) gamesHistory[game.id].lastMoves.push([game.turn, piece.name, piece.name, 7, locName, locName, 7, "🔀" + findEmoji("Undead") + "🟦"]);
        let locXY = nameToXY(locName);
        let loc2XY = nameToXY(fromLocName);
        game.state[loc2XY.y][loc2XY.x] = shallowCopy(attackingPiece);
        game.state[locXY.y][locXY.x] = getPiece("Undead");
        game.state[locXY.y][locXY.x].enemyVisibleStatus = 7;
    }
    
    // Graveyard: Zombie conversion
    if(game.soloTeam == "Graveyard") {
        if(attackingPiece.name == "Zombie" || attackingPiece.name == "Zombie2" || attackingPiece.name == "Zombie3" || attackingPiece.name == "Zombie4" || attackingPiece.name == "Zombie5") { // zombie overwrites death effects
            let moveTo = nameToXY(locName);
            defensive = getDefensivePosition(nameToXY(fromLocName), moveTo, 0, 0);
            game.state[defensive.y][defensive.x] = attackingPiece;
            attackingPiece.zombieChildCount++;
            // turn piece
            let nextZombie = "Zombie";
            switch(attackingPiece.name) {
                case "Zombie": nextZombie = "Zombie2"; break;
                case "Zombie2": nextZombie = "Zombie3"; break;
                case "Zombie3": nextZombie = "Zombie4"; break;
                default: case "Zombie4": nextZombie = "Zombie5"; break;
            }
            
            game.state[moveTo.y][moveTo.x] = getPiece(nextZombie);
            game.state[moveTo.y][moveTo.x].zombieID = attackingPiece.zombieID + "" + attackingPiece.zombieChildCount;
            game.state[moveTo.y][moveTo.x].zombieParent = attackingPiece.zombieID;
            game.state[moveTo.y][moveTo.x].protected = false;
            if(!game.ai) gamesHistory[game.id].lastMoves.push([game.turn, attackingPiece.name, false, "", locName, locName, 7, "🔀" + findEmoji(nextZombie) + "🟦"]);
            // reveal zombie
            attackingPiece.enemyVisibleStatus = 7;
            game.state[moveTo.y][moveTo.x].enemyVisibleStatus = 7;
        }
    }
    
}


/**
learnPieceInfo
Learns more about a piece based on its movement
**/
function learnPieceInfo(mEVS, movedPiece, movedX, movedY, mDis, mDisChess, p1Turn, p2Turn, p3Turn, movedYorig, beatenPiece, beaten) {
 // an impossible move was done
    if(mEVS <= 5 && (movedPiece.enemyVisible == "Knight" || movedPiece.enemyVisible == "ActiveKnight") && ((movedY != 1 && movedX != 2) && (movedY != 2 && movedX != 1))) { // was disguised
        movedPiece.enemyVisibleStatus = 0;
        movedPiece.enemyVisible = "Unknown";
    } else if(mEVS <= 5 && (movedPiece.enemyVisible == "Rook" || movedPiece.enemyVisible == "ActiveRook") && movedY >= 1 && movedX >= 1) { // was disguised
        movedPiece.enemyVisibleStatus = 4;
        movedPiece.enemyVisible = "Queen";
    }

    // definitely a knight
    if(mEVS < 3 && ((movedY == 1 && movedX == 2) || (movedY == 2 && movedX == 1))) {
        if(movedPiece.team == 0 && !movedPiece.hasMoved) { // white knights may be amnesiacs
            movedPiece.enemyVisibleStatus = 0;
            movedPiece.enemyVisible = "LikelyKnight";  
        } else {
            movedPiece.enemyVisibleStatus = 4;
            movedPiece.enemyVisible = "Knight";
        }
    } else if((mEVS == 4 || mEVS == 5) && ((movedY == 1 && movedX == 2) || (movedY == 2 && movedX == 1))) { // turned into knight
        movedPiece.enemyVisibleStatus = 4;
        movedPiece.enemyVisible = "Knight";
    }
    
    if(mEVS <= 6 && ((movedY == 1 && movedX == 2) || (movedY == 2 && movedX == 1)) && mDis && mDisChess != "Knight") { // was disguised
        movedPiece.enemyVisibleStatus = 4;
        movedPiece.enemyVisible = "Knight";
    }
    // pawn condition
    else if(mEVS < 1 && p1Turn && movedYorig == 1 && movedX == 0 && beatenPiece.name == null) { // white pawn move
        movedPiece.enemyVisibleStatus = 1;
        movedPiece.enemyVisible = "LikelyPawn";
    } else if((mEVS < 1 || (mEVS <= 6 && mDis && mDisChess == "Rook")) && p1Turn && movedYorig == 1 && movedX == 1 && beaten) { // white pawn beat
        movedPiece.enemyVisibleStatus = 1;
        movedPiece.enemyVisible = "LikelyPawn";
    } else if(mEVS < 1 && p2Turn && movedYorig == -1 && movedX == 0 && beatenPiece.name == null) { // black pawn move
        movedPiece.enemyVisibleStatus = 1;
        movedPiece.enemyVisible = "LikelyPawn";
    } else if((mEVS < 1 || (mEVS <= 6 && mDis && mDisChess == "Rook")) && p2Turn && movedYorig == -1 && movedX == 1 && beaten) { // black pawn beat
        movedPiece.enemyVisibleStatus = 1;
        movedPiece.enemyVisible = "LikelyPawn";
    } else if(mEVS < 1 && p3Turn && movedY == 1 && movedX == 0 && beatenPiece.name == null) { // gold pawn move
        movedPiece.enemyVisibleStatus = 1;
        movedPiece.enemyVisible = "LikelyPawn";
    } else if((mEVS < 1 || (mEVS <= 6 && mDis && mDisChess == "Rook")) && p3Turn && movedY == 1 && movedX == 1 && beaten) { // gold pawn beat
        movedPiece.enemyVisibleStatus = 1;
        movedPiece.enemyVisible = "LikelyPawn";
    }
    // king condition
    else if((mEVS < 2 || (mEVS <= 6 && mDis && (mDisChess != "Rook" || mDisChess != "Queen" || mDisChess != "King"))) && movedY == 0 && movedX == 1) { // rook like move (left/right)
        movedPiece.enemyVisibleStatus = 2;
        movedPiece.enemyVisible = "LikelyKing";
    } else if((mEVS < 2 || (mEVS <= 6 && mDis && (mDisChess != "Rook" || mDisChess != "Queen" || mDisChess != "King"))) && ((p1Turn && movedYorig == -1) || (p2Turn && movedYorig == 1))  && (movedX == 0 || movedX == 1)) { // rook like move (down, side down)
        movedPiece.enemyVisibleStatus = 2;
        movedPiece.enemyVisible = "LikelyKing";
    } else if((mEVS < 2 || (mEVS <= 6 && mDis && (mDisChess != "Rook" || mDisChess != "Queen" || mDisChess != "King"))) && ((p1Turn && movedYorig == 1) || (p2Turn && movedYorig == -1))  && movedX == 0 && beaten) { // rook like move (up)
        movedPiece.enemyVisibleStatus = 2;
        movedPiece.enemyVisible = "LikelyKing";
    } else if((mEVS < 2 || (mEVS <= 6 && mDis && (mDisChess != "Queen" || mDisChess != "King"))) && ((p1Turn && movedYorig == 1) || (p2Turn && movedYorig == -1))  && movedX == 1 && beatenPiece.name == null) { // king like move (side up)
        movedPiece.enemyVisibleStatus = 2;
        movedPiece.enemyVisible = "LikelyKing";
    } else if((mEVS < 2 || (mEVS <= 6 && mDis && (mDisChess != "Queen" || mDisChess != "King"))) && p3Turn  && movedX == 1 && movedY == 1 && beatenPiece.name == null) { // king like move (diagonal)
        movedPiece.enemyVisibleStatus = 2;
        movedPiece.enemyVisible = "LikelyKing";
    }
    // rook condition
    else if((mEVS < 3 || (mEVS <= 6 && mDis && (mDisChess != "Rook" || mDisChess != "Queen"))) && ((movedY > 1 && movedX == 0) || (movedY == 0 && movedX > 1))) {
        movedPiece.enemyVisibleStatus = 3;
        movedPiece.enemyVisible = "LikelyRook";
    }
    // queen condition
    else if((mEVS < 4 || (mEVS <= 6 && mDis && mDisChess != "Queen")) && (movedY > 1 || movedX > 1) && movedY > 1 && movedX > 1) {
        movedPiece.enemyVisibleStatus = 4;
        movedPiece.enemyVisible = "Queen";
    }
}

/**
pieceBeatenEffects
Effects for when a piece is beaten
**/
function pieceBeatenEffects(movedPiece, beatenPiece, moveCurGame, moveCurGameHistory, from, to, moveFrom, moveTo, movedX, movedY, defensive, notAiTurn) {
    let usedDefensive = false;
    
    if(notAiTurn || beatenPiece.team == moveCurGame.turn || beatenPiece.enemyVisibleStatus >= 6) { // only run in normal turns, ai's own turns or when effect is visible
        if(!notAiTurn && beatenPiece.team != moveCurGame.turn && beatenPiece.enemyVisibleStatus == 6 && beatenPiece.disguise) beatenPiece.name = beatenPiece.disguise; // see role with disguise if applicable
        
        if(beatenPiece.protected && notAiTurn) { // protected (Witch)
            //if(notAiTurn) console.log(beatenPiece);
            if(notAiTurn) {
                moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, xyToName(defensive.x, defensive.y), movedPiece.enemyVisibleStatus]);
                moveCurGameHistory.lastMoves.push([beatenPiece.protectedBy, beatenPiece.name, beatenPiece.disguise, beatenPiece.enemyVisible, to, to, beatenPiece.enemyVisibleStatus, "🛡️🟦🟦"]);
            }
            moveCurGame.state[defensive.y][defensive.x] = movedPiece;
            moveCurGame.state[moveTo.y][moveTo.x] = shallowCopy(beatenPiece);
            beatenPiece.name = "protected";
            usedDefensive = true;
        } 
        
        switch(beatenPiece.name) {
            case "protected":
                // nothing
            break;
            case null:
                if(from == to) { // pawn promotion
                    if(notAiTurn && movedPiece.team != 2) moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisibleStatus<4?"Pawn":movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus<4?4:movedPiece.enemyVisibleStatus, "⏫🟦🟦"]); // black/white -> promotion
                    if(notAiTurn && movedPiece.team == 2) moveCurGame.doNotSerialize = true; // gold -> piece chose not to move
                } else if(notAiTurn) { 
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus]);
                }
            break;
            default:
                // store move
                if(notAiTurn) {
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                }
                pieceDied(moveCurGame, beatenPiece, to, from, movedPiece);
            break; // Hooker defense
            case "Hooker":
            case "Bat":
                if(beatenPiece.hidden) {
                    if(notAiTurn) {
                        moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, xyToName(defensive.x, defensive.y), movedPiece.enemyVisibleStatus]);
                        moveCurGameHistory.lastMoves.push([beatenPiece.team, beatenPiece.name, false, "", to, to, 7, "🛡️🟦🟦"]);
                    }
                    moveCurGame.state[defensive.y][defensive.x] = movedPiece;
                    moveCurGame.state[moveTo.y][moveTo.x] = beatenPiece;
                    moveCurGame.state[moveTo.y][moveTo.x].enemyVisibleStatus = 7;
                    usedDefensive = true;
                } else if(notAiTurn) { 
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                    pieceDied(moveCurGame, beatenPiece, to, from, movedPiece);
                }
            break;
            case "Ranger":
                if(movedPiece.disguise) {
                    movedPiece.enemyVisibleStatus = 6;
                    if(notAiTurn) {
                        moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                        moveCurGameHistory.lastMoves.push([0, "Ranger", false, "", to, to, 6, "👁️" + findEmoji(movedPiece.disguise) + "🟦"]);
                    }
                    pieceDied(moveCurGame, beatenPiece, to, from, movedPiece);
                } else {
                    movedPiece.enemyVisibleStatus = 7;
                    if(notAiTurn) {
                        moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                        moveCurGameHistory.lastMoves.push([0, "Ranger", false, "", to, to, 7, "👁️" + findEmoji(movedPiece.name) + "🟦"]);
                    }
                    pieceDied(moveCurGame, beatenPiece, to, from, movedPiece);
                }
            break;
            case "Angry Bear":
            case "Angel":
                if(notAiTurn && !moveCurGame.goldEliminated) {
                    if(moveCurGame.players[2]) sendMessage(moveCurGame.id, "**Ascension:** <@" + moveCurGame.players[2] + "> ascends and wins!");
                    else sendMessage(moveCurGame.id, "**Ascension:** " + moveCurGame.playerNames[2] + " ascends and wins! The game continues.");
                    winRewardEvaluate(moveCurGame, moveCurGame.players[2]);
                    console.log("ASCEND GOLD");
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                    moveCurGameHistory.lastMoves.push([beatenPiece.team, beatenPiece.name, false, "", to, from, 7, "⬆️🏅🟦"]);
                }
                if(!moveCurGame.goldEliminated) {
                    pieceDied(moveCurGame, beatenPiece, to, from, movedPiece);
                }
                moveCurGame.goldEliminated = true;
                if(!moveCurGame.goldEliminated) moveCurGame.goldAscended = true; //cannot win while eliminated
                moveCurGame.state[moveTo.y][moveTo.x] = getPiece(null);
            break;
            case "Bear":
                if(notAiTurn) {
                    moveCurGameHistory.lastMoves.push([beatenPiece.team, beatenPiece.name, false, "", to, from, 7, "🇽​"]);
                } 
                moveCurGame.state[moveTo.y][moveTo.x] = getPiece("Angry Bear");
            break;
            case "Zombie":
            case "Zombie2":
            case "Zombie3":
            case "Zombie4":
            case "Zombie5":
                // if a zombie dies, so do its children
                if(notAiTurn) {
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                }
                let zombieHandeled = [];
                let zombieParents = [beatenPiece.zombieID];
                let zCount = 0;
                while(zCount < zombieParents.length && zCount < 20) {
                    for(let y = 0; y < moveCurGame.height; y++) {
                        for(let x = 0; x < moveCurGame.width; x++) {
                            let xyPiece = moveCurGame.state[y][x];
                            //console.log("ZOMBIE DEATH", notAiTurn, xyPiece.name, xyPiece.zombieParent, beatenPiece.zombieID);
                            if((xyPiece.name == "Zombie" || xyPiece.name == "Zombie2" || xyPiece.name == "Zombie3" || xyPiece.name == "Zombie4" || xyPiece.name == "Zombie5") && xyPiece.zombieParent == zombieParents[zCount]) {
                                zombieParents.push(xyPiece.zombieID);
                                moveCurGame.state[y][x] = getPiece(null);
                                if(notAiTurn) {
                                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, beatenPiece.name, false, "", to, xyToName(x, y), 7, "🇽​"]);
                                }
                            }
                        }
                    }
                    zCount++;
                }
            break;
            case "Huntress":
                if(notAiTurn) {
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                    moveCurGameHistory.lastMoves.push([beatenPiece.team, beatenPiece.name, false, "", to, from, 7, "🇽​"]);
                } 
                moveCurGame.state[moveTo.y][moveTo.x] = getPiece(null);
                pieceDied(moveCurGame, beatenPiece, to, from, movedPiece);
            break;
            // Extra Move Pieces
            case "Child":
                if(notAiTurn && !moveCurGame.whiteEliminated) {
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                    moveCurGameHistory.lastMoves.push([beatenPiece.team, beatenPiece.name, false, "", to, to, 7, "🟦" + "2️⃣" + "🇽"]);
                }
                pieceDied(moveCurGame, beatenPiece, to, from, movedPiece);
                moveCurGame.doubleMove0 = true;
            break;
            case "Wolf Cub":
                if(notAiTurn && !moveCurGame.blackEliminated) {
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                    moveCurGameHistory.lastMoves.push([beatenPiece.team, beatenPiece.name, false, "", to, to, 7, "🟦" + "2️⃣" + "🇽"]);
                }
                pieceDied(moveCurGame, beatenPiece, to, from, movedPiece);
                moveCurGame.doubleMove1 = true;
            break;
            // Fortune Apprentice
            case "Fortune Teller":
            case "Aura Teller":
            case "Crowd Seeker":
                if(notAiTurn) {
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                }
                pieceDied(moveCurGame, beatenPiece, to, from, movedPiece);
                for(let y = 0; y < moveCurGame.height; y++) {
                    for(let x = 0; x < moveCurGame.width; x++) {
                        let xyPiece = moveCurGame.state[y][x];
                        if(xyPiece.name == "Fortune Apprentice") {
                            moveCurGame.state[y][x] = convertPiece(moveCurGame.state[y][x], beatenPiece.name);
                        }
                    }
                }
            break;
            // Defensive Pieces, Single Defense
            case "Runner":
            case "Idiot":
            case "Scared Wolf":
                if(notAiTurn) {
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, xyToName(defensive.x, defensive.y), movedPiece.enemyVisibleStatus]);
                    moveCurGameHistory.lastMoves.push([beatenPiece.team, beatenPiece.name, false, "", to, to, 7, "🛡️🟦🟦"]);
                }
                moveCurGame.state[defensive.y][defensive.x] = movedPiece;
                moveCurGame.state[moveTo.y][moveTo.x] = getPiece("Attacked " + beatenPiece.name);
                moveCurGame.state[moveTo.y][moveTo.x].enemyVisibleStatus = 7;
                usedDefensive = true;
            break;
            case "Cursed Civilian":
                if(notAiTurn) {
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, xyToName(defensive.x, defensive.y), movedPiece.enemyVisibleStatus]);
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, beatenPiece.name, false, "", to, to, 7, "🔀" + findEmoji("Wolf") + "🟦"]);
                }
                moveCurGame.state[defensive.y][defensive.x] = movedPiece;
                moveCurGame.state[moveTo.y][moveTo.x] = getPiece("Wolf");
                moveCurGame.state[moveTo.y][moveTo.x].enemyVisibleStatus = 7;
                usedDefensive = true;
            break;
            case "Vampire":
            case "Empowered Vampire":
            case "Apprentice Vampire":
                if(notAiTurn) {
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, xyToName(defensive.x, defensive.y), movedPiece.enemyVisibleStatus]);
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, beatenPiece.name, false, "", to, to, 7, "🔀" + findEmoji("Undead") + "🟦"]);
                }
                moveCurGame.state[defensive.y][defensive.x] = movedPiece;
                moveCurGame.state[moveTo.y][moveTo.x] = getPiece("Undead");
                moveCurGame.state[moveTo.y][moveTo.x].enemyVisibleStatus = 7;
                usedDefensive = true;
                
                // Underworld: Promote Apprentice Vampire
                if(beatenPiece.name == "Vampire") {
                    let vamp = null;
                    let appx = null, appy = null;
                    for(let y = 0; y < moveCurGame.height; y++) {
                        for(let x = 0; x < moveCurGame.width; x++) {
                            let xyPiece = moveCurGame.state[y][x];
                            if(xyPiece.name == "Vampire Apprentice") {
                                vamp = shallowCopy(xyPiece);
                                appx = x;
                                appy = y;
                            }
                        }
                    }
                    if(vamp) {
                        moveCurGameHistory.lastMoves.push([2, vamp.name, vamp.name, 7, xyToName(appx, appy), xyToName(appx, appy), 7, "⏫🟦🟦"]);
                        moveCurGame.state[appy][appx] = getPiece("Vampire");
                    }
                }
                
            break;
            case "Alcoholic":
                let bartenderAlive = false;
                for(let y = 0; y < moveCurGame.height; y++) {
                    for(let x = 0; x < moveCurGame.width; x++) {
                        let xyPiece = moveCurGame.state[y][x];
                        if(xyPiece.name == "Bartender") {
                            bartenderAlive = true;
                        }
                    }
                }
                if(bartenderAlive) {
                    if(notAiTurn) {
                        moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, xyToName(defensive.x, defensive.y), movedPiece.enemyVisibleStatus]);
                        moveCurGameHistory.lastMoves.push([beatenPiece.team, beatenPiece.name, false, "", to, to, 7, "🛡️🟦🟦"]);
                    }
                    moveCurGame.state[defensive.y][defensive.x] = movedPiece;
                    moveCurGame.state[moveTo.y][moveTo.x] = beatenPiece;
                    moveCurGame.state[moveTo.y][moveTo.x].enemyVisibleStatus = 7;
                    usedDefensive = true;
                } else {
                    if(notAiTurn) {
                        moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus]);
                    }
                    pieceDied(moveCurGame, beatenPiece, to, from, movedPiece);
                }
            break;
        }
    }
    
    return usedDefensive;
}

/**
movePiece
moves a piece from one place to another (and/or replaces the piece with another piece)
 **/
function movePiece(moveCurGame, from, to, repl = null) {
    // a move has been done
    moveCurGame.firstMove = true;
    // is ai fake turn
    const notAiTurn = !moveCurGame.ai;
    // get history
    let moveCurGameHistory = null;
    if(notAiTurn) moveCurGameHistory = gamesHistory[moveCurGame.id];
    // get coords
    let moveFrom = nameToXY(from);
    let moveTo = nameToXY(to);
            
    // move piece
    let movedPieceCopy = shallowCopy(moveCurGame.state[moveFrom.y][moveFrom.x]);
    let movedPiece = shallowCopy(moveCurGame.state[moveFrom.y][moveFrom.x]);
    let beatenPiece = shallowCopy(moveCurGame.state[moveTo.y][moveTo.x]);
    if(repl) movedPiece = repl; // replace piece for promotion
    moveCurGame.state[moveFrom.y][moveFrom.x] = getPiece(null);
    moveCurGame.state[moveTo.y][moveTo.x] = movedPiece;
    
    moveCurGame.prevMove = movedPiece.team; // store who did the last move
    
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
    //if(notAiTurn) console.log("MOVED", movedPiece.name, movedXorig, movedYorig, beatenPiece.name?beatenPiece.name:"");
    //console.log("status", movedPiece.enemyVisibleStatus);
    const mEVS = movedPiece.enemyVisibleStatus;
    const mDis = movedPiece.disguise;
    const mDisChess = getChessName(mDis);
    const p1Turn = moveCurGame.turn === 0;
    const p2Turn = moveCurGame.turn === 1;
    const p3Turn = moveCurGame.turn === 2;
    const beaten = beatenPiece.name != null;
    
    if(notAiTurn) {
        if(beaten) moveCurGameHistory.sinceCapture = 0;
        else moveCurGameHistory.sinceCapture++;
    }
    
    // leanrs more info about a piece based on its movement
    if(mEVS < 7) { 
       learnPieceInfo(mEVS, movedPiece, movedX, movedY, mDis, mDisChess, p1Turn, p2Turn, p3Turn, movedYorig, beatenPiece, beaten);
    }
    
    // store that piece has moved
    movedPiece.hasMoved = true;
    
    
    if(from == to) beatenPiece = getPiece(null); // promotion is not taking
    
    let defensive = getDefensivePosition(moveFrom, moveTo, movedX, movedY);
    // death effects
    let defensiveUsed = pieceBeatenEffects(movedPiece, beatenPiece, moveCurGame, moveCurGameHistory, from, to, moveFrom, moveTo, movedX, movedY, defensive, notAiTurn);
    if(!defensiveUsed) {
        defensive = moveTo;
    }
    
    
    // Hooker death check
    if(notAiTurn || beatenPiece.team == moveCurGame.turn || movedPiece.enemyVisibleStatus >= 6) { // only run in normal turns, ai's own turns or when effect is visible
        for(let y = 0; y < moveCurGame.height; y++) {
            for(let x = 0; x < moveCurGame.width; x++) {
                let xyPiece = moveCurGame.state[y][x];
                if(xyPiece.hidden == to) {
                    moveCurGame.state[y][x] = getPiece(null);
                    if(notAiTurn) {
                        moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽" + findEmoji(xyPiece.name) + "🟦"]);
                    }
                    pieceDied(moveCurGame, xyPiece, xyToName(x, y), xyToName(x, y), xyPiece);
                }
            }
        }
    }
    
    // packless wolf transformation (also gets val for DW)
    let wolfCount = 0;
    for(let y = 0; y < moveCurGame.height; y++) {
        for(let x = 0; x < moveCurGame.width; x++) {
            let xyPiece = moveCurGame.state[y][x];
            if(xyPiece.team == 1) {
                wolfCount++;
            }
        }
    }
    if(wolfCount == 1) {
        for(let y = 0; y < moveCurGame.height; y++) {
            for(let x = 0; x < moveCurGame.width; x++) {
                let xyPiece = moveCurGame.state[y][x];
                if(xyPiece.name == "Packless Wolf") {
                    moveCurGame.state[y][x] = convertPiece(moveCurGame.state[y][x], "Wolf");
                }
            }
        }
    }
    
    // move effects
    if(notAiTurn || beatenPiece.team == moveCurGame.turn || movedPiece.enemyVisibleStatus >= 6) { // only run in normal turns, ai's own turns or when effect is visible
        if(!notAiTurn && beatenPiece.team != moveCurGame.turn && movedPiece.enemyVisibleStatus == 6 && movedPiece.disguise) movedPiece.name = movedPiece.disguise; // see role with disguise if applicable
        switch(movedPiece.name) {
            case "Amnesiac": // Amnesiac -> Change role after onhe move
            if(from != to) { // dont convert on promotion
                 if(!moveCurGame.ai) console.log("AMNESIAC CHANGE", movedPiece.convertTo);
                 moveCurGame.state[defensive.y][defensive.x] = convertPiece(movedPiece, movedPiece.convertTo);
            }
            break;
            case "Direwolf": // Direwolf -> Double move if last piece
                if(wolfCount == 1 && !moveCurGame.inDoubleMove) {
                moveCurGame.doubleMove1 = true;
                movedPiece.enemyVisibleStatus = 7;
            }
            break;
        }
        moveCurGame.inDoubleMove = false;
    }
    
    // mark solo as revealed if applicable
    if(p3Turn && movedPiece.enemyVisibleStatus >= 6) {
        moveCurGame.soloRevealed = true;
    }
    
    // promote?
    if(movedPiece.chess == "Pawn" && p1Turn && (defensive&&defensive.y?defensive.y==0:moveTo.y == 0)) {
        
        if(moveCurGame.mode == "pawnford" || moveCurGame.mode == "pawnford_big") {
            for(let y = 0; y < moveCurGame.height; y++) {
                for(let x = 0; x < moveCurGame.width; x++) {
                    let xyPiece = moveCurGame.state[y][x];
                    if(xyPiece.team == 1) {
                        moveCurGame.state[y][x] = getPiece(null);
                    }
                }
            }
        }
        
        if(notAiTurn && moveCurGame.players[0] != null) {  // handle user interaction promotion outside
            return { action: "promote_white", piece: movedPiece, to: to };
        } else { // 
            let randomOptions = ["Hooker","Royal Knight","Fortune Teller","Runner","Witch"];
            if(movedPiece.name == "White Pawn") {
                randomOptions = ["White Rook", "White Rook", "White Knight", "White King"];
            }
            let promoteTo = getPiece(randomOptions[Math.floor(Math.random() * randomOptions.length)]);
            if(!moveCurGame.ai) console.log("PROMOTE TO", promoteTo.name);
            return movePiece(moveCurGame, to, to, promoteTo);
        }
    } else if(movedPiece.chess == "Pawn" && movedPiece.name != "Revealed Bloody Butcher" && p2Turn && (defensive&&defensive.y?defensive.y==moveCurGame.height-1:moveTo.y == moveCurGame.height-1)) {
        
        if(moveCurGame.mode == "pawnford" || moveCurGame.mode == "pawnford_big") {
            for(let y = 0; y < moveCurGame.height; y++) {
                for(let x = 0; x < moveCurGame.width; x++) {
                    let xyPiece = moveCurGame.state[y][x];
                    if(xyPiece.team == 0) {
                        moveCurGame.state[y][x] = getPiece(null);
                    }
                }
            }
        }
        
        
        if(notAiTurn && moveCurGame.players[1] != null) {
            return { action: "promote_black", piece: movedPiece, to: to };
        } else {
            let randomOptions = ["Alpha Wolf","Direwolf","Warlock","Scared Wolf","Saboteur Wolf"];
            if(movedPiece.name == "Black Pawn") {
                randomOptions = ["Black Rook", "Black Rook", "Black Knight", "Black King"];
            }
            let promoteTo = getPiece(randomOptions[Math.floor(Math.random() * randomOptions.length)]);
            if(!moveCurGame.ai) console.log("PROMOTE TO", promoteTo.name);
            return movePiece(moveCurGame, to, to, promoteTo);
        }
    } else {
        // turn complete
        return { action: "turn_done" };
    }
}

/**
turnDone
Runs at the end of a turn and does draw checks
**/
function turnDone(game, message) {
    // serialize and store state
    if(!game.doNotSerialize) {
        gamesHistory[game.id].history.push(serialize(game.turn, game.state));
    } else {
        game.doNotSerialize = false;
    }
    // check for draw by triplicate (threefold repetition)
    let findDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) != index)
    let triplicates = findDuplicates(findDuplicates(gamesHistory[game.id].history));
    let triplicateDraw = triplicates.length > 0;
    
    // check for draw by no captures x30 (50 move rule)
    let captureDraw = gamesHistory[game.id].sinceCapture >= 30;

    if(triplicateDraw || captureDraw) {
        
        // only still living players draw
        let drawPlayers = [];
        if(!game.solo || (game.solo && !game.whiteEliminated)) {
            if(game.players[0]) drawPlayers.push("<@" + game.players[0] + ">");
            else drawPlayers.push(game.playerNames[0]);
        }
        if(!game.solo || (game.solo && !game.blackEliminated)) {
            if(game.players[1]) drawPlayers.push("<@" + game.players[1] + ">");
            else drawPlayers.push(game.playerNames[1]);
        }
        if(game.solo && !game.goldEliminated && !game.goldAscended) {
            if(game.players[2]) drawPlayers.push("<@" + game.players[2] + ">");
            else drawPlayers.push(game.playerNames[2]);
        }
        
        // message
        let drawMessage = [];
        if(triplicateDraw) drawMessage.push("Triplicated Position");
        if(captureDraw) drawMessage.push("30-Moves & No Captures");
        if(drawPlayers.length == 2) sendMessage(game.id, "**" + drawMessage.join(", ") + ":** The game ends in a draw between " + drawPlayers[0] + " and " + drawPlayers[1] + "!");
        else sendMessage(game.id, "**" + drawMessage.join(", ") + ":** The game ends in a draw between " + drawPlayers[0] + ", " + drawPlayers[1] + " and " + drawPlayers[2] + "!");
        
        // destroy game
        concludeGame(game.id);
        delayedDestroy(game.id);
        console.log("DRAW");
        return;
    }
    
    nextTurn(game);
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

function soloWin(board, soloTeam) {
    switch(soloTeam) {
        case "Flute":
            // check if a piece is unenchanted
            for(let y = 0; y < board.length; y++) {
                for(let x = 0; x < board[0].length; x++) {
                    if(board[y][x].team >= 0 && board[y][x].team != 2 && !board[y][x].enchanted) return false;
                }
            }
            // if no piece is found, return true
            return true;
        break;
    }
    // default -> not win
    return false;
}

function uaWin(board, uaTeam) {
    switch(uaTeam) {
        case "Angel":
            if(!canMove(board, 2)) return true;
        break;
    }
    // default -> not win
    return false;
}

function enemyTeam(turn, pieceTeam) {
    return pieceTeam != -1 && turn != pieceTeam;
}

function findWWW(game) {
    // look for www
    let wwwAlive = false;
    let wolfCount = 0;
    for(let y = 0; y < game.height; y++) {
        for(let x = 0; x < game.width; x++) {
            let xyPiece = game.state[y][x];
            if(xyPiece.name == "White Werewolf") {
                wwwAlive = true;
            }
            if(xyPiece.team == 1) {
                wolfCount++;
            }
        }
    }
    return wwwAlive && wolfCount > 1;
}

function removeSoloEffect(game) {
    for(let y = 0; y < game.height; y++) {
        for(let x = 0; x < game.width; x++) {
            game.state[y][x].enchanted = false;
            game.state[y][x].demonized = false;
        }
    }
}


/**
nextTurn
Runs at the start of a turn, evaluating wins and elimination if necessary
**/
function nextTurn(game, forceTurn = null) {
    if(!game.ai) saveToDB();
    if(game.concluded) return; // dont do a turn on a concluded game
    // increment turn
    let oldTurn = game.turn;
    // determine next turn
    if(!game.firstMove) { // when here before the first move, force a P1 turn (this happens via "Start Game" buton)
        game.turn = 0;
        game.normalTurn = 0;
    } else if(!game.solo) { // normal game, switch between P1 & P2
        game.turn = (game.turn + 1) % 2;
        if(forceTurn != null) game.turn = forceTurn; // force turn
    } else { // solo game, do P1 then P3, then P2, then P3 again
        // determine next turn
        if(game.soloDoubleTurns) { // solo double turns
            if(game.turn != 2) {
                game.turn = 2;
            } else {
                if(game.normalTurn == 0) {
                    game.turn = 1;
                    game.normalTurn = 1;
                } else {
                    game.turn = 0;
                    game.normalTurn = 0;
                }
            }
        } else { // solo normal turns
            game.turn = (game.turn + 1) % 3;
        }
        
        if(forceTurn != null) { // force turn
            game.turn = forceTurn;
            if(forceTurn < 2) game.normalTurn = forceTurn;
        }
        
        // eliminated players if applicable
        switch(game.turn) {
            case 0:
                if(!canMove(game.state, 0) && !game.whiteEliminated) {
                    if(!game.ai) {
                        if(game.players[0]) sendMessage(game.id, "**Elimination:** <@" + game.players[0] + "> was eliminated!");
                        else if(game.playerNames[0]) sendMessage(game.id, "**Elimination:** " + game.playerNames[0] + " was eliminated!");
                        console.log("ELIMINATE WHITE");
                        players = players.filter(el => el[0] != game.players[0]);
                    }
                    game.whiteEliminated = true;
                }
            break;
            case 1:
                if(!canMove(game.state, 1) && !game.blackEliminated) {
                    if(!game.ai) {
                        if(game.players[1]) sendMessage(game.id, "**Elimination:** <@" + game.players[1] + "> was eliminated!");
                        else if(game.playerNames[1]) sendMessage(game.id, "**Elimination:** " + game.playerNames[1] + " was eliminated!");
                        console.log("ELIMINATE BLACK");
                        players = players.filter(el => el[0] != game.players[1]);
                    }
                    game.blackEliminated = true;
                }
            break;
            case 2:
                if(!canMove(game.state, 2) && !game.goldEliminated) {
                    removeSoloEffect(game);
                    if(!game.ai) {
                        if(game.players[2]) sendMessage(game.id, "**Elimination:** <@" + game.players[2] + "> was eliminated!");
                        else if(game.playerNames[2]) sendMessage(game.id, "**Elimination:** " + game.playerNames[2] + " was eliminated!");
                        console.log("ELIMINATE GOLD");
                        players = players.filter(el => el[0] != game.players[2]);
                    }
                    game.goldEliminated = true;
                }
            break;
        }
        
         // if new turn player eliminated, skip turn
        if(game.turn == 0 && game.whiteEliminated && !game.blackEliminated && !game.goldEliminated) {
            nextTurn(game, 1);
            return;
        } else if(game.turn == 1 && game.blackEliminated && !game.whiteEliminated && !game.goldEliminated) {
            if(game.soloDoubleTurns) {
                nextTurn(game, 0);
            } else {
                nextTurn(game, 2);
            }            
            return;
        } else if(game.turn == 2 && game.goldEliminated && !game.whiteEliminated && !game.blackEliminated) {
            if(game.soloDoubleTurns) {
                if(game.normalTurn == 0) {
                    nextTurn(game, 1);
                } else {
                    nextTurn(game, 0);
                }
            } else {
                nextTurn(game, 0);
            }
            return;
        }
        
        // check if at least two players cant move
        let soloHasWon = !game.ai ? soloWin(game.state, game.soloTeam) : false;
        if(!game.ai && (soloHasWon || (game.whiteEliminated ? (game.blackEliminated || game.goldEliminated) : (game.blackEliminated && game.goldEliminated)))) { // game over
            // get channel
            // determine winner
            if(!game.blackEliminated && !soloHasWon && findWWW(game)) { // P2 loses by WWW
                sendMessage(game.id, "**Game End:** White Werewolf causes a loss!");
                let enemies = "";
                if(game.players[1]) enemies += "<@" + game.players[1] + ">";
                else enemies += game.playerNames[1];
                enemies += " & ";
                if(game.players[2]) enemies += "<@" + game.players[2] + ">";
                else enemies += game.playerNames[2];
                if(game.players[0]) sendMessage(game.id, "**Victory:** " + enemies + " have won against " + game.player[0] + "!");
                else sendMessage(game.id, "**Victory:** " + enemies + " have won against " + game.playerNames[0] + "!"); 
                winRewardEvaluate(game, game.players[1], game.players[2]);
            } else if(!game.goldEliminated || soloHasWon) { // P3 wins
                if(soloHasWon) sendMessage(game.id, "**Game End:** Solo Power causes a loss!");
                let enemies = "";
                if(game.players[0]) enemies += "<@" + game.players[0] + ">";
                else enemies += game.playerNames[0];
                if(game.players[1]) enemies += " & <@" + game.players[1] + ">";
                else if(game.playerNames[1]) enemies += " & " + game.playerNames[1];
                if(game.players[2]) sendMessage(game.id, "**Victory:** <@" + game.players[2] + "> has won against " + enemies + "!");
                else sendMessage(game.id, "**Victory:** " + game.playerNames[2] + " has won against " + enemies + "!");
                winRewardEvaluate(game, game.players[2]);
            } else if(!game.whiteEliminated) { // P1 wins
                let enemies = "";
                if(game.players[1] || game.playerNames[1]) {
                    if(game.players[1]) enemies += "<@" + game.players[1] + ">";
                    else enemies += game.playerNames[1];
                    if(!game.goldAscended) {// dont win against ascended
                        enemies += " & ";
                        if(game.players[2]) enemies += "<@" + game.players[2] + ">";
                        else enemies += game.playerNames[2];
                    } else {
                        enemies += ", and ";
                        if(game.players[2]) enemies += "<@" + game.players[2] + ">";
                        else enemies += game.playerNames[2];
                        enemies += " won by ascension";
                        winRewardEvaluate(game, game.players[2]);
                    }
                } else { // white vs gold game
                    if(game.players[2]) enemies += "<@" + game.players[2] + ">";
                    else enemies += game.playerNames[2];
                }
                if(game.players[0]) sendMessage(game.id, "**Victory:** <@" + game.players[0] + "> has won against " + enemies + "!");
                else sendMessage(game.id, "**Victory:** " + game.playerNames[0] + " has won against " + enemies + "!");
                winRewardEvaluate(game, game.players[0]);
            } else if(!game.blackEliminated) { // P2 wins
                let enemies = "";
                if(game.players[0]) enemies += "<@" + game.players[0] + ">";
                else enemies += game.playerNames[0];
                if(!game.goldAscended) { // dont win against ascended
                    enemies += " & ";
                    if(game.players[2]) enemies += "<@" + game.players[2] + ">";
                    else enemies += game.playerNames[2];
                } else {
                    enemies += ", and ";
                    if(game.players[2]) enemies += "<@" + game.players[2] + ">";
                    else enemies += game.playerNames[2];
                    enemies += " won by ascension";
                }
                if(game.players[1]) sendMessage(game.id, "**Victory:** <@" + game.players[1] + "> has won against " + enemies + "!");
                else sendMessage(game.id, "**Victory:** " + game.playerNames[1] + " has won against " + enemies + "!");
                winRewardEvaluate(game, game.players[1]);
            } else {
                sendMessage(game.id, "**Game End:** The game ends in a stalemate!");
            }
            
            // destroy game
            concludeGame(game.id);
            delayedDestroy(game.id);
            console.log("WIN");
            return;
        }
        
       
    }
    if(!game.ai) console.log("-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\nNEXT TURN", game.turn);
    if(!game.ai) saveToDB();
    
    if(!game.ai) {
        // find a valid move
        let board = game.state;
      
        // Update Spectator Board
        updateSpectatorBoard(game.id)

        // WIN Message
        if(!game.solo && !canMove(board, game.turn)) {

            // www lose
            if(findWWW(game) && oldTurn == 1) {
                oldTurn = 0;
                game.turn = 1;
                sendMessage(game.id, "**Game End:** White Werewolf causes a loss!");
            }
            
            if(game.players[0] && game.players[1]) sendMessage(game.id, "**Victory:** <@" + game.players[oldTurn] + "> has won against <@" + game.players[game.turn] + ">!"); // no AI
            else if(oldTurn == 0 && !game.players[0] && game.players[1]) sendMessage(game.id, "**Victory:** " + game.playerNames[0] + " has won against <@" + game.players[1] + ">!"); // town AI
            else if(oldTurn == 1 && !game.players[0] && game.players[1]) {
                sendMessage(game.id, "**Victory:** <@" + game.players[1] + "> has won against " + game.playerNames[0] + "!"); // town AI
                winRewardEvaluate(game, game.players[1]);
            }
            else if(oldTurn == 0 && !game.players[1] && game.players[0]) {
                sendMessage(game.id, "**Victory:** <@" + game.players[0] + "> has won against " + game.playerNames[1] + "!"); // wolf AI
                winRewardEvaluate(game, game.players[0]);
            }
            else if(oldTurn == 1 && !game.players[1] && game.players[0]) sendMessage(game.id, "**Victory:** " + game.playerNames[1] + " has won against <@" + game.players[0] + ">!"); // wolf AI
            else if(oldTurn == 0 && !game.players[1] && !game.players[0]) sendMessage(game.id, "**Victory:** " + game.playerNames[0] + " has won against " + game.playerNames[1] + "!"); // both AI
            else if(oldTurn == 1 && !game.players[1] && !game.players[0]) sendMessage(game.id, "**Victory:** " + game.playerNames[1] + " has won against " + game.playerNames[0] + "!"); // both AI
            concludeGame(game.id);
            delayedDestroy(game.id);
            console.log("WIN SIMPLE");
            return;
        }
    }
    
    // remove effects
    // unprotect, unhide, undisguise, unsabotage
    removeEffects(game, game.turn);
    
    // DOUBLE MOVE (CHILD/CUB)
    if(game.prevMove == 0 && game.doubleMove0 == true) { // double move town (Child)
        game.doubleMove0 = false;
    	game.inDoubleMove = true;
        nextTurn(game, 0);
        return;
    } else if(game.prevMove == 1 && game.doubleMove1 == true) { // double move wolf (Cub)
        game.doubleMove1 = false;
    	game.inDoubleMove = true;
        nextTurn(game, 1);
        return;
    }
    
    // Do AI Turn if AI in play
    if(!game.ai && game.turn == 1 && game.players[1] == null) {
        AImove(1, game)
    } else if(!game.ai && game.turn == 0 && game.players[0] == null) {
        AImove(0, game)
    } else if(!game.ai && game.turn == 2 && game.players[2] == null) {
        AImove(2, game)
    }
    
    // final save
    if(!game.ai) saveToDB();
}

function removeEffects(curGame, team) {
    // unprotect, unhide, undisguise, unsabotage
    for(let y = 0; y < curGame.height; y++) {
        for(let x = 0; x < curGame.width; x++) {
            let xyPiece = curGame.state[y][x];
            if(xyPiece.name != null && xyPiece.team == team) {
                curGame.state[y][x].protected = false; 
                curGame.state[y][x].protectedBy = null; 
                curGame.state[y][x].hidden = false; 
                curGame.state[y][x].disguise = false;
                if(curGame.state[y][x].name == "Sneaking Wolf") curGame.state[y][x].disguise = "Wolf"; // keep SnW disguise
                if(curGame.state[y][x].name == "Bloody Butcher") curGame.state[y][x].disguise = "Butcher"; // keep BB disguise
            } else if(xyPiece.name != null && xyPiece.team != team) {
                curGame.state[y][x].sabotaged = false;
                curGame.state[y][x].stay = false;
            }
        }
    }
}