//----------------------------------------------------------------------
// Morphy.js  -  Chess GUI
//
// Copyright (c) 2021 by Mark Cornwell
//
// This is a chess GUI written in Javascript for embedding in web pages.
// It uses HTML3 canvas for rendering the board and pieces in a web page.
// It also detects user actions with the mouse so the use can graphically
// manipulate the pieces and make moves on the board.
//
// Modifying the drawing and event logic to use Functional Reactive
// Programming (FRP) coding style.  Events will become event streams
// and graphcis will become observers that feed off the streams.
// Our hope is that the code will become clearer and easier to modify.
//
// Read up on RxJS library.
//-----------------------------------------------------------------------

import * as Bacon from '../node_modules/baconjs/dist/Bacon.mjs';
Bacon.once("hello").log()

//Document and Canvas

document.body.style.overflow = 'hidden';  // suppress scroll bars

var canvas = document.querySelector('canvas')
var c = canvas.getContext('2d')


// all of these should be part of an observer that reacts to resize events
var BoardScale, BoardSize, SquareSize, BoardTopLeftX, BoardTopLeftY;
function Scale() {
    console.log("Scaling")
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
	c.clearRect(0,0,window.innerHeight,window.innerWidth)
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
	if ((State == MOVING) && (row*8 + col == FromSq)) {
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

function even(i) {
    return (i % 2) == 0;
}

//----------------------------------------------
// Integer codes for the pieces - 5 bits total
// Color in top 2 bits, Kind in bottom 3 bits
//----------------------------------------------

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

//----------------------------------------------
//  Images for displaying the pieces
//----------------------------------------------


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


var pieceImagesInitialized = false; // already initialized?

// initializes all the images for pieces
function InitPieceImages() {
	if (pieceImagesInitialized) return true;
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
    pieceImagesInitialized = true;
}
InitPieceImages();

//---------------------------------------------------------------------
//  Drawing the pieces  on the Board
//---------------------------------------------------------------------

function DrawPosn(P) {
    Scale();
    DrawBoard();
    InitPieceImages();
    for (let i=0; i<64; i++) {
        if (P.Board[i] != NONE) {
            DrawPiece(i%8, Math.floor(i/8),P.Board[i]);
        }
    }
}

function DrawPiece(col,row,piece) {
    c.drawImage (lookup[piece]
                ,(window.innerWidth  - BoardSize)/2 + col*SquareSize
                ,(window.innerHeight - BoardSize)/2 + row*SquareSize
                ,SquareSize
                ,SquareSize
                );
}

//-------------------------------------------------------------------------
//  Representing a chess position
//-------------------------------------------------------------------------

function emptyPosition () {
    return {
        Board: [],
        SideToMove: WHITE,
        WhiteCanOO: true,
        WhiteCanOOO: true,
        BlackCanOO: true,
        BlackCanOOO: true,
        epSquare: undefined,
        HalfMoveClock: 0,
        FullMoveCounter: 0
}}


//---------------------------------

//--------------------------------------------------------------------------
// Parse Forsyth-Edwwards Notation (FEN) to set up a position on the Board.
// The parser uses recursive descent through the BNF that defines FEN.
// Its inverse is unparse which take the board position and reconstructs
// the FEN.
//               parse(unparse(P)) = P
//               unparse(parse(fen)) = fen
//
// are two laws they obey if no exceptions arise.
//--------------------------------------------------------------------------
// parse: [env] x String -> [env] x Position
function parse(fen) {
    var P = emptyPosition() // newly constructed position
    var i = 0;  // indexes Board
    var j = 0;  // indexes fen
    var flag = true;
    // <Piece Placement> ::= <rank8> '/' <rank7> '/'' <rank6> '/' <rank5> '/' <rank4> '/' <rank3> '/' <rank2> '/' <rank1> " "
    while(flag) {
    	//console.log(fen[j]);
    	if ("12345678".includes(fen[j])) {
    		let k = Number(fen[j]);
    		//console.log("k=" + k);
    		while (k > 0) {
    			P.Board[i++] = NONE;
    			//console.log("empty " + i);
    			k = k-1;
    		}
    		j++;
    	} else {
    	switch (fen[j]) {
    		case 'k': P.Board[i++] = BLACK+KING;   j++; break;
    		case 'q': P.Board[i++] = BLACK+QUEEN;  j++; break;
    		case 'r': P.Board[i++] = BLACK+ROOK;   j++; break;
    		case 'b': P.Board[i++] = BLACK+BISHOP; j++; break;
    		case 'n': P.Board[i++] = BLACK+KNIGHT; j++; break;
    		case 'p': P.Board[i++] = BLACK+PAWN;   j++; break;
    		case 'K': P.Board[i++] = WHITE+KING;   j++; break;
    		case 'Q': P.Board[i++] = WHITE+QUEEN;  j++; break;
    		case 'R': P.Board[i++] = WHITE+ROOK;   j++; break;
    		case 'B': P.Board[i++] = WHITE+BISHOP; j++; break;
    		case 'N': P.Board[i++] = WHITE+KNIGHT; j++; break;
    		case 'P': P.Board[i++] = WHITE+PAWN;   j++; break;
    		case '/': j++; break;
    		case ' ': flag = false; j++ ; break;
    		default:
    		    console.log("parser: unrecognized character <" + fen[j] + ">");
    		    flag = false;
    	}}};

    // <Side to move> :=  { 'w' | 'b' }
    //
    switch(fen[j]) {
        case 'w': P.SideToMove = WHITE; j++; break;
        case 'b': P.SideToMove = BLACK; j++; break;
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
        case "-": P.WhiteCanOO = false; j++; break;
        case "K": P.WhiteCanOO = true;  j++; break;
        default:
            console.log("parse: expected '-' or 'K'");
            flag = false;
    };
    switch (fen[j]) {
        case "-": P.WhiteCanOOO = false; j++; break;
        case "Q": P.WhiteCanOOO = true;  j++; break;
        default:
            console.log("parse: expected '-' or 'Q'");
            flag = false;
    };
    switch (fen[j]) {
        case "-": P.BlackCanOO = false; j++; break;
        case "k": P.BlackCanOO = true;  j++; break;
        default:
            console.log("parse: expected '-' or 'k'");
            flag = false;
    };
    switch (fen[j]) {
        case "-": P.BlackCanOOO = false; j++; break;
        case "q": P.BlackCanOOO = true;  j++; break;
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
    	P.epSquare = undefined; 
    	j++;
    } else if ("abcdefgh".includes(fen[j]) && "36".includes(fen[j+1])) {
        P.epSquare = 8*( Number(fen[j+1]) - 1 ) + "abcdefgh".indexOf( fen[j] );
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
        P.HalfMoveClock = Number(fen[j]);
        j++;
    } else {
        console.log("parse: expected digit");
    }
    while ("0123456789".includes(fen[j])) {
        P.HalfMoveClock = 10*P.HalfMoveClock + Number(fen[j]);
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
        P.FullMoveCounter = Number(fen[j]);
        j++;
    } else {
        console.log("parse: Fullmove counter -- expected digit19");
    }
    while ("0123456789".includes(fen[j])) {
        P.FullMoveCounter = 10*P.FullMoveCounter + Number(fen[j]);
        j++;
    }

    return P;
}

//-----------------------------------------------------------------
// unparse maps P to its corresponding FEN string
// It is pure in that it does not alter the environment
//-----------------------------------------------------------------
// unparse: Position -> String
function unparse(P) {
    var fenstring = ""
    // <Piece placement>
    var emptySquareCount = 0
    for (let i=0 ; i<64 ; i++) {
        if (P.Board[i]==NONE) {
            emptySquareCount++;
        }
        if (emptySquareCount>0 && (P.Board[i]!=NONE || i%8 == 7)) {
            fenstring += String(emptySquareCount);
            emptySquareCount = 0;
            //console.log(fenstring);
        }
        if (P.Board[i]!=NONE) {
            switch (P.Board[i]) {
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
                    console.log("unparse: unrecognized piece value", P.Board[i]);
            }
            //console.log(fenstring);
        }
        if (i%8 == 7 && i<63) {
            fenstring += "/";
            //console.log(fenstring);
        }
    }
    // " "
    fenstring += " ";

    // <Side to move> :=  "w" | "b"
    switch( P.SideToMove ) {
        case WHITE: fenstring += "w"; break;
        case BLACK: fenstring += "b"; break;
        default:
            console.log("unparse: unrecognized value for SideToMove",SideToMove);
    }
    //console.log(fenstring);
    // " "
    fenstring += " ";

    // <Castling ability> ::= '-' | ['K'] ['Q'] ['k'] ['q'] (1..4)
    fenstring += (P.WhiteCanOO  ? 'K' : '-');
    fenstring += (P.WhiteCanOOO ? 'Q' : '-');
    fenstring += (P.BlackCanOO  ? 'k' : '-');
    fenstring += (P.BlackCanOOO ? 'q' : '-');
    // " "
    fenstring += " ";
    //console.log(fenstring);

    // <En passant target square> ::= '-' | <epsquare>
    // <epsquare>   ::= <fileLetter> <eprank>
    // <fileLetter> ::= 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'
    // <eprank>     ::= '3' | '6'
    if (P.epSquare == undefined) {
        fenstring += '-';
    } else {
        fenstring += "abcdefgh"[P.epSquare%8] + String(Math.floor(P.epSquare/8)+1);
    }

    // " "
    fenstring += " ";
    //console.log(fenstring);

    // <Halfmove Clock> ::= <digit> {<digit>}
    // <digit> ::= '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
    fenstring += P.HalfMoveClock;

    // " "
    fenstring += " ";
    //console.log(fenstring);

    // <Fullmove counter> ::= <digit19> {<digit>}
    // <digit19> ::= '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
    // <digit>   ::= '0' | <digit19>
    fenstring += P.FullMoveCounter;
    //console.log(fenstring);
    return fenstring;
}


//--------------------------------------------------------------------
//           Testing FEN parsing and FEN generation
//------------------------------------------------------------------

function check(label,b) {
    console.log(label + ": " + (b ? "passed" : "FAILED"));
}

var Iposn = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
var Posn2 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
var Posn3 = "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2" 
var Posn4 = "rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2"
var Posn5 = "rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2"


function test1() {
    DrawPosn(parse(Iposn));
}

function testFEN(posn) {
	DrawPosn(parse(posn));
}

// Human in the Loop (HITL)
// visual check the parsed fen displays correctly
// requires human in the loop to visually check the monitor
function test2() {testFEN(Posn2)}
function test3() {testFEN(Posn3)}
function test4() {testFEN(Posn4)}
function test41() {testFEN(Posn5)}

// 
// parse and unparse are inverses - fully automated
function test5() { check ("t5", unparse(parse(Iposn)) == Iposn) }
function test6() { check ("t6", unparse(parse(Posn2)) == Posn2) }
function test7() { check ("t7", unparse(parse(Posn3)) == Posn3) }
function test8() { check ("t8", unparse(parse(Posn4)) == Posn4) }

async function testall() {
	console.log("watch the board...");
    delay = 500; // milliseconds
    test1(); await sleep(delay);
    test2(); await sleep(delay);
    test3(); await sleep(delay);
    test4(); await sleep(delay);
    test41(); await sleep(delay);
    test5(); await sleep(delay);
    test6(); await sleep(delay);
    test7(); await sleep(delay);
    test8(); await sleep(delay);
    console.log("end test");
}

//-------------------------------------------------------------------------
//                              Mouse Events
//-------------------------------------------------------------------------
// Struggling to figure out how to do IO in a functional style.
//
// After pushing Board and flags into a Position structure, I still
// found myself resorting to a global var _P in a scope visible to
// doMouseDone and doMouseUp.  The asynchronous communication from the
// listeners is an issue.
//
// This _P makes things uglier than when I bit the bullet and
// simply put the Board and flags variables in the outer scope.  At least
// then I was consistent.
//
// Listeners are essentially callbacks we define which get called
// asynchronously by the OS javascript framework.  The problem is how
// do pair up the incomming call in a pure functional way?
//
// Does FRP offer any good solution?  Requires more thought.
//
// Perhaps muy listeners should just drop messages onto a message que
// that process using a more functional framework like promise and await.
// Listeners would push events onto a stream, and functional style programs
// would consume the string pushing state long in parameters and return
// values.  (Dare we say monoid?)  That would push shared state down
// down under the covers of our stream implementation.  Too wierd?
//
// 7/6/21 - After some reading it looks like _P could be defined as a
//          property associated with an event stream of move events.
//          Mouse click and drag events would be lower level streams
//          that generated hight level steams of move events.
//          That would be in keeping with the FRP style as I understand it.
//          Look into Bacon.js
//-------------------------------------------------------------------------

//-------------------------------------------------------------------------
// Experiments with Bacon -- A Functional Reactive Programming Libnrary
//-------------------------------------------------------------------------

// initialize event stream
const pointerDownStream = Bacon.fromEvent(document, 'pointerdown');
const pointerMoveStream = Bacon.fromEvent(document, 'pointermove');
const pointerUpStream = Bacon.fromEvent(document, 'pointerup');


// Subscription callback
pointerDownStream.onValue(PointerDownEvent => {
    const { clientX, clientY } = PointerDownEvent;
    Bacon.once("pointerdown " + String(clientX) + "," + String(clientY)).log()
})

const pointerDownInBoxStream = pointerDownStream.filter(pointerDownEvent => {
    const { clientX, clientY } = pointerDownEvent;
    return inBox(clientX,clientY,BoardTopLeftX, BoardTopLeftY, BoardSize, BoardSize)
})

// Square selections
const squareSelectStream = pointerDownInBoxStream.map(PointerDownEvent => {
    const { clientX, clientY } = PointerDownEvent;
    return findSquare(clientX,clientY)
})

squareSelectStream.onValue(SquareSelectEvent => {
    Bacon.once("squareSelect " + SquareSelectEvent).log()
})

// Move event stream build up from square selection events.
// Clicking on same square twice cancels out move selection.
const moveStream = squareSelectStream.bufferWithCount(2).filter(e => {
    return e[0]!=e[1]
})
moveStream.log("move:")

// Stream of positions constructed from the moveStream
const startPosition = parse("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
const positionStream = moveStream.scan(startPosition,nextPosition)

positionStream.map(unparse).log("posn:")

// Resize Events -- not working yet

const resizeEventStream = Bacon.fromEvent(canvas, 'resize')

resizeEventStream.onValue(ResizeEvent => {
    Bacon.once("resize" + ResizeEvent).log("resize")
})

// ------ experimental -----------

// Issue: at this point move could be any two squares.  E.g. from square may be empty
// or opponent piece, toSquare could be owm piece.  Where do we put in those constraints?
// Requires knowledge of the board position, not just squares.

// Somewhere we need a sequence of P1 m1 P2 m2 P3 m3 ....
// 

function nextPosition(P,move) {
    return Object.assign( {}, P, { 
        Board: nextBoard(P, move),
        SideToMove: ( WHITE ? BLACK : WHITE ),
        HalfMoveClock: P.HalfMoveClock + 1,
        FullMoveCounter: (P.SideToMove == WHITE ? P.FullMoveCounter + 1 : P.FullMoveCounter)
    })
}

function nextBoard(P,move) {
    var board = [... P.Board]
    if ((Color(P.Board[move[0]]) == P.SideToMove) && Color(P.Board[move[1]]) != P.SideToMove) {
        board[move[0]] = NONE
        board[move[1]] = P.Board[move[0]]
    }
    return board
}

//-------------------------------------------------------------------------
//            MouseDown Event  -- Old Fashion Way with Event Listeners
//-------------------------------------------------------------------------

canvas.addEventListener("mousedown", doMouseDown, false);

const READY  = 0;
const MOVING = 1;

// Lots of state variables.  Challenge to do this in a functional style.
export var State = READY;
var FromSq;
var DestSq;

// note: there should be absolutely no references to _P above this line.
var _P = emptyPosition();  // mutable Position shared by mouse events below

function doMouseDown(event) {
    //console.log("doMouseDown called at " + event.pageX + " " + event.pageY)
    if (inBox(event.pageX,event.pageY,BoardTopLeftX, BoardTopLeftY, BoardSize, BoardSize)) {
    	//console.log("mousedown in board");
    	console.log(findSquare(event.pageX,event.pageY));
    	switch (State) {
    		case READY:
    		    FromSq = findSquare(event.pageX,event.pageY);
    		    if (_P.Board[FromSq] != NONE) {
    		        State = MOVING;
    		        //DrawBoard();
    		        DrawPosn(_P);
    	        }
    		    break;
    		case MOVING:
    		    DestSq = findSquare(event.pageX,event.pageY);
    		    // clicking the fromSquare puts you back to READY
    		    if (FromSq == DestSq) {
      		    	FromSq = NONE;
    		    	DestSq = NONE;
    		    	State = READY;
    		    	//DrawBoard();
    		    	DrawPosn(_P);
    		    // move into empty square 		    	
    		    } else if ( Color(_P.Board[DestSq]) == NONE )  {
    		    	_P.Board[DestSq] = _P.Board[FromSq];
    		    	_P.Board[FromSq] = NONE;
    		    	State = READY
    		    	//DrawBoard();
    		    	DrawPosn(_P);
    		    // disallow move onto squares occupied by your own pieces
    		    } else if ( Color(_P.Board[DestSq]) != Color(_P.Board[FromSq]) ) {
    		    	_P.Board[DestSq] = _P.Board[FromSq];
    		    	_P.Board[FromSq] = NONE;
    		    	State = READY
    		    	//DrawBoard();
    		    	DrawPosn(_P);	
    		    }
    		    break;
    		 default:
    		     console.log("unrecognized state");
    		     break;
    	}
    } else {
    	console.log("mousedown outside board");
    }
}

// TBD - Animate draggin the piece to its target square

/*************** code snippet shows how to track mouse motion
 canvas.addEventListener('mousemove', (e) => {
        console.log("mouse move X: ", e.clientX);
        console.log("mouse move X: ", e.screenX);
    }, );
****************/

//-----------------------------------------------------------------
//  Handle the geometry for mapping the x,y positions on the
//  canvas to the numbers 0..63 for squares on the board.
//  Searches by successively halving the interval and testing what
//  side the point is on.  Thought we are only an 8x8 grid, the
//  bound function below works for any NxN grid.
//  Note: inBox, findSquare, bound do not write the environmnet.
//  But they *do* read BoardTopLeftX, BoardSize, etc. which do 
//  change when the canvas is scaled or resized.
//-----------------------------------------------------------------

function inBox(x,y,x0,y0,wd,ht) {
    return (x0 < x) && (x < x0+wd) && (y0 < y) && (y < y0+ht)
}

// Find the number of the square at a given x,y on the canvas
// findSquare : Int -> Int -> Square
function findSquare( x, y ) {
    var col = bound( x - BoardTopLeftX, 0, BoardSize, 0, 2);
    //console.log("col",col)
    var row = bound( y - BoardTopLeftY, 0, BoardSize, 0, 2);
    //console.log("row",row);
    return row * 8 + col;
}

// Successively halves the [lob,hib] interval n=3 times to find 
// which of 2^n = 8 equal size segements (0..7) bounds the given coordinate.
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


//-----------------------------------------------------------------------
// Rescale the Board and Board Position whenever the windows is resized.
//-----------------------------------------------------------------------

window.addEventListener('resize', RefreshBoardPosn, false);

function RefreshBoardPosn() {
	DrawPosn(_P);
};

// Experimenting with using promises to waiting for all piece images
// to load before we draw the position on the board.

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Setup Board In the Initial Position by Default
_P = parse(Iposn)

async function DelayedBoardRefresh() {
    while(imageCount < 12) {
	    console.log("imageCount",imageCount);
	    await sleep(1);
    }
    RefreshBoardPosn();
}

// Start loading up the images as soon as the script is loaded
// and wait until they are all loaded.
DelayedBoardRefresh();

// continue here
