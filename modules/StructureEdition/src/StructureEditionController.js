define([
	'jquery',
	'mustache',
	'modules/Cursor/src/CursorModel',
	'modules/core/src/SongModel',
	'modules/core/src/SectionModel',
	'modules/core/src/NoteManager',
	'modules/core/src/NoteModel',
	'modules/core/src/SongBarsIterator',
	'modules/core/src/TimeSignatureModel',
	'modules/MidiCSL/src/converters/SongConverterMidi_MidiCSL',
	'utils/NoteUtils',
	'utils/UserLog',
	'pubsub',
], function($, Mustache, CursorModel, SongModel, SectionModel, NoteManager, NoteModel, SongBarsIterator, TimeSignatureModel, SongConverterMidi_MidiCSL, NoteUtils, UserLog, pubsub) {

	function StructureEditionController(songModel, cursor, structEditionModel) {
		this.songModel = songModel || new SongModel();
		this.cursor = cursor || new CursorModel();
		this.initSubscribe();
		this.structEditionModel = structEditionModel;
	}

	/**
	 * Subscribe to view events
	 */
	StructureEditionController.prototype.initSubscribe = function() {
		var self = this;
		var fn;
		// All functions related with note edition go here
		$.subscribe('StructureEditionView', function(el, fn, param) {
			//if (self.noteSpaceMng.isEnabled()) {
			self[fn].call(self, param);
			$.publish('ToViewer-draw', self.songModel);
			//}
		});
		$.subscribe('CursorModel-setPos', function(el) {
			self.setCurrentElementFromCursor();
		});
	};

	StructureEditionController.prototype.setCurrentElementFromCursor = function() {
		if (typeof this.structEditionModel === "undefined") {
			return;
		}
		var currentBarNumber = this.songModel.getComponent('notes').getNoteBarNumber(this.cursor.getStart(), this.songModel);
		var currentBar = this.songModel.getComponent('bars').getBar(currentBarNumber);
		// TODO get tonality at
		this.structEditionModel.setSelectedBar(currentBar);
		var currentSectionNumber = this.songModel.getSectionNumberFromBarNumber(currentBarNumber);
		var currentSection = this.songModel.getSection(currentSectionNumber);
		this.structEditionModel.setSelectedSection(currentSection);
	};

	StructureEditionController.prototype.addSection = function() {
		/*var selBars = this._getSelectedBars();
		if (selBars.length !== 0) {
			return;
		}*/

		// TODO add section after current section position
		var numberOfBarsToCreate = 2;
		var barManager = this.songModel.getComponent('bars');

		// clone last bar
		var indexLastBar = barManager.getTotal() - 1;

		// now we add bars to this section and fill them with silences
		var noteManager = this.songModel.getComponent('notes');
		var indexLastNote = noteManager.getTotal() - 1;
		var beatDuration = this.songModel.getTimeSignatureAt(indexLastBar).getQuarterBeats();

		for (var i = 0; i < numberOfBarsToCreate; i++) {
			barManager.addBar(barManager.getBar(indexLastBar).clone());
			noteManager.fillGapWithRests(beatDuration);
		}
		var section = new SectionModel({
			'numberOfBars': numberOfBarsToCreate
		});
		this.songModel.addSection(section);

		UserLog.logAutoFade('info', "Section has been added successfully");
		$.publish('ToLayers-removeLayer');
		$.publish('ToHistory-add', 'Add Section');
		this.cursor.setPos(indexLastNote + 1);
	};

	StructureEditionController.prototype.removeSection = function() {
		if (this.songModel.getSections().length === 1) {
			UserLog.logAutoFade('error', "You can't delete last section");
			return;
		}
		var selBars = this._getSelectedBars();
		if (selBars.length === 0) {
			return;
		}
		var sectionNumber = this.songModel.getSectionNumberFromBarNumber(selBars[0]);

		var startBar = this.songModel.getStartBarNumberFromSectionNumber(sectionNumber);
		var numberOfBars = this.songModel.getSection(sectionNumber).getNumberOfBars();

		//var barManager = this.songModel.getComponent('bars');
		var noteManager = this.songModel.getComponent('notes');
		//var notes;
		// console.log(sectionNumber, startBar, numberOfBars);
		for (var i = 0; i < numberOfBars; i++) {
			//notes = noteManager.getNotesAtBarNumber(startBar, this.songModel);
			//for (var j = notes.length - 1; j >= 0; j--) {
			//	noteManager.deleteNote(noteManager.getNoteIndex(notes[j]));
			//}
			this._removeBar(startBar);
			//barManager.removeBar(startBar); // each time we remove index move so we don't need to sum startBar with i

		}
		// check if cursor not outside
		var indexLastNote = noteManager.getTotal() - 1;
		if (this.cursor.getEnd() > indexLastNote) {
			this.cursor.setPos(indexLastNote);
		}

		// Remove section in songmodel is not needed because it's done when we remove last sections bar
		//this.songModel.removeSection(sectionNumber);
		UserLog.logAutoFade('info', "Section have been removed successfully");
		$.publish('ToLayers-removeLayer');
		$.publish('ToHistory-add', 'Remove Section');

	};

	StructureEditionController.prototype.setSectionName = function(name) {
		if (typeof name === "undefined") {
			return;
		}
		var selBars = this._getSelectedBars();
		if (selBars.length === 0) {
			return;
		}
		var sectionNumber = this.songModel.getSectionNumberFromBarNumber(selBars[0]);
		this.songModel.getSection(sectionNumber).setName(name);
		$.publish('ToViewer-draw', this.songModel);
		$.publish('ToHistory-add', 'Rename Section ' + name);
	};

	// Carefull, if a section is played 2 times, repeatTimes = 1
	StructureEditionController.prototype.setRepeatTimes = function(repeatTimes) {
		if (typeof repeatTimes === "undefined") {
			return;
		}
		var selBars = this._getSelectedBars();
		if (selBars.length === 0) {
			return;
		}
		var sectionNumber = this.songModel.getSectionNumberFromBarNumber(selBars[0]);
		this.songModel.getSection(sectionNumber).setRepeatTimes(repeatTimes);

		$.publish('ToHistory-add', 'Change Section repeat' + repeatTimes);

	};

	StructureEditionController.prototype.addBar = function() {
		var selBars = this._getSelectedBars();
		var numBar = 0;
		if (selBars.length !== 0) {
			numBar = selBars[0] + 1; // add bar after current one
		}

		var nm = this.songModel.getComponent('notes');
		//get the duration of the bar, and create a new bar with silences
		var beatDuration = this.songModel.getTimeSignatureAt(numBar).getQuarterBeats();
		var newBarNm = new NoteManager(); //Create new Bar NoteManager
		//if is first bar we add a note, otherwise there are inconsistencies with duration of a bar
		if (numBar === 0) {
			newBarNm.addNote(new NoteModel("E/4-q"));
			beatDuration = beatDuration - 1;
		}
		//insert those silences
		newBarNm.fillGapWithRests(beatDuration);

		//get numBeat from first note of current bar
		var numBeat = this.songModel.getStartBeatFromBarNumber(numBar);
		// get the index of that note
		var index = nm.getNextIndexNoteByBeat(numBeat);

		// remove a possibly tied notes
		if (typeof nm.getNote(index) !== "undefined" && nm.getNote(index).isTie('stop')) {
			var tieType = nm.getNote(index).getTie();
			if (tieType === "stop") {
				nm.getNote(index).removeTie();
				var tieTypePrevious = nm.getNote(index - 1).getTie();
				if (tieTypePrevious === 'start') {
					nm.getNote(index - 1).removeTie();
				} else if (tieTypePrevious === 'start_stop') {
					nm.getNote(index - 1).setTie("stop");
				}
			} else {
				// case it's start or stop_start
				nm.getNote(index).setTie("start");
			}
		}
		nm.notesSplice([index, index - 1], newBarNm.getNotes());

		//add bar to barManager
		var barManager = this.songModel.getComponent('bars');
		barManager.insertBar(numBar, this.songModel);

		// decal chords
		this.songModel.getComponent('chords').incrementChordsBarNumberFromBarNumber(1, numBar);
		$.publish('ToLayers-removeLayer');
		$.publish('ToHistory-add', 'Add Bar');
	};

	/**
	 * Function deletes selected bars
	 */
	StructureEditionController.prototype.removeBar = function() {
		var selBars = this._getSelectedBars();
		if (selBars.length === 0) {
			return;
		}
		for (var i = selBars.length - 1; i >= 0; i--) {
			this._removeBar(selBars[i]);
		}
		$.publish('ToLayers-removeLayer');
		$.publish('ToHistory-add', 'Remove Bar');
	};

	/**
	 * Function deletes bar and all it's components with index, it also delete section if it was the last bar of the section
	 */
	StructureEditionController.prototype._removeBar = function(barNumber) {
		var bm = this.songModel.getComponent('bars');
		var nm = this.songModel.getComponent('notes');
		var cm = this.songModel.getComponent('chords');


		var sectionNumber = this.songModel.getSectionNumberFromBarNumber(barNumber);
		var section = this.songModel.getSection(sectionNumber);
		var sectionNumberOfBars = section.getNumberOfBars();
		if (sectionNumberOfBars === 1 && this.songModel.getSections().length === 1) {
			UserLog.logAutoFade('warn', "Can't delete the last bar of the last section.");
			return;
		}

		// adjust section number of bars
		section.setNumberOfBars(sectionNumberOfBars - 1);

		// remove notes in bar
		var beatDuration = this.songModel.getTimeSignatureAt(barNumber).getQuarterBeats() - 1; // I am not sure why we remove 1 here
		var numBeat = this.songModel.getStartBeatFromBarNumber(barNumber);
		var index = nm.getNextIndexNoteByBeat(numBeat);
		var index2 = nm.getPrevIndexNoteByBeat(numBeat + beatDuration);
		nm.notesSplice([index, index2], []);

		// remove chords in bar
		cm.removeChordsByBarNumber(barNumber);

		// adjust all chords bar number
		cm.incrementChordsBarNumberFromBarNumber(-1, barNumber);

		bm.removeBar(barNumber);

		// We remove the section in songModel if it was the last bar of the section
		if (sectionNumberOfBars === 1) {
			this.songModel.removeSection(sectionNumber);
		}
		this.cursor.setPos(index - 1);
	};



	StructureEditionController.prototype.setTimeSignature = function(timeSignature) {
		/**
		 * modifies selBars end index, if there is a time signature change, selection is reduced until the bar before the time change,
		 * this behaviour is copied from Sibelius
		 * @return {Boolean} tells if we actually reduced selection or not, later we set Time Signature change to the previous only if we did not reduce. 
		 */
		function reduceSelectionIfChanges() {
			//if there are timeSig changes in selection we just take until change
			var barsIt = new SongBarsIterator(song);
			var timeSigChangesInSelection = false,
				iBar,
				prevTimeSignature;
			barsIt.setBarIndex(selBars[0] + 1); //we check if there is a timeSig change in the middle (not in first bar) 
			while (barsIt.getBarIndex() <= selBars[1]) {
				iBar = barsIt.getBarIndex();

				if (barsIt.doesTimeSignatureChange()) {
					timeSigChangesInSelection = true;
					selBars[1] = barsIt.getBarIndex() - 1;
					break;
				}
				barsIt.next();
			}
			return timeSigChangesInSelection;
		}
		/**
		 * @param  {Array} selBars       indexes of bars selected
		 * @param  {Array} selectedNotes notes selected
		 * @param  {Integer} numSelectedBars notes selected
		 * @param  {TimeSignaureModel} newTimeSig    new time signature
		 * @return {Array}               notes adapted to new time signature
		 */
		function calcAdaptedNotes(selBars, selectedNotes, numSelectedBars, newTimeSig) {
			var tmpNm = new NoteManager();
			tmpNm.setNotes(selectedNotes);
			var notes = tmpNm.getNotesAdaptedToTimeSig(newTimeSig, numSelectedBars);
			tmpNm.setNotes(notes);
			var numBars = tmpNm.getTotalDuration() / newTimeSig.getQuarterBeats();
			return {
				notes: notes,
				numBars: numBars
			};
		}

		//actually starts here
		var selBars = [];
		selBars[0] = this.songModel.getComponent('notes').getNoteBarNumber(this.cursor.getStart(), this.songModel);
		selBars[1] = this.songModel.getComponent('notes').getNoteBarNumber(this.cursor.getEnd(), this.songModel);
		if (selBars.length === 0) {
			return;
		}

		var song = this.songModel,
			barMng = song.getComponent("bars"),
			noteMng = song.getComponent("notes"),
			newTimeSig = new TimeSignatureModel(timeSignature);

		//we check if there are time signature changes within the selection in that case selection is reduced until first change, selBars[1] is modified 
		var timeSigChangesInSelection = reduceSelectionIfChanges();

		//we get start and en beats of selection
		var startBeat = song.getStartBeatFromBarNumber(selBars[0]);
		var endBeat = (barMng.getTotal() - 1 === selBars[1]) ? null : song.getStartBeatFromBarNumber(selBars[1] + 1);

		//we get selected notes and adapt them to new time signature
		var indexes = noteMng.getIndexesStartingBetweenBeatInterval(startBeat, endBeat);
		var selectedNotes = noteMng.cloneElems(indexes[0], indexes[1]);
		var numSelectedBars = selBars[1] + 1 - selBars[0];
		var calc;
		try {
			calc = calcAdaptedNotes(selBars, selectedNotes, numSelectedBars, newTimeSig);
			var adaptedNotes = calc.notes;
			var numBarsAdaptedNotes = calc.numBars;

			//HERE we change time signature
			var prevTimeSignature = song.getTimeSignatureAt(selBars[0]);
			barMng.getBar(selBars[0]).setTimeSignatureChange(timeSignature);

			//check if we have to create bars to fit melody (normally if new time sign. has less beats than old one)
			var diffBars = numBarsAdaptedNotes - numSelectedBars;
			if (diffBars) {
				barMng.insertBar(selBars[1], song, diffBars);
			}


			//we set previous time signature in the bar just after the selection, only if there are no time sign. changes and if we are not at end of song
			var indexFollowingBar = selBars[1] + diffBars + 1;
			if (barMng.getTotal() > indexFollowingBar && // if following bar exists
				!timeSigChangesInSelection &&
				!barMng.getBar(indexFollowingBar).getTimeSignatureChange()) //if there is no time signature change in following bar
			{
				barMng.getBar(indexFollowingBar).setTimeSignatureChange(prevTimeSignature.toString());
			}

			//we set end index to -1 because notesSplice indexes are inclusive (so if we want to paste notes over indexes [0,5] we don't have to send 0,6 like in cloneElems). These differences among the code are confusing. TODO: refactor 
			indexes[1]--;
			//we overwrite adapted notes in general note manager
			noteMng.notesSplice(indexes, adaptedNotes);
		} catch (e) {
			//console.log(e);
			UserLog.logAutoFade('error', "Tuplets can't be broken");
			return;
		}

		$.publish('ToHistory-add', 'Time signature set to ' + timeSignature);
	};
	StructureEditionController.prototype.tonality = function(tonality) {
		var selBars = this._getSelectedBars();
		if (selBars.length === 0) {
			return;
		}
		for (var i = 0, c = selBars.length; i < c; i++) {
			this.songModel.getComponent("bars").getBar(selBars[i]).setTonality(tonality);
		}
		$.publish('ToHistory-add', 'Tonality set to ' + tonality);
	};

	StructureEditionController.prototype.ending = function(ending) {
		var selBars = this._getSelectedBars();
		if (selBars.length === 0) {
			return;
		}
		for (var i = 0, c = selBars.length; i < c; i++) {
			if (ending === "none") {
				ending = undefined;
			}
			this.songModel.getComponent("bars").getBar(selBars[i]).setEnding(ending);
		}
		$.publish('ToHistory-add', 'Ending set to ' + ending);
	};

	StructureEditionController.prototype.style = function(style) {
		var selBars = this._getSelectedBars();
		if (selBars.length === 0) {
			return;
		}
		for (var i = 0, c = selBars.length; i < c; i++) {
			if (style === "none") {
				style = undefined;
			}
			this.songModel.getComponent("bars").getBar(selBars[i]).setStyle(style);
		}
		$.publish('ToHistory-add', 'Style set to ' + style);
	};

	StructureEditionController.prototype.label = function(label) {
		var selBars = this._getSelectedBars();
		if (selBars.length === 0) {
			return;
		}
		for (var i = 0, c = selBars.length; i < c; i++) {
			if (label === "none") {
				label = '';
			}
			this.songModel.getComponent("bars").getBar(selBars[i]).setLabel(label);
		}
		$.publish('ToHistory-add', 'Label set to ' + label);
	};

	StructureEditionController.prototype.subLabel = function(sublabel) {
		var selBars = this._getSelectedBars();
		if (selBars.length === 0) {
			return;
		}
		for (var i = 0, c = selBars.length; i < c; i++) {
			if (sublabel === "none") {
				sublabel = undefined;
			}
			this.songModel.getComponent("bars").getBar(selBars[i]).setSublabel(sublabel);
		}
		$.publish('ToHistory-add', 'Sublabel set to ' + sublabel);
	};

	StructureEditionController.prototype._getSelectedBars = function() {
		var selectedBars = [];
		selectedBars[0] = this.songModel.getComponent('notes').getNoteBarNumber(this.cursor.getStart(), this.songModel);
		selectedBars[1] = this.songModel.getComponent('notes').getNoteBarNumber(this.cursor.getEnd(), this.songModel);
		if (selectedBars[1] === selectedBars[0]) {
			selectedBars.pop();
		}
		return selectedBars;
	};

	StructureEditionController.prototype.unfold = function(force) {
		var unfold = true;
		if (typeof force === "undefined" || force === false) {
			unfold = !this.structEditionModel.unfolded;
		}
		if (unfold) {
			this.oldSong = this.songModel;
			var newSongModel = this.songModel.unfold();
			this.songModel = newSongModel;
			$.publish('ToViewer-draw', this.songModel);
		} else {
			$.publish('ToViewer-draw', this.oldSong);
		}
		this.structEditionModel.toggleUnfolded();
		$.publish('ToLayers-removeLayer');
	};

	StructureEditionController.prototype.transposeSong = function(semiTons) {
		if (isNaN(semiTons) || semiTons === 0) {
			return;
		}

		// notes
		// First we get all notes and all midi notes
		var nm = this.songModel.getComponent('notes');
		var notes = nm.getNotes();
		var midiNotes = SongConverterMidi_MidiCSL.exportNoteToMidiCSL(this.songModel);

		var midiNote, currentNote, pitchFormat;
		var tonalityNote = SongConverterMidi_MidiCSL.convertTonality2AlteredNote(this.songModel.getTonality());
		var accidentalMeasure = (JSON.parse(JSON.stringify(tonalityNote))); // clone object
		var numMeasure = 0;
		for (var i = 0, c = midiNotes.length; i < c; i++) {
			if (typeof midiNotes[i].midiNote !== "undefined" && midiNotes[i].midiNote[0] !== false && midiNotes[i].midiNote !== false) { // exclude silence but not tie notes
				// Build current tonality and accidental measure
				if (nm.getNoteBarNumber(i, this.songModel) !== numMeasure) {
					numMeasure = nm.getNoteBarNumber(i, this.songModel);
					tonalityNote = SongConverterMidi_MidiCSL.convertTonality2AlteredNote(this.songModel.getTonalityAt(numMeasure));
					accidentalMeasure = (JSON.parse(JSON.stringify(tonalityNote))); // empty accidentalMeasure on each new measure
				}
				midiNote = midiNotes[i].midiNote[0] + parseInt(semiTons, 10);
				currentNote = MIDI.noteToKey[midiNote];
				pitchFormat = currentNote.substr(0, currentNote.length - 1) + '/' + currentNote.substr(-1); // Convert C#4 to C#/4

				notes[i].setNoteFromString(pitchFormat);

				// Change accidental measure
				if (notes[i].getAccidental() !== "") {
					accidentalMeasure[notes[i].getPitchClass()] = notes[i].getPitchClass() + notes[i].getAccidental();
				}
				// Use accidental measure to decide if we need a natural or not
				if (accidentalMeasure[notes[i].getPitchClass()] !== notes[i].getPitchClass() + notes[i].getAccidental()) {
					notes[i].setAccidental('n');
				}

				// case tied notes
				if (typeof midiNotes[i].tieNotesNumber !== "undefined" && midiNotes[i].tieNotesNumber) {
					for (var j = 1, v = midiNotes[i].tieNotesNumber; j < v; j++) {
						notes[i - j].setPitchClass(notes[i].getPitchClass());
						notes[i - j].setOctave(notes[i].getOctave());
						if (accidentalMeasure[notes[i].getPitchClass()] !== notes[i].getPitchClass() + notes[i].getAccidental()) {
							notes[i - j].setAccidental('n');
						} else {
							notes[i - j].setAccidental(notes[i].getAccidental());
						}
					}
				}
			}
		}

		// chords
		var chords = this.songModel.getComponent('chords').getChords();
		var pitch2Midi;
		var newPitch;
		for (var i = 0, c = chords.length; i < c; i++) {
			pitch2Midi = NoteUtils.pitch2Number(chords[i].getNote());
			newPitch = NoteUtils.number2Pitch(pitch2Midi + semiTons);
			chords[i].setNote(newPitch);
			if (chords[i].isEmptyBase() === false) {
				pitch2Midi = NoteUtils.pitch2Number(chords[i].getBase().getNote());
				newPitch = NoteUtils.number2Pitch(pitch2Midi + semiTons);
				chords[i].base.setNote(newPitch);
			}
		}

		this.structEditionModel.setDecalFromOriginalTonality(semiTons);
		$.publish('ToHistory-add', 'Transpose Song ' + semiTons + ' half ton(s)');
	};

	return StructureEditionController;
});