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

document.body.style.overflow = 'hidden';  // suppress scroll bars

var canvas = document.querySelector('canvas')
var c = canvas.getContext('2d')

var BoardScale, BoardSize, SquareSize, BoardTopLeftX, BoardTopLeftY;

function Scale() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    c = canvas.getContext('2d');
    BoardScale = 0.75;    
    BoardSize = Math.min(window.innerHeight, window.innerWidth) * BoardScale;
    SquareSize = BoardSize / 8;
    BoardTopLeftX = (window.innerWidth - BoardSize)  / 2;
    BoardTopLeftY = (window.innerHeight - BoardSize) / 2;
}
Scale();

function Clear() {
	c.clearRect(0,0,canvas.height,canvas.width)
}

function even(i) {
	return (i % 2) == 0;
}

function DrawBoard() {
	//console.log("DrawBoard called:window");
	for (let col=0; col<8; col++) {
		for (let row=0; row<8; row++) {
			//console.log(col,row);
			DrawSquare(row,col)
		}
	}
}

function DrawSquare(col,row) {
	//console.log("DrawSquare called ");
	if ((State == Moving) && (row*8 + col == FromSq)) {
		c.fillStyle = (even(row+col) ? "#FFFF99" : "#CCFF33");
	} else {
		c.fillStyle = (even(row+col) ? "#FFCC99" : "#CC8033");
    }
	c.fillRect ((window.innerWidth  - BoardSize)/2 + col*SquareSize
	           ,(window.innerHeight - BoardSize)/2 + row*SquareSize
	           ,SquareSize
	           ,SquareSize
	           );
}

// Integer codes for the pieces - 5 bits total
// Color in top 2 bits, Kind in bottom 3 bits

const WHITE = 8;
const BLACK = 16

const NONE   = 0;
const PAWN   = 1;
const ROOK   = 3;
const KNIGHT = 4;
const BISHOP = 5;
const KING   = 6;
const QUEEN  = 7;

function Color(piece) {
	if (piece > 16) {
		return BLACK;
	} else if (piece > 8) { 
		return WHITE;
	} else {
		return NONE;
	}
}

var lookup = [];  // holds the image objects for pieces

// Counting the images lets us check that all the images have loaded.
// Since the images load asynchronously, we can check this before
// drawing the board, polling until all have loaded.
var imageCount = 0

// build image object from the image file
function newImage(filename) {
	var img = new Image();
	img.onload = function() { imageCount++; }
	img.src = filename;
	return img;
}

var initFlag = false;

// initializes all the images for pieces
function InitPieceImages() {
	if (initFlag) return true;
    lookup[BLACK+PAWN]   = newImage('image/Chess_pdt60.png');
    lookup[BLACK+KNIGHT] = newImage('image/Chess_ndt60.png');
    lookup[BLACK+ROOK]   = newImage('image/Chess_rdt60.png');
    lookup[BLACK+BISHOP] = newImage('image/Chess_bdt60.png');
    lookup[BLACK+QUEEN]  = newImage('image/Chess_qdt60.png');
    lookup[BLACK+KING]   = newImage('image/Chess_kdt60.png');
    lookup[WHITE+PAWN]   = newImage('image/Chess_plt60.png');
    lookup[WHITE+KNIGHT] = newImage('image/Chess_nlt60.png');
    lookup[WHITE+ROOK]   = newImage('image/Chess_rlt60.png');
    lookup[WHITE+BISHOP] = newImage('image/Chess_blt60.png');
    lookup[WHITE+QUEEN]  = newImage('image/Chess_qlt60.png');
    lookup[WHITE+KING]   = newImage('image/Chess_klt60.png');
    initFlag = true;
}
InitPieceImages();

//----------------------------------------
//  Drawing Pieces on the Board
//----------------------------------------

function DrawPiece(col,row,piece) {
    c.drawImage (lookup[piece]
                ,(window.innerWidth  - BoardSize)/2 + col*SquareSize
                ,(window.innerHeight - BoardSize)/2 + row*SquareSize
                ,SquareSize
                ,SquareSize
                );
}

function DrawPosn() {
	for (let i=0; i<64; i++) {
		if (Board[i] != NONE) {
			DrawPiece(i%8, Math.floor(i/8),Board[i]);
		}
	}
}

//-------------------------------------------------------------------------
//  Representing a chess position on the Board
//-------------------------------------------------------------------------

var Board = [];   // let board b be an array 0..63 

