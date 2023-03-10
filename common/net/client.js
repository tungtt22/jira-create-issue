const fetch = require("node-fetch");

module.exports =
	(serviceName) =>
	async (state, apiMethod = "unknown") => {
		const response = await fetch(state.req.url, state.req);
    console.log(state.req)
		state.res = {
			headers: response.headers?.raw(),
			status: response.status,
		};

		// const tags = {
		//   api_method: apiMethod,
		//   method: state.req.method || 'GET',
		//   response_code: response.status,
		//   service: serviceName,
		// }

		state.res.body = await response.text();

		const isJSON = (response.headers.get("content-type") || "").includes(
			"application/json"
		);

		if (isJSON && state.res.body) {
			state.res.body = JSON.parse(state.res.body);
		}

		if (!response.ok) {
			throw new Error(response.statusText);
		}
		return state;
	};
