import {Position} from './scanner';

export class CompilerError {
	msg: string;
	isWarning: boolean;
	beginPos: Position;
	constructor(msg: string, beginPos: Position, isWarning = false) {
		this.msg = msg;
		this.isWarning = isWarning;
		this.beginPos = beginPos;
	}
}
