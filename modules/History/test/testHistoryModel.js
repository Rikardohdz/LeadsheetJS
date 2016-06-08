define([
	'modules/History/src/HistoryModel',
], function(HistoryModel) {
	return {
		run: function() {
			test("HistoryModel", function(assert) {
				var hm = new HistoryModel();
				assert.ok(hm instanceof HistoryModel);

				//we construct
				assert.equal(hm.getSavedHistory().length, 0, 'on initialisation, no history');
				assert.equal(hm.getCurrentPosition(), -1);
				assert.equal(hm.lastLeadsheet, null);

				//on load we controller will do first add to history, initial lead sheet (position -1)
				hm.addToHistory({
					title: 'ls',
					_id: 1,
				}, 'initial leadsheet');
				assert.equal(hm.getCurrentPosition(), 0, 'tests initial lead sheet');
				assert.equal(hm.getSavedHistory().length, 1);
				assert.deepEqual(hm.lastLeadsheet, {
					_id: 1,
					title: 'ls'
				});

				hm.addToHistory({
					_id: 1,
					title: 'ls',
					composer: 'hey'
				}, '1st change');

				assert.equal(hm.getCurrentPosition(), 1, 'tests 1st change');
				assert.deepEqual(hm.lastLeadsheet, {
					_id: 1,
					title: 'ls',
					composer: 'hey'
				});

				hm.addToHistory({
						_id: 1,
						title: 'ls',
						composer: 'hi',
						source: 'real book'
					},
					'2nd change, now this is a good one');

				assert.equal(hm.getCurrentPosition(), 2, 'tests 2nd change');

				hm.addToHistory({
					_id: 1,
					title: 'ls',
					composer: 'hi'
				}, '3rd change, removed source');

				assert.equal(hm.getCurrentPosition(), 3, 'tests 3rd change');

				hm.addToHistory({
					_id: 1,
					title: 'ls',
					composer: 'huu'
				}, 'new changing, but updating', true);

				assert.equal(hm.getCurrentPosition(), 3, 'tests change updating');

				hm.setCurrentPosition(hm.getCurrentPosition() - 1);
				assert.equal(hm.getCurrentPosition(), 2);
				assert.deepEqual(hm.getCurrentState(), {
					_id: 1,
					title: 'ls',
					composer: 'hi',
					source: 'real book'
				}, 'going to position 2');

				hm.setCurrentPosition(hm.getCurrentPosition() - 1);
				assert.equal(hm.getCurrentPosition(), 1, 'going to position 1');
				assert.deepEqual(hm.getCurrentState(), {
					_id: 1,
					title: 'ls',
					composer: 'hey'
				});

				hm.setCurrentPosition(hm.getCurrentPosition() - 1);
				assert.equal(hm.getCurrentPosition(), 0, 'going to position -1');
				assert.deepEqual(hm.getCurrentState(), {
					_id: 1,
					title: 'ls'
				});

				hm.setCurrentPosition(hm.getCurrentPosition() + 3);
				assert.deepEqual(hm.getCurrentState(), {
					_id: 1,
					title: 'ls',
					composer: 'huu'
				});
				assert.equal(hm.getCurrentPosition(), 3);

				//REWRITING HISTORY: 
				//	go back to state 1
				hm.setCurrentPosition(hm.getCurrentPosition() - 2);
				assert.equal(hm.getCurrentPosition(), 1);
				assert.deepEqual(hm.getCurrentState(), {
					_id: 1,
					title: 'ls',
					composer: 'hey'
				}, 'rewriting history');

				//add new change
				hm.addToHistory({
					_id: 1,
					title: 'ls',
					composer: '104'
				}, 'changing composer');
				assert.equal(hm.getCurrentPosition(), 2, 'tests 2nd change');
				
				assert.deepEqual(hm.getCurrentState(), {
					_id: 1,
					title: 'ls',
					composer: '104'
				}, 'checking just inserted entry');

				hm.setCurrentPosition(hm.getCurrentPosition() - 1);
				assert.deepEqual(hm.getCurrentState(), {
					_id: 1,
					title: 'ls',
					composer: 'hey'
				}, 'checking going back to entry' );

				//Testing history length
				var shortHm = new HistoryModel({maxHistoryLength: 2});
				shortHm.addToHistory({_id: 2, example:'1'}, 'first add');
				assert.equal(shortHm.getSavedHistory().length,1,'testing history length (maxLength == 2)');
				
				shortHm.addToHistory({_id: 1,example:'2'}, 'second add');
				assert.equal(shortHm.getSavedHistory().length,2,'after 2nd add: length == 2');

				shortHm.addToHistory({_id: 1,example:'3'}, 'third add');
				assert.equal(shortHm.getSavedHistory().length,2,'after third add, still length == 2');
				assert.deepEqual(shortHm.getState(0),{_id: 1,example:'2'}, 'oldest state is example 2, as we have deleted example 1 when adding example 3');

			});
		}
	};
});