function Maze (height, width) {
	// width and height should be odd values
	height = height % 2 == 0 ? height+1 : height;
	width = width % 2 == 0 ? width + 1 : width;

	this.height = height;
	this.width = width;
}

Maze.BLOCK_WALL = 'wall';
Maze.BLOCK_EMPTY = 'maze';

Maze.prototype.isValid = function (y, x) {
	return y < this.height && y>=0 && x < this.width && x>=0;
};

Maze.prototype.get = function (y, x) {
	return this.blocks[y][x];
};
Maze.prototype.set = function (y, x, value) {
	return this.blocks[y][x] = value;
};

Maze.prototype.isWall = function (y, x) {
	return this.get(y, x) === Maze.BLOCK_WALL;
};

Maze.prototype.isEmpty = function (y, x) {
	return this.get(y, x) === Maze.BLOCK_EMPTY;
};

Maze.prototype.generate = function (startPosition) {
	if (!startPosition) startPosition = [0, 0];
	var walls = [], blocks = this.blocks = [];

	for (var y= 0, height = this.height; y<height; y++) {
		blocks[y] = [];
		for (var x = 0, width = this.width; x<width; x++) {
			this.set(y, x, 'wall');
		}
	}

	var maze = this;

	function amaze(y, x, addBlockWalls) {
		maze.set(y, x, Maze.BLOCK_EMPTY);
		if (addBlockWalls && maze.isValid(y+1,x) && maze.isWall(y+1, x)) walls.push([y+1,  x , [y,x]]);
		if (addBlockWalls && maze.isValid(y-1,x) && maze.isWall(y-1, x)) walls.push([y-1,  x , [y,x]]);
		if (addBlockWalls && maze.isValid(y,x+1) && maze.isWall(y, x+1)) walls.push([ y , x+1, [y,x]]);
		if (addBlockWalls && maze.isValid(y,x-1) && maze.isWall(y, x-1)) walls.push([ y , x-1, [y,x]]);
	}

	amaze(startPosition[0],startPosition[1], true);

	while(walls.length != 0) {
		var randomWall = walls[Math.floor(Math.random() * walls.length)], host = randomWall[2], opposite = [(host[0] + (randomWall[0]-host[0])*2), (host[1] + (randomWall[1]-host[1])*2)];
		if (maze.isValid(opposite[0],opposite[1])) {
			if (maze.isEmpty(opposite[0], opposite[1])) {
				walls.splice(walls.indexOf(randomWall),1);
			}
			else {
				amaze(randomWall[0],randomWall[1],false);
				amaze(opposite[0],opposite[1],true);
			}
		}
		else walls.splice(walls.indexOf(randomWall),1);
	}

};

function generate (height, width, startPosition) {
	var maze = new Maze(height, width);
	maze.generate(startPosition);
	return maze;
}

/* global $ */

function UserView (cellSize) {
	this.$el = $('<div>')
		.attr('id', 'me')
		.css({
			width: cellSize,
			height: cellSize
		});
	this.cellSize = cellSize;
	this.y = 0;
	this.x = 0;
	this.rotation = UserView.ROTATE_RIGHT;
	this.draw(true);
}

UserView.ROTATE_RIGHT = 0;
UserView.ROTATE_UP = 270;
UserView.ROTATE_LEFT = 180;
UserView.ROTATE_DOWN = 90;

UserView.prototype.draw = function (instant) {
	this.drawRotation(instant);
	this.drawPosition(instant);
};

UserView.prototype._setAttrs = function (attrs, instant) {
	var $el = this.$el;

	if (instant) {
		$el.css(attrs);
		return Promise.resolve();
	} else {
		return new Promise(function (resolve, reject) {
			$el.animate(attrs, 100, resolve);
		});
	}
};

UserView.prototype.drawPosition = function (instant) {
	return this._setAttrs({
		left: this.x * this.cellSize,
		top: this.y * this.cellSize
	}, instant);
};

