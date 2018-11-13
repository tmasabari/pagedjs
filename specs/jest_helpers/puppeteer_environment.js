const chalk = require('chalk');
const NodeEnvironment = require('jest-environment-node');
const puppeteer = require('puppeteer');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { WS_ENDPOINT_PATH, DIR, DEBUG, ORIGIN, PDF_SETTINGS } = require('./constants');

class PuppeteerEnvironment extends NodeEnvironment {
	constructor(config) {
		super(config);
	}

	async setup() {
		DEBUG && console.log(chalk.yellow('Setup Test Environment.'));
		await super.setup()
		const wsEndpoint = fs.readFileSync(WS_ENDPOINT_PATH, 'utf8');
		if (!wsEndpoint) {
			throw new Error('wsEndpoint not found');
		}
		this.global.browser = await puppeteer.connect({
			browserWSEndpoint: wsEndpoint,
		})

		this.global.loadPage = this.loadPage.bind(this);

		this.global.ORIGIN = ORIGIN;
		this.global.DEBUG = DEBUG;
		this.global.PDF_SETTINGS = PDF_SETTINGS;
	}

	async teardown() {
		DEBUG && console.log(chalk.yellow('Teardown Test Environment.'));
		await super.teardown();
	}

	runScript(script) {
		return super.runScript(script);
	}

	handleError(error) {
		console.error(error);
	}

	async loadPage(path) {
		let page = await this.global.browser.newPage();
		let renderedResolve, renderedReject;
		page.rendered = new Promise(function(resolve, reject) {
			renderedResolve = resolve;
			renderedReject = reject;
		});

		page.addListener('pageerror', (error) => {
			this.handleError(error);
			renderedReject(error);
		});

		page.addListener('error', (error) => {
			this.handleError(error);
			renderedReject(error);
		});

		// await page.exposeFunction('PuppeteerLogger', (msg, counter) => {
		// 	console.log(msg, counter);
		// });

		await page.exposeFunction('onPagesRendered', (msg, width, height, orientation) => {
			renderedResolve(msg, width, height, orientation);
		});

		await page.goto(ORIGIN + '/specs/' + path, { waitUntil: 'networkidle2' });

		return page;
	}
}

module.exports = PuppeteerEnvironment;
