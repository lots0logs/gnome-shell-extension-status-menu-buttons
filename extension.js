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
const Util = imports.misc.util;

const Main = imports.ui.main;
const StatusSystem = imports.ui.status.system;
const PopupMenu = imports.ui.popupMenu;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const ConfirmDialog = Me.imports.confirmDialog;
const ExtensionSystem = imports.ui.extensionSystem;
const Signals = imports.signals;

const SystemdProxyIface = '<node> \
<interface name="org.freedesktop.login1.Manager"> \
<method name="Suspend"> \
    <arg type="b" direction="in"/> \
</method> \
<method name="CanSuspend"> \
    <arg type="s" direction="out"/> \
</method> \
<method name="Hibernate"> \
    <arg type="b" direction="in"/> \
</method> \
<method name="CanHibernate"> \
    <arg type="s" direction="out"/> \
</method> \
<method name="HybridSleep"> \
    <arg type="b" direction="in"/> \
</method> \
<method name="CanHybridSleep"> \
    <arg type="s" direction="out"/> \
</method> \
<method name="LockSession"> \
    <arg type="b" direction="in"/> \
</method> \
<signal name="PrepareForSleep"> \
    <arg type="b" direction="out"/> \
</signal> \
</interface> \
</node>';

/*const LightLockerProxyIface = '<node> \
<interface name="org.gnome.ScreenSaver"> \
<method name="Lock"> \
    <arg type="b" direction="in"/> \
</method> \
</interface> \
</node>';*/

const SystemdLoginManagerProxy = Gio.DBusProxy.makeProxyWrapper(SystemdProxyIface);
const LightLockerDbusProxy = Gio.DBusProxy.makeProxyWrapper(LightLockerProxyIface);

/*const LightLockerProxy = new Lang.Class({
	Name: 'LightLockerProxy',

	_init: function () {
		this._proxy = new LightLockerDbusProxy(Gio.DBus.system,
			'org.gnome.ScreenSaver',
			'/org/gnome/ScreenSaver');
	},

	lock: function () {
		this._proxy.LockRemote(true);
	}
});
Signals.addSignalMethods(LightLockerProxy.prototype);*/

