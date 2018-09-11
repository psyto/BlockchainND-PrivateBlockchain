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
    // this.chain = [];
    // this.addBlock(new Block("First block in the chain - Genesis block"));

  }

  // Add new block
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
  	await this.addLevelDBData(newBlock.height, JSON.stringify(newBlock));
  }

  // Get block height
	// getBlockHeight() function retrieves current block height within the LevelDB chain.
    getBlockHeight(){
      return this.chain.length-1;
    }

    // get block
		// getBlock() function retrieves a block by block height within the LevelDB chain.
    getBlock(blockHeight){
      // return object as a single string
      return JSON.parse(JSON.stringify(this.chain[blockHeight]));
    }

    // validate block
		// validate block() function to validate a block stored within levelDB.
    validateBlock(blockHeight){
      // get block object
      let block = this.getBlock(blockHeight);
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

   // Validate blockchain
	 // validateChain() function to validate blockchain stored within levelDB.
    validateChain(){
      let errorLog = [];
      for (var i = 0; i < this.chain.length-1; i++) {
        // validate block
        if (!this.validateBlock(i))errorLog.push(i);
        // compare blocks hash link
        let blockHash = this.chain[i].hash;
        let previousHash = this.chain[i+1].previousBlockHash;
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
addLevelDBData(key,value){
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

// Add data to levelDB with value
function addDataToLevelDB(value) {
    let i = 0;
    db.createReadStream().on('data', function(data) {
          i++;
        }).on('error', function(err) {
            return console.log('Unable to read data stream!', err)
        }).on('close', function() {
          console.log('Block #' + i);
          addLevelDBData(i, value);
        });
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


(function theLoop (i) {
  setTimeout(function () {
    addDataToLevelDB('Testing data');
    if (--i) theLoop(i);
  }, 100);
})(10);
