/**
CLONING
**/
// create a deep copy of an element by JSON stringifying and then parsing it 
function deepCopy(el) {
    //BENCHMARK timeSpentCloning -= Date.now();
    //BENCHMARK if(timeSpentMovingCur) timeSpentMovingClone -= Date.now();
    //BENCHMARK let clone = JSON.parse(JSON.stringify(el));
    //BENCHMARK timeSpentCloning += Date.now();
    //BENCHMARK if(timeSpentMovingCur) timeSpentMovingClone += Date.now();
    //BENCHMARK return clone;
    
    return JSON.parse(JSON.stringify(el));
}

function shallowCopy(el) {
    return { ...el };
}

// clone a board state
function stateClone(el) {
    let clone = [];
    for(let i = 0; i < el.length; i++) {
        clone[i] = [];
        for(let j = 0; j < el[0].length; j++) {
            clone[i][j] = shallowCopy(el[i][j]);
        }
    }
    return clone;
}

// clone a game
function gameClone(el) {
    //BENCHMARK timeSpentFastCloning -= Date.now();
    //BENCHMARK if(timeSpentMovingCur) timeSpentMovingClone -= Date.now();
    
    let clone = { ...el };
    
    if(el.state) {
        clone.state = stateClone(el.state);
    }
    
    //BENCHMARK timeSpentFastCloning += Date.now();
    //BENCHMARK if(timeSpentMovingCur) timeSpentMovingClone += Date.now();
    return clone;
}