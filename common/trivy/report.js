const fs = require("fs");

class TrivyReport {
	constructor() {}

	readReport(filePath) {
		let rawdata = fs.readFileSync(filePath);
		let student = JSON.parse(rawdata);
		console.log(student);
	}
}
