const SNS = LOAD.library("sns");
module.exports = new class extends Controller {
	constructor() {
		super();
	}
	sendcode() {
		if ( !post(data => {
			SNS.sendcode( {
				openid : data.openid,
				tel : data.tel
			} );
		} ) ) end("Param Error!");
	}
}();