const SystemdProxy = new Lang.Class({
	Name: 'SystemdProxy',

	_init: function () {
		this._proxy = new SystemdLoginManagerProxy(Gio.DBus.system,
			'org.freedesktop.login1',
			'/org/freedesktop/login1');
		this._proxy.connectSignal('PrepareForSleep',
			Lang.bind(this, this._prepareForSleep));
	},

	canHibernate: function (asyncCallback) {
		this._proxy.CanHibernateRemote(function (result, error) {
			if (error) {
				global.log(error);
				asyncCallback(false);
			} else {
				global.log(result);
				asyncCallback(result[0] != 'no');
			}
		});
	},
	hibernate: function () {
		this._proxy.HibernateRemote(true);
	},
	canHybridSleep: function (asyncCallback) {
		this._proxy.CanHybridSleepRemote(function (result, error) {
			if (error) {
				global.log(error);
				asyncCallback(false);
			} else {
				global.log(result);
				asyncCallback(result[0] != 'no');
			}
		});
	},
	hybridSleep: function () {
		this._proxy.HybridSleepRemote(true);
	},

	_prepareForSleep: function (proxy, sender, [aboutToSuspend]) {
		this.emit('prepare-for-sleep', aboutToSuspend);
	}
});
Signals.addSignalMethods(SystemdProxy.prototype);

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
						global.log(error)
					}

					if (error)
						asyncCallback(false);
					else
						asyncCallback(result[0] != 'no');
				});
		} else {
			Mainloop.idle_add(Lang.bind(this, function () {
				global.log('_loginManager._proxy not found');
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

	_lightLockerLock: function () {
		Util.spawn(['/usr/bin/light-locker-command', '-l']);
	},

	/*_lightLockerLock: function () {
		if (this._lightLocker._proxy) {
			this._lightLocker._proxy.call("Lock",
				GLib.Variant.new('(b)', [true]),
				Gio.DBusCallFlags.NONE,
				-1, null, null);
		} else {
			global.log('Unable to communicate with Light Locker. Is it running?')
			this._dialog = new ConfirmDialog.ConfirmDialog(ConfirmDialog.LightLockerMissingDialogContent);
			this._dialog.connect('DisableExtension', function () {
				let enabledExtensions = global.settings.get_strv(ExtensionSystem.ENABLED_EXTENSIONS_KEY);
				enabledExtensions.splice(enabledExtensions.indexOf(Me.uuid), 1);
				global.settings.set_strv(ExtensionSystem.ENABLED_EXTENSIONS_KEY, enabledExtensions);
			});
			this._dialog.open();
		}
	},*/

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

	_updateHaveLock: function () {
		this._haveLock = true;
		this._updateLock();
	},

	_updateLock: function () {
		this._lockAction.visible = this._haveLock;
	},

	_onHibernateClicked: function () {
		this.systemMenu.menu.itemActivated();
		this._dialog = new ConfirmDialog.ConfirmDialog(ConfirmDialog.HibernateDialogContent);
		this._dialog.connect('ConfirmedHibernate', Lang.bind(this, this._loginManagerHibernate));
		this._dialog.open();
	},

	_onHybridSleepClicked: function () {
		this.systemMenu.menu.itemActivated();
		this._loginManagerHybridSleep();
	},

	_onLockClicked: function () {
		this.systemMenu.menu.itemActivated();
		this._lightLockerLock();
	},

	enable: function () {
		//this._lightLocker = new LightLockerProxy();
		this._loginManager = new SystemdProxy();
		this.systemMenu = Main.panel.statusArea['aggregateMenu']._system;

		this._hibernateAction = this.systemMenu._createActionButton('document-save-symbolic', _("Hibernate"));
		this._hibernateActionId = this._hibernateAction.connect('clicked', Lang.bind(this, this._onHibernateClicked));

		this._hybridSleepAction = this.systemMenu._createActionButton('document-save-as-symbolic', _("HybridSleep"));
		this._hybridSleepActionId = this._hybridSleepAction.connect('clicked', Lang.bind(this, this._onHybridSleepClicked));

		this._settingsButton = this.systemMenu._actionsItem.actor.get_first_child();
		this._powerButton = this.systemMenu._actionsItem.actor.get_last_child();

		this._lockAction = this.systemMenu._createActionButton('system-lock-screen-symbolic', _("Lock"));
		this._lockActionId = this._lockAction.connect('clicked', Lang.bind(this, this._onLockClicked));
		this.systemMenu._actionsItem.actor.insert_child_at_index(this._lockAction, -1);

		this._altHibernateSwitcher = new StatusSystem.AltSwitcher(this._hibernateAction, this._hybridSleepAction);
		this.systemMenu._actionsItem.actor.insert_child_at_index(this._altHibernateSwitcher.actor, -1);

		this.systemMenu._actionsItem.actor.set_child_at_index(this._settingsButton, 1);
		this.systemMenu._actionsItem.actor.set_child_at_index(this._lockAction, 2);
		this.systemMenu._actionsItem.actor.set_child_at_index(this._altHibernateSwitcher, 3);
		this.systemMenu._actionsItem.actor.set_child_at_index(this._powerButton, 4);

		this._menuOpenStateChangedId = this.systemMenu.menu.connect('open-state-changed', Lang.bind(this,
			function (menu, open) {
				if (!open)
					return;
				this._hibernateAction.visible = true;
				this._updateHaveHibernate();
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

		if (this._lockActionId) {
			this._lockAction.disconnect(this._lockActionId);
			this._lockActionId = 0;
		}

		this.systemMenu._actionsItem.actor.remove_child(this._altHibernateSwitcher.actor);
		this.systemMenu._actionsItem.actor.remove_child(this._lockAction);

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

