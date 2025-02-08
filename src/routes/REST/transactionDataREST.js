export default async function transactionDataREST(req, res) {
    try {
        const transactionUpdate = (e) => {
        res.json(e);
        };
    
        await checkAndUpdateLatestTransactionData(transactionUpdate);
    } catch (error) {
        console.log(error);
    }
}