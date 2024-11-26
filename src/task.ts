import type { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Logger } from "./logger";
import { getUserAgent, type TProxy } from "./utils";
import "dotenv/config";

puppeteer.use(StealthPlugin());

const args = [
	"--disable-gpu",
	"--no-sandbox",
	"--enable-features=NetworkService,NetworkServiceInProcess",
	"--disable-dev-shm-usage",
	"--disable-infobars",
	"--disable-extensions",
	"--disable-setuid-sandbox",
	`--user-agent=${getUserAgent()}`,
	"--ignore-certifcate-errors",
	"--ignore-certifcate-errors-spki-list",
	"--disable-accelerated-2d-canvas",
	"--no-first-run",
	"--no-zygote",
	"--force-gpu-mem-available-mb=1024",
	"--disable-web-security",
	"--disable-features=site-per-process",
	"--no-default-browser-check",
];

const convertTime = async (input: string) => {
	const parts = input.split(" ");

	let hours = 0;
	let minutes = 0;

	for (const part of parts) {
		if (part.endsWith("h")) {
			hours = Number.parseInt(part.slice(0, -1), 10);
		} else if (part.endsWith("m")) {
			minutes = Number.parseInt(part.slice(0, -1), 10);
		}
	}

	const totalMilliseconds = hours * 60 * 60 * 1000 + minutes * 60 * 1000;

	return totalMilliseconds;
};

const getPage = async (
	options: object,
	proxy: TProxy | undefined,
	logger: Logger,
): Promise<{ page: Page; browser: Browser }> => {
	logger.info("Browser is waiting in the launch queue");
	logger.info("Browser run");
	if (proxy) args.push(`--proxy-server=${proxy.ip}:${proxy.port}`);

	const browser = await puppeteer.launch(options);
	logger.info("Get browser");

	const page = (await browser.pages())[0];

	logger.info("Get page");

	if (proxy) {
		logger.info(
			`Use proxy ${proxy.ip}:${proxy.port}@${proxy.login}:${proxy.password}`,
		);
		await page.authenticate({
			username: proxy.login,
			password: proxy.password,
		});
	}

	await page.goto("https://web.telegram.org/k/#@herewalletbot", {
		waitUntil: "networkidle0",
		timeout: 0,
	});

	return { page, browser };
};

const task = async (id: number, proxyStr?: string): Promise<void> => {
	const logger = new Logger(id);
	const options = {
		args,
		ignoreDefaultArgs: [
			"--enable-automation",
			"--enable-blink-features=IdleDetection",
		],
		headless: process.env.NODE_ENV !== "development",
		userDataDir: `/tmp/profile${id}`,
		slowMo: 20,
		ignoreHTTPSErrors: true,
	};

	logger.info("Run!");

	let proxy: TProxy | undefined = undefined;
	if (proxyStr) {
		const [login, password, ip, port] = proxyStr.split(":");
		proxy = { login, password, ip, port };
	}

	const { browser, page } = await getPage(options, proxy, logger);

	const openHotWalletXpath =
		"::-p-xpath(//div[@class='new-message-bot-commands-view'][contains(text(),'Open Wallet')])";

	const launchPopPup = ".popup-button.btn .i18n";

	const storageBtnXpath = "::-p-xpath(//h4[contains(text(), 'Storage')])";

	const btnClaimSel =
		"#root > div > div > div:nth-child(3) > div > div:nth-child(3) > div > div:nth-child(2) > div:nth-child(3) > button";

	const gashotSel =
		"body > div:nth-child(8) > div > div.react-modal-sheet-content > div > div > div:nth-child(3) > button";

	try {
		await page.waitForSelector(openHotWalletXpath);
		await page.click(openHotWalletXpath);

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

		await hotWallet.waitForSelector(storageBtnXpath, { timeout: 15000 });
		await new Promise((res) => setTimeout(res, 3000));

		logger.info("Find storage");

		await hotWallet.click(storageBtnXpath);

		await hotWallet.waitForSelector(
			"#root > div > div > div:nth-child(3) > div > div:nth-child(3) > div > div:nth-child(2)",
		);

		while (true) {
			const contentBtn = await hotWallet.$eval(
				btnClaimSel,
				(el) => el.textContent,
			);

			const getTimeToRecovery = await hotWallet.$eval(
				"#root > div > div > div:nth-child(3) > div > div:nth-child(3) > div > div:nth-child(2) > div:nth-child(2) > p:nth-child(2)",
				(el) => el.textContent,
			);

			if (!getTimeToRecovery) throw Error("Time to recovery is nul");

			if (getTimeToRecovery.includes("fill")) {
				logger.info(
					`Mining is currently in progress, time to recovery: ${getTimeToRecovery}`,
				);
				const timeToRecovery = await convertTime(getTimeToRecovery);
				await new Promise((res) => setTimeout(res, timeToRecovery + 10000));
				continue;
			}

			logger.info(`Btn content is ${contentBtn}`);

			if (contentBtn?.includes("NEWS")) {
				logger.info("Find NEWS btn");
				await hotWallet.click(btnClaimSel);
			}

			if (contentBtn === "Claim HOT") {
				logger.info("Find claim btn");
				await hotWallet.click(btnClaimSel);
			}

			try {
				logger.info("Gas selection window found, hot selected by default");
				await hotWallet.waitForSelector(gashotSel, { timeout: 25000 });
				await hotWallet.click(gashotSel);
			} catch (er) {
				logger.error(er as Error);
			}
		}
	} catch (er) {
		const error = er as Error;
		logger.info("Throw Error");
		logger.error(error);

		try {
			const pages = await browser.pages();
			for (const anotherPage of pages) {
				await anotherPage.screenshot({
					type: "png",
					path: `./errors/${new Date().toString()}-${await anotherPage.title()}.png`,
				});
			}
		} catch (er) {
			logger.info("Can't take screenshot");
			logger.error(er as Error);
		}
	} finally {
		await browser?.close();
	}
};

export default task;
