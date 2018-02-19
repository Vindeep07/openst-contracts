/**
 * This is script for deploying Pricer contract on any chain.<br><br>
 *
 *   Prerequisite:
 *    <ol>
 *       <li>Deployer Address</li>
 *     </ol>
 *
 *   These are the following steps:<br>
 *     <ol>
 *       <li>Deploy Airdrop contract</li>
 *     </ol>
 *
 *
 * @module tools/deploy/pricer
 */

const readline = require('readline');
const rootPrefix = '../..';
const web3Provider = require(rootPrefix + '/lib/web3/providers/rpc');
const deployHelper = require(rootPrefix + '/tools/deploy/helper');
const coreConstants = require(rootPrefix + '/config/core_constants');
const coreAddresses = require(rootPrefix + '/config/core_addresses');
const prompts = readline.createInterface(process.stdin, process.stdout);
const logger = require(rootPrefix + '/helpers/custom_console_logger');
const OpsManagedContract = require(rootPrefix + "/lib/contract_interact/ops_managed_contract");

// Different addresses used for deployment
const deployerName = "deployer";
const deployerAddress = coreAddresses.getAddressForUser(deployerName);

const opsName = "ops";
const opsAddress = coreAddresses.getAddressForUser(opsName);


/**
 * Validation Method
 *
 * @param {Array} arguments
 *
 * @return {}
 */
function validate(argv) {
  if (argv[2] === undefined || argv[2] === '') {
    logger.error("brandedTokenAddress is mandatory!");
    process.exit(0);
  }
  if (argv[3] === undefined || argv[3] === '') {
    logger.error("Base currency is mandatory!");
    process.exit(0);
  }
  if (argv[4] === undefined || argv[4] === '') {
    logger.error("Worker Contract Address is mandatory!");
    process.exit(0);
  }
  if (argv[5] === undefined || argv[5] === '') {
    logger.error("airdropbudgetholder is mandatory!");
    process.exit(0);
  }
  if (argv[6] === undefined || argv[6] === '') {
    logger.error("gas price is mandatory!");
    process.exit(0);
  }
}

/**
 * It is the main performer method of this deployment script
 *
 * @param {Array} arguments
 *
 * @return {}
 */
async function performer(argv) {

  logger.info("argv[0]: " + argv[0]);
  logger.info("argv[1]: " + argv[1]);
  logger.info("argv[2]: " + argv[2]); // branded Toke Contract Address
  logger.info("argv[3]: " + argv[3]); // base Currency
  logger.info("argv[4]: " + argv[4]); // worker contract address
  logger.info("argv[5]: " + argv[5]); // airdropbudgetholder address
  logger.info("argv[6]: " + argv[6]); // gas price
  logger.info("argv[7]: " + argv[7]); // isTravisCIEnabled
  logger.info("argv[8]: " + argv[8]); // file to write airdrop contract address

  validate(argv);
  const brandedTokenAddress = argv[2].trim();
  const baseCurrency = argv[3].trim();
  const workerContractAddress = argv[4].trim();
  const airdropBudgetHolder = argv[5].trim();
  const gasPrice = argv[6].trim();
  var isTravisCIEnabled = false;
  if (argv[7] !== undefined) {
    isTravisCIEnabled = argv[7].trim() === 'travis';
  }
  const fileForContractAddress = (argv[8] !== undefined) ? argv[8].trim() : '';
  const deploymentOptions = {
    gasPrice: gasPrice,
    gas: coreConstants.OST_GAS_LIMIT
  };

  logger.info("Deployer Address: " + deployerAddress);
  logger.info("Ops Address: " + opsAddress);
  logger.info("Branded Token Address: " + brandedTokenAddress);
  logger.info("Base currency: " + baseCurrency);
  logger.info("Worker Contract Address: " + workerContractAddress);
  logger.info("Airdrop Budget Holder: " + airdropBudgetHolder);
  logger.info("Gas price: " + gasPrice);
  logger.info("Travis CI enabled Status: " + isTravisCIEnabled);
  logger.info("File to write For ContractAddress: "+fileForContractAddress);

  if (isTravisCIEnabled === false ) {
    await new Promise(
      function (onResolve, onReject) {
        prompts.question("Please verify all above details. Do you want to proceed? [Y/N]", function (intent) {
          if (intent === 'Y') {
            logger.info('Great! Proceeding deployment.');
            prompts.close();
            onResolve();
          } else {
            logger.error('Exiting deployment scripts. Change the enviroment variables and re-run.');
            process.exit(1);
          }
        });
      }
    );
  } else {
    prompts.close();
  }

  const contractName = 'airdrop';
  const contractAbi = coreAddresses.getAbiForContract(contractName);
  const contractBin = coreAddresses.getBinForContract(contractName);


  var constructorArgs = [
    brandedTokenAddress,
    web3Provider.utils.asciiToHex(baseCurrency),
    workerContractAddress,
    airdropBudgetHolder
  ];

  logger.info("Deploying contract: " + contractName);

  var contractDeployTxReceipt = await deployHelper.perform(
    contractName,
    web3Provider,
    contractAbi,
    contractBin,
    deployerName,
    deploymentOptions,
    constructorArgs
  );

  logger.info(contractDeployTxReceipt);
  logger.win(contractName+ " Deployed ");

  const contractAddress = contractDeployTxReceipt.receipt.contractAddress;
  logger.info(contractName+ " Contract Address: "+contractAddress);

  logger.info("Setting Ops Address to: " + opsAddress);
  var opsManaged = new OpsManagedContract(contractAddress, gasPrice);
  var result = await opsManaged.setOpsAddress(deployerName, opsAddress, deploymentOptions);
  logger.info(result);
  var contractOpsAddress = await opsManaged.getOpsAddress();
  logger.info("Ops Address Set to: " + contractOpsAddress);

  // Write to file based on filename passed
  if (fileForContractAddress != '') {
    deployHelper.writeContractAddressToFile(fileForContractAddress, contractAddress);
  }

}

// node tools/deploy/airdrop.js brandedTokenContractAddress quoteCurrency workerContractAddress airdropBudgetHolder gasPrice <travis> <fileToWrite>
performer(process.argv);