var SideToMove;
var WhiteCanOO;
var WhiteCanOOO;
var BlackCanOO;
var BlackCanOOO;
var epSquare;
var HalfMoveClock;
var FullMoveCounter;

//--------------------------------------------------------------------------
// Parse Forsyth-Edwwards Notation (FEN) to set up a position on the Board.
// The parser uses recursive descent through the BNF that defines FEN.
//--------------------------------------------------------------------------

function parse(fen) {
    var i = 0; // indexes Board
    var j = 0; // indexes fen
    var flag = true;
    // <Piece Placement> ::= <rank8> '/' <rank7> '/'' <rank6> '/' <rank5> '/' <rank4> '/' <rank3> '/' <rank2> '/' <rank1> " "
    while(flag) {
    	//console.log(fen[j]);
    	if ("12345678".includes(fen[j])) {
    		let k = Number(fen[j]);
    		//console.log("k=" + k);
    		while (k > 0) {
    			Board[i++] = NONE;
    			//console.log("empty " + i);
    			k = k-1;
    		}
    		j++;
    	} else {
    	switch (fen[j]) {
    		case 'k': Board[i++] = BLACK+KING;   j++; break;
    		case 'q': Board[i++] = BLACK+QUEEN;  j++; break;
    		case 'r': Board[i++] = BLACK+ROOK;   j++; break;
    		case 'b': Board[i++] = BLACK+BISHOP; j++; break;
    		case 'n': Board[i++] = BLACK+KNIGHT; j++; break;
    		case 'p': Board[i++] = BLACK+PAWN;   j++; break;
    		case 'K': Board[i++] = WHITE+KING;   j++; break;
    		case 'Q': Board[i++] = WHITE+QUEEN;  j++; break;
    		case 'R': Board[i++] = WHITE+ROOK;   j++; break;
    		case 'B': Board[i++] = WHITE+BISHOP; j++; break;
    		case 'N': Board[i++] = WHITE+KNIGHT; j++; break;
    		case 'P': Board[i++] = WHITE+PAWN;   j++; break;
    		case '/': j++; break;
    		case ' ': flag = false; j++ ; break;
    		default:
    		    console.log("parser: unrecognized character <" + fen[j] + ">");
    		    flag = false;
    	}}};

    // <Side to move> :=  { 'w' | 'b' }
    //
    switch(fen[j]) {
        case 'w': SideToMove = WHITE; j++; break;
        case 'b': SideToMove = BLACK; j++; break;
        default:
            console.log("parser: side to move must be w or b");
            flag = false;
    };
    // ' '
    switch (fen[j]) {
        case " ": j++; break;
        default:
            console.log("parse: expected blank");
            flag = false;
    }
    // <Castling ability> ::= '-' | ['K'] ['Q'] ['k'] ['q'] (1..4)
    //
    switch (fen[j]) {
        case "-": WhiteCanOO = false; j++; break;
        case "K": WhiteCanOO = true;  j++; break;
        default:
            console.log("parse: expected '-' or 'K'");
            flag = false;
    };
    switch (fen[j]) {
        case "-": WhiteCanOOO = false; j++; break;
        case "Q": WhiteCanOOO = true;  j++; break;
        default:
            console.log("parse: expected '-' or 'Q'");
            flag = false;
    };
    switch (fen[j]) {
        case "-": BlackCanOO = false; j++; break;
        case "k": BlackCanOO = true;  j++; break;
        default:
            console.log("parse: expected '-' or 'k'");
            flag = false;
    };
    switch (fen[j]) {
        case "-": BlackCanOOO = false; j++; break;
        case "q": BlackCanOOO = true;  j++; break;
        default:
            console.log("parse: expected '-' or 'q'");
            flag = false;
    };
    // ' '
    switch (fen[j]) {
        case " ": j++; break;
        default:
            console.log("parse: expected blank");
            flag = false;
    }
    // <Enpassant target square> ::= '-' | <epsquare>
    // <epsquare ::= <fileLetter> <epRank>
    // <fileLetter> ::= 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'
    // <eprank> ::= '3' | '6'
    //
    if (fen[j] == "-") {
    	epSquare = undefined; 
    	j++;
    } else if ("abcdefgh".includes(fen[j]) && "36".includes(fen[j+1])) {
        epSquare = 8*( Number(fen[j+1]) - 1 ) + "abcdefgh".indexOf( fen[j] );
        j = j+2;
    }

    // ' '
    switch (fen[j]) {
        case " ": j++; break;
        default:
            console.log("parse: expected blank");
            flag = false;
    }

    // <Halfmove clock> := <digit> {<digit>}
    // <digit> ::= '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
    //
    if ("0123456789".includes(fen[j])) {
        HalfMoveClock = Number(fen[j]);
        j++;
    } else {
        console.log("parse: expected digit");
    }
    while ("0123456789".includes(fen[j])) {
        HalfMoveClock = 10*HalfMoveClock + Number(fen[j]);
        j++;
    }
     // ' '
    switch (fen[j]) {
        case " ": j++; break;
        default:
            console.log("parse: expected blank");
            flag = false;
    }

    // <Fullmove counter> := <digit19> { <digit> }
    // <digit19> ::= '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' 
    // <digit> := '0' | <digit19>
    //
    if ("123456789".includes(fen[j])) {   
        FullMoveCounter = Number(fen[j]);
        j++;
    } else {
        console.log("parse: Fullmove counter -- expected digit19");
    }
    while ("0123456789".includes(fen[j])) {
        FullMoveCounter = 10*FullMoveCounter + Number(fen[j]);
        j++;
    }
}


