(function () {
    "use strict";

    class Measure {
        constructor() {
            this.startTime = null;
            this.elapsedTime = 0;
        }

        start() {
            this.startTime = Date.now();
        }

        stop() {
            this.elapsedTime = parseInt((Date.now() - this.startTime) / 1e3);

            return this;
        }

        getElapsedTime() {
            const mins = Math.floor(this.elapsedTime / 60);
            const secs = Math.floor(this.elapsedTime % 60);

            const minsStr = mins > 9 ? mins : '0' + mins.toString();
            const secsStr = secs > 9 ? secs : '0' + secs.toString();

            return minsStr + ':' + secsStr;
        }
    }

    class Pair {
        constructor() {
            this.pair = [];
            this._onFound = null;
            this._attempts = 0;
        }

        /**
         *
         * @param {Card} card
         */
        add(card) {
            if (this.pair.length < 2 && !card.hasFound && !card.isOpen) {
                this.pair.push(card);
            }

            if (this.pair.length === 2) {
                ++this._attempts;

                if (this.pair[0].value === this.pair[1].value) {
                    this.pair.forEach(card => {
                        card.found();
                    });

                    if (typeof this._onFound === 'function') {
                        this._onFound();
                    }
                } else {
                    this.pair.forEach(card => {
                        card.close();
                    });
                }

                this.pair = [];
            }
        }

        get attempts() {
            return this._attempts;
        }

        set onFound(callback) {
            this._onFound = callback;
        }
    }

    class DifficultySelector {
        constructor() {
            this._onOptionSelected = null;
            this.overlay = document.querySelector('.difficulty-selector');
            this.options = this.overlay.querySelectorAll('.options .option');

            for (let i = 0; i < this.options.length; i++) {
                this.options[i].onclick = e => {
                    if (typeof this._onOptionSelected === 'function') {
                        this._onOptionSelected(parseInt(e.target.dataset.difficulty));
                    }
                }
            }
        }

        show() {
            this.overlay.removeAttribute('style');
        }

        hide() {
            this.overlay.style.display = 'none';
        }

        set onOptionSelected(callback) {
            this._onOptionSelected = callback;
        }
    }

    class EndLayer {
        constructor() {
            this.overlay = document.querySelector('.end-layer');
            this.time = this.overlay.querySelector('.time b');
            this.attempts = this.overlay.querySelector('.attempts b');
            this._onRestart = null;

            this.overlay.querySelector('.btn.restart').onclick = () => {
                if (typeof this._onRestart === 'function') {
                    this._onRestart();
                }
            }
        }

        show(time, attempts) {
            this.overlay.removeAttribute('style');
            this.time.innerText = time;
            this.attempts.innerText = attempts;
        }

        hide() {
            this.overlay.style.display = 'none';
        }

        set onRestart(callback) {
            this._onRestart = callback;
        }
    }

    class Card {
        constructor(value) {
            this.cardElem = this._createCard(value);
            this._isOpen = false;
            this._onOpened = null;
            this._found = false;
            this._value = value;
        }

        _createCard(value) {
            const div = document.createElement('div');
            div.classList.add('card');
            div.innerText = value;
            div.onclick = () => {
                this.open();
            };

            return div;
        }

        open() {
            this.cardElem.classList.add('opened');

            if (typeof this._onOpened === 'function') {
                this._onOpened(this);
            }

            this._isOpen = true;
        }

        close() {
            if (!this._found) {
                setTimeout(() => {
                    this.cardElem.classList.remove('opened');
                    this._isOpen = false;
                }, 400);
            }
        }

        get isOpen() {
            return this._isOpen;
        }

        get hasFound() {
            return this._found;
        }

        found() {
            this._found = true;
            this.cardElem.classList.add('found');
        }

        getElem() {
            return this.cardElem;
        }

        get value() {
            return this._value;
        }

        set onOpened(callback) {
            this._onOpened = callback;
        }
    }

    class Board {
        constructor() {
            this.board = null;
            this.boardElem = document.querySelector('.board');
            this.difficultySelector = new DifficultySelector();
            this.endLayer = new EndLayer();

            this.difficultySelector.onOptionSelected = difficulty => {
                this._init(difficulty);
            };

            this.endLayer.onRestart = () => {
                this.endLayer.hide();
                this.difficultySelector.show();
            }
        }

        _init(difficulty) {
            // Hide layers
            const measure = new Measure();
            measure.start();

            this.difficultySelector.hide();
            this.endLayer.hide();

            document.querySelector('.game').dataset.difficulty = difficulty;

            this.board = this.constructor.getEmptyBoard(difficulty);
            this.boardElem.innerText = ''; // Clear board elem
            const pair = new Pair();
            pair.onFound = () => {
                let allFound = true;

                for (let i = 0; i < this.board.length; i++) {
                    for (let j = 0; j < this.board[0].length; j++) {
                        if (!this.board[i][j].hasFound) {
                            allFound = false;
                            break;
                        }
                    }
                }

                if (allFound) {
                    this.endGame(measure.stop().getElapsedTime(), pair.attempts);
                }
            };

            const cellCount = difficulty * difficulty;
            const emptyCalls = [...Array(cellCount).keys()];
            const cardValues = [...Array(cellCount / 2).keys()].map(i => (i + 1).toString());

            const getCoordiantes = position => {
                const x = position % difficulty;
                const y = (position - x) / difficulty;

                return {x, y}
            };

            for (const cardValue of cardValues) {
                for (let i = 0; i < 2; i++) {
                    const position = emptyCalls[Math.floor(Math.random() * emptyCalls.length)]; // Pick a random position
                    emptyCalls.splice(emptyCalls.indexOf(position), 1); // Remove picked position from available positions
                    const coords = getCoordiantes(position); // Get the coordinates
                    this.board[coords.x][coords.y] = new Card(cardValue);
                    this.board[coords.x][coords.y].onOpened = card => {
                        pair.add(card);
                    };
                }
            }

            for (let i = 0; i < this.board.length; i++) {
                const row = document.createElement('div');
                row.classList.add('row');

                for (let j = 0; j < this.board[0].length; j++) {
                    row.appendChild(this.board[i][j].getElem());
                }

                this.boardElem.appendChild(row);
            }
        }

        static getEmptyBoard(difficulty) {
            const result = [];

            for (let i = 0; i < difficulty; i++) {
                result.push([]);

                for (let j = 0; j < difficulty; j++) {
                    result[i][j] = null;
                }
            }

            return result;
        }

        endGame(time, attempts) {
            this.difficultySelector.hide();
            this.endLayer.show(time, attempts);
        }
    }

    new Board();

    const keyboardHint = document.querySelector('.keyboard-hint');
    keyboardHint.querySelector('.cmd').innerText = navigator.platform.toLowerCase().includes('mac') ? 'CMD' : 'CTRL';
    keyboardHint.style.visibility = 'visible';
})();