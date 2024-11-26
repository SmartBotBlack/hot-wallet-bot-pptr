# Hot wallet bot

These are automatic mines, though.

It is a real browser, but it is the back ground, so it does interfere with your work.

## Instalation guide

1. Install [NodeJS](https://nodejs.org/).
2. Clone this repository `git clone https://github.com/SmartBotBlack/hot-wallet-bot-pptr.git`.
3. Go to folder bot `cd hot-wallet-bot-pptr`.
4. Use the command `npm ci` to install the lib.


## Preparing accounts

Before launching, you must slime hot at least once on your account

1. You need to go to the accounts.ts file and add the number of browsers and proxies for them, in the form id and proxy, 
 - where id is the unique address of the browser (1 browser - 1 telegram account)
 - Proxy of the form login:password:ip:port
2. Run the session creation process, `npm run createSession`
3. When you open your browser, log in to Telegram in any convenient way (QR code or phone number).
4. After authorization, the hot wallet application will automatically open, where you will need to go, that is, import the wallet.
5. Continue the import process until you reach the main screen where your hot balance is displayed.


## Running Instructions

After all the dependencies have been downloaded and installed, simply run:

```
npm run mine
```