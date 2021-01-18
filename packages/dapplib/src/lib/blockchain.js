const { Solana } = require('./solana');

module.exports = class Blockchain {

    /**
     * @dev Reads data from an account
     */
    static async get(env, accountName) {
        let solana = new Solana(env.config);
        let account = env.config.programInfo.programAccounts[accountName];
        if (!account) {
            throw new Error(`Account ${accountName} does not exist.`);
        }

        let accountInfo = await solana.getAccountInfo(account.publicKey);
        let layoutItem = Solana.getDataLayouts().filter((item) => { return item.name === accountName });
        let layout = layoutItem.length > 0 ? layoutItem[0].layout : null;        
        let resultData = null;

        if (accountInfo && layout) {
            resultData = layout.decode(Buffer.from(accountInfo.data));
        }

        return {
            callAccount: account.publicKey,
            callData: resultData
        }
    }

    /**
     * @dev Updates an account's data
     */
    static async put(env, accountName, data) {
        let solana = new Solana(env.config);
        
        let tx =  await solana.submitTransaction({
            keys: [{pubKey: Solana.getAccount(env.config.programInfo.programAccounts[accountName].publicKey), isSigner: false, isWritable: true}],
            payer: (env.config.programInfo.programAccounts['payer'].publicKey),
            data
        });

        return {
            callAccount: env.config.programInfo.programAccounts[accountName].publicKey,
            callData: resultData
        }
    }

    /**
     * @dev Calls a program function
     */
    static async post(env, tx, args) {
        return 'Not implemented';
    } 
}
