define(['modules/core/src/ChordModel'], function(ChordModel) {
	var ChordModel_CSLJson = {};

	ChordModel_CSLJson.importFromMusicCSLJSON = function(JSONChord) {
		console.log("JSONChord=");
		console.log(JSONChord);
		var chordModel = new ChordModel();
		var root = JSONChord.p;
		var type = JSONChord.ch;
		if (root == undefined) root = JSONChord.root; //TODO: patch as temporary
		if (type == undefined) type = JSONChord.type; //TODO: patch as temporary
		chordModel.setNote(root);
		chordModel.setChordType(type);
		chordModel.setParenthesis(JSONChord.parenthesis);
		chordModel.setBeat(JSONChord.beat);
		if (JSONChord.hasOwnProperty('bp') && JSONChord.bp.length !== 0) {
			var chordModelBase = new ChordModel();
			chordModelBase.setNote(JSONChord.bp);
			chordModelBase.setChordType(JSONChord.bch);
			chordModel.setBase(chordModelBase);
		}
		if (JSONChord.barNumber != null) {
			chordModel.barNumber = JSONChord.barNumber;
		}
		return chordModel;
	};


	ChordModel_CSLJson.exportToMusicCSLJSON = function(chordModel, withNumMeasure) {
		if (withNumMeasure === undefined) withNumMeasure = false;
		var chord = {};
		if (typeof chordModel !== "undefined" && chordModel instanceof ChordModel) {
			chord.p = chordModel.getNote();
			chord.ch = chordModel.getChordType();
			if (chordModel.getParenthesis())
				chord.parenthesis = chordModel.getParenthesis();

			chord.beat = chordModel.getBeat();
			if (!chordModel.isEmptyBase()) {
				chordBase = chordModel.getBase();
				if (chordBase instanceof ChordModel) {
					chord.bp = '';
					if (chordBase.getNote() !== "undefined") {
						chord.bp = chordBase.getNote();
					}
					chord.bch = '';
					if (chordBase.getChordType() !== "undefined") {
						chord.bch = chordBase.getChordType();
					}
				}
			}
			if (withNumMeasure) chord.barNumber = chordModel.barNumber;
		}
		return chord;
	};

	return ChordModel_CSLJson;
});