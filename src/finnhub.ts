import { delay } from './utils';

const fh = require('finnhub');
const api_key = fh.ApiClient.instance.authentications['api_key'];
api_key.apiKey = 'c7kg752ad3i9q0uqp8tg';
const finnhubClient = new fh.DefaultApi();

export async function get_stock_price(ticker: string) {
    let result = null;
    let checked = false;
    finnhubClient.quote(ticker, (error, data, response) => {
        checked = true;
        if (error) {
            console.log(error);
            return;
        }
        result = data;
    });
    while (!checked) {
        await delay(10);
    }
    //console.log(result);
    return result;
}
