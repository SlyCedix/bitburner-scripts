export interface ServerData {
	servers: string[];
	scripts: string[];
	txts: string[];
	flags: string[];
}

export interface TreeRoot {
	sha : string;
	url : string;
	tree : Array<TreeBranch>;
	truncated : string;
}

export interface TreeBranch {
	path : string;
	mode : string;
	type : string;
	sha : string;
	url : string;
}