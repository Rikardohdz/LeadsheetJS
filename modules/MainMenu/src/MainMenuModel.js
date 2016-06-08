define([
	'jquery',
], function($) {

	/**
	 * MainMenuModel is the model containing a set of menuList, each menuList contain a menu, each menu contain at least a title
	 * @exports MainMenu/MainMenuModel
	 */
	function MainMenuModel(allowChangeUrl) {
		this.menuList = []; // array of menus
		this.currentMenu = this.menuList[0]; // Current menu represent the current selected menu
		this.allowChangeUrl = (allowChangeUrl) ? allowChangeUrl : false;
	}


	MainMenuModel.prototype.isAllowChangeUrl = function() {
		return this.allowChangeUrl;
	};

	MainMenuModel.prototype.getMenuLength = function() {
		return this.menuList.length;
	};

	MainMenuModel.prototype.getMenu = function(index) {
		if (isNaN(index) || typeof this.menuList[index] === "undefined") {
			throw 'MainMenuModel - getMenu - index is undefined or is not a number or doesnt exist ' + index;
		}
		return this.menuList[index];
	};

	MainMenuModel.prototype.getMenuIdFromTitle = function(title) {
		return String(title.replace(' ', '_') + '_menu').toLowerCase();
	};

	MainMenuModel.prototype.addMenu = function(menu) {
		if (typeof menu === "undefined" || menu.title == "undefined") {
			throw 'MainMenuModel - addMenu - menu is undefined' + menu;
		}
		if (this.hasMenu(menu.title) === false) {
			if (typeof menu.order === "undefined") {
				menu.order = this.menuList.length + 1;
			}
			this.menuList.push(menu);
			this.sortMenu();
			window.clearTimeout(this.eventOptimizer);
			this.eventOptimizer = window.setTimeout(function() {
				$.publish('MainMenuModel-addMenu', menu);
			}, 10);
		} else {
			console.warn('MainMenuModel - addMenu - menu ' + menu.title + ' already exist');
		}
	};

	MainMenuModel.prototype.sortMenu = function() {
		this.menuList.sort(function(a, b) {
			if (a.order > b.order) {
				return 1;
			}
			if (a.order < b.order) {
				return -1;
			}
			// a doit être égale à b
			return 0;
		});
	};


	MainMenuModel.prototype.hasMenu = function(menuTitle) {
		if (menuTitle === "") {
			throw "MainMenuModel - hasMenu - menuTitle can't be equal to an empty string";
		}
		return this.searchMenuIndex(menuTitle) !== -1;
	};

	MainMenuModel.prototype.searchMenuIndex = function(menuTitle) {
		if (menuTitle === "") {
			throw "MainMenuModel - searchMenuIndex - menuTitle can't be equal to an empty string";
		}
		for (var i = 0, c = this.menuList.length; i < c; i++) {
			if (String(this.menuList[i].title).toLowerCase() === String(menuTitle).toLowerCase()) {
				return i;
			}
		}
		return -1;
	};

	MainMenuModel.prototype.removeMenu = function(menuTitle) {
		var index = this.searchMenuIndex(menuTitle);
		if (index !== -1) {
			this.menuList[index] = undefined;
			this.menuList.splice(index, 1);
			$.publish('MainMenuModel-removeMenu', menuTitle);
			return true;
		}
		return false;
	};

	MainMenuModel.prototype.getCurrentMenu = function() {
		return this.currentMenu;
	};

	MainMenuModel.prototype.setCurrentMenuById = function(currentMenuId) {
		var menuIndex = this.searchMenuIndex(currentMenuId.substr(0, currentMenuId.indexOf('_menu')));
		if (menuIndex !== -1) {
			this.setCurrentMenu(this.menuList[menuIndex])
			$.publish('MainMenuModel-setCurrentMenu', this.currentMenu);
		}
	};

	MainMenuModel.prototype.setCurrentMenu = function(currentMenu) {
		this.currentMenu = currentMenu;
		$.publish('MainMenuModel-setCurrentMenu', this.currentMenu);
	};

	return MainMenuModel;
});