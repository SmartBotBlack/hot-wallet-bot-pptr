import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { acc } from "../accounts";
import { Logger } from "./logger";
import type { Browser } from "puppeteer";
import { getUserAgent, type TProxy } from "./utils";

puppeteer.use(StealthPlugin());

const args = [
	"--no-sandbox",
	"--disable-setuid-sandbox",
	"--disable-features=site-per-process",
	"--window-size=1680,1220",
	"--disable-gpu",
	"--enable-features=NetworkService,NetworkServiceInProcess",
	"--disable-dev-shm-usage",
	"--disable-infobars",
	"--disable-extensions",
	"--ignore-certifcate-errors",
	"--ignore-certifcate-errors-spki-list",
	"--disable-accelerated-2d-canvas",
	"--no-first-run",
	"--no-zygote",
	"--force-gpu-mem-available-mb=1024",
];

const startCreateSession = async (id: number, proxy?: TProxy) => {
	const options = {
		args,
		ignoreDefaultArgs: ["--enable-automation"],
		headless: false,
		slowMo: 120,
		ignoreHTTPSErrors: true,
		defaultViewport: {
			width: 1648,
			height: 1099,
		},
		userDataDir: `/tmp/profile${id}`,
	};

	const logger = new Logger(id);

	args.push(`--user-agent=${getUserAgent()}`);
	if (proxy) args.push(`--proxy-server=${proxy.ip}:${proxy.port}`);

	let browser: Browser | undefined;
	let cycle = true;
	try {
		browser = await puppeteer.launch(options);
		logger.info("Start create session");
		const page = await browser.newPage();

		if (proxy)
			await page.authenticate({
				username: proxy.login,
				password: proxy.password,
			});

		await page.goto("https://web.telegram.org/", {
			waitUntil: "networkidle0",
			timeout: 0,
		});

		while (cycle) {
			try {
				await page.waitForSelector(`input[type="text"]`, { timeout: 5000 });
				await new Promise((res) => setTimeout(res, 3000));

				await page.goto("https://web.telegram.org/k/#@herewalletbot", {
					waitUntil: "networkidle0",
					timeout: 0,
				});

				logger.info("Open page");

				const openHotWalletXpath =
					"::-p-xpath(//div[@class='new-message-bot-commands-view'][contains(text(),'Open Wallet')])";

				const launchPopPup = ".popup-button.btn .i18n";

				const storageBtnXpath =
					"::-p-xpath(//h4[contains(text(), 'Storage')] )";

				await page.waitForSelector(openHotWalletXpath);
				await page.click(openHotWalletXpath);

				try {
					await page.waitForSelector(launchPopPup, { timeout: 5000 });
					await page.click(launchPopPup);
				} catch (er) {
					const error = er as Error;
					logger.error(error);
				}

				const hotWallet = page.frames()[1];

				logger.info("Perform an account import");

				while (cycle) {
					try {
						await hotWallet.waitForSelector(storageBtnXpath, { timeout: 7000 });
						await new Promise((res) => setTimeout(res, 3000));
						cycle = false;
					} catch (error) {
						logger.info("No hot wallet login found");
					}
				}

				logger.info("Session done");
			} catch (er) {
				const error = er as Error;
				if (!error.message.includes(".input-search")) throw error;
				logger.info("Log in to telegram via the browser that opens");
			}
		}
	} catch (error) {
		const er = error as Error;
		await new Promise((res) => setTimeout(res, 300000));
		logger.error(er);
	} finally {
		await browser?.close();
	}
};

void (async () => {
	for (const account of acc) {
		const { id, proxy: proxyStr } = account;
		let proxy: TProxy | undefined = undefined;
		if (proxyStr) {
			const [login, password, ip, port] = proxyStr.split(":");
			proxy = { login, password, ip, port };
		}

		await startCreateSession(id, proxy);
	}
})();