// generate FEN for current position
function unparse() {
    fenstring = "";
    // <Piece placement>
    emptySquareCount = 0
    for (let i=0 ; i<64 ; i++) {
        if (Board[i]==NONE) {
            emptySquareCount++;
        }
        if (emptySquareCount>0 && (Board[i]!=NONE || i%8 == 7)) {
            fenstring += String(emptySquareCount);
            emptySquareCount = 0;
            console.log(fenstring);
        }
        if (Board[i]!=NONE) {
            switch (Board[i]) {
                case BLACK+ROOK:   fenstring+="r"; break;
                case BLACK+KNIGHT: fenstring+="n"; break;
                case BLACK+BISHOP: fenstring+="b"; break;
                case BLACK+QUEEN:  fenstring+="q"; break;
                case BLACK+KING:   fenstring+="k"; break;
                case BLACK+PAWN:   fenstring+="p"; break;
                case WHITE+PAWN:   fenstring+="P"; break;
                case WHITE+ROOK:   fenstring+="R"; break;
                case WHITE+KNIGHT: fenstring+="N"; break;
                case WHITE+BISHOP: fenstring+="B"; break;
                case WHITE+QUEEN:  fenstring+="Q"; break;
                case WHITE+KING:   fenstring+="K"; break;
                default:
                    console.log("unparse: unrecognized piece value", Board[i]);
            }
            console.log(fenstring);
        }
        if (i%8 == 7 && i<63) {
            fenstring += "/";
            console.log(fenstring);
        }
    }
    // " "
    fenstring += " ";

    // <Side to move> :=  "w" | "b"
    switch( SideToMove ) {
        case WHITE: fenstring += "w"; break;
        case BLACK: fenstring += "b"; break;
        default:
            console.log("unparse: unrecognized value for SideToMove",SideToMove);
    }
    console.log(fenstring);
    // " "
    fenstring += " ";

    // <Castling ability> ::= '-' | ['K'] ['Q'] ['k'] ['q'] (1..4)
    fenstring += (WhiteCanOO  ? 'K' : '-');
    fenstring += (WhiteCanOOO ? 'Q' : '-');
    fenstring += (BlackCanOO  ? 'k' : '-');
    fenstring += (BlackCanOOO ? 'q' : '-');
    // " "
    fenstring += " ";
    console.log(fenstring);

    // <En passant target square> ::= '-' | <epsquare>
    // <epsquare>   ::= <fileLetter> <eprank>
    // <fileLetter> ::= 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'
    // <eprank>     ::= '3' | '6'
    if (epSquare == undefined) {
        fenstring += '-';
    } else {
        fenstring += "abcdefgh"[epSquare%8] + String(Math.floor(epSquare/8)+1);
    }

    // " "
    fenstring += " ";
    console.log(fenstring);

    // <Halfmove Clock> ::= <digit> {<digit>}
    // <digit> ::= '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
    fenstring += HalfMoveClock;

    // " "
    fenstring += " ";
    console.log(fenstring);

    // <Fullmove counter> ::= <digit19> {<digit>}
    // <digit19> ::= '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
    // <digit>   ::= '0' | <digit19>
    fenstring += FullMoveCounter;
    console.log(fenstring);
    return fenstring;
}

//--------------------------------------------------------------------
//           Testing FEN parsing and FEN generation
//------------------------------------------------------------------

var Iposn = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
var Posn2 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
var Posn3 = "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2" 
var Posn4 = "rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2"

