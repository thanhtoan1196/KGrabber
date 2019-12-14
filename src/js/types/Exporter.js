// needed for jsdoc
/* eslint-disable no-unused-vars */
const Status = require("./Status");
/* eslint-enable no-unused-vars */

module.exports = class Exporter {
	/**
	 * @param {Object} obj
	 * @param {String} obj.name Display name
	 * @param {String} obj.extension File extension
	 * @param {Boolean} obj.requireSamePage Does the exporter require additional information from the show's page?
	 * @param {String[]} obj.linkTypes The LinkTypes the exporter supports
	 * @param {function(Status):String} func
	 */
	constructor({ name, extension, requireSamePage, linkTypes }, func) {
		this.name = name;
		this.extension = extension;
		this.requireSamePage = requireSamePage;
		this.linkTypes = linkTypes;
		this._export = func;
		Object.freeze(this);
	}

	/**
	 * Runs the exporter
	 * @param {Status} status
	 * @returns {String}
	 */
	export (status) {
		return this._export(status);
	}
};