UserView.prototype.drawRotation = function (instant) {
	this.$el.css({
		transform: 'rotate(' + this.rotation + 'deg)'
	});
};

UserView.prototype.moveTo = function (y, x, instant) {
	if (this.x === x && this.y === y) return;

	this.x = x;
	this.y = y;

	return this.drawPosition(instant);
};

UserView.prototype.rotateTowards = function (y, x, instant) {
	var rotation = this.rotation;

	if (y > this.y) {
		rotation = UserView.ROTATE_DOWN;
	} else if (y < this.y) {
		rotation = UserView.ROTATE_UP;
	} else if (x > this.x) {
		rotation = UserView.ROTATE_RIGHT;
	} else if (x < this.x) {
		rotation = UserView.ROTATE_LEFT;
	}

	if (rotation === this.rotation) return;

	if (rotation - this.rotation > 180) rotation = rotation - 360;

	this.rotation = rotation;
	this.drawRotation(instant);
};

function calculateCellSize (mazeElement, rows, cols) {
	var border = parseFloat(mazeElement.css('border-width'));

	var parent = mazeElement.parent();

	var MAX_CELL_SIZE = 100;
	var MIN_CELL_SIZE = 10;
	var calculatedCellSize = Math.min(
		(parent.height() - border * 2) / rows,
		(parent.width() - border * 2) / cols
	);

	var cellSize = Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, calculatedCellSize));

	return Math.floor(cellSize);
}

function getDesiredSize (mazeElement) {
	mazeElement = $(mazeElement);

	var border = parseFloat(mazeElement.css('border-width')),
		container = mazeElement.parent(),
		requestedCellSize = 30,
		height = Math.floor((container.height() - border * 2) / requestedCellSize),
		width = Math.floor((container.width() - border * 2) / requestedCellSize);

	return {
		width: width,
		height: height
	};
}

function initRound (size, startPosition) {
	$('#complete').slideUp();

	var maze = generate(size.height, size.width, startPosition);
	var finishX = maze.width - 1,
		finishY = maze.height - 1;

	maze.set(finishY, finishX, Maze.BLOCK_EMPTY);

	var mazeElement = $('#maze').empty();
	var cellSize = calculateCellSize(mazeElement, maze.height, maze.width);

	mazeElement.css({
		height: maze.height * cellSize,
		width: maze.width * cellSize
	});

	for (var y=0; y<maze.height; y++) {
		for (var x = 0; x<maze.width; x++) {
			var block = $('<div>')
				.addClass('block')
				.css({
					width: cellSize,
					height: cellSize
				});

			if (x === finishX && y === finishY) {
				block.addClass('finish');
			} else if (maze.isWall(y, x)) {
				block.addClass('wall');
			}

			mazeElement.append(block);
		}
	}

	var currentPosition = startPosition;

	var userView = new UserView(cellSize);
	userView.moveTo(startPosition[0], startPosition[1], true);
	mazeElement.append(userView.$el);

	$('body').off('keydown').keydown(function (e) {
		var KEY_DOWN = 40,
			KEY_UP = 38,
			KEY_LEFT = 37,
			KEY_RIGHT = 39
		;

		var newY = userView.y,
			newX = userView.x;

		switch (e.keyCode) {
			case KEY_DOWN: newY++; break;
			case KEY_UP: newY--; break;
			case KEY_LEFT: newX--; break;
			case KEY_RIGHT: newX++; break;
			default: return;
		}

		e.preventDefault();

		if (!maze.isValid(newY, newX)) return;

		userView.rotateTowards(newY, newX);

		if (maze.isEmpty(newY, newX)) {
			var moved = userView.moveTo(newY, newX);

			if (newY === finishY && newX === finishX) {
				moved.then(function () {
					$('#complete').slideDown();
				});
			}
		}
	});
}

function run () {
	initRound(getDesiredSize('#maze'), [0, 0]);
}

run();