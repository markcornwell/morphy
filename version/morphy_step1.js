//----------------------------------------------------------------------
// Morphy.js  -  Chess GUI
//
// Copyright (c) 2021 by Mark Cornwell
//
// This is a chess GUI written in Javascript for embedding in web pages.
// It uses HTML3 canvas for rendering the board and pieces in a web page.
// It also detects user actions with the mouse so the use can graphically
// manipulate the pieces and make moves on the board.
//-----------------------------------------------------------------------

var canvas = document.querySelector('canvas')

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var c = canvas.getContext('2d')

var BoardScale = 0.75;
var BoardSize = Math.min(window.innerHeight, window.innerWidth) * BoardScale;
var SquareSize = BoardSize / 8;

function Scale() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    c = canvas.getContext('2d');
    BoardSize = Math.min(window.innerHeight, window.innerWidth) * BoardScale;
    SquareSize = BoardSize / 8;
}

function Clear() {
	c.clearRect(0,0,canvas.height,canvas.width)
}

function even(i) {
	return (i % 2) == 0;
}

function DrawBoard() {
	console.log("DrawBoard called:window");
	for (let col=0; col<8; col++) {
		for (let row=0; row<8; row++) {
			console.log(col,row);
			DrawSquare(row,col)
		}
	}
}

function DrawSquare(col,row) {
	console.log("DrawSquare called ");
	c.fillStyle = (even(row+col) ? "#FFCC99" : "#CC8033");
	c.fillRect ((window.innerWidth  - BoardSize)/2 + col*SquareSize
	           ,(window.innerHeight - BoardSize)/2 + row*SquareSize
	           ,SquareSize
	           ,SquareSize
	           );
}

// continue here
