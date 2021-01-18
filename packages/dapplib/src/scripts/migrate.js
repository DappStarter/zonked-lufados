const fs = require("fs");
const path = require("path");
const { binary_to_base58 } = require('@relocke/base58');
const spawn = require("cross-spawn");

const SLASH = path.sep;
const PAYER = 'payer';
const dappConfigFile = path.resolve(
  `${__dirname}${SLASH}..${SLASH}dapp-config.json`
);

const networks = require("../solana-config.json");
const { Solana } = require("../lib/solana");
const { setUncaughtExceptionCaptureCallback } = require("process");

(async () => {
  let config = networks.development.config;
  let accountCount = 5;

  // Unpopulated dappConfig
  let dappConfig = {
    httpUri: config.httpUri,
    contracts: {},
    accounts: [],
    wallets: [],
    programInfo: null
  };

  if (fs.existsSync(dappConfigFile)) {
    dappConfig = JSON.parse(fs.readFileSync(dappConfigFile, "utf8"));
  }

  if (dappConfig.accounts.length < accountCount) {
    await createTestAccounts(accountCount);
  }

  // One account is created for each data layout in the array passed to deployProgram
  // In addition, the payer account is automatically funded with lamports based on the 
  // data layout size

  let dataLayouts = Solana.getDataLayouts();

  await deployProgram(dataLayouts);

  console.log(
    `\n\n\🚀 Dapp configuration file updated at ${dappConfigFile}\n\n`
  );

  async function createTestAccounts(count) {
    let solana = new Solana(config);
    for (let a = 0; a < count; a++) {
      // Create the account with the public keys
      let accountObj = await solana.createAccount({
        lamports: 1000000,
        entropy: null,
      });
      let account = {
        publicKey: accountObj.publicKey.toBase58(),
        privateKey: binary_to_base58(accountObj.secretKey),
      };
      dappConfig.wallets.push(account);
      dappConfig.accounts.push(account.publicKey);

      if (a === count - 1) {
        // Write the configuration file with test accounts for use in the web app dev
        // We do this here to account for the scenario where there is no contract to
        // deploy in which case the file would never be written.
        fs.writeFileSync(
          dappConfigFile,
          JSON.stringify(dappConfig, null, "\t"),
          "utf8"
        );
      }
    }
  }

  async function deployProgram(accountDataLayouts) {

    let programsPath = path.resolve(__dirname, '..','..','programs');
    spawn.sync('cargo',  [
                            'build-bpf', 
                            `--manifest-path=${programsPath}${SLASH}Cargo.toml`,
                            `--bpf-out-dir=${programsPath}${SLASH}build`
                         ], { stdio: 'inherit' });

    let program = fs.readFileSync(`${programsPath}${SLASH}build${SLASH}dapp.so`);
    let solana = new Solana(config);

    console.log(
      `\n\n\⚙️  Deploying program to blockchain...\n\n`
    );

    let result = await solana.deployProgram(program, accountDataLayouts);

    console.log(
      `\n\n\💰 Payer account ${result.programAccounts[PAYER].publicKey} created with ${result.programAccounts[PAYER].lamports } lamports for fees.\n\n`
    );

    for(let accountName in result.programAccounts) {
      if (accountName !== PAYER) {
        console.log(
          `\n\n\📄 State account ${result.programAccounts[accountName].publicKey} created with ${result.programAccounts[accountName].lamports} lamports for fees.\n\n`
        );      
      }
    }

    console.log('Program loaded to account ', result.programId);

    dappConfig.programInfo = result;
    fs.writeFileSync(
      dappConfigFile,
      JSON.stringify(dappConfig, null, "\t"),
      "utf8"
    );

    return result;
  }
})();
