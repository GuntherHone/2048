const GRIDROWS = 4;
const GRIDCOLS = 4;
const TOUCH_THRESHOLD = 40;
const MERGED_FLAG = 0x1000;

let gameState = null;
let score = 0;
let highScore = 0;

/************************/
rotate2D = {
  plus90deg: a => a[0].map((_, colIndex) => a.map(row => row[colIndex]).slice().reverse()),

  minus90deg: a => a[0].map((_, colIndex) => a.map(row => row.slice().reverse()[colIndex]))
}

/************************/
function isEqual2D(a,b)
{
   return a.reduce((rowMatch, currRow, rowIndex) => rowMatch && currRow.reduce((colMatch, currCol, colIndex) => colMatch && currCol == b[rowIndex][colIndex], true), true)
}

/************************/
pubsub = {
  events:{},

  subscribe: function (type, callback) 
  {
    if (!(type in this.events)) {
      this.events[type] = []
    }
    this.events[type].push(callback);
  },

  publish: function (type, ...args) {
    if (this.events[type]) {
      this.events[type].forEach(callback => {
        callback(...args);
      });
    }
  }
}

/************************/
class Touch {

  #triggered = false;
  #startX;
  #startY;
  #threshold;

  constructor(htmlElement, threshold) {
    htmlElement.addEventListener("touchstart", e => this.#start(e));
htmlElement.addEventListener("touchmove", e => this.#move(e));

   this.#threshold = threshold;

  }

  #start(event) {
    let {clientX, clientY} = event.touches[0];

    this.#startX = clientX;
    this.#startY = clientY;

    this.#triggered = false;
  }

  #move(event) {
    if (!this.#triggered) {
       let {clientX, clientY} = event.touches[0];

       let deltaX = clientX - this.#startX;
       let deltaY = clientY - this.#startY;

       if ((Math.abs(deltaX) > this.#threshold) || (Math.abs(deltaY) > this.#threshold)) {
     if (Math.abs(deltaX) > Math.abs(deltaY)) {
       if(deltaX < 0) {
         this.#triggered = true;
         pubsub.publish("left");
       } else {
         this.#triggered = true;
         pubsub.publish("right");
       }
     } else {
       if(deltaY < 0) {
         this.#triggered = true;
         pubsub.publish("up");
       } else {
         this.#triggered = true;
         pubsub.publish("down");
       }
     }
    }
   }
  }
}

/************************/
function getRandomInteger(min, max) {
  return Math.floor(Math.random() * (max - min) ) + min;
}

/************************/
function getEmptySpaces(state) {
  emptySpaces = [];
  
  if (state) {
  state.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell === 0) {
        emptySpaces.push({rowIndex,colIndex});
      }
    });
  });
  }
  
  return emptySpaces;
}

/************************/
function addNewNumber(state) {
  
  emptySpaces = getEmptySpaces(state);

  if (emptySpaces.length === 0) {
    return null;
  }

  cell = emptySpaces[getRandomInteger(0,emptySpaces.length)];

  // Copy state
  newState = state.map(arr => arr.slice());

  newState[cell.rowIndex][cell.colIndex] = 2 * getRandomInteger(1,3);
  
  return newState;
}

/************************/
function shiftCols(state) {
  // Copy the current state
  newState = state.map(arr => arr.slice());

  newState.forEach(row => {
    let didAdd = false;
    for (let iterations = 0; (iterations < GRIDCOLS-1) && (!didAdd); ++iterations) {
    for (let col = 0; col < GRIDCOLS-1; ++col) {
      if (row[col] && (row[col] === row[col+1])) {
         score += 2 * row[col];
         row[col] = row[col] * 2 + MERGED_FLAG;
         row[col+1] = 0;
         didAdd = true;
      } else if (row[col] === 0) {
         row[col] = row[col+1];
         row[col+1] = 0;
      }
    }
  }
  });

  if (score > highScore) {
     highScore = score;
     localStorage.setItem("2048",score);
  }

  return newState;
}

/************************/
function isGameOver(state) {

  function checkRow(current, row)
  {
    return current && (() => {

      for (let col = 0; col < GRIDCOLS-1; ++col) {
        if ((row[col] === 0) || (row[col+1] === 0) || (row[col] === row[col+1])) {
          return false;
        } // if
      } // for

      return true;
    })();
  }

  return state.reduce(checkRow, true) && rotate2D.minus90deg(state).reduce(checkRow, true);
}

/************************/
function update(newState) {
  if (!isEqual2D(gameState, newState)) {
    pubsub.publish("render", addNewNumber(newState));
  }

  if (isGameOver(gameState)) {
document.getElementById("gameOverScore").innerHTML = score;
    document.getElementById("gameOverDialog").style.display = "grid";

  }
}

/************************/
function shiftLeft(state) {

  newState = shiftCols(state);

  update(newState);
}

/************************/
function shiftUp(state) {

  newState = rotate2D.plus90deg(shiftCols(rotate2D.minus90deg(state)));

  update(newState);
}

/************************/
function shiftDown(state) {

  newState = 
    rotate2D.minus90deg(
      shiftCols(
        rotate2D.plus90deg(
          state
        )
      )
    );

  update(newState);
}

/************************/
function shiftRight(state) {
  
  newState = 
    rotate2D.minus90deg(
      rotate2D.minus90deg(
        shiftCols(
          rotate2D.plus90deg(
            rotate2D.plus90deg(
              state
            )
          )
        )
      )
    );

  update(newState);
}

/************************/
function resetGame() {

  document.
    getElementById("gameOverDialog").
    style.display = "none";

   score = 0;

  pubsub.publish("render", addNewNumber(addNewNumber(Array(GRIDROWS).fill(Array(GRIDCOLS).fill(0)))));
}

/************************/
function setup() {

  let gamefieldElement = document.getElementById("gamefield");

  document.getElementById("restart").onclick = resetGame;

  let touch = new Touch(gamefieldElement, TOUCH_THRESHOLD);

  pubsub.subscribe("left", () => shiftLeft(gameState));

  pubsub.subscribe("up", () => shiftUp(gameState));

  pubsub.subscribe("down", () => shiftDown(gameState));

  pubsub.subscribe("right", () => shiftRight(gameState));

  pubsub.subscribe("render", (newState) =>
render(gamefieldElement, newState));

  let hiscore = localStorage.getItem("2048");
  if (hiscore !== null) {
    highScore = hiscore;
  } else {
    highScore = 0;
    localStorage.setItem("2048",0);
  }

  resetGame();
}

/************************/
function removeFlags(state) {
  return state.map(row => row.map(cell => cell & ~MERGED_FLAG));
}

/************************/
function render(targetElement, state) {
  targetElement.innerHTML = "";

  state.forEach((row,rowIndex) => {
    
    const rowElement = document.createElement("tr");

    row.forEach((cell,colIndex) => {
      const cellElement = document.createElement("td");
      if (cell) {
        if (cell & MERGED_FLAG) {
           cell -= MERGED_FLAG;
         cellElement.classList.add("animate","pop");
        }
        cellElement.textContent = cell;
        cellElement.classList.add("number");
      }
     rowElement.appendChild(cellElement);
      
    });
    targetElement.appendChild(rowElement);
  });

  // Save the current state
  gameState = removeFlags(state).map(arr => arr.slice());

  // Show score
  document.getElementById("score").
  textContent = score;

  // Show hiscore
  document.getElementById("hiscore").
  textContent = highScore;
}

/************************/
setup();