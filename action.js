const FormData = require("form-data");
const fs = require("fs");
const Jira = require("./common/net/Jira");

module.exports = class {
	constructor({ githubEvent, argv, config }) {
		this.Jira = new Jira({
			baseUrl: config.baseUrl,
			token: config.token,
			email: config.email,
		});

		this.config = config;
		this.argv = argv;
		this.githubEvent = githubEvent;
	}

	async execute() {
		const { argv } = this;
		const projectKey = argv.project;
		const issuetypeName = argv.issuetype;

		// map custom fields
		const { projects } = await this.Jira.getCreateMeta({
			expand: "projects.issuetypes.fields",
			projectKeys: projectKey,
			issuetypeNames: issuetypeName,
		});

		console.log(this.argv);

		if (projects.length === 0) {
			console.error(`project '${projectKey}' not found`);

			return;
		}

		const [project] = projects;

		if (project.issuetypes.length === 0) {
			console.error(`issuetype '${issuetypeName}' not found`);

			return;
		}

		let providedFields = [
			{
				key: "project",
				value: {
					key: projectKey,
				},
			},
			{
				key: "issuetype",
				value: {
					name: issuetypeName,
				},
			},
			{
				key: "summary",
				value: argv.summary,
			},
		];

		if (argv.description) {
			providedFields.push({
				key: "description",
				value: argv.description,
			});
		}

		if (argv.labels) {
			const labels = argv.labels.split(",");
			providedFields.push({
				key: "labels",
				value: labels,
			});
		}

		const form = new FormData();
		if (argv.attachments) {
			for (const attachment of argv.attachments) {
				// const stats = fs.statSync(attachment);
				// const fileSizeInBytes = stats.size;
				const fileStream = fs.createReadStream(attachment);

				form.append("file", fileStream, { knownLength: fileSizeInBytes });
			}
		}

		if (argv.fields) {
			providedFields = [
				...providedFields,
				...this.transformFields(argv.fields),
			];
		}

		// const payload = providedFields.reduce(
		// 	(acc, field) => {
		// 		acc.fields[field.key] = field.value;

		// 		return acc;
		// 	},
		// 	{
		// 		fields: {},
		// 	}
		// );

		// const issue = await this.Jira.createIssue(payload);

		const attachment = await this.Jira.addIssueAttachments("SECURITY-6", form);
		console.log(attachment);
		// return { issue: issue.key };

		return { issue: "AAAA" };
	}

	transformFields(fieldsString) {
		const fields = JSON.parse(fieldsString);

		return Object.keys(fields).map((fieldKey) => ({
			key: fieldKey,
			value: fields[fieldKey],
		}));
	}
};
