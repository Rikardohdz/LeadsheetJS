define(['modules/converters/MusicCSLJson/src/SongModel_CSLJson', 'modules/core/src/SongModel', 'tests/test-songs'], function(SongModel_CSLJson, SongModel, testSongs) {
	return {
		run: function() {
			test("SongModel_CSLJson", function(assert) {
				
				var song = SongModel_CSLJson.importFromMusicCSLJSON(testSongs.simpleLeadSheet, new SongModel());
								
				var exportedCSLJson = SongModel_CSLJson.exportToMusicCSLJSON(song);
				///assert.deepEqual(exportedCSLJson, testSongs.simpleLeadSheet);
				
				//var songWithKeySigChanges = SongModel_CSLJson.importFromMusicCSLJSON(testSongs.leadSheetTimeSigChanges, new SongModel());
				
				
				//console.log(songWithKeySigChanges.getBar(1));

				expect(0);
			});
		}
	}
});