function test1() {
    Scale();
    InitPieceImages();
    DrawBoard();
    parse(Iposn);
    DrawPosn();
}

function testFEN(posn) {
	InitPieceImages();   // InitPieceImages();Scale() === Scale();InitPieceImages()
	Scale();
	parse(posn);
	DrawBoard();  // parse(...); DrawBoard() === DrawBoard(); parse(..)
	DrawPosn();
}

function test2() {testFEN(Posn2)}
function test3() {testFEN(Posn3)}
function test4() {testFEN(Posn4)}
function test5() { unparse() }

async function testall() {
	console.log("watch the board...");
    test1(); await sleep(2000);
    test2(); await sleep(2000);
    test3(); await sleep(2000);
    test4(); await sleep(2000);
    test5();
    console.log("end test");
}



//------------------------------------------------------------------------
//                              Mouse Events
//------------------------------------------------------------------------

const Ready  = 0;
const Moving = 1;

var State = Ready;
var FromSq;
var DestSq;

function doMouseDown(event) {
    //console.log("doMouseDown called at " + event.pageX + " " + event.pageY)
    if (inBox(event.pageX,event.pageY,BoardTopLeftX, BoardTopLeftY, BoardSize, BoardSize)) {
    	//console.log("mousedown in board");
    	console.log(findSquare(event.pageX,event.pageY));
    	switch (State) {
    		case Ready:
    		    FromSq = findSquare(event.pageX,event.pageY);
    		    if (Board[FromSq] != NONE) {
    		        State = Moving;
    		        DrawBoard();
    		        DrawPosn();
    	        }
    		    break;
    		case Moving:
    		    DestSq = findSquare(event.pageX,event.pageY);
    		    // clicking the fromSquare puts you back to Ready
    		    if (FromSq == DestSq) {
      		    	FromSq = NONE;
    		    	DestSq = NONE;
    		    	State = Ready;
    		    	DrawBoard();
    		    	DrawPosn();
    		    // move into empty square 		    	
    		    } else if ( Color(Board[DestSq]) == NONE )  {
    		    	Board[DestSq] = Board[FromSq];
    		    	Board[FromSq] = NONE;
    		    	State = Ready
    		    	DrawBoard();
    		    	DrawPosn();
    		    // disallow move onto squares occupied by your own pieces
    		    } else if ( Color(Board[DestSq]) != Color(Board[FromSq]) ) {
    		    	Board[DestSq] = Board[FromSq];
    		    	Board[FromSq] = NONE;
    		    	State = Ready
    		    	DrawBoard();
    		    	DrawPosn();	
    		    }
    		    break;
    		 default:
    		     console.log("unrecognized state");
    		     break;
    	}
    } else {
    	console.log("mousedwon outside board");
    }
}

canvas.addEventListener("mousedown", doMouseDown, false);

function inBox(x,y,x0,y0,wd,ht) {
    return (x0 < x) && (x < x0+wd) && (y0 < y) && (y < y0+ht)
}

// Find the number of the square at a given x,y on the canvas
function findSquare( x, y ) {
    var col = bound( x - BoardTopLeftX, 0, BoardSize, 0, 2);
    //console.log("col",col)
    var row = bound( y - BoardTopLeftY, 0, BoardSize, 0, 2);
    //console.log("row",row);
    return row * 8 + col;
}

// Successively halves the interval [log,hib] three times to find 
// which of 8 equal size segements (0..7) bounds the given coordinate.
// Same algorihtm applies to finding row (y-coord) and col (x-coord).
function bound( x, lob, hib, n, d) {
	//console.log(x, lob, hib, n, d);
	let mid = (hib-lob)/2;
    if ( d < 0 ) {
        return n
    } else if ( x > lob+mid ) {
        return bound( x, lob+mid, hib, n+2**d, d-1)
    } else {
        return bound( x, lob, hib-mid, n, d-1)
    }}


// Rescale the Board and Board Position whenever the windows is resized.

window.addEventListener('resize', RefreshBoardPosn, false);

function RefreshBoardPosn() {
	InitPieceImages();
	Scale();
	DrawBoard();
	DrawPosn();
};

// Experimenting with using promises to waiting for all piece images
// to load before we draw the position on the board.

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Setup Board In the Initial Position by Default
parse(Iposn)

async function DelayedBoardRefresh() {
    while(imageCount < 12) {
	    console.log("imageCount",imageCount);
	    await sleep(1);
    }
    RefreshBoardPosn();
}

DelayedBoardRefresh();

// continue here
