/*
 -*- coding: utf-8 -*-

 extension.js

 Copyright © 2015 Antergos
 Copyright © 2014-2015 Alexandre Relange

 This file is part of Status Menu Buttons, (SMB).

 SMB is free software; you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation; either version 2 of the License, or
 (at your option) any later version.

 SMB is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with SMB; if not, write to the Free Software
 Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
 MA 02110-1301, USA.

 */

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Util = imports.misc.util

const LoginManager = imports.misc.loginManager;
const Main = imports.ui.main;
const StatusSystem = imports.ui.status.system;
const PopupMenu = imports.ui.popupMenu;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const ConfirmDialog = Me.imports.confirmDialog;
const ExtensionSystem = imports.ui.extensionSystem;

const Extension = new Lang.Class({
	Name: 'StatusMenuButtons.Extension',

	_init: function () {
	},

	_loginManagerCanHibernate: function (asyncCallback) {
		if (this._loginManager._proxy) {
			// systemd path
			this._loginManager._proxy.call("CanHibernate",
				null,
				Gio.DBusCallFlags.NONE,
				-1, null, function (proxy, asyncResult) {
					let result, error;

					try {
						result = proxy.call_finish(asyncResult).deep_unpack();
					} catch (e) {
						error = e;
					}

					if (error)
						asyncCallback(false);
					else
						asyncCallback(result[0] != 'no');
				});
		} else {
			Mainloop.idle_add(Lang.bind(this, function () {
				asyncCallback(false);
				return false;
			}));
		}
	},

	_loginManagerHibernate: function () {
		if (this._loginManager._proxy) {
			// systemd path
			this._loginManager._proxy.call("Hibernate",
				GLib.Variant.new('(b)', [true]),
				Gio.DBusCallFlags.NONE,
				-1, null, null);
		} else {
			// Can't do in ConsoleKit
			this._loginManager.emit('prepare-for-sleep', true);
			this._loginManager.emit('prepare-for-sleep', false);
		}
	},

	_loginManagerCanLock: function (asyncCallback) {
		if (this._loginManager._proxy) {
			// systemd path
			this._loginManager._proxy.call("CanLock",
				null,
				Gio.DBusCallFlags.NONE,
				-1, null, function (proxy, asyncResult) {
					let result, error;

					try {
						result = proxy.call_finish(asyncResult).deep_unpack();
					} catch (e) {
						error = e;
					}

					if (error)
						asyncCallback(false);
					else
						asyncCallback(result[0] != 'no');
				});
		} else {
			Mainloop.idle_add(Lang.bind(this, function () {
				asyncCallback(false);
				return false;
			}));
		}
	},

	_loginManagerLock: function () {
		if (this._loginManager._proxy) {
			// systemd path
			this._loginManager._proxy.call("Lock",
				GLib.Variant.new('(b)', [true]),
				Gio.DBusCallFlags.NONE,
				-1, null, null);
		} else {
			// Can't do in ConsoleKit
			this._loginManager.emit('prepare-for-sleep', true);
			this._loginManager.emit('prepare-for-sleep', false);
		}
	},

	_loginManagerCanHybridSleep: function (asyncCallback) {
		if (this._loginManager._proxy) {
			// systemd path
			this._loginManager._proxy.call("CanHybridSleep",
				null,
				Gio.DBusCallFlags.NONE,
				-1, null, function (proxy, asyncResult) {
					let result, error;

					try {
						result = proxy.call_finish(asyncResult).deep_unpack();
					} catch (e) {
						error = e;
					}

					if (error)
						asyncCallback(false);
					else
						asyncCallback(result[0] != 'no');
				});
		} else {
			Mainloop.idle_add(Lang.bind(this, function () {
				asyncCallback(false);
				return false;
			}));
		}
	},

	_loginManagerHybridSleep: function () {
		if (this._loginManager._proxy) {
			// systemd path
			this._loginManager._proxy.call("HybridSleep",
				GLib.Variant.new('(b)', [true]),
				Gio.DBusCallFlags.NONE,
				-1, null, null);
		} else {
			// Can't do in ConsoleKit
			this._loginManager.emit('prepare-for-sleep', true);
			this._loginManager.emit('prepare-for-sleep', false);
		}
	},

	_loginManagerCanSuspend: function (asyncCallback) {
		if (this._loginManager._proxy) {
			// systemd path
			this._loginManager._proxy.call("CanSuspend",
				null,
				Gio.DBusCallFlags.NONE,
				-1, null, function (proxy, asyncResult) {
					let result, error;

					try {
						result = proxy.call_finish(asyncResult).deep_unpack();
					} catch (e) {
						error = e;
					}

					if (error)
						asyncCallback(false);
					else
						asyncCallback(result[0] != 'no');
				});
		} else {
			Mainloop.idle_add(Lang.bind(this, function () {
				asyncCallback(false);
				return false;
			}));
		}
	},

	_loginManagerSuspend: function () {
		if (this._loginManager._proxy) {
			// systemd path
			this._loginManager._proxy.call("Suspend",
				GLib.Variant.new('(b)', [true]),
				Gio.DBusCallFlags.NONE,
				-1, null, null);
		} else {
			// Can't do in ConsoleKit
			this._loginManager.emit('prepare-for-sleep', true);
			this._loginManager.emit('prepare-for-sleep', false);
		}
	},

	_updateHaveHibernate: function () {
		this._loginManagerCanHibernate(Lang.bind(this, function (result) {
			this._haveHibernate = result;
			this._updateHibernate();
		}));
	},

	_updateHibernate: function () {
		this._hibernateAction.visible = this._haveHibernate && !Main.sessionMode.isLocked;
	},

	_updateHaveHybridSleep: function () {
		this._loginManagerCanHybridSleep(Lang.bind(this, function (result) {
			this._haveHybridSleep = result;
			this._updateHybridSleep();
		}));
	},

	_updateHybridSleep: function () {
		this._hybridSleepAction.visible = this._haveHybridSleep && !Main.sessionMode.isLocked;
	},

	_updateHaveSuspend: function () {
		this._loginManagerCanSuspend(Lang.bind(this, function (result) {
			this._haveSuspend = result;
			this._updateSuspend();
		}));
	},

	_updateSuspend: function () {
		this._suspendAction.visible = this._haveSuspend && !Main.sessionMode.isLocked;
	},

	_updateHaveLock: function () {
		this._loginManagerCanLock(Lang.bind(this, function (result) {
			this._haveLock = result;
			this._updateLock();
		}));
	},

	_updateLock: function () {
		this._lockAction.visible = this._haveLock && !Main.sessionMode.isLocked;
	},

	_onHibernateClicked: function () {
		this.systemMenu.menu.itemActivated();
		this._dialog = new ConfirmDialog.ConfirmDialog(ConfirmDialog.HibernateDialogContent);
		this._dialog.connect('ConfirmedHibernate', Lang.bind(this, this._loginManagerHibernate));
		this._dialog.open();
	},

	_onSuspendClicked: function () {
		this.systemMenu.menu.itemActivated();
		this._loginManagerSuspend();
	},

	_onHybridSleepClicked: function () {
		this.systemMenu.menu.itemActivated();
		this._loginManagerHybridSleep();
	},

	_onLockClicked: function () {
		this.systemMenu.menu.itemActivated();
		this._loginManagerLock();
	},

	_checkRequirements: function () {
		if (!LoginManager.haveSystemd()) {
			this._dialog = new ConfirmDialog.ConfirmDialog(ConfirmDialog.SystemdMissingDialogContent);
			this._dialog.connect('DisableExtension', function () {
				let enabledExtensions = global.settings.get_strv(ExtensionSystem.ENABLED_EXTENSIONS_KEY);
				enabledExtensions.splice(enabledExtensions.indexOf(Me.uuid), 1);
				global.settings.set_strv(ExtensionSystem.ENABLED_EXTENSIONS_KEY, enabledExtensions);
			});
			this._dialog.open();
		}
	},

	enable: function () {
		this._checkRequirements();
		this._loginManager = LoginManager.getLoginManager();
		this.systemMenu = Main.panel.statusArea['aggregateMenu']._system;

		this._hibernateAction = this.systemMenu._createActionButton('document-save-symbolic', _("Hibernate"));
		this._hibernateActionId = this._hibernateAction.connect('clicked', Lang.bind(this, this._onHibernateClicked));

		this._hybridSleepAction = this.systemMenu._createActionButton('document-save-as-symbolic', _("HybridSleep"));
		this._hybridSleepActionId = this._hybridSleepAction.connect('clicked', Lang.bind(this, this._onHybridSleepClicked));

		this._suspendAction = this.systemMenu._createActionButton('document-save-symbolic', _("Suspend"));
		this._suspendActionId = this._suspendAction.connect('clicked', Lang.bind(this, this._onSuspendClicked));

		this._lockAction = this.systemMenu._createActionButton('document-save-symbolic', _("Lock"));
		this._lockActionId = this._lockAction.connect('clicked', Lang.bind(this, this._onLockClicked));

		this._altHibernateSwitcher = new StatusSystem.AltSwitcher(this._hibernateAction, this._hybridSleepAction);
		this.systemMenu._actionsItem.actor.insert_child_at_index(this._altHibernateSwitcher.actor, 4);

		this._menuOpenStateChangedId = this.systemMenu.menu.connect('open-state-changed', Lang.bind(this,
			function (menu, open) {
				if (!open)
					return;
				this._hibernateAction.visible = true;
				this._updateHaveHibernate();
				this._suspendAction.visible = true;
				this._updateHaveSuspend();
				this._lockAction.visible = true;
				this._updateHaveLock();
				this._updateHaveHybridSleep();
			}));
	},

	disable: function () {
		if (this._menuOpenStateChangedId) {
			this.systemMenu.menu.disconnect(this._menuOpenStateChangedId);
			this._menuOpenStateChangedId = 0;
		}

		if (this._hybridSleepActionId) {
			this._hybridSleepAction.disconnect(this._hybridSleepActionId);
			this._hybridSleepActionId = 0;
		}

		if (this._hibernateActionId) {
			this._hibernateAction.disconnect(this._hibernateActionId);
			this._hibernateActionId = 0;
		}

		if (this._suspendActionId) {
			this._suspendAction.disconnect(this._suspendActionId);
			this._suspendActionId = 0;
		}

		if (this._lockActionId) {
			this._lockAction.disconnect(this._lockActionId);
			this._lockActionId = 0;
		}

		this.systemMenu._actionsItem.actor.remove_child(this._altHibernateSwitcher.actor);

		if (this._altHibernateSwitcher) {
			this._altHibernateSwitcher.actor.destroy();
			this._altHibernateSwitcher = 0;
		}

		if (this._hybridSleepAction) {
			this._hybridSleepAction.destroy();
			this._hybridSleepAction = 0;
		}

		if (this._hibernateAction) {
			this._hibernateAction.destroy();
			this._hibernateAction = 0;
		}

		if (this._suspendAction) {
			this._suspendAction.destroy();
			this._suspendAction = 0;
		}

		if (this._lockAction) {
			this._lockAction.destroy();
			this._lockAction = 0;
		}
	}
});

function init(metadata) {
	return (extension = new Extension());
}

