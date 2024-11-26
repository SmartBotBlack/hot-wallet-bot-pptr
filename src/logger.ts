export class Logger {
	private prefixLog: string;

	constructor(id: number) {
		this.prefixLog = `profile${id}: `;
	}

	public info(str: string) {
		console.log(this.prefixLog + str);
	}

	public error(str: Error) {
		console.error(this.prefixLog + str);
	}
}
