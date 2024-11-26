import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const args = [
	"--window-size=1680,1220",
	"--disable-gpu",
	"--no-sandbox",
	"--enable-features=NetworkService,NetworkServiceInProcess",
	"--disable-dev-shm-usage",
	"--disable-infobars",
	"--disable-extensions",
	"--disable-setuid-sandbox",
	"--ignore-certifcate-errors",
	"--ignore-certifcate-errors-spki-list",
	// ...
	// "--single-process",
	"--disable-accelerated-2d-canvas",
	"--no-first-run",
	"--no-zygote",
	"--force-gpu-mem-available-mb=1024",
];

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
	userDataDir: "/tmp/profile1",
};

void (async () => {
	const browser = await puppeteer.launch(options);

	const page = await browser.newPage();
	await page.goto("https://web.telegram.org/", {
		waitUntil: "networkidle0",
		timeout: 0,
	});

	await new Promise((res) => setTimeout(res, 3e10));
})();
