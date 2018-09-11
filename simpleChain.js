/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');

/* ===== Persist data with LevelDB ===================================
|  Learn more: level: https://github.com/Level/level     |
|  =============================================================*/

const level = require('level');
const chainDB = './chaindata';
const db = level(chainDB);

/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/

class Block{
	constructor(data){
		this.hash = "",
		this.height = 0,
		this.body = data,
		this.time = 0,
		this.previousBlockHash = ""
	}
}

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain{
	constructor(){
		// Genesis block persist as the first block in the blockchain using LevelDB.
		this.getBlockHeight().then((height) => {
			if (height === -1) {
				this.addBlock(new Block("First block in the chain - Genesis block"));
			}
		})
	}

	// addBlock(newBlock) includes a method to store newBlock within LevelDB.
	async addBlock(newBlock){
		// Previous block height
		const previousBlockHeight = parseInt(await this.getBlockHeight());
		// Block height
		newBlock.height = previousBlockHeight + 1;
		// UTC timestamp
		newBlock.time = new Date().getTime().toString().slice(0,-3);
		// previous block hash
		if(newBlock.height>0){
			const previousBlock = await this.getBlock(previousBlockHeight);
			newBlock.previousBlockHash = previousBlock.hash;
		}
		// Block hash with SHA256 using newBlock and converting to a string
		newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
		// Adding block object to chain
		await this.addDataToLevelDB(newBlock.height, JSON.stringify(newBlock).toString());
	}

	// getBlockHeight() function retrieves current block height within the LevelDB chain.
	async getBlockHeight(){
		return await this.getBlockHeightFromLevelDB();
	}

	// getBlock() function retrieves a block by block height within the LevelDB chain.
	async getBlock(blockHeight){
		// return object as a single string
		return JSON.parse(await this.getLevelDBData(blockHeight));
	}

	// validate block() function to validate a block stored within levelDB.
	validateBlock(blockHeight){
		// get block object
		let block = await this.getBlock(blockHeight);
		// get block hash
		let blockHash = block.hash;
		// remove block hash to test block integrity
		block.hash = '';
		// generate block hash
		let validBlockHash = SHA256(JSON.stringify(block)).toString();
		// Compare
		if (blockHash===validBlockHash) {
			return true;
		} else {
			console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
			return false;
		}
	}

	// validateChain() function to validate blockchain stored within levelDB.
	validateChain(){
		let errorLog = [];
		const height = await this.getBlockHeightFromLevelDB();
		for (var i = 0; i < height; i++) {
			// validate block
			if (!this.validateBlock(i))errorLog.push(i);
			// compare blocks hash link
			let blockHash = this.getBlock(i).hash;
			let previousHash = this.getBlock(i+1).previousBlockHash;
			if (blockHash!==previousHash) {
				errorLog.push(i);
			}
		}
		if (errorLog.length>0) {
			console.log('Block errors = ' + errorLog.length);
			console.log('Blocks: '+errorLog);
		} else {
			console.log('No errors detected');
		}
	}
}

// Add data to levelDB with key/value pair
addDataToLevelDB(key,value){
	return new Promise((resolve, reject) => {
		db.put(key, value, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve(value);
			}
		})
	})
}

// Get data from levelDB with key
getLevelDBData(key){
	return new Promise((resolve, reject) => {
		db.get(key, (err, value) => {
			if (err) {
				reject(err);
			} else {
				resolve(value);
			}
		})
	})
}

// Get block height from levelDB
getBlockHeightFromLevelDB(){
	return new Promise((resolve, reject) => {
		let height = -1;
		db.createReadStream().on('data', (data) => {
			height++;
		}).on('error', (err) => {
			reject(err);
		}).on('close', () => {
			resolve(height);
		})
	})
}

/* ===== Testing ==============================================================|
|  - Self-invoking function to add blocks to chain                             |
|  - Learn more:                                                               |
|   https://scottiestech.info/2014/07/01/javascript-fun-looping-with-a-delay/  |
|                                                                              |
|  * 100 Milliseconds loop = 36,000 blocks per hour                            |
|     (13.89 hours for 500,000 blocks)                                         |
|    Bitcoin blockchain adds 8640 blocks per day                               |
|     ( new block every 10 minutes )                                           |
|  ===========================================================================*/

let blockchain = new Blockchain();

(function theLoop (i) {
	setTimeout(function () {
		blockchain.addBlock(new Block("Test Block - " (i + 1))).then((result) => {
			if (--i) theLoop(i);
		})
	}, 100);
})(